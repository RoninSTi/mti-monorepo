# Phase 2: Connection Management - Research

**Researched:** 2026-02-07
**Domain:** WebSocket connection lifecycle, state machines, reconnection strategies, heartbeat mechanisms
**Confidence:** HIGH

## Summary

Phase 2 establishes reliable WebSocket connection management with proper state machine handling, automatic reconnection with exponential backoff, and connection health monitoring through heartbeats. The standard approach uses the `ws` library (Node.js WebSocket client/server), custom connection state machine (DISCONNECTED → CONNECTING → CONNECTED → AUTHENTICATED), exponential backoff with jitter for reconnection, and application-level heartbeats for connection health detection.

The key technical decisions center on:
1. **ws library** - Industry-standard WebSocket client for Node.js, fast and thoroughly tested
2. **Custom state machine** - Extend WebSocket's built-in readyState (CONNECTING, OPEN, CLOSING, CLOSED) with application states (DISCONNECTED, AUTHENTICATED)
3. **Exponential backoff with jitter** - 1s, 2s, 4s... up to 30s max with randomness to prevent thundering herd
4. **Application-level heartbeats** - More control than protocol ping/pong, recommended 20-30s interval
5. **Graceful shutdown** - Listen for SIGINT/SIGTERM, close connections, clear all timers before exit
6. **Close code categorization** - Differentiate normal closure (1000) from reconnectable errors (1001, 1006)

**Primary recommendation:** Use application-level heartbeats (custom JSON messages) over protocol ping/pong frames for connection health, as they provide better visibility, work in all environments (including browsers), and allow latency measurement. Implement exponential backoff with decorrelated jitter (AWS-recommended) to prevent reconnection storms.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | 8.18+ | WebSocket client/server | Simple, fast, thoroughly tested; most popular Node.js WebSocket library (20M+ downloads/week) |
| @types/ws | 8.18+ | TypeScript definitions for ws | Official type definitions, complete event and method typing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | All functionality built-in | ws library provides complete WebSocket client functionality |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ws | websocket (Faye) | ws is faster, simpler API, better maintained |
| ws | Socket.IO | Socket.IO adds transport fallbacks and rooms but much heavier (not needed for direct gateway connection) |
| Application heartbeat | Protocol ping/pong | Protocol ping/pong unavailable in browsers, less control, application heartbeat provides latency measurement |

**Installation:**
```bash
npm install ws
npm install -D @types/ws
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── connection.ts    # ConnectionState enum, connection-related types
├── gateway/
│   ├── connection.ts    # WebSocketConnection class (state machine, lifecycle)
│   ├── heartbeat.ts     # Heartbeat manager
│   └── reconnect.ts     # Exponential backoff logic
├── utils/
│   └── logger.ts        # Logger utility (from Phase 1)
├── config.ts            # Configuration (from Phase 1)
└── main.ts              # Application entry point
```

### Pattern 1: WebSocket Connection State Machine
**What:** Custom state machine extending WebSocket's built-in readyState with application-level states
**When to use:** Managing connection lifecycle with authentication and reconnection logic
**Example:**
```typescript
// src/types/connection.ts
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  AUTHENTICATED = 'AUTHENTICATED',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

// src/gateway/connection.ts
import WebSocket from 'ws';
import { ConnectionState } from '../types/connection';
import { logger } from '../utils/logger';

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    logger.info(`Connection state: ${oldState} → ${newState}`);
  }

  public connect(): void {
    if (this.state !== ConnectionState.DISCONNECTED &&
        this.state !== ConnectionState.CLOSED) {
      logger.warn('Connection attempt ignored - already connecting or connected');
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('close', (code, reason) => this.handleClose(code, reason));
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('message', (data) => this.handleMessage(data));
  }

  private handleOpen(): void {
    logger.info('WebSocket connection opened');
    this.setState(ConnectionState.CONNECTED);
  }

  private handleClose(code: number, reason: Buffer): void {
    const reasonStr = reason.toString();
    logger.info(`WebSocket closed: code=${code}, reason="${reasonStr}"`);
    this.setState(ConnectionState.CLOSED);

    // Determine if reconnection should happen based on close code
    if (this.shouldReconnect(code)) {
      // Trigger reconnection logic (handled by reconnect module)
    }
  }

  private handleError(error: Error): void {
    logger.error('WebSocket error:', error);
    // Error event is always followed by close event
  }

  private handleMessage(data: WebSocket.RawData): void {
    const message = data.toString();
    logger.debug('Received message:', message);
    // Message handling logic
  }

  private shouldReconnect(closeCode: number): boolean {
    // 1000 = normal closure (don't reconnect)
    // 1001 = going away (reconnect with delay)
    // 1006 = abnormal closure (reconnect immediately)
    return closeCode !== 1000;
  }

  public close(code: number = 1000, reason: string = 'Normal closure'): void {
    if (!this.ws) return;

    this.setState(ConnectionState.CLOSING);
    this.ws.close(code, reason);
  }

  public terminate(): void {
    if (!this.ws) return;

    logger.warn('Terminating WebSocket connection (immediate)');
    this.ws.terminate();
    this.setState(ConnectionState.CLOSED);
  }
}
```

### Pattern 2: Exponential Backoff with Jitter
**What:** Reconnection delay algorithm that doubles delay after each failure, with randomness to prevent synchronized reconnections
**When to use:** All automatic reconnection scenarios
**Example:**
```typescript
// src/gateway/reconnect.ts
// Source: AWS Architecture Blog - Exponential Backoff and Jitter
// https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

export interface ReconnectConfig {
  initialDelay: number;   // Starting delay (e.g., 1000ms)
  maxDelay: number;       // Maximum delay cap (e.g., 30000ms)
  multiplier: number;     // Delay multiplier (typically 2)
  maxAttempts?: number;   // Optional limit on attempts
}

export class ExponentialBackoff {
  private config: ReconnectConfig;
  private attempts: number = 0;

  constructor(config: ReconnectConfig) {
    this.config = config;
  }

  public getDelay(): number {
    const { initialDelay, maxDelay, multiplier } = this.config;

    // Calculate exponential delay: initial * (multiplier ^ attempts)
    const exponentialDelay = initialDelay * Math.pow(multiplier, this.attempts);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Add decorrelated jitter (AWS recommended)
    // Jitter range: [initialDelay, cappedDelay * 3]
    const jitter = Math.random() * (cappedDelay * 3 - initialDelay) + initialDelay;
    const delayWithJitter = Math.min(jitter, maxDelay);

    this.attempts++;
    return Math.floor(delayWithJitter);
  }

  public reset(): void {
    this.attempts = 0;
  }

  public getAttempts(): number {
    return this.attempts;
  }

  public hasExceededMaxAttempts(): boolean {
    if (!this.config.maxAttempts) return false;
    return this.attempts >= this.config.maxAttempts;
  }
}

// Usage example
export class ReconnectionManager {
  private backoff: ExponentialBackoff;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.backoff = new ExponentialBackoff({
      initialDelay: 1000,   // 1 second
      maxDelay: 30000,      // 30 seconds
      multiplier: 2,        // Double each time
    });
  }

  public scheduleReconnect(callback: () => void): void {
    const delay = this.backoff.getDelay();
    logger.info(`Scheduling reconnect attempt ${this.backoff.getAttempts()} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      callback();
    }, delay);
  }

  public cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public resetBackoff(): void {
    this.backoff.reset();
  }

  public cleanup(): void {
    this.cancelReconnect();
    this.backoff.reset();
  }
}
```

### Pattern 3: Application-Level Heartbeat
**What:** Custom JSON messages sent at intervals to detect connection health, with timeout to detect dead connections
**When to use:** Connection health monitoring (preferred over protocol ping/pong for application control)
**Example:**
```typescript
// src/gateway/heartbeat.ts
import { logger } from '../utils/logger';

export interface HeartbeatConfig {
  interval: number;        // How often to send heartbeat (e.g., 30000ms)
  timeout: number;         // How long to wait for response (e.g., 5000ms)
  onTimeout: () => void;   // Callback when connection considered dead
}

export class HeartbeatManager {
  private config: HeartbeatConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatSent: number = 0;
  private lastHeartbeatReceived: number = 0;

  constructor(config: HeartbeatConfig) {
    this.config = config;
  }

  public start(sendFn: (message: string) => void): void {
    logger.info(`Starting heartbeat (interval: ${this.config.interval}ms, timeout: ${this.config.timeout}ms)`);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(sendFn);
    }, this.config.interval);
  }

  private sendHeartbeat(sendFn: (message: string) => void): void {
    this.lastHeartbeatSent = Date.now();

    const heartbeat = JSON.stringify({
      type: 'ping',
      timestamp: this.lastHeartbeatSent,
    });

    logger.debug('Sending heartbeat');
    sendFn(heartbeat);

    // Start timeout timer
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeout);
  }

  public onHeartbeatResponse(timestamp: number): void {
    this.lastHeartbeatReceived = Date.now();

    // Clear timeout timer - connection is alive
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    // Calculate round-trip latency
    const latency = this.lastHeartbeatReceived - timestamp;
    logger.debug(`Heartbeat response received (latency: ${latency}ms)`);
  }

  private handleTimeout(): void {
    const elapsed = Date.now() - this.lastHeartbeatSent;
    logger.error(`Heartbeat timeout after ${elapsed}ms - connection considered dead`);

    this.stop();
    this.config.onTimeout();
  }

  public stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    logger.info('Heartbeat stopped');
  }

  public getLastLatency(): number | null {
    if (!this.lastHeartbeatReceived || !this.lastHeartbeatSent) {
      return null;
    }
    return this.lastHeartbeatReceived - this.lastHeartbeatSent;
  }
}
```

### Pattern 4: Graceful Shutdown
**What:** Handle process signals (SIGINT, SIGTERM), close connections cleanly, clear timers, and exit gracefully
**When to use:** All Node.js applications with long-lived connections
**Example:**
```typescript
// src/main.ts
import { logger } from './utils/logger';
import { WebSocketConnection } from './gateway/connection';
import { HeartbeatManager } from './gateway/heartbeat';
import { ReconnectionManager } from './gateway/reconnect';

class Application {
  private connection: WebSocketConnection;
  private heartbeat: HeartbeatManager;
  private reconnect: ReconnectionManager;
  private isShuttingDown: boolean = false;

  constructor() {
    this.connection = new WebSocketConnection('ws://192.168.1.1:5000');
    this.heartbeat = new HeartbeatManager({
      interval: 30000,
      timeout: 5000,
      onTimeout: () => this.handleConnectionDead(),
    });
    this.reconnect = new ReconnectionManager();

    // Register shutdown handlers
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
  }

  private handleConnectionDead(): void {
    logger.warn('Connection dead - initiating reconnection');
    this.connection.terminate();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.reconnect.scheduleReconnect(() => {
      this.connection.connect();
    });
  }

  public async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal} - starting graceful shutdown`);

    try {
      // 1. Stop heartbeat
      this.heartbeat.stop();

      // 2. Cancel any pending reconnection
      this.reconnect.cleanup();

      // 3. Close WebSocket connection gracefully
      this.connection.close(1000, 'Application shutdown');

      // 4. Wait briefly for close to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public start(): void {
    logger.info('Application starting');
    this.connection.connect();
  }
}

// Start application
const app = new Application();
app.start();
```

### Anti-Patterns to Avoid
- **Not clearing timers on disconnect:** Always call `clearInterval()` and `clearTimeout()` or memory leaks occur
- **Checking ws.readyState before every send:** Store application state separately; readyState can be stale
- **Sending before connection is open:** Check state before send, queue messages if needed, or they'll be silently dropped
- **Using protocol ping/pong exclusively:** Browser clients can't send ping frames; use application heartbeats for portability
- **Reconnecting without backoff:** Creates thundering herd when server restarts, use exponential backoff with jitter
- **Forgetting to remove event listeners:** Event listeners prevent garbage collection, causing memory leaks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket client | Raw TCP sockets + WS protocol | `ws` library | Handles frame parsing, masking, control frames, edge cases; battle-tested |
| Backoff algorithm | Simple delay doubling | Exponential backoff with jitter | Prevents thundering herd, AWS-proven at scale, handles edge cases |
| Heartbeat timing | Custom ping intervals | Established heartbeat patterns | Edge cases: connection stalls, clock skew, timeout management |

**Key insight:** WebSocket connection management has many subtle failure modes (network partitions, half-open connections, proxy timeouts, backpressure). The `ws` library handles protocol-level complexity. Application-level patterns (state machine, backoff, heartbeat) are straightforward but must be implemented carefully to avoid memory leaks and reconnection storms.

## Common Pitfalls

### Pitfall 1: Memory Leaks from Un-cleared Timers
**What goes wrong:** `setInterval` for heartbeat or `setTimeout` for reconnection continues running after connection closes, accumulating timers and keeping references alive.
**Why it happens:** Forgetting to call `clearInterval()` or `clearTimeout()` when connection closes or component unmounts.
**How to avoid:** Store timer IDs, clear them in close/error handlers and cleanup methods. Create dedicated cleanup function.
**Warning signs:** Memory usage grows over time, multiple reconnection attempts happen simultaneously.

**Example:**
```typescript
// WRONG - timer never cleared
class BadConnection {
  private heartbeatTimer: NodeJS.Timeout;

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  disconnect() {
    this.ws.close();
    // Timer still running! Memory leak
  }
}

// RIGHT - timer cleared on disconnect
class GoodConnection {
  private heartbeatTimer: NodeJS.Timeout | null = null;

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.ws.close();
  }
}
```

### Pitfall 2: Thundering Herd on Reconnection
**What goes wrong:** Multiple clients disconnect simultaneously (server restart) and all reconnect at the same time, overwhelming the server.
**Why it happens:** Fixed retry delay without randomness causes synchronized reconnection attempts.
**How to avoid:** Add jitter (randomness) to backoff delay. Use decorrelated jitter (AWS recommended).
**Warning signs:** Server struggles after restart, connection spikes in monitoring.

**Example:**
```typescript
// WRONG - fixed delay, no jitter
function getReconnectDelay(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 30000);
  // All clients with same attempts wait identical time!
}

// RIGHT - exponential backoff with jitter
function getReconnectDelay(attempts: number): number {
  const exponential = 1000 * Math.pow(2, attempts);
  const capped = Math.min(exponential, 30000);
  // Add jitter: random between initial and capped*3
  const jitter = Math.random() * (capped * 3 - 1000) + 1000;
  return Math.min(jitter, 30000);
}
```

### Pitfall 3: Sending Before Connection is Open
**What goes wrong:** Calling `ws.send()` when readyState is CONNECTING throws error or silently fails.
**Why it happens:** Assuming connection is ready immediately after `new WebSocket()` call.
**How to avoid:** Check state before sending, or queue messages and flush after 'open' event.
**Warning signs:** "WebSocket is not open: readyState 0 (CONNECTING)" errors.

**Example:**
```typescript
// WRONG - send immediately after construction
const ws = new WebSocket(url);
ws.send('Hello'); // Error! Connection not open yet

// RIGHT - wait for open event
const ws = new WebSocket(url);
ws.on('open', () => {
  ws.send('Hello'); // Safe - connection is open
});

// BETTER - check state before sending
class SafeConnection {
  send(message: string): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send - connection not open');
      return false;
    }
    this.ws.send(message);
    return true;
  }
}
```

### Pitfall 4: Confusing Protocol Ping/Pong with Application Heartbeat
**What goes wrong:** Relying on `ws.ping()` but heartbeat doesn't work in browser environments or through certain proxies.
**Why it happens:** Protocol ping/pong frames (opcodes 0x9/0xA) not accessible in browser WebSocket API, some proxies don't forward them.
**How to avoid:** Use application-level heartbeats (JSON messages with type: "ping"/"pong") for portability and control.
**Warning signs:** Heartbeat works in Node.js but fails in browser, inconsistent behavior across environments.

**Example:**
```typescript
// LIMITED - protocol ping/pong (Node.js only)
ws.ping();
ws.on('pong', () => {
  logger.debug('Pong received');
});
// Works in Node.js ws library, unavailable in browser

// PORTABLE - application-level heartbeat
ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'pong') {
    logger.debug('Pong received');
  }
});
// Works everywhere, provides more control
```

### Pitfall 5: Not Differentiating Close Codes
**What goes wrong:** Reconnecting on normal closure (code 1000) or not reconnecting on abnormal closure (code 1006).
**Why it happens:** Treating all close events identically without inspecting close code.
**How to avoid:** Check close code in close event handler, implement reconnection logic based on code category.
**Warning signs:** Unnecessary reconnection attempts, failure to reconnect when should.

**Close code categories:**
- **1000 (Normal Closure):** Don't reconnect - intentional disconnect
- **1001 (Going Away):** Reconnect after delay - server restart or page navigation
- **1006 (Abnormal Closure):** Reconnect immediately - network failure or connection dropped
- **1008 (Policy Violation):** Don't reconnect - application-level rejection

**Example:**
```typescript
// WRONG - always reconnect
ws.on('close', (code) => {
  this.reconnect();
});

// RIGHT - check close code
ws.on('close', (code, reason) => {
  logger.info(`Connection closed: ${code} - ${reason}`);

  switch (code) {
    case 1000: // Normal closure
      logger.info('Normal closure - not reconnecting');
      break;
    case 1001: // Going away
      logger.info('Server going away - reconnecting with delay');
      this.scheduleReconnect();
      break;
    case 1006: // Abnormal closure
      logger.warn('Abnormal closure - reconnecting immediately');
      this.reconnect();
      break;
    case 1008: // Policy violation
      logger.error('Policy violation - not reconnecting');
      break;
    default:
      logger.warn(`Unknown close code ${code} - reconnecting with backoff`);
      this.scheduleReconnect();
  }
});
```

### Pitfall 6: Race Conditions Between Heartbeat and Reconnect
**What goes wrong:** Heartbeat timeout triggers reconnection while reconnection is already in progress, creating multiple concurrent connection attempts.
**Why it happens:** Not coordinating between heartbeat timeout handler and reconnection logic.
**How to avoid:** Use state machine to prevent concurrent connection attempts, check state before reconnecting.
**Warning signs:** Multiple WebSocket instances created, "already connecting" warnings, duplicate message handling.

**Example:**
```typescript
// WRONG - no state coordination
heartbeat.onTimeout(() => {
  connection.reconnect(); // May create duplicate connection
});

// RIGHT - check state first
heartbeat.onTimeout(() => {
  if (connection.getState() === ConnectionState.CONNECTED) {
    logger.warn('Heartbeat timeout - terminating and reconnecting');
    connection.terminate();
    // State machine prevents duplicate connection
    connection.connect();
  }
});
```

## Code Examples

Verified patterns from official sources:

### Complete WebSocket Connection with ws Library
```typescript
// Source: ws npm package documentation + TypeScript patterns
import WebSocket from 'ws';
import { logger } from '../utils/logger';

const ws = new WebSocket('ws://192.168.1.1:5000');

// Event: connection opened
ws.on('open', () => {
  logger.info('Connection established');
  ws.send('Hello Server');
});

// Event: message received
ws.on('message', (data: WebSocket.RawData) => {
  const message = data.toString();
  logger.info('Received:', message);
});

// Event: connection closed
ws.on('close', (code: number, reason: Buffer) => {
  logger.info(`Connection closed: ${code} - ${reason.toString()}`);
});

// Event: error occurred
ws.on('error', (error: Error) => {
  logger.error('WebSocket error:', error);
});

// Graceful close
ws.close(1000, 'Normal closure');

// Immediate termination (emergency)
ws.terminate();
```

### WebSocket readyState Constants
```typescript
// Source: MDN WebSocket API documentation
// Standard WebSocket readyState values
const WEBSOCKET_STATES = {
  CONNECTING: 0,  // Socket created, connection not yet open
  OPEN: 1,        // Connection open and ready to communicate
  CLOSING: 2,     // Connection in process of closing
  CLOSED: 3,      // Connection closed or couldn't be opened
};

// Check state before operations
if (ws.readyState === WebSocket.OPEN) {
  ws.send('Message');
}
```

### Protocol Ping/Pong (Node.js Only)
```typescript
// Source: ws library documentation
// Note: This is Node.js specific, not available in browsers
ws.ping(); // Send ping frame

ws.on('pong', () => {
  logger.debug('Pong received - connection alive');
});

// Server automatically responds to ping with pong (autoPong: true by default)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed retry delays | Exponential backoff with jitter | 2015 (AWS blog post) | Prevents thundering herd, proven at massive scale |
| Protocol ping/pong only | Application-level heartbeats | Ongoing trend | Better control, browser compatibility, latency measurement |
| Manual frame parsing | ws library | 2011 (library created) | Eliminates protocol-level bugs, handles edge cases |
| Synchronous error handling | Async event-driven | Node.js paradigm | Proper handling of network delays and concurrent events |

**Deprecated/outdated:**
- **websocket (Faye)**: Still works but ws is faster and better maintained
- **Socket.IO for simple connections**: Overkill when direct WebSocket connection works
- **Checking readyState on every send**: Better to maintain application state separately

**Current best practices (2026):**
- Application-level heartbeats preferred over protocol ping/pong for control and portability
- Decorrelated jitter (AWS recommendation) for exponential backoff
- Separate application state machine from WebSocket readyState
- Graceful shutdown with signal handlers (SIGINT, SIGTERM)

## Open Questions

Things that couldn't be fully resolved:

1. **Heartbeat vs Ping/Pong for Gateway**
   - What we know: Application heartbeats provide more control and work everywhere
   - What's unclear: Whether CTC Connect gateway expects specific heartbeat format or responds to protocol ping
   - Recommendation: Start with application-level heartbeats (JSON messages), test against real gateway, fall back to protocol ping if gateway prefers it

2. **Authentication State Transition**
   - What we know: Requirements specify AUTHENTICATED as a state after CONNECTED
   - What's unclear: Authentication happens in Phase 3, but state machine designed here
   - Recommendation: Define AUTHENTICATED state in enum now, implement transition logic in Phase 3

3. **Reconnection Attempt Limits**
   - What we know: Exponential backoff should have max delay (30s specified)
   - What's unclear: Whether to limit total number of reconnection attempts or retry indefinitely
   - Recommendation: Start with unlimited retries (connection crucial for application), add max attempts if needed after testing

4. **Message Queuing During Disconnection**
   - What we know: Messages sent when disconnected are lost
   - What's unclear: Whether to queue messages during reconnection or fail fast
   - Recommendation: Phase 2 focuses on connection only - defer message queuing to Phase 3 if needed

## Sources

### Primary (HIGH confidence)
- [ws npm package](https://www.npmjs.com/package/ws) - Official package page, version 8.18+, API documentation
- [ws GitHub repository](https://github.com/websockets/ws) - Source code, examples, issues
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState) - WebSocket readyState constants and values
- [MDN WebSocket Close Codes](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code) - Official close code definitions
- [WebSocket.org Close Codes Reference](https://websocket.org/reference/close-codes/) - Complete close code meanings
- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) - Authoritative backoff algorithm guidance

### Secondary (MEDIUM confidence)
- [OneUpTime: WebSocket Heartbeat Implementation](https://oneuptime.com/blog/post/2026-01-27-websocket-heartbeat/view) - 2026 guide with code examples
- [OneUpTime: WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) - Recent reconnection patterns
- [DEV Community: WebSocket Reconnection with Exponential Backoff](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1) - Implementation patterns
- [Ably: WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices) - Scaling and architecture guidance
- [VideoSDK: WebSocket Ping Pong Frame](https://www.videosdk.live/developer-hub/websocket/ping-pong-frame-websocket) - Ping/pong vs heartbeat comparison
- [DEV Community: Node.js Graceful Shutdown](https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6) - Signal handling patterns
- [WebSocket State Machines (End Point Dev)](https://www.endpointdev.com/blog/2024/07/websocket-controlled-state-machine/) - State machine patterns
- [TypeScript FSM patterns](https://github.com/eonarheim/TypeState) - TypeScript state machine implementation

### Tertiary (LOW confidence)
- WebSearch results for WebSocket common mistakes 2026 - Aggregated pitfalls from multiple sources
- Community discussions on memory leaks - Anecdotal evidence, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ws library verified through npm (20M+ weekly downloads), official documentation
- Architecture: HIGH - Patterns verified through AWS, MDN, official ws docs, recent 2026 sources
- Pitfalls: HIGH - Common mistakes documented across multiple authoritative sources, verified with official docs
- Code examples: HIGH - All examples based on official ws documentation and established patterns
- Reconnection algorithms: HIGH - AWS blog post is authoritative source, widely cited, proven at scale
- Heartbeat patterns: MEDIUM - Community best practices, not official standard, but widely adopted

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - WebSocket patterns are stable, ws library has infrequent breaking changes)

**Notes:**
- No CONTEXT.md exists for this phase (no prior `/gsd:discuss-phase` session), providing full discretion on implementation approach
- Research focused on Node.js-specific patterns using ws library, though many patterns are portable
- All code examples are TypeScript-compatible with strict mode enabled
- Focus on robustness and reliability over advanced features (matches "balanced quality" project constraint)
