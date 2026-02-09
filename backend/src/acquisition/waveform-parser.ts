// Progressive waveform parser with CSV/JSON/Base64 fallback strategies
// Handles the critical unknown (waveform encoding format) from ACQ-06

import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface WaveformData {
  x: number[];
  y: number[];
  z: number[];
}

// ============================================================================
// Parsing Strategies
// ============================================================================

type ParsingStrategy = {
  name: string;
  parse: (str: string) => number[];
};

/**
 * CSV Strategy: Parse comma-separated numeric values
 * Example: "1.23, 4.56, 7.89"
 */
const csvStrategy: ParsingStrategy = {
  name: 'CSV',
  parse: (str: string): number[] => {
    return str
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v)); // Remove any NaN values
  },
};

/**
 * JSON Strategy: Parse JSON array of numbers
 * Example: "[1.23, 4.56, 7.89]"
 */
const jsonStrategy: ParsingStrategy = {
  name: 'JSON',
  parse: (str: string): number[] => {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed value is not an array');
    }
    if (!parsed.every((v) => typeof v === 'number')) {
      throw new Error('Array contains non-numeric values');
    }
    return parsed;
  },
};

/**
 * Base64 Strategy: Decode Base64 string and read as Int16LE pairs
 * Converts from raw sensor units (assumed 16-bit signed integers) to milligravity
 * Division by 1000 converts milligravity to gravity units
 * Example: Base64-encoded binary data
 */
const base64Strategy: ParsingStrategy = {
  name: 'Base64',
  parse: (str: string): number[] => {
    const buffer = Buffer.from(str, 'base64');
    const values: number[] = [];

    // Read as Int16LE pairs (2 bytes per sample)
    for (let i = 0; i < buffer.length; i += 2) {
      if (i + 1 < buffer.length) {
        const rawValue = buffer.readInt16LE(i);
        const convertedValue = rawValue / 1000; // Convert to gravity units
        values.push(convertedValue);
      }
    }

    return values;
  },
};

// Ordered list of strategies to try (most likely first)
const STRATEGIES: ParsingStrategy[] = [csvStrategy, jsonStrategy, base64Strategy];

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate parsed waveform data meets expected criteria
 */
function validateWaveform(
  values: number[],
  expectedSamples?: number
): { valid: boolean; reason?: string } {
  // Check for NaN or Infinity values
  if (!values.every((v) => Number.isFinite(v))) {
    return { valid: false, reason: 'Contains NaN or Infinity values' };
  }

  // Check expected sample count if provided
  if (expectedSamples !== undefined && values.length !== expectedSamples) {
    return {
      valid: false,
      reason: `Expected ${expectedSamples} samples, got ${values.length}`,
    };
  }

  // Check values are in reasonable range (generous range for discovery)
  // Actual sensor range will be discovered during Phase 6 testing
  const MAX_REASONABLE_G = 200; // +/- 200g should cover most sensors
  if (!values.every((v) => Math.abs(v) <= MAX_REASONABLE_G)) {
    return { valid: false, reason: `Values exceed reasonable range (±${MAX_REASONABLE_G}g)` };
  }

  return { valid: true };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse waveform strings using progressive strategy (CSV -> JSON -> Base64)
 *
 * This is the primary discovery mechanism for ACQ-06 (waveform encoding format).
 * Tries multiple strategies and logs extensively to learn the actual format.
 *
 * @param xStr - X-axis waveform string
 * @param yStr - Y-axis waveform string
 * @param zStr - Z-axis waveform string
 * @param expectedSamples - Optional expected sample count for validation
 * @returns Parsed waveform data with numeric arrays for each axis
 * @throws Error if all strategies fail
 */
export function parseWaveform(
  xStr: string,
  yStr: string,
  zStr: string,
  expectedSamples?: number
): WaveformData {
  const attemptedStrategies: string[] = [];

  for (const strategy of STRATEGIES) {
    try {
      logger.debug(`Attempting ${strategy.name} parsing strategy...`);

      // Parse all three axes
      const x = strategy.parse(xStr);
      const y = strategy.parse(yStr);
      const z = strategy.parse(zStr);

      // Validate each axis
      const xValidation = validateWaveform(x, expectedSamples);
      if (!xValidation.valid) {
        logger.debug(`${strategy.name} X-axis validation failed: ${xValidation.reason}`);
        attemptedStrategies.push(`${strategy.name} (X-axis: ${xValidation.reason})`);
        continue;
      }

      const yValidation = validateWaveform(y, expectedSamples);
      if (!yValidation.valid) {
        logger.debug(`${strategy.name} Y-axis validation failed: ${yValidation.reason}`);
        attemptedStrategies.push(`${strategy.name} (Y-axis: ${yValidation.reason})`);
        continue;
      }

      const zValidation = validateWaveform(z, expectedSamples);
      if (!zValidation.valid) {
        logger.debug(`${strategy.name} Z-axis validation failed: ${zValidation.reason}`);
        attemptedStrategies.push(`${strategy.name} (Z-axis: ${zValidation.reason})`);
        continue;
      }

      // Success - log and return
      logger.info(
        `Waveform parsed using ${strategy.name} format (${x.length} samples per axis)`
      );
      return { x, y, z };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`${strategy.name} strategy failed: ${errorMsg}`);
      attemptedStrategies.push(`${strategy.name} (${errorMsg})`);
    }
  }

  // All strategies failed
  throw new Error(
    `Failed to parse waveform data. Attempted strategies: ${attemptedStrategies.join(', ')}`
  );
}

/**
 * Calculate statistics for a single axis of waveform data
 * Uses reduce pattern to avoid stack overflow on large arrays
 *
 * @param samples - Array of numeric samples
 * @returns Statistics: min, max, mean, count
 */
export function calculateAxisStats(samples: number[]): {
  min: number;
  max: number;
  mean: number;
  count: number;
} {
  if (samples.length === 0) {
    return { min: 0, max: 0, mean: 0, count: 0 };
  }

  // Use reduce to avoid stack overflow with Math.min/max(...samples)
  const min = samples.reduce((a, b) => Math.min(a, b), Infinity);
  const max = samples.reduce((a, b) => Math.max(a, b), -Infinity);
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / samples.length;
  const count = samples.length;

  return { min, max, mean, count };
}
