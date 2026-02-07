# Phase 5: Acquisition & Notifications - Research

**Researched:** 2026-02-07
**Domain:** WebSocket Async Notification Handling and Waveform Data Parsing
**Confidence:** MEDIUM

## Summary

This research investigated async notification handling patterns, waveform data parsing strategies, and acquisition timeout patterns for Phase 5. The core challenge is handling fire-and-forget notifications (NOT_DYN_READING_STARTED, NOT_DYN_READING, NOT_DYN_TEMP) that arrive asynchronously after sending TAKE_DYN_READING command.

The standard approach is **Promise wrapper around EventEmitter pattern** - wrap notification events in Promises that resolve when target notification arrives and reject on timeout. Node.js provides native `events.once()` returning Promises, eliminating need for custom wrappers. For timeout handling, `Promise.race()` pattern is standard - race the notification Promise against a timeout Promise.

The biggest unknown is waveform encoding format (X/Y/Z strings). Research shows vibration sensor data is typically encoded as: CSV strings (human-readable, parser-friendly), Base64 binary (33% overhead, transmission-safe), or JSON arrays (verbose but native). Best strategy: **progressive parsing with fallback** - try each format, log what succeeds, validate with sanity checks (sample count matches metadata, values in reasonable g-range).

**Primary recommendation:** Use `events.once()` to await notifications, implement Promise.race() timeout pattern with 60s acquisition timeout, build multi-strategy waveform parser (CSV → JSON → Base64), use native `console.table()` for output, and validate data integrity (expected sample count, reasonable value ranges).

## Standard Stack

The project already uses the standard stack for this domain - no new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | 8.19.0 | WebSocket client with EventEmitter | Industry standard Node.js WebSocket library, already used in Phase 2 |
| Native Node.js events | 20+ | events.once() Promise wrapper | Built-in, no dependencies, returns Promise that resolves on event emission |
| Native Node.js timers/promises | 20+ | setTimeout Promise for timeouts | Native Promise-based timeout, works with AbortSignal for cleanup |
| Zod | 4.3.6 | Runtime validation for waveform data | Already used for all message schemas, can validate parsed arrays |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| console.table() | Native | Format multi-axis data | Native Node.js method for tabular output, no dependencies |
| Promise.race() | Native | Timeout pattern | Built-in, races notification Promise vs timeout Promise |
| String.split() | Native | Parse CSV waveform strings | Native method for comma-separated values |
| JSON.parse() | Native | Parse JSON array waveforms | Native method for JSON format detection |
| Buffer.from() | Native | Decode Base64 waveforms | Native method for Base64 → binary decoding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| events.once() | Custom Promise wrapper | Custom wrapper adds complexity, events.once() is native and well-tested |
| Promise.race() | External timeout libraries | Libraries like promise-timeout add dependency for functionality already native |
| console.table() | Third-party table libs (cli-table, table) | Third-party libs add features (colors, borders) but Phase 5 only needs simple output |
| Progressive parser | Single assumed format | Assuming format fails if wrong, progressive parser is resilient to unknowns |

**Installation:**
```bash
# No new dependencies required - all libraries already installed or native
```

## Architecture Patterns

### Current Project Structure
The project already has the necessary infrastructure from Phases 1-4:
```
src/
├── types/
│   └── messages.ts           # NotDynReading, NotDynTemp schemas already defined
├── gateway/
│   ├── command-client.ts     # sendCommand() with timeout (30s default)
│   ├── notification-handler.ts # on() and handle() methods for NOT_ messages
│   └── message-router.ts     # Routes NOT_ messages to NotificationHandler
├── config.ts                 # ACQUISITION_TIMEOUT: 60000ms already defined
└── main.ts                   # Orchestration entry point
```

Phase 5 adds new modules:
```
src/
├── acquisition/
│   ├── acquisition-manager.ts  # Orchestrates TAKE_DYN_READING flow
│   └── waveform-parser.ts      # Multi-strategy waveform decoder
└── output/
    └── waveform-display.ts     # Console output formatting
```

### Pattern 1: Promise Wrapper for Notification Events

**What:** Wrap EventEmitter-based notification handler with Promises that resolve when target notification arrives.

**When to use:** Async operations where you need to await events that arrive out-of-band (not correlated to request).

**Why this pattern:**
- Node.js native `events.once()` returns Promise that resolves with event args
- No custom Promise wrapper code needed
- Clean async/await syntax in application flow
- Race-compatible for timeout handling

**Implementation:**
```typescript
// Source: Node.js events documentation (https://nodejs.org/api/events.html)
import { once } from 'node:events';

// NotificationHandler extends EventEmitter
class NotificationHandler extends EventEmitter {
  handle(message: NotificationMessage): void {
    // Emit event with notification type and data
    this.emit(message.Type, message.Data);
  }
}

// Application code awaits notification
const notificationHandler = new NotificationHandler();

// Wait for NOT_DYN_READING with timeout
const [readingData] = await Promise.race([
  once(notificationHandler, 'NOT_DYN_READING'),
  timeout(60000, 'Acquisition timeout - reading not received')
]);
```

**Key insight:** Don't build custom Promise wrappers - Node.js provides `events.once()` that returns Promise resolving with `[...args]` array.

### Pattern 2: Promise.race() Timeout Pattern

**What:** Race the target Promise against a timeout Promise that rejects after specified duration.

**When to use:** Any async operation that needs time limit (acquisition can take 30-60 seconds).

**Why this pattern:**
- Native JavaScript pattern, no dependencies
- Explicit timeout handling with custom error messages
- Cleanup-friendly (can use AbortSignal)
- Standard in Node.js ecosystem (Better Stack, 30secondsofcode)

**Implementation:**
```typescript
// Source: Better Stack Node.js Timeouts Guide (https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/)
function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

// Usage with acquisition flow
try {
  const result = await Promise.race([
    waitForReading(),
    timeout(config.ACQUISITION_TIMEOUT, 'Reading timeout')
  ]);
} catch (error) {
  logger.error(`Acquisition failed: ${error.message}`);
}
```

**Alternative with cleanup:**
```typescript
// Source: Node.js timers/promises API (https://nodejs.org/api/timers.html)
import { setTimeout } from 'node:timers/promises';

const abortController = new AbortController();
try {
  const result = await Promise.race([
    waitForReading(),
    setTimeout(60000, null, { signal: abortController.signal })
      .then(() => Promise.reject(new Error('Timeout')))
  ]);
  abortController.abort(); // Clean up timeout
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout was aborted because operation completed
  } else {
    // Actual timeout or other error
  }
}
```

### Pattern 3: Progressive Waveform Parser with Fallback

**What:** Try multiple parsing strategies in order until one succeeds, with validation after each attempt.

**When to use:** Unknown encoding format that could be CSV, JSON array, or Base64 binary.

**Why this pattern:**
- Resilient to format changes or documentation errors
- Validates parsed result matches expected sample count
- Logs successful strategy for documentation
- Fails gracefully if all strategies fail

**Implementation:**
```typescript
// Source: Encoding Time Series Data (https://jessemcdowell.ca/2024/12/Encoding-Time-Series-Data/)
interface WaveformData {
  x: number[];
  y: number[];
  z: number[];
}

function parseWaveform(
  xStr: string,
  yStr: string,
  zStr: string,
  expectedSamples: number
): WaveformData {
  const strategies = [
    { name: 'CSV', parser: parseCSV },
    { name: 'JSON', parser: parseJSON },
    { name: 'Base64', parser: parseBase64 },
  ];

  for (const { name, parser } of strategies) {
    try {
      const x = parser(xStr);
      const y = parser(yStr);
      const z = parser(zStr);

      // Validate sample count matches sensor metadata
      if (x.length !== expectedSamples) {
        logger.debug(`${name} parsing failed: expected ${expectedSamples} samples, got ${x.length}`);
        continue;
      }

      // Validate reasonable g-range (±16g max for most sensors)
      const allValues = [...x, ...y, ...z];
      const outOfRange = allValues.some(v => Math.abs(v) > 16);
      if (outOfRange) {
        logger.debug(`${name} parsing failed: values out of range (>±16g)`);
        continue;
      }

      logger.info(`Waveform parsed successfully using ${name} format`);
      return { x, y, z };
    } catch (error) {
      logger.debug(`${name} parsing failed: ${error.message}`);
    }
  }

  throw new Error('All waveform parsing strategies failed');
}

// Strategy 1: CSV (comma-separated values)
function parseCSV(str: string): number[] {
  return str.split(',').map(v => parseFloat(v.trim()));
}

// Strategy 2: JSON array
function parseJSON(str: string): number[] {
  const parsed = JSON.parse(str);
  if (!Array.isArray(parsed)) throw new Error('Not an array');
  return parsed.map(v => Number(v));
}

// Strategy 3: Base64 binary (16-bit signed integers)
function parseBase64(str: string): number[] {
  const buffer = Buffer.from(str, 'base64');
  const samples: number[] = [];
  for (let i = 0; i < buffer.length; i += 2) {
    const value = buffer.readInt16LE(i); // Signed 16-bit little-endian
    samples.push(value / 1000); // Assuming milligravity units
  }
  return samples;
}
```

**Validation checks:**
1. Sample count matches sensor metadata (`Samples` field from GET_DYN_CONNECTED)
2. Values within reasonable range (±16g for 16g sensors, ±8g for 8g sensors)
3. Z-axis mean close to ±1g (if sensor mounted horizontally)
4. No NaN or Infinity values

### Pattern 4: Acquisition Flow Orchestration

**What:** Coordinate POST_SUB_CHANGES → TAKE_DYN_READING → await notifications sequence.

**When to use:** Multi-step async flow with command-response and notification handling.

**Implementation:**
```typescript
// Source: WebSocket Request-Response Pattern (https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44)
async function acquireReading(
  sensor: SensorMetadata,
  commandClient: CommandClient,
  notificationHandler: NotificationHandler,
  config: Config
): Promise<void> {
  // Step 1: Subscribe to notifications
  await commandClient.sendCommand({
    Type: 'POST_SUB_CHANGES',
    From: 'UI',
    To: 'SERV',
    Data: {},
  });
  logger.info('Subscribed to notifications');

  // Step 2: Register notification handlers (before triggering reading)
  const readingStartedPromise = once(notificationHandler, 'NOT_DYN_READING_STARTED');
  const readingCompletePromise = once(notificationHandler, 'NOT_DYN_READING');
  const tempPromise = once(notificationHandler, 'NOT_DYN_TEMP');

  // Step 3: Trigger reading
  await commandClient.sendCommand({
    Type: 'TAKE_DYN_READING',
    From: 'UI',
    To: 'SERV',
    Data: { Serial: sensor.Serial },
  });
  logger.info(`Triggered reading for sensor ${sensor.Serial}`);

  // Step 4: Wait for NOT_DYN_READING_STARTED
  const [startedData] = await Promise.race([
    readingStartedPromise,
    timeout(30000, 'Timeout waiting for reading start notification')
  ]);

  if (!startedData.Success) {
    throw new Error(`Reading failed to start: Serial ${startedData.Serial}`);
  }
  logger.info('Reading started successfully');

  // Step 5: Wait for NOT_DYN_READING (acquisition timeout: 60s)
  const [readingData] = await Promise.race([
    readingCompletePromise,
    timeout(config.ACQUISITION_TIMEOUT, 'Timeout waiting for reading complete')
  ]);

  // Step 6: Parse waveform data
  const waveforms = parseWaveform(
    readingData.X,
    readingData.Y,
    readingData.Z,
    sensor.Samples
  );

  // Step 7: Display results
  displayWaveform(sensor, readingData, waveforms);

  // Step 8: Optionally wait for temperature (but don't block - may arrive later)
  Promise.race([
    tempPromise.then(([tempData]) => {
      logger.info(`Temperature: ${tempData.Temp}°C`);
    }),
    timeout(10000, 'Temperature notification timeout')
  ]).catch(() => {
    logger.debug('Temperature notification not received (optional)');
  });

  // Step 9: Unsubscribe
  await commandClient.sendCommand({
    Type: 'POST_UNSUB_CHANGES',
    From: 'UI',
    To: 'SERV',
    Data: {},
  });
  logger.info('Unsubscribed from notifications');
}
```

**Key timing:**
- POST_SUB_CHANGES: standard 30s command timeout
- TAKE_DYN_READING: standard 30s command timeout (RTN_ERR if sensor busy/disconnected)
- NOT_DYN_READING_STARTED: 30s notification timeout (should arrive immediately)
- NOT_DYN_READING: 60s acquisition timeout (sensor takes time to capture waveform)
- NOT_DYN_TEMP: 10s optional timeout (don't block on temperature)

### Anti-Patterns to Avoid

- **Awaiting notifications before registering handlers:** Register `once()` listeners BEFORE triggering command, otherwise notification may arrive before listener attached (race condition).
- **Single timeout for entire flow:** Use specific timeouts for each step - command timeouts (30s) vs acquisition timeout (60s) have different reasons.
- **Assuming waveform format:** Progressive parser handles unknown format gracefully instead of failing on wrong assumption.
- **Ignoring NOT_DYN_READING_STARTED:** This notification signals acquisition start and includes Success field - check it before waiting for completion.
- **Blocking on temperature notification:** NOT_DYN_TEMP is optional/informational - don't fail acquisition if it doesn't arrive.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Promise timeout wrapper | Custom timeout wrapper with manual cleanup | `Promise.race()` with native `setTimeout()` or `timers/promises` | Native solution, no dependencies, works with AbortSignal |
| Event-to-Promise wrapper | Custom Promise wrapper around EventEmitter | Native `events.once()` | Returns Promise that resolves with event args, built-in since Node.js 11.13.0 |
| Console table formatting | String concatenation for table output | Native `console.table()` | Handles column alignment, headers, and formatting automatically |
| CSV parsing library | Third-party CSV parser for simple comma-separated values | Native `String.split(',').map(parseFloat)` | Simple waveform data doesn't need full CSV parser (no quotes, escaping) |
| Base64 decoding library | Third-party Base64 decoder | Native `Buffer.from(str, 'base64')` | Node.js Buffer handles Base64 natively |

**Key insight:** Phase 5's requirements are simple enough for native Node.js APIs. CSV is trivial (comma-split), Base64 is native (Buffer), and timeout/event patterns are built-in. Avoid external dependencies unless format proves complex during testing.

## Common Pitfalls

### Pitfall 1: Notification Race Condition

**What goes wrong:** Register notification listener AFTER sending TAKE_DYN_READING. Notification arrives before listener attached, so Promise never resolves.

**Why it happens:** Notifications are fire-and-forget, not queued. If NOT_DYN_READING_STARTED arrives before `once()` is called, the event is lost.

**How to avoid:**
```typescript
// WRONG: Listener registered after command sent
await commandClient.sendCommand({ Type: 'TAKE_DYN_READING', ... });
const [data] = await once(notificationHandler, 'NOT_DYN_READING'); // May miss notification!

// RIGHT: Listener registered before command sent
const readingPromise = once(notificationHandler, 'NOT_DYN_READING');
await commandClient.sendCommand({ Type: 'TAKE_DYN_READING', ... });
const [data] = await readingPromise; // Guaranteed to catch notification
```

**Warning signs:**
- Timeout on notification wait even though sensor shows "reading complete" in logs
- Intermittent failures (works when slow, fails when fast)

### Pitfall 2: Wrong Timeout Duration

**What goes wrong:** Using 30s timeout for acquisition (NOT_DYN_READING), but sensor takes 45s to capture waveform. Timeout fires before legitimate completion.

**Why it happens:** Confusing command timeout (30s for RTN_DYN/RTN_ERR) with acquisition timeout (60s for waveform capture).

**How to avoid:**
- Command timeouts: 30s (TAKE_DYN_READING returns immediately with RTN_ERR if sensor busy)
- Notification timeouts: 60s (NOT_DYN_READING takes time - sensor must physically capture vibration)
- Use config.ACQUISITION_TIMEOUT (60000ms) for NOT_DYN_READING wait

**Warning signs:**
- Consistent timeout at same duration (e.g., always 30s)
- Sensor logs show successful capture but application reports timeout
- Timeout message arrives shortly before actual notification

### Pitfall 3: Waveform Validation Failure

**What goes wrong:** Waveform parser succeeds but data is nonsense - values like `[NaN, Infinity, 9999999]` or sample count mismatch.

**Why it happens:** Parser assumes format (e.g., CSV) but actual format is different (e.g., Base64). Parser doesn't validate result.

**How to avoid:**
1. Validate sample count matches sensor metadata: `parsed.length === sensor.Samples`
2. Validate value range: `Math.abs(value) <= 16` (for 16g sensor)
3. Validate no NaN/Infinity: `allValues.every(v => Number.isFinite(v))`
4. Validate Z-axis sanity: `Math.abs(mean(z) - 1.0) < 0.5` (horizontal mount)

**Warning signs:**
- Sample count doesn't match sensor metadata (Samples: 6400 but got 3200)
- Z-axis mean far from ±1g (e.g., mean(z) = 0.001 or 50.0)
- Values outside sensor range (e.g., 500g on 8g sensor)
- NaN or Infinity in output

### Pitfall 4: Subscription State Confusion

**What goes wrong:** Send TAKE_DYN_READING without POST_SUB_CHANGES first. Command succeeds but notifications never arrive.

**Why it happens:** Gateway only sends NOT_ messages to subscribed connections. Without POST_SUB_CHANGES, connection is not subscribed.

**How to avoid:**
```typescript
// Enforce subscription order in acquisition manager
if (!this.isSubscribed) {
  throw new Error('Cannot trigger reading: not subscribed to notifications');
}
```

**Warning signs:**
- TAKE_DYN_READING returns success but no NOT_DYN_READING_STARTED arrives
- Timeout on all notification waits despite successful commands
- Other connections see notifications but yours don't

### Pitfall 5: Temperature Notification Blocking

**What goes wrong:** Wait for NOT_DYN_TEMP with same timeout as NOT_DYN_READING. Temperature notification is delayed or missing, blocking acquisition flow.

**Why it happens:** Temperature is optional/informational and may arrive separately or not at all.

**How to avoid:**
```typescript
// Don't block on temperature - use separate Promise with shorter timeout
Promise.race([
  tempPromise.then(([data]) => logger.info(`Temp: ${data.Temp}°C`)),
  timeout(10000, 'Temp timeout')
]).catch(() => logger.debug('Temperature not received'));

// Continue with main flow immediately
```

**Warning signs:**
- Acquisition succeeds but application waits extra 60s before displaying results
- Timeout error mentions "temperature" but waveform data was received
- Inconsistent behavior (works sometimes, times out other times)

## Code Examples

Verified patterns from research sources:

### Awaiting Notification with Timeout
```typescript
// Source: Node.js events.once() documentation
// https://nodejs.org/api/events.html
import { once } from 'node:events';

// NotificationHandler extends EventEmitter
const [readingData] = await Promise.race([
  once(notificationHandler, 'NOT_DYN_READING'),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 60000)
  )
]);

// Access notification data
console.log(`Reading ID: ${readingData.ID}`);
console.log(`Serial: ${readingData.Serial}`);
console.log(`Time: ${readingData.Time}`);
```

### Waveform Statistics Calculation
```typescript
// Source: Vibration sensor best practices
// https://www.ni.com/en/shop/data-acquisition/sensor-fundamentals/measuring-vibration-with-accelerometers.html
function calculateStats(samples: number[]): {
  min: number;
  max: number;
  mean: number;
  rms: number;
} {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const rms = Math.sqrt(
    samples.reduce((sum, v) => sum + v * v, 0) / samples.length
  );
  return { min, max, mean, rms };
}
```

### Console Output Formatting
```typescript
// Source: Node.js console.table() documentation
// https://nodejs.org/api/console.html
function displayWaveform(
  sensor: SensorMetadata,
  reading: NotDynReading,
  waveforms: WaveformData
): void {
  // Sensor metadata
  console.log('\n=== Sensor Information ===');
  console.table({
    Serial: sensor.Serial,
    PartNum: sensor.PartNum,
    ReadRate: `${sensor.ReadRate} Hz`,
    Samples: sensor.Samples,
    GMode: sensor.GMode,
  });

  // Reading metadata
  console.log('\n=== Reading Information ===');
  console.log(`Reading ID: ${reading.ID}`);
  console.log(`Timestamp: ${reading.Time}`);

  // Waveform statistics
  console.log('\n=== Waveform Statistics ===');
  const xStats = calculateStats(waveforms.x);
  const yStats = calculateStats(waveforms.y);
  const zStats = calculateStats(waveforms.z);

  console.table({
    'X-axis': xStats,
    'Y-axis': yStats,
    'Z-axis': zStats,
  });

  // First 10 samples
  console.log('\n=== First 10 Samples ===');
  console.table(
    Array.from({ length: 10 }, (_, i) => ({
      Sample: i + 1,
      X: waveforms.x[i].toFixed(3),
      Y: waveforms.y[i].toFixed(3),
      Z: waveforms.z[i].toFixed(3),
    }))
  );
}
```

### Acquisition Manager Pattern
```typescript
// Source: WebSocket async request-response pattern
// https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44
export class AcquisitionManager {
  private isSubscribed = false;

  constructor(
    private commandClient: CommandClient,
    private notificationHandler: NotificationHandler,
    private config: Config
  ) {}

  async subscribe(): Promise<void> {
    if (this.isSubscribed) return;

    await this.commandClient.sendCommand({
      Type: 'POST_SUB_CHANGES',
      From: 'UI',
      To: 'SERV',
      Data: {},
    });

    this.isSubscribed = true;
    logger.info('Subscribed to notifications');
  }

  async acquireReading(sensor: SensorMetadata): Promise<AcquisitionResult> {
    if (!this.isSubscribed) {
      throw new Error('Must subscribe before triggering reading');
    }

    // Register listeners BEFORE triggering command
    const startedPromise = once(this.notificationHandler, 'NOT_DYN_READING_STARTED');
    const completePromise = once(this.notificationHandler, 'NOT_DYN_READING');

    // Trigger reading
    await this.commandClient.sendCommand({
      Type: 'TAKE_DYN_READING',
      From: 'UI',
      To: 'SERV',
      Data: { Serial: sensor.Serial },
    });

    // Wait for start confirmation
    const [started] = await Promise.race([
      startedPromise,
      timeout(30000, 'Reading start timeout')
    ]);

    if (!started.Success) {
      throw new Error(`Reading failed to start for sensor ${sensor.Serial}`);
    }

    // Wait for completion
    const [reading] = await Promise.race([
      completePromise,
      timeout(this.config.ACQUISITION_TIMEOUT, 'Reading completion timeout')
    ]);

    // Parse and return
    const waveforms = parseWaveform(
      reading.X,
      reading.Y,
      reading.Z,
      sensor.Samples
    );

    return { sensor, reading, waveforms };
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSubscribed) return;

    await this.commandClient.sendCommand({
      Type: 'POST_UNSUB_CHANGES',
      From: 'UI',
      To: 'SERV',
      Data: {},
    });

    this.isSubscribed = false;
    logger.info('Unsubscribed from notifications');
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom Promise wrappers | Native events.once() | Node.js 11.13.0 (2019) | Eliminates need for custom event-to-Promise code |
| setTimeout callbacks | timers/promises with AbortSignal | Node.js 15.0.0 (2020) | Promise-based timeouts with cleanup support |
| Third-party CSV parsers | Native String.split() for simple CSV | N/A | No dependency needed for comma-separated numbers |
| Callback-based EventEmitter | Async/await with events.once() | Node.js 11.13.0 (2019) | Clean async code without callback nesting |

**Deprecated/outdated:**
- **promisify(events.once)**: Now native, no need for util.promisify
- **External promise-timeout libraries**: Built-in Promise.race() and timers/promises handle this
- **Heavy CSV parsing libraries**: Overkill for simple numeric arrays

## Open Questions

Things that couldn't be fully resolved and require testing:

1. **Waveform Encoding Format**
   - What we know: CTC API shows `X: str, Y: str, Z: str` but doesn't specify encoding
   - What's unclear: CSV string? JSON array? Base64 binary? Hex?
   - Recommendation: Implement progressive parser (CSV → JSON → Base64), log successful strategy, document in Milestone 0 findings

2. **Sample Value Units**
   - What we know: Accelerometers measure in g (9.81 m/s²) or raw ADC values
   - What's unclear: Are values in g, milligravity (mg), or raw integers?
   - Recommendation: Check Z-axis mean - if close to 1.0, likely g units; if close to 1000, likely mg units

3. **Temperature Notification Timing**
   - What we know: NOT_DYN_TEMP sent separately from NOT_DYN_READING
   - What's unclear: Does it arrive before/after/concurrent with waveform notification?
   - Recommendation: Don't block on temperature - use separate Promise with 10s timeout, log if not received

4. **NOT_DYN_READING_STARTED Success=false Scenarios**
   - What we know: Success field indicates if acquisition started
   - What's unclear: What causes Success=false? Sensor busy? Low battery? Disconnected?
   - Recommendation: Log Success=false cases, include Serial in error message, test failure scenarios

5. **Acquisition Duration Variability**
   - What we know: Milestone spec suggests 60s default timeout
   - What's unclear: Does duration vary by sensor config (Samples, ReadRate)? Expected range?
   - Recommendation: Calculate expected duration = Samples / ReadRate, use 2x as timeout (buffer for processing)

6. **Multiple Concurrent Readings**
   - What we know: Phase 5 scope is single reading for one sensor
   - What's unclear: Can gateway handle multiple TAKE_DYN_READING commands in parallel?
   - Recommendation: Out of scope for Phase 5, but note for future phases (concurrent reads vs sequential queue)

## Sources

### Primary (HIGH confidence)
- Node.js Events Documentation (https://nodejs.org/api/events.html) - events.once() Promise API
- Node.js Timers Documentation (https://nodejs.org/api/timers.html) - Promise-based setTimeout
- Better Stack Node.js Timeouts Guide (https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/) - Timeout patterns and best practices

### Secondary (MEDIUM confidence)
- [Real-Time Notification System with Node.js and WebSockets](https://codefinity.com/blog/Real-Time-Notification-System-with-Node.js-and-WebSockets) - WebSocket notification patterns
- [Request-Response model in web-sockets](https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44) - Correlation patterns for async messages
- [Using EventEmitters to resolve Promises from afar in Node.js](https://www.jpwilliams.dev/using-eventemitters-to-resolve-promises-from-afar-in-nodejs) - Event-to-Promise wrapper patterns
- [Encoding Time Series Data](https://jessemcdowell.ca/2024/12/Encoding-Time-Series-Data/) - Waveform encoding formats and compression strategies
- [Measuring Vibration with Accelerometers](https://www.ni.com/en/shop/data-acquisition/sensor-fundamentals/measuring-vibration-with-accelerometers.html) - Accelerometer output format and units

### Tertiary (LOW confidence - requires verification)
- WebSearch results on waveform parsing strategies - General encoding detection patterns, not specific to CTC API
- WebSearch results on console formatting - Node.js console.table() exists, but feature completeness varies by Node version
- WebSearch results on Base64 overhead - Cited 33% overhead but not verified against actual CTC payload sizes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are native Node.js or already in package.json, no new dependencies needed
- Architecture patterns: HIGH - events.once() and Promise.race() are documented Node.js APIs, EventEmitter extension is established pattern
- Waveform parsing: LOW - Encoding format unknown until testing, progressive parser is educated guess based on common formats
- Pitfalls: MEDIUM - Based on research and general WebSocket/async patterns, but specific to CTC gateway requires validation
- Output formatting: HIGH - console.table() is native Node.js since v10, verified in documentation

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, native APIs unlikely to change)
