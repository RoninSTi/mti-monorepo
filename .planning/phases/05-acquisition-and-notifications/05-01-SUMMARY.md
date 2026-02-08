---
phase: 05
plan: 01
subsystem: acquisition
tags: [waveform-parsing, data-processing, output-formatting, utilities]

requires:
  - phases: [03-message-infrastructure]
    reason: Uses message types (SensorMetadata, NotDynReading)
  - phases: [01-foundation]
    reason: Uses logger utility

provides:
  - capability: Progressive waveform parser with CSV/JSON/Base64 strategies
    consumers: [05-02-acquisition-manager]
  - capability: Console output formatting for reading results
    consumers: [05-02-acquisition-manager]

affects:
  - phase: 05-02
    impact: AcquisitionManager will consume parseWaveform and displayReadingResults
  - phase: 06-integration
    impact: Actual waveform format will be discovered during testing

tech-stack:
  added: []
  patterns:
    - Progressive fallback parsing (CSV -> JSON -> Base64)
    - Reduce pattern for large array statistics (avoid stack overflow)

key-files:
  created:
    - src/acquisition/waveform-parser.ts
    - src/output/waveform-display.ts
  modified: []

decisions:
  - id: progressive-parsing-strategy
    decision: Implement CSV, JSON, and Base64 parsing with progressive fallback
    rationale: Waveform encoding format is unknown (ACQ-06), need flexible discovery
    alternatives: Hard-code single format (risky if wrong)

  - id: reduce-for-stats
    decision: Use reduce pattern for min/max calculation
    rationale: Math.min/max(...array) causes stack overflow on large arrays
    alternatives: Loop-based calculation (same performance, less idiomatic)

  - id: generous-validation-range
    decision: Validate waveform values within ±200g range
    rationale: Actual sensor range unknown, need generous bounds for discovery
    alternatives: Strict range (could reject valid data during testing)

  - id: console-log-formatting
    decision: Use simple console.log with toFixed(4) precision
    rationale: Reliable, clean output that works in all environments
    alternatives: console.table (less control over formatting)

metrics:
  duration: 1 minutes
  completed: 2026-02-07
---

# Phase 5 Plan 01: Waveform Parsing and Display Utilities Summary

**One-liner:** Progressive waveform parser with CSV/JSON/Base64 strategies and console output formatter for sensor reading results.

## What Was Built

Created two pure utility modules with no gateway dependencies:

1. **waveform-parser.ts** - Progressive parsing with fallback strategies
2. **waveform-display.ts** - Console output formatting for all OUT requirements

These utilities handle the critical unknown (waveform encoding format) and provide the display layer for reading results.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create progressive waveform parser | 57b841f | src/acquisition/waveform-parser.ts |
| 2 | Create waveform display module | 4c68ebd | src/output/waveform-display.ts |

## Implementation Details

### Waveform Parser (Task 1)

**Progressive Parsing Strategy:**
- **CSV Strategy:** Parse comma-separated values, filter NaN
- **JSON Strategy:** Parse JSON array, validate all numeric
- **Base64 Strategy:** Decode buffer, read Int16LE pairs, convert to gravity units (/1000)

**Validation per strategy:**
- No NaN or Infinity values: `Number.isFinite(v)`
- Sample count matches expected (if provided)
- Values within ±200g range (generous for discovery)

**Statistics Calculation:**
- Uses reduce pattern to avoid stack overflow: `samples.reduce((a, b) => Math.min(a, b), Infinity)`
- Returns min, max, mean, count per axis

**Exports:**
- `WaveformData` interface: `{ x: number[], y: number[], z: number[] }`
- `parseWaveform(xStr, yStr, zStr, expectedSamples?)`: Progressive parser
- `calculateAxisStats(samples)`: Min/max/mean/count calculator

### Display Module (Task 2)

**Output Requirements Coverage:**
- **OUT-01:** Sensor metadata (Serial, Part, ReadRate, Samples, GMode if present)
- **OUT-02:** Reading metadata (ID, Serial, Timestamp)
- **OUT-03:** Waveform statistics (samples per axis)
- **OUT-04:** First 10 samples per axis with fixed formatting
- **OUT-05:** Min/max/mean statistics per axis
- **OUT-06:** Temperature display when present

**Formatting:**
- Uses `toFixed(4)` for numeric precision
- Clean console.log sections with headers
- Padded sample indices for alignment

**Exports:**
- `displayReadingResults(sensor, reading, waveforms, temperature?)`: Single display function

## Decisions Made

### 1. Progressive Parsing Strategy

**Decision:** Implement CSV, JSON, and Base64 parsing with progressive fallback

**Context:** Waveform encoding format is unknown (ACQ-06 in research). Need flexible discovery mechanism.

**Options:**
- Progressive fallback (chosen) - Try multiple formats, log extensively
- Hard-code single format - Risk of total failure if wrong

**Rationale:** Progressive parser IS the discovery mechanism. Extensive debug logging will reveal actual format during Phase 6 testing.

### 2. Reduce Pattern for Statistics

**Decision:** Use `reduce` pattern for min/max calculation

**Context:** `Math.min(...samples)` spreads array as function arguments, causing stack overflow on large arrays.

**Implementation:**
```typescript
const min = samples.reduce((a, b) => Math.min(a, b), Infinity);
const max = samples.reduce((a, b) => Math.max(a, b), -Infinity);
```

**Rationale:** Handles arrays of any size without stack overflow risk. Performance equivalent to loop-based approach.

### 3. Generous Validation Range

**Decision:** Validate waveform values within ±200g range

**Context:** Actual sensor range unknown. Need to accept valid data during discovery testing.

**Rationale:** 200g is generous enough to cover most industrial sensors. Too strict a range could reject valid readings. Actual range will be discovered during testing.

### 4. Console.log Formatting

**Decision:** Use simple console.log with fixed precision

**Context:** Need reliable, clean output for OUT-01 through OUT-06.

**Alternatives considered:**
- `console.table` - Less control over formatting, harder to align sections
- Custom table library - Adds dependency

**Rationale:** Simple console.log works everywhere, easy to format, no dependencies.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**TypeScript Compilation:** All files compile cleanly with `npx tsc --noEmit`

**Format Discovery Strategy:**
- Parser will try CSV first (simplest, most likely for small datasets)
- Falls back to JSON (structured, easy to validate)
- Finally tries Base64 (binary efficiency for large datasets)
- Logs every attempt at debug level
- Logs successful strategy at info level

**Expected Phase 6 Behavior:**
- First reading acquisition will reveal actual format
- If format isn't CSV/JSON/Base64, we'll see detailed error logs
- Parser can be extended with additional strategies if needed

## Next Phase Readiness

**Ready for 05-02 (Acquisition Manager):**
- ✅ `parseWaveform` handles unknown format with fallback
- ✅ `calculateAxisStats` provides statistics for display
- ✅ `displayReadingResults` covers all OUT requirements
- ✅ All utilities are pure functions (no state, independently testable)

**Dependencies for 05-02:**
- Needs NotificationHandler from MessageRouter (exists in 03-03)
- Needs sensor discovery results (exists in 04-02)
- Needs to trigger readings via CommandClient (exists in 03-02)

**Open Questions for Phase 6:**
- What is the actual waveform encoding format? (will be discovered)
- What is the actual sensor G range? (will be discovered)
- Do X/Y/Z waveforms always have same length? (validation assumes yes)

## Files Created

### src/acquisition/waveform-parser.ts
**Purpose:** Progressive waveform parser with validation
**Exports:** WaveformData, parseWaveform, calculateAxisStats
**Dependencies:** logger
**Lines:** 218
**Key functions:**
- `parseWaveform()`: Try CSV -> JSON -> Base64 strategies
- `calculateAxisStats()`: Min/max/mean/count using reduce pattern

### src/output/waveform-display.ts
**Purpose:** Console output formatting for reading results
**Exports:** displayReadingResults
**Dependencies:** types/messages, acquisition/waveform-parser
**Lines:** 84
**Key functions:**
- `displayReadingResults()`: Single function covering OUT-01 through OUT-06

## Self-Check: PASSED

All created files exist:
- ✅ src/acquisition/waveform-parser.ts
- ✅ src/output/waveform-display.ts

All commits exist:
- ✅ 57b841f feat(05-01): implement progressive waveform parser
- ✅ 4c68ebd feat(05-01): implement waveform display module

TypeScript compilation: ✅ PASSED
