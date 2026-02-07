# Architecture Research

**Domain:** TypeScript WebSocket Client for Gateway Communication
**Researched:** 2026-02-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

Production TypeScript WebSocket clients follow a layered architecture that separates concerns between connection lifecycle, message routing, and business logic:

```
┌──────────────────────────────────────────────────────────────────┐
│                      Application Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Command      │  │ Notification │  │ Auth         │            │
│  │ Client       │  │ Handler      │  │ Manager      │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                 │                     │
├─────────┴─────────────────┴─────────────────┴─────────────────────┤
│                      Message Routing Layer                         │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Message Router / Dispatcher                    │   │
│  │  - Routes messages by type (COMMAND/NOTIFY/ERROR)          │   │
│  │  - Matches responses to pending requests                    │   │
│  │  - Invokes registered handlers                              │   │
│  └────────────────────────┬───────────────────────────────────┘   │
│                           │                                        │
├───────────────────────────┴────────────────────────────────────────┤
│                    Connection Management Layer                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │             WebSocket Connection Manager                    │   │
│  │  - Lifecycle: connect/disconnect/error                      │   │
│  │  - State machine: CONNECTING→OPEN→CLOSING→CLOSED           │   │
│  │  - Reconnection with exponential backoff                    │   │
│  │  - Heartbeat/keep-alive (ping/pong)                         │   │
│  │  - Send/receive primitives                                  │   │
│  └────────────────────────┬───────────────────────────────────┘   │
│                           │                                        │
├───────────────────────────┴────────────────────────────────────────┤
│                    Infrastructure Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Config   │  │ Logger   │  │ Parser   │  │ Types    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Connection Manager** | WebSocket lifecycle, state machine, reconnection, heartbeat | Class wrapping native WebSocket with state tracking |
| **Message Router** | Parse incoming messages, route by type, match request/response | Event emitter or callback registry with message type discrimination |
| **Command Client** | Send commands, await responses, handle errors | Request-response pattern with Promise-based API |
| **Notification Handler** | Subscribe to event streams, handle async notifications | Pub/sub pattern with topic-based subscriptions |
| **Auth Manager** | Authentication flow after connection (e.g., POST_LOGIN) | Separate module handling auth handshake |
| **Config** | Connection parameters (URL, timeouts, reconnect policy) | Configuration object or class |
| **Logger** | Structured logging of connection events, messages, errors | Logger facade or simple console wrapper |
| **Types** | TypeScript interfaces for messages, commands, responses | Shared type definitions |

## Recommended Project Structure

```
src/
├── types/                  # TypeScript interfaces and enums
│   ├── messages.ts         # Message formats (Command, Response, Notify, Error)
│   ├── config.ts           # Configuration interfaces
│   └── events.ts           # Event types for callbacks
│
├── connection/             # Connection management layer
│   ├── ConnectionManager.ts    # WebSocket lifecycle, state machine
│   ├── ReconnectStrategy.ts    # Exponential backoff logic
│   └── HeartbeatManager.ts     # Keep-alive ping/pong
│
├── routing/                # Message routing layer
│   ├── MessageRouter.ts        # Routes messages by type
│   ├── RequestRegistry.ts      # Tracks pending request/response pairs
│   └── NotificationBus.ts      # Pub/sub for async notifications
│
├── client/                 # Application layer - user-facing APIs
│   ├── GatewayClient.ts        # Main client facade
│   ├── CommandClient.ts        # Send commands, await responses
│   ├── NotificationClient.ts   # Subscribe to notifications
│   └── AuthClient.ts           # Handle authentication flow
│
├── utils/                  # Infrastructure
│   ├── logger.ts               # Structured logging
│   ├── parser.ts               # JSON parsing with error handling
│   └── errors.ts               # Custom error types
│
├── config.ts               # Configuration management
└── index.ts                # Public API exports
```

### Structure Rationale

- **types/** — Centralized type definitions shared across all layers. Separating types enables type-safe communication contracts and makes it easy to generate documentation or validate messages.

- **connection/** — Isolates all WebSocket-specific concerns (native API, state, reconnection). This layer has no knowledge of message formats or business logic, making it reusable and testable.

- **routing/** — Decouples message interpretation from connection management. The router maps incoming messages to handlers without knowing connection details, enabling independent evolution of both layers.

- **client/** — Application-specific APIs that compose lower layers. The `GatewayClient` facade provides a clean public interface while `CommandClient` and `NotificationClient` implement specific patterns (request-response vs pub/sub).

- **utils/** — Cross-cutting concerns used by multiple layers. Logger and parser are stateless utilities that don't depend on other modules.

This structure follows the **Dependency Inversion Principle**: high-level modules (client/) depend on abstractions (types/), not low-level details (connection/). It enables testing each layer in isolation and supports future multi-gateway scenarios by making `GatewayClient` instantiable per gateway.

## Architectural Patterns

### Pattern 1: Connection State Machine

**What:** Model WebSocket lifecycle as explicit states with defined transitions.

**When to use:** Essential for managing reconnection logic, preventing race conditions, and ensuring operations only occur in valid states.

**Trade-offs:**
- **Pros:** Makes state transitions explicit, prevents invalid operations (e.g., sending while CLOSED), simplifies debugging
- **Cons:** Adds boilerplate for state tracking and transition validation

**Example:**
```typescript
enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',  // Initial or after close
  CONNECTING = 'CONNECTING',       // Connection attempt in progress
  CONNECTED = 'CONNECTED',         // Connection established
  AUTHENTICATED = 'AUTHENTICATED', // Post-login handshake complete
  RECONNECTING = 'RECONNECTING',   // Reconnection attempt after failure
  CLOSING = 'CLOSING',             // Close initiated, waiting for confirmation
  CLOSED = 'CLOSED'                // Connection closed cleanly
}

class ConnectionManager {
  private state: ConnectionState = ConnectionState.DISCONNECTED;

  async connect(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      throw new Error(`Cannot connect from state ${this.state}`);
    }
    this.transitionTo(ConnectionState.CONNECTING);
    // ... connection logic
  }

  private transitionTo(newState: ConnectionState): void {
    const allowedTransitions: Record<ConnectionState, ConnectionState[]> = {
      [ConnectionState.DISCONNECTED]: [ConnectionState.CONNECTING],
      [ConnectionState.CONNECTING]: [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED],
      [ConnectionState.CONNECTED]: [ConnectionState.AUTHENTICATED, ConnectionState.RECONNECTING, ConnectionState.CLOSING],
      // ... define all valid transitions
    };

    if (!allowedTransitions[this.state]?.includes(newState)) {
      throw new Error(`Invalid transition: ${this.state} -> ${newState}`);
    }

    this.logger.debug(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }
}
```

### Pattern 2: Request-Response with Callback Registry

**What:** Implement request-response pattern over WebSocket by tracking pending requests with unique IDs and matching responses.

**When to use:** When you need command-response semantics (like HTTP) over WebSocket's bidirectional stream.

**Trade-offs:**
- **Pros:** Provides Promise-based API familiar to developers, automatic timeout handling, type-safe responses
- **Cons:** Requires message ID generation, memory overhead for pending request tracking, complexity for handling orphaned requests

**Example:**
```typescript
interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
}

class RequestRegistry {
  private pending = new Map<string, PendingRequest<any>>();

  register<T>(messageId: string, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Request ${messageId} timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(messageId, { resolve, reject, timeout: timer, timestamp: Date.now() });
    });
  }

  resolve<T>(messageId: string, response: T): void {
    const request = this.pending.get(messageId);
    if (request) {
      clearTimeout(request.timeout);
      this.pending.delete(messageId);
      request.resolve(response);
    }
  }

  rejectAll(error: Error): void {
    for (const [id, request] of this.pending.entries()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}

class CommandClient {
  private requestRegistry = new RequestRegistry();

  async sendCommand<T>(command: string, data: any): Promise<T> {
    const messageId = crypto.randomUUID();
    const promise = this.requestRegistry.register<T>(messageId, 5000);

    this.connection.send(JSON.stringify({
      id: messageId,
      command,
      data
    }));

    return promise;
  }

  handleResponse(message: any): void {
    if (message.type === 'RESPONSE') {
      this.requestRegistry.resolve(message.id, message.data);
    } else if (message.type === 'ERROR') {
      this.requestRegistry.reject(message.id, new Error(message.error));
    }
  }
}
```

### Pattern 3: Pub/Sub for Notifications

**What:** Separate notification stream from command-response using topic-based subscriptions.

**When to use:** When server sends unsolicited events (e.g., real-time updates) that multiple parts of the application need to react to.

**Trade-offs:**
- **Pros:** Decouples notification producers from consumers, supports multiple subscribers per topic, clean separation from request-response
- **Cons:** Requires subscription management, memory overhead for subscriber lists, potential for memory leaks if subscriptions not cleaned up

**Example:**
```typescript
type NotificationHandler<T> = (data: T) => void;

class NotificationBus {
  private subscribers = new Map<string, Set<NotificationHandler<any>>>();

  subscribe<T>(topic: string, handler: NotificationHandler<T>): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  publish<T>(topic: string, data: T): void {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in notification handler for ${topic}:`, error);
        }
      });
    }
  }
}

class NotificationClient {
  constructor(private bus: NotificationBus) {}

  async subscribeToChanges(handler: (change: Change) => void): Promise<() => void> {
    // Send server subscription command
    await this.commandClient.sendCommand('POST_SUB_CHANGES', {});

    // Register local handler
    return this.bus.subscribe<Change>('NOTIFY_CHANGE', handler);
  }
}
```

### Pattern 4: Exponential Backoff Reconnection

**What:** Automatically reconnect with increasing delays between attempts to avoid overwhelming the server.

**When to use:** Always implement for production clients to handle transient network failures gracefully.

**Trade-offs:**
- **Pros:** Resilient to temporary failures, prevents server overload during outages, user-friendly (automatic recovery)
- **Cons:** May mask underlying connectivity issues, complexity in determining when to stop retrying

**Example:**
```typescript
interface ReconnectConfig {
  initialDelay: number;      // Start with 1000ms
  maxDelay: number;          // Cap at 30000ms
  multiplier: number;        // 1.5x or 2x increase per attempt
  maxAttempts: number;       // Stop after N attempts (0 = infinite)
  jitter: boolean;           // Add randomness to prevent thundering herd
}

class ReconnectStrategy {
  private attempts = 0;

  constructor(private config: ReconnectConfig) {}

  getNextDelay(): number {
    const baseDelay = Math.min(
      this.config.initialDelay * Math.pow(this.config.multiplier, this.attempts),
      this.config.maxDelay
    );

    if (this.config.jitter) {
      // Add ±20% randomness
      const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
      return Math.max(0, baseDelay + jitter);
    }

    return baseDelay;
  }

  shouldRetry(): boolean {
    return this.config.maxAttempts === 0 || this.attempts < this.config.maxAttempts;
  }

  recordAttempt(): void {
    this.attempts++;
  }

  reset(): void {
    this.attempts = 0;
  }
}
```

### Pattern 5: Message Type Discrimination

**What:** Use TypeScript discriminated unions to handle different message types type-safely.

**When to use:** Always use for message parsing to catch type errors at compile time and enable exhaustive checking.

**Trade-offs:**
- **Pros:** Type safety, exhaustive checking, self-documenting code, autocomplete support
- **Cons:** Requires upfront type definition, more verbose than untyped parsing

**Example:**
```typescript
// Discriminated union for all message types
type GatewayMessage =
  | { type: 'RESPONSE'; id: string; data: any; }
  | { type: 'ERROR'; id: string; error: string; code: string; }
  | { type: 'NOTIFY'; topic: string; data: any; }
  | { type: 'ACK'; }
  | { type: 'PONG'; };

class MessageRouter {
  route(raw: string): void {
    const message: GatewayMessage = JSON.parse(raw);

    // TypeScript knows the shape of each branch
    switch (message.type) {
      case 'RESPONSE':
        this.requestRegistry.resolve(message.id, message.data);
        break;

      case 'ERROR':
        this.requestRegistry.reject(message.id, new Error(message.error));
        break;

      case 'NOTIFY':
        this.notificationBus.publish(message.topic, message.data);
        break;

      case 'ACK':
        this.logger.debug('Received ACK');
        break;

      case 'PONG':
        this.heartbeat.recordPong();
        break;

      default:
        // Exhaustiveness check - TypeScript error if we miss a case
        const _exhaustive: never = message;
        this.logger.warn('Unknown message type:', _exhaustive);
    }
  }
}
```

### Pattern 6: Facade for Multi-Gateway Support

**What:** Provide a clean, instantiable client facade that encapsulates all gateway operations, making multi-gateway support as simple as creating multiple instances.

**When to use:** When the system may need to connect to multiple WebSocket endpoints simultaneously.

**Trade-offs:**
- **Pros:** Scalable to N gateways, clean separation of concerns, testable in isolation
- **Cons:** Slightly more complex than singleton pattern for single-gateway scenarios

**Example:**
```typescript
interface GatewayConfig {
  url: string;
  reconnect: ReconnectConfig;
  heartbeat: { interval: number; timeout: number; };
  requestTimeout: number;
}

class GatewayClient {
  private connection: ConnectionManager;
  private router: MessageRouter;
  private commandClient: CommandClient;
  private notificationClient: NotificationClient;

  constructor(config: GatewayConfig) {
    this.connection = new ConnectionManager(config.url, config.reconnect);
    this.router = new MessageRouter(
      new RequestRegistry(config.requestTimeout),
      new NotificationBus()
    );
    this.commandClient = new CommandClient(this.connection, this.router);
    this.notificationClient = new NotificationClient(this.commandClient, this.router.bus);

    // Wire up message flow: connection -> router -> clients
    this.connection.onMessage(raw => this.router.route(raw));
  }

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  async authenticate(credentials: Credentials): Promise<void> {
    const response = await this.commandClient.sendCommand('POST_LOGIN', credentials);
    // Handle auth response
  }

  // Expose command/notification APIs
  get commands() { return this.commandClient; }
  get notifications() { return this.notificationClient; }
}

// Multi-gateway usage
const primaryGateway = new GatewayClient({ url: 'wss://primary.example.com', ... });
const backupGateway = new GatewayClient({ url: 'wss://backup.example.com', ... });

await primaryGateway.connect();
await backupGateway.connect();
```

## Data Flow

### Request-Response Flow

```
[User Code]
    │
    ├── commandClient.sendCommand('POST_FOO', data)
    │       │
    │       ├── Generate messageId
    │       ├── Register promise in RequestRegistry
    │       └── connection.send({ id, command, data })
    │              │
    │              └── [Network] ──────────────────> [Gateway]
    │                                                     │
    │                                                     ├── Process command
    │                                                     └── [Network] <─────┐
    │                                                                          │
    ├── connection.onMessage(raw)                                             │
    │       │                                                                  │
    │       └── router.route(raw)                                             │
    │              │                                                           │
    │              ├── Parse message: { type: 'RESPONSE', id, data }         │
    │              └── requestRegistry.resolve(id, data)                      │
    │                     │                                                    │
    │                     └── Promise resolves                                │
    │                            │                                            │
    └── [User Code receives response] <──────────────────────────────────────┘
```

### Notification Flow

```
[Gateway sends unsolicited event]
    │
    └── [Network] ──────────────────> connection.onMessage(raw)
                                              │
                                              └── router.route(raw)
                                                     │
                                                     ├── Parse: { type: 'NOTIFY', topic: 'CHANGES', data }
                                                     └── notificationBus.publish('CHANGES', data)
                                                            │
                                                            ├─> [Handler 1](data)  // Component A
                                                            ├─> [Handler 2](data)  // Component B
                                                            └─> [Handler 3](data)  // Component C
```

### Lifecycle Flow

```
[DISCONNECTED]
    │
    ├── connect()
    │     │
    │     ├── Transition to CONNECTING
    │     ├── new WebSocket(url)
    │     └── Await 'open' event
    │            │
    ├─────────────┴─> [CONNECTED]
    │                      │
    │                      ├── Start heartbeat timer
    │                      ├── authClient.login(credentials)
    │                      └── Transition to AUTHENTICATED
    │                               │
    │                               ├─> [Normal Operation]
    │                               │      │
    │                               │      ├── Send commands
    │                               │      ├── Receive responses
    │                               │      └── Receive notifications
    │                               │
    │                               └── On error/close
    │                                      │
    ├─────────────────────────────────────┴─> [RECONNECTING]
    │                                               │
    │                                               ├── Calculate backoff delay
    │                                               ├── Wait delay
    │                                               ├── Attempt reconnect
    │                                               │
    │                                               ├── Success -> CONNECTED
    │                                               └── Failure -> Retry or give up
    │
    └── disconnect() -> [CLOSED]
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **Single Gateway** | Basic structure with one `GatewayClient` instance. All components (connection, router, command/notification clients) in single process. Simple, low overhead. |
| **2-5 Gateways** | Multiple `GatewayClient` instances with shared infrastructure (logger, config). Introduce `GatewayManager` to coordinate across clients. Add gateway selection logic for commands. |
| **5+ Gateways** | Add connection pooling and health checking. Implement gateway discovery service. Consider worker threads for heavy message processing. Add message broker (e.g., Redis) if gateways need to coordinate. |

### Scaling Priorities

1. **First bottleneck: CPU-bound message parsing**
   - **When:** Processing thousands of messages/second with complex validation
   - **Fix:** Move parsing to worker threads, use schema validation libraries with caching, batch process notifications
   - **For this project:** Unlikely to hit this in spike phase; JSON.parse is fast for small messages

2. **Second bottleneck: Memory from pending requests**
   - **When:** Many long-lived requests (slow gateway responses) accumulate in `RequestRegistry`
   - **Fix:** Implement request timeout cleanup, monitor registry size, add alerts for high pending counts
   - **For this project:** Set aggressive timeouts (5s), implement cleanup on disconnect

3. **Third bottleneck: WebSocket connection limits**
   - **When:** Browser limit of 6-30 connections per domain, or OS socket limits
   - **Fix:** Use connection multiplexing (multiple logical channels over one WebSocket), implement connection pooling
   - **For this project:** Single connection per gateway sufficient for spike

## Anti-Patterns

### Anti-Pattern 1: Mixing Connection and Business Logic

**What people do:** Put authentication, command formatting, and message handling directly in the connection manager class.

**Why it's wrong:** Creates a "God class" that's impossible to test in isolation. Changes to message formats require touching connection logic. Can't reuse connection manager for different protocols or gateways.

**Do this instead:** Separate layers as shown in architecture diagram. Connection manager only knows about WebSocket lifecycle (open, close, send, receive). Higher layers handle message interpretation and business logic.

```typescript
// BAD: Everything in one class
class WebSocketClient {
  connect() { /* ... */ }
  sendLogin(user, pass) { /* ... */ }
  subscribeToChanges() { /* ... */ }
  // 500+ lines of mixed concerns
}

// GOOD: Separated concerns
class ConnectionManager { connect() { /* ... */ } }
class AuthClient { login(credentials) { /* ... */ } }
class NotificationClient { subscribe(topic) { /* ... */ } }
```

### Anti-Pattern 2: Ignoring Reconnection State

**What people do:** Simply retry connection on failure without tracking attempts, state, or exponential backoff.

**Why it's wrong:**
- Hammers server with rapid reconnection attempts during outages
- No way to distinguish transient failures from permanent ones
- Can cause "thundering herd" if many clients reconnect simultaneously
- No feedback to user about connection state

**Do this instead:** Implement proper reconnection strategy with exponential backoff, jitter, max attempts, and state tracking. Expose connection state to UI so users know what's happening.

### Anti-Pattern 3: Promise Anti-Pattern in Request-Response

**What people do:** Create nested promises or manually construct Promise instead of async/await.

**Why it's wrong:** Harder to read, error-prone, loses stack traces, makes debugging difficult.

**Do this instead:** Use async/await consistently and let the `RequestRegistry` handle Promise creation internally.

```typescript
// BAD: Promise constructor anti-pattern
sendCommand(cmd, data) {
  return new Promise((resolve, reject) => {
    this.connection.send(JSON.stringify(cmd));
    this.once('response', (msg) => {
      if (msg.error) {
        reject(msg.error);
      } else {
        resolve(msg.data);
      }
    });
  });
}

// GOOD: Clean async/await with registry
async sendCommand<T>(cmd: string, data: any): Promise<T> {
  const id = crypto.randomUUID();
  const promise = this.registry.register<T>(id, this.timeout);
  this.connection.send(JSON.stringify({ id, cmd, data }));
  return promise; // Registry handles Promise creation
}
```

### Anti-Pattern 4: No Message Validation

**What people do:** Assume incoming messages match expected structure, directly access properties without validation.

**Why it's wrong:** Malformed messages cause runtime errors that crash the client. No defense against gateway bugs or network corruption. Hard to debug when messages are slightly wrong.

**Do this instead:** Validate message structure at routing layer before dispatching to handlers. Use TypeScript discriminated unions and runtime validation (Zod, Yup, etc.).

```typescript
// BAD: No validation
route(raw: string) {
  const msg = JSON.parse(raw);
  if (msg.type === 'RESPONSE') {
    this.registry.resolve(msg.id, msg.data); // What if id is undefined?
  }
}

// GOOD: Validate before routing
route(raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch (error) {
    this.logger.error('Invalid JSON:', raw);
    return;
  }

  if (!msg.type || typeof msg.type !== 'string') {
    this.logger.warn('Message missing type field:', msg);
    return;
  }

  switch (msg.type) {
    case 'RESPONSE':
      if (!msg.id || !msg.data) {
        this.logger.warn('Invalid RESPONSE format:', msg);
        return;
      }
      this.registry.resolve(msg.id, msg.data);
      break;
    // ... other cases
  }
}
```

### Anti-Pattern 5: Shared Mutable State

**What people do:** Store connection state, pending requests, or subscriptions in module-level variables or singletons.

**Why it's wrong:** Makes testing impossible (state leaks between tests), prevents multi-gateway support, causes race conditions when multiple components mutate state.

**Do this instead:** Encapsulate state in class instances. Make `GatewayClient` instantiable so each gateway gets its own state.

```typescript
// BAD: Module-level state (singleton anti-pattern)
let connection: WebSocket | null = null;
const pendingRequests = new Map();

export function connect(url: string) {
  connection = new WebSocket(url);
}

// GOOD: Instance-based state
export class GatewayClient {
  private connection: ConnectionManager;
  private requestRegistry: RequestRegistry;

  constructor(config: GatewayConfig) {
    this.connection = new ConnectionManager(config);
    this.requestRegistry = new RequestRegistry();
  }
}

// Supports multiple gateways
const gateway1 = new GatewayClient({ url: 'wss://gw1' });
const gateway2 = new GatewayClient({ url: 'wss://gw2' });
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Gateway WebSocket Server** | Direct WebSocket connection | Primary integration point. Must handle authentication, command/response, and notifications according to gateway protocol. |
| **Logger (console/file/service)** | Dependency injection | Pass logger to components via constructor. Use interface to support different backends (console, Winston, Pino). |
| **Monitoring/Metrics** | Event hooks | Expose connection events (connected, disconnected, error) for monitoring. Track metrics: connection uptime, message latency, error rate. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Connection ↔ Router** | Callback/Event | Connection calls `router.route(raw)` on each message. One-way data flow (connection never calls back to router after routing). |
| **Router ↔ Registry** | Direct method calls | Router resolves/rejects pending requests via `registry.resolve(id, data)`. Synchronous, no async needed. |
| **Router ↔ Bus** | Direct method calls | Router publishes notifications via `bus.publish(topic, data)`. Synchronous notification dispatch (handlers may be async). |
| **Client ↔ Connection** | Async method calls | Client sends via `connection.send(json)` and awaits connection events. Client doesn't directly receive messages (router handles that). |
| **Command Client ↔ Notification Client** | Shared Bus | Notification client registers subscriptions via command client (sends `POST_SUB_CHANGES`), then receives notifications via shared bus. Decoupled but coordinated. |

## Build Order Dependencies

The layered architecture naturally suggests a bottom-up build order:

### Phase 1: Foundation (Independent)
1. **types/** — Define all interfaces first (no dependencies)
2. **utils/** — Logger, parser, errors (depends only on types)
3. **config.ts** — Configuration (depends on types)

### Phase 2: Core (Depends on Foundation)
4. **connection/ConnectionManager** — WebSocket wrapper (depends on config, logger, types)
5. **connection/ReconnectStrategy** — Backoff logic (depends on config)
6. **connection/HeartbeatManager** — Keep-alive (depends on ConnectionManager, logger)

### Phase 3: Routing (Depends on Core)
7. **routing/RequestRegistry** — Pending request tracking (depends on types, logger)
8. **routing/NotificationBus** — Pub/sub (depends on types, logger)
9. **routing/MessageRouter** — Message dispatch (depends on Registry, Bus, types, logger)

### Phase 4: Application (Depends on All)
10. **client/CommandClient** — Request-response API (depends on Connection, Router)
11. **client/NotificationClient** — Pub/sub API (depends on CommandClient, Bus)
12. **client/AuthClient** — Authentication flow (depends on CommandClient)
13. **client/GatewayClient** — Facade (depends on all clients)

### Testing Strategy per Phase

- **Phase 1:** Unit tests with no mocks (pure functions)
- **Phase 2:** Unit tests with mock config/logger
- **Phase 3:** Unit tests with mock Connection, plus integration tests for Router + Registry + Bus
- **Phase 4:** Integration tests with mock Connection, plus end-to-end tests with real WebSocket server

This build order allows incremental development: each phase is fully testable before moving to the next. The spike can start with phases 1-2 to validate connection management, then add phase 3 for message routing, and finally phase 4 for user-facing APIs.

## Sources

**Architecture Patterns:**
- [WebSocket Architecture Best Practices - Ably](https://ably.com/topic/websocket-architecture-best-practices)
- [WebSockets at Scale - Production Architecture and Best Practices | WebSocket.org](https://websocket.org/guides/websockets-at-scale/)
- [Design a WebSocket Application - websockets 16.0 Documentation](https://websockets.readthedocs.io/en/stable/howto/patterns.html)
- [WebSocket Gateway Reference Architecture | Scalable Real-Time Systems - DASMETA](https://www.dasmeta.com/docs/solutions/websocket-gateway-reference-architecture/index)

**TypeScript Implementations:**
- [ts-ws-client - GitHub](https://github.com/t34-dev/ts-ws-client)
- [TypeScript and WebSockets: Client-Side Engineering Challenges - Ably](https://ably.com/topic/websockets-typescript)
- [WebSockets with TypeScript: Real-Time Communication - Krython](https://krython.com/tutorial/typescript/websockets-typescript-real-time-communication/)

**Connection Management:**
- [WebSocket Connection Life Cycle - Design (websockets documentation)](https://websockets.readthedocs.io/en/stable/topics/design.html)
- [Reconnecting WebSocket - GitHub](https://github.com/pladaria/reconnecting-websocket)
- [Simple Reconnect Logic for RXJS WebSocket - Medium](https://kat-leight.medium.com/simple-reconnect-logic-for-rxjs-websocket-c2ba46fa71eb)

**Request-Response Pattern:**
- [Request-Response Model in WebSockets - Medium](https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44)
- [Implement Request/Reply in AsyncAPI - AsyncAPI Initiative](https://www.asyncapi.com/docs/tutorials/websocket/websocket-request-reply)

**Notification Patterns:**
- [Receiving Event Notifications via WebSockets - RingCentral](https://developers.ringcentral.com/guide/notifications/websockets/receiving)
- [Understanding the Event API WebSocket Protocol - AWS AppSync Events](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html)
- [Event-Driven APIs: Understanding the Principles - Medium](https://medium.com/event-driven-utopia/event-driven-apis-understanding-the-principles-c3208308d4b2)

**Message Routing:**
- [Type-Safe WebSocket Message Routing - GitHub bun-ws-router](https://github.com/kriasoft/bun-ws-router)
- [MessageBridgeJS - WebSocket Command/Query/Event Service - GitHub](https://github.com/alfnielsen/MessageBridgeJS)

**Production Best Practices:**
- [WebSocket Best Practices for Production Applications - LatteStream](https://lattestream.com/blog/websocket-best-practices)
- [Node.js and WebSockets Best Practices Checklist - Voodoo Engineering](https://medium.com/voodoo-engineering/websockets-on-production-with-node-js-bdc82d07bb9f)
- [Building Real-Time Applications with WebSockets - Render](https://render.com/articles/building-real-time-applications-with-websockets)

---
*Architecture research for: TypeScript WebSocket Client for Gateway Communication*
*Researched: 2026-02-07*
*Confidence: HIGH (patterns verified across multiple authoritative sources)*
