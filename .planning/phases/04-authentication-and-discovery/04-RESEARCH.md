# Phase 4: Authentication & Discovery - Research

**Researched:** 2026-02-07
**Domain:** WebSocket Authentication and API Discovery Patterns
**Confidence:** HIGH

## Summary

This research investigated WebSocket authentication flows and sensor discovery patterns to guide implementation of Phase 4. The project already has established infrastructure (WebSocketConnection, CommandClient, MessageRouter) that makes authentication straightforward: send POST_LOGIN command after connection, transition state on success, reject on RTN_ERR.

The standard approach for WebSocket authentication in application-layer scenarios (as opposed to browser-based) is **first-message authentication** - authenticate immediately after connection opens using application messages rather than HTTP headers or query parameters. This matches the CTC Gateway's POST_LOGIN pattern exactly. The existing ConnectionState enum already includes an AUTHENTICATED state, indicating this pattern was anticipated.

For sensor discovery, the GET_DYN_CONNECTED response uses a dictionary keyed by serial number. TypeScript's `Record<string, T>` type combined with Zod's `z.record()` provides type-safe parsing. The key pattern is: parse the dictionary, filter for connected sensors (Connected === 1), select first or from config, handle empty list gracefully.

**Primary recommendation:** Implement as a thin authentication layer using CommandClient for POST_LOGIN, transition ConnectionState.AUTHENTICATED only after RTN_DYN success, parse sensor dictionary with Zod Record schema, and handle edge cases (auth failure, no sensors) with clear errors and graceful exit.

## Standard Stack

The project already uses the standard stack for this domain - no new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | (current) | WebSocket client | Industry standard Node.js WebSocket library, already used in Phase 2 |
| Zod | (current) | Runtime validation | Already used for all message schemas, supports Record types for dictionaries |
| Native Node.js crypto | 20+ | UUID generation | Already used for correlation IDs in CommandClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript Record<K,V> | N/A | Dictionary types | For sensor metadata keyed by serial number |
| Zod z.record() | (current) | Dictionary validation | For runtime validation of dynamic key-value responses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| First-message auth | Query param auth | Query params leak credentials in logs - websockets.readthedocs.io explicitly recommends first-message |
| First-message auth | Cookie-based auth | Cookies add complexity for non-browser clients - unnecessary for machine-to-machine |
| ConnectionState enum | String literal union | Enums already established in Phase 2 (ConnectionState.CONNECTED exists), maintain consistency |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Current Project Structure
The project already has the necessary structure from Phases 1-3:
```
src/
├── types/
│   ├── connection.ts      # ConnectionState enum (includes AUTHENTICATED)
│   └── messages.ts        # All message schemas including PostLoginCommand
├── gateway/
│   ├── connection.ts      # WebSocketConnection with state machine
│   ├── command-client.ts  # CommandClient with sendCommand()
│   └── message-router.ts  # Routes RTN_ and NOT_ messages
├── config.ts              # Config with GATEWAY_EMAIL/PASSWORD
└── utils/
    └── logger.ts          # Singleton logger
```

### Pattern 1: First-Message Authentication Flow

**What:** Authenticate immediately after WebSocket connection opens by sending application-level POST_LOGIN command.

**When to use:** Machine-to-machine WebSocket communication where custom HTTP headers aren't supported and credentials shouldn't be in query parameters.

**Why this pattern:**
- Official websockets documentation (websockets.readthedocs.io) recommends this as "most secure option" for programmatic clients
- Keeps authentication at application layer with full control over error handling
- Allows detailed error messages (RTN_ERR with specific failure reasons)
- Prevents credential leakage in logs (unlike query parameters)

**Implementation sequence:**
```typescript
// Source: WebSocket authentication best practices (oneuptime.com/blog, websockets.readthedocs.io)
// 1. Connection opens (WebSocketConnection already handles this)
connection.on('open') → state = ConnectionState.CONNECTED

// 2. Immediately send POST_LOGIN command
const loginResponse = await commandClient.sendCommand({
  Type: 'POST_LOGIN',
  From: 'UI',
  To: 'SERV',
  Data: {
    Email: config.GATEWAY_EMAIL,
    Password: config.GATEWAY_PASSWORD,
  }
});

// 3. Transition state only on success
state = ConnectionState.AUTHENTICATED

// 4. Reject RTN_ERR with clear message
// CommandClient already rejects on RTN_ERR, just needs context logging
```

### Pattern 2: State Machine Authentication Transitions

**What:** Use explicit state transitions to prevent commands before authentication.

**When to use:** When authentication is required before any other operations.

**Current implementation:**
The ConnectionState enum already supports this pattern:
```typescript
// Source: src/types/connection.ts
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',      // ← Connection open but not authenticated
  AUTHENTICATED = 'AUTHENTICATED', // ← After POST_LOGIN succeeds
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}
```

**Transition rules:**
```
CONNECTED → AUTHENTICATED: POST_LOGIN succeeds (RTN_DYN received)
CONNECTED → DISCONNECTED: POST_LOGIN fails (RTN_ERR received, close connection)
AUTHENTICATED → *: All other commands now allowed
```

**Rationale for enum over string literal union:**
- Project already uses ConnectionState enum consistently (established in Phase 2)
- Enums provide centralized definition and easy IDE autocomplete
- String literal unions would require changing established patterns
- STATE.md decision: "String enum for ConnectionState - readable logging output"

### Pattern 3: Dictionary Response Parsing with Zod Record

**What:** Parse API responses where data is a dictionary keyed by dynamic IDs.

**When to use:** GET_DYN_CONNECTED returns `{ [serial: string]: SensorMetadata }`

**Implementation:**
```typescript
// Source: Zod documentation (zod.dev), TypeScript dictionary patterns
// Response type (already in src/types/messages.ts lines 150-156)
export const SensorMetadataSchema = z.object({
  Serial: z.number(),
  PartNum: z.string(),
  ReadRate: z.number(),
  Samples: z.number(),
  Name: z.string().optional(),
}).passthrough(); // Allow unknown fields from gateway

// Response Data is z.record() mapping serial to metadata
const response = await commandClient.sendCommand({
  Type: 'GET_DYN_CONNECTED',
  From: 'UI',
  To: 'SERV',
  Data: {},
});

// response.Data is Record<string, unknown> - narrow to sensor dictionary
const sensors: Record<string, SensorMetadata> = {};
for (const [serial, metadata] of Object.entries(response.Data)) {
  const parsed = SensorMetadataSchema.safeParse(metadata);
  if (parsed.success) {
    sensors[serial] = parsed.data;
  } else {
    logger.warn(`Invalid sensor metadata for ${serial}`);
  }
}

// Filter for connected sensors
const connectedSensors = Object.values(sensors).filter(s => s.Connected === 1);
```

**Why z.record() with safeParse per entry:**
- Gateway may return malformed entries - validate each independently
- Unknown fields allowed via .passthrough() (future-proof)
- TypeScript Record<string, T> provides compile-time type safety
- Runtime validation catches gateway changes

### Pattern 4: Graceful Handling of Empty Resources

**What:** When no resources found (no sensors connected), log clear message and exit cleanly.

**When to use:** Discovery operations where zero results are possible but prevent further operations.

**Anti-pattern to avoid:**
```typescript
// DON'T: Throw exception for business logic condition
if (connectedSensors.length === 0) {
  throw new Error('No sensors connected'); // Crashes with stack trace
}
```

**Recommended pattern:**
```typescript
// Source: Node.js graceful shutdown best practices
if (connectedSensors.length === 0) {
  logger.warn('No sensors connected to gateway - nothing to do');
  await shutdown(); // Clean shutdown (unsubscribe, close connection)
  process.exit(0);  // Exit successfully - not an error condition
}
```

**Rationale:**
- Zero sensors is a valid operational state, not an error
- Logging at WARN level alerts operator without triggering error monitoring
- Clean shutdown prevents orphaned connections
- Exit code 0 indicates successful execution (checked desired state, nothing to do)

### Pattern 5: Authentication Timeout and Error Handling

**What:** Set short timeout for authentication, fail fast with clear errors.

**Implementation:**
```typescript
// Source: WebSocket authentication best practices (oneuptime.com/blog)
// Recommended: 10 second authentication timeout
const AUTH_TIMEOUT_MS = 10000;

try {
  const loginResponse = await commandClient.sendCommand(
    { Type: 'POST_LOGIN', /* ... */ },
    AUTH_TIMEOUT_MS // Override default 30s timeout
  );
  // Success - transition to AUTHENTICATED
} catch (error) {
  // CommandClient throws on RTN_ERR or timeout
  logger.error(`Authentication failed: ${error.message}`);
  await connection.close();
  process.exit(1);
}
```

**Why shorter timeout:**
- Authentication should be fast (< 1 second typically)
- 10 seconds allows for network latency without hanging
- Fail-fast prevents indefinite unauthenticated state
- Matches industry best practice (oneuptime.com blog post)

### Anti-Patterns to Avoid

- **Query parameter authentication:** Credentials logged in WebSocket URLs, rejected by industry best practices
- **Authenticate-then-subscribe race:** Don't send POST_SUB_CHANGES before authentication completes
- **Silent authentication failure:** Always log auth errors with context (email used, error from gateway)
- **Continuing after no sensors found:** Would cause downstream errors, exit cleanly instead
- **Hardcoded sensor selection:** Allow config override (SENSOR_SERIAL) for testing specific hardware

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dictionary validation | Manual Object.entries() parsing | Zod z.record() | Handles type coercion, nested validation, clear error messages |
| UUID generation | Custom ID generator | crypto.randomUUID() | Already used in CommandClient, standardized format |
| State transitions | Boolean flags (isAuthenticated) | ConnectionState enum | Already established, readable logs, prevents invalid states |
| Authentication correlation | Custom promise management | CommandClient.sendCommand() | Already handles correlation IDs, timeouts, RTN_ERR rejection |
| Configuration parsing | Manual env var reading | Zod config schema | Already used, validates email format, enforces required fields |

**Key insight:** Phases 1-3 built all the primitives needed for authentication. Phase 4 is thin orchestration layer, not infrastructure.

## Common Pitfalls

### Pitfall 1: Authenticating Too Late or Too Early

**What goes wrong:** Sending commands before authentication completes, or blocking connection open until authenticated.

**Why it happens:** Confusion about when to authenticate in WebSocket lifecycle.

**How to avoid:**
```
CORRECT sequence:
1. WebSocket opens → state = CONNECTED
2. Immediately send POST_LOGIN
3. Await RTN_DYN response
4. state = AUTHENTICATED
5. Now allow other commands

WRONG: Send POST_LOGIN before connection opens
WRONG: Send GET_DYN_CONNECTED before POST_LOGIN completes
```

**Warning signs:**
- "Connection not available" errors (sent before open)
- RTN_ERR "Not authenticated" (sent before auth completes)
- Race condition where sometimes works, sometimes fails

### Pitfall 2: Not Handling Auth Failure Gracefully

**What goes wrong:** RTN_ERR from POST_LOGIN crashes with generic error or hangs indefinitely.

**Why it happens:** Assuming authentication always succeeds, not handling CommandClient rejection.

**How to avoid:**
```typescript
try {
  await commandClient.sendCommand({ Type: 'POST_LOGIN', ... });
} catch (error) {
  // CommandClient rejects with Error containing RTN_ERR details
  // Error message format: "Command error: {Error} (Attempt: POST_LOGIN, ...)"
  logger.error(`Authentication failed: ${error.message}`);
  // Extract details if needed for specific error handling
  if (error.message.includes('Invalid credentials')) {
    logger.error('Check GATEWAY_EMAIL and GATEWAY_PASSWORD in .env');
  }
  await connection.close();
  process.exit(1); // Fail fast - can't proceed without auth
}
```

**Warning signs:**
- Unhandled promise rejection crashes
- Process hangs waiting for commands that will never succeed
- Generic "Command error" without authentication context

### Pitfall 3: Parsing Dictionary with Unknown Keys Incorrectly

**What goes wrong:** Assuming sensor serials are known at compile time, or treating dictionary as array.

**Why it happens:** Confusion between fixed-schema objects and dynamic key-value dictionaries.

**How to avoid:**
```typescript
// WRONG: Assume specific serials exist
const sensor = response.Data['123456']; // Might be undefined

// WRONG: Try to iterate like array
response.Data.forEach((sensor) => { /* ... */ }); // Data is object, not array

// CORRECT: Iterate object entries
const sensors: SensorMetadata[] = [];
for (const [serial, metadata] of Object.entries(response.Data)) {
  const parsed = SensorMetadataSchema.safeParse(metadata);
  if (parsed.success) {
    sensors.push(parsed.data);
  }
}
```

**Warning signs:**
- "Cannot read property of undefined" when accessing sensor by hardcoded serial
- "Data.forEach is not a function" errors
- TypeScript errors about Record<string, T> not being array

### Pitfall 4: Not Filtering Connected Sensors

**What goes wrong:** Selecting sensor with Connected === 0, causing "Sensor not connected" errors on TAKE_DYN_READING.

**Why it happens:** GET_DYN_CONNECTED returns ALL known sensors, not just connected ones.

**How to avoid:**
```typescript
// WRONG: Select first sensor without checking Connected field
const firstSensor = Object.values(response.Data)[0];

// CORRECT: Filter for connected, then select
const connectedSensors = Object.values(response.Data)
  .filter(sensor => sensor.Connected === 1);

if (connectedSensors.length === 0) {
  logger.warn('No sensors currently connected');
  // Handle gracefully
}

const selectedSensor = connectedSensors[0]; // Now guaranteed connected
```

**Warning signs:**
- RTN_ERR "Sensor not connected" on TAKE_DYN_READING
- Intermittent failures when sensor list changes

### Pitfall 5: Logging Sensitive Credentials

**What goes wrong:** Authentication errors log full POST_LOGIN command including password.

**Why it happens:** Debug logging includes entire message objects without sanitization.

**How to avoid:**
```typescript
// WRONG: Log full command
logger.debug(`Sending command: ${JSON.stringify(command)}`); // Includes password

// CORRECT: CommandClient already logs safely
// From src/gateway/command-client.ts line 93:
logger.debug(`Sent command: ${command.Type}, CorrelationId: ${correlationId}`);
// Does NOT log Data field

// For auth-specific logging:
logger.info(`Authenticating with email: ${config.GATEWAY_EMAIL}`);
// Log email (not sensitive), NOT password
```

**Warning signs:**
- Passwords visible in log files
- Security audit flags credential exposure
- Config.GATEWAY_PASSWORD appears in debug output

## Code Examples

Verified patterns based on existing project code and industry best practices:

### Authentication Flow

```typescript
// Source: Existing project patterns + websockets.readthedocs.io best practices
// Location: New file src/gateway/authenticator.ts or integrate into connection.ts

import type { CommandClient } from './command-client';
import type { Config } from '../config';
import { logger } from '../utils/logger';

const AUTH_TIMEOUT_MS = 10000; // 10 second timeout per industry best practice

/**
 * Authenticate with gateway using POST_LOGIN command
 *
 * Sends credentials immediately after connection opens.
 * Throws on authentication failure - caller must handle by closing connection.
 */
export async function authenticate(
  commandClient: CommandClient,
  config: Config
): Promise<void> {
  logger.info(`Authenticating with gateway as ${config.GATEWAY_EMAIL}`);

  try {
    await commandClient.sendCommand(
      {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: config.GATEWAY_EMAIL,
          Password: config.GATEWAY_PASSWORD,
        },
      },
      AUTH_TIMEOUT_MS // Fail fast on auth timeout
    );

    logger.info('Authentication successful');
  } catch (error) {
    // CommandClient throws on RTN_ERR or timeout
    logger.error(`Authentication failed: ${error.message}`);
    throw error; // Propagate to caller for connection cleanup
  }
}
```

### Sensor Discovery with Dictionary Parsing

```typescript
// Source: Zod documentation + existing SensorMetadataSchema in src/types/messages.ts
// Location: New file src/gateway/sensor-discovery.ts

import type { CommandClient } from './command-client';
import type { SensorMetadata } from '../types/messages';
import { SensorMetadataSchema } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * Discover connected sensors and select one for acquisition
 *
 * @param commandClient - Authenticated command client
 * @param preferredSerial - Optional serial to prefer if connected
 * @returns Selected connected sensor metadata
 * @throws Error if no sensors connected
 */
export async function discoverSensor(
  commandClient: CommandClient,
  preferredSerial?: number
): Promise<SensorMetadata> {
  logger.info('Discovering connected sensors...');

  // Query gateway for all sensors
  const response = await commandClient.sendCommand({
    Type: 'GET_DYN_CONNECTED',
    From: 'UI',
    To: 'SERV',
    Data: {},
  });

  // Parse dictionary response: { [serial: string]: SensorMetadata }
  const sensors: SensorMetadata[] = [];
  for (const [serial, metadata] of Object.entries(response.Data)) {
    const parsed = SensorMetadataSchema.safeParse(metadata);
    if (parsed.success) {
      sensors.push(parsed.data);
    } else {
      logger.warn(`Invalid sensor metadata for serial ${serial}: ${parsed.error}`);
    }
  }

  // Filter for connected sensors only (Connected === 1)
  const connectedSensors = sensors.filter(s => s.Connected === 1);

  logger.info(`Found ${connectedSensors.length} connected sensors (${sensors.length} total)`);

  if (connectedSensors.length === 0) {
    throw new Error('No sensors currently connected to gateway');
  }

  // Select preferred sensor if specified and connected, otherwise first
  let selected = connectedSensors[0];
  if (preferredSerial) {
    const preferred = connectedSensors.find(s => s.Serial === preferredSerial);
    if (preferred) {
      selected = preferred;
      logger.info(`Selected preferred sensor: ${selected.Serial}`);
    } else {
      logger.warn(`Preferred sensor ${preferredSerial} not connected, using ${selected.Serial}`);
    }
  } else {
    logger.info(`Selected first connected sensor: ${selected.Serial}`);
  }

  logger.info(`Sensor details: ${selected.PartNum}, ${selected.ReadRate}Hz, ${selected.Samples} samples`);

  return selected;
}
```

### State Transition in Connection

```typescript
// Source: Existing ConnectionState enum in src/types/connection.ts
// Location: Modify existing src/gateway/connection.ts

import { ConnectionState } from '../types/connection';

export class WebSocketConnection {
  private state: ConnectionState = ConnectionState.DISCONNECTED;

  // ... existing connection code ...

  async connect(): Promise<void> {
    this.state = ConnectionState.CONNECTING;
    // ... WebSocket connection logic ...
    // On open:
    this.state = ConnectionState.CONNECTED; // Not yet authenticated
  }

  /**
   * Mark connection as authenticated after POST_LOGIN succeeds
   * Should only be called after successful authentication
   */
  markAuthenticated(): void {
    if (this.state !== ConnectionState.CONNECTED) {
      logger.warn(`Cannot authenticate from state: ${this.state}`);
      return;
    }
    this.state = ConnectionState.AUTHENTICATED;
    logger.debug('Connection state transitioned to AUTHENTICATED');
  }

  /**
   * Check if authenticated before allowing sensitive commands
   */
  isAuthenticated(): boolean {
    return this.state === ConnectionState.AUTHENTICATED;
  }
}
```

### Graceful Shutdown on No Sensors

```typescript
// Source: Node.js graceful shutdown best practices
// Location: Integration into src/main.ts

async function main() {
  // ... connection, authentication ...

  try {
    const sensor = await discoverSensor(commandClient, config.SENSOR_SERIAL);
    // Continue with acquisition...
  } catch (error) {
    if (error.message.includes('No sensors currently connected')) {
      // Not an error - just nothing to do
      logger.warn('No sensors available - exiting gracefully');
      await shutdown(); // Unsubscribe, close connection
      process.exit(0); // Success exit - checked state, nothing to do
    } else {
      // Actual error - discovery failed for other reason
      logger.error(`Sensor discovery failed: ${error.message}`);
      await shutdown();
      process.exit(1); // Failure exit
    }
  }
}

async function shutdown() {
  logger.info('Shutting down...');
  // Unsubscribe if subscribed
  // Close connection
  // Clear timeouts
}
```

## Open Questions

Things that couldn't be fully resolved:

1. **Unknown: POST_LOGIN Response Structure**
   - What we know: Gateway API documentation doesn't specify RTN_DYN structure for POST_LOGIN. Only mentions RTN_ERR for failures.
   - What's unclear: Does successful auth return RTN_DYN with Data? Or just connection stays open with no RTN_ response? CTC API doc silent on this.
   - Recommendation: Assume RTN_DYN or RTN_ERR based on CommandClient's existing pattern (wait for correlated response). If testing shows no RTN_ response, may need to transition state immediately after send and wait for next command to verify auth succeeded.
   - Testing approach: Send POST_LOGIN and log all received messages to determine actual response.

2. **Config: Preferred Sensor Selection Strategy**
   - What we know: Config has SENSOR_SERIAL field, spec says "select first connected sensor or specific sensor from config"
   - What's unclear: Should SENSOR_SERIAL be required or optional? If specified but not connected, is that error or warning?
   - Recommendation: Make SENSOR_SERIAL optional (z.coerce.number().optional()). If specified and connected, use it. If specified but not connected, warn and use first available. If not specified, use first available. This matches milestone-0.md flow "select first sensor (or sensor from config if provided)".

3. **Edge Case: All Sensors Disconnected After Discovery**
   - What we know: GET_DYN_CONNECTED returns snapshot of sensor state
   - What's unclear: If all sensors disconnect between discovery and TAKE_DYN_READING, how does gateway respond?
   - Recommendation: Existing RTN_ERR handling covers this - TAKE_DYN_READING will fail with "Sensor not connected" error which CommandClient will reject. No special handling needed.

## Sources

### Primary (HIGH confidence)
- WebSocket authentication patterns - https://websockets.readthedocs.io/en/stable/topics/authentication.html (official websockets library docs, recommends first-message auth for programmatic clients)
- WebSocket authentication best practices - https://oneuptime.com/blog/post/2026-01-24-websocket-authentication/view (2026 current best practices, 10 second auth timeout recommendation)
- Zod Record documentation - https://zod.dev/basics (official Zod docs for z.record() dictionary parsing)
- TypeScript Record utility type - https://www.typescriptlang.org/docs/handbook/utility-types.html (official TS docs)
- Existing project code - src/gateway/command-client.ts, src/types/connection.ts, src/types/messages.ts (established patterns)

### Secondary (MEDIUM confidence)
- TypeScript state machine patterns - https://medium.com/@MichaelVD/composable-state-machines-in-typescript-type-safe-predictable-and-testable-5e16574a6906 (discriminated unions, type safety benefits)
- Node.js graceful shutdown - https://dev.to/superiqbal7/graceful-shutdown-in-nodejs-handling-stranger-danger-29jo (SIGTERM handling, cleanup patterns)
- TypeScript error handling - https://overctrl.com/advanced-error-handling-in-typescript-best-practices-and-common-pitfalls/ (try/catch patterns, custom errors)

### Tertiary (LOW confidence)
- WebSocket security - https://ably.com/blog/websocket-authentication (general security patterns, not specific to this use case)
- TypeScript dictionary patterns - https://carlrippon.com/typescript-dictionary/ (community best practices, not official)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, patterns established in Phases 1-3
- Architecture: HIGH - First-message auth is industry best practice, dictionary parsing well-documented in Zod
- Pitfalls: HIGH - Based on existing CommandClient behavior and documented WebSocket authentication anti-patterns
- POST_LOGIN response structure: LOW - CTC Gateway API documentation doesn't specify success response format

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, authentication patterns rarely change)
