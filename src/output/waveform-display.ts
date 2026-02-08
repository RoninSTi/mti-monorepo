// Console output formatting for sensor readings and waveform data
// Implements all OUT-01 through OUT-06 requirements

import { SensorMetadata } from '../types/messages.js';
import { WaveformData, calculateAxisStats } from '../acquisition/waveform-parser.js';

// ============================================================================
// Display Interface
// ============================================================================

/**
 * Display complete reading results to console
 *
 * Outputs:
 * - OUT-01: Sensor metadata (Serial, Part, ReadRate, Samples, GMode)
 * - OUT-02: Reading metadata (ID, Serial, Timestamp)
 * - OUT-03: Waveform statistics (samples per axis)
 * - OUT-04: First 10 samples per axis
 * - OUT-05: Min/max/mean statistics per axis
 * - OUT-06: Temperature (if present)
 *
 * @param sensor - Sensor metadata from discovery
 * @param reading - Reading metadata from NOT_DYN_READING
 * @param waveforms - Parsed waveform data (x, y, z arrays)
 * @param temperature - Optional temperature from NOT_DYN_TEMP
 */
export function displayReadingResults(
  sensor: SensorMetadata,
  reading: { ID: number; Serial: string; Time: string },
  waveforms: WaveformData,
  temperature?: number
): void {
  // OUT-01: Sensor Information
  console.log('\n=== Sensor Information ===');
  console.log(`  Serial:    ${sensor.Serial}`);
  console.log(`  Part:      ${sensor.PartNum}`);
  console.log(`  ReadRate:  ${sensor.ReadRate} Hz`);
  console.log(`  Samples:   ${sensor.Samples}`);
  if (sensor.GMode !== undefined) {
    console.log(`  GMode:     ${sensor.GMode}`);
  }

  // OUT-02: Reading Information
  console.log('\n=== Reading Information ===');
  console.log(`  Reading ID: ${reading.ID}`);
  console.log(`  Serial:     ${reading.Serial}`);
  console.log(`  Timestamp:  ${reading.Time}`);

  // OUT-03: Waveform Statistics (sample counts)
  console.log('\n=== Waveform Statistics ===');
  console.log(
    `  Samples per axis: X=${waveforms.x.length}, Y=${waveforms.y.length}, Z=${waveforms.z.length}`
  );

  // OUT-05: Min/max/mean per axis
  const xStats = calculateAxisStats(waveforms.x);
  const yStats = calculateAxisStats(waveforms.y);
  const zStats = calculateAxisStats(waveforms.z);

  console.log(
    `  X-axis: min=${xStats.min.toFixed(4)}, max=${xStats.max.toFixed(4)}, mean=${xStats.mean.toFixed(4)}`
  );
  console.log(
    `  Y-axis: min=${yStats.min.toFixed(4)}, max=${yStats.max.toFixed(4)}, mean=${yStats.mean.toFixed(4)}`
  );
  console.log(
    `  Z-axis: min=${zStats.min.toFixed(4)}, max=${zStats.max.toFixed(4)}, mean=${zStats.mean.toFixed(4)}`
  );

  // OUT-04: First 10 samples per axis
  console.log('\n=== First 10 Samples ===');
  const sampleCount = Math.min(10, waveforms.x.length);
  for (let i = 0; i < sampleCount; i++) {
    console.log(
      `  [${String(i).padStart(2)}]  X=${waveforms.x[i].toFixed(4)}  Y=${waveforms.y[i].toFixed(4)}  Z=${waveforms.z[i].toFixed(4)}`
    );
  }

  // OUT-06: Temperature (if present)
  if (temperature !== undefined) {
    console.log('\n=== Temperature ===');
    console.log(`  Temperature: ${temperature} C`);
  }
}
