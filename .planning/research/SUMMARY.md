# Project Research Summary

**Project:** TypeScript WebSocket Client for Industrial IoT Gateway
**Domain:** Industrial IoT WebSocket Communication
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

This project builds a TypeScript WebSocket client to communicate with an industrial IoT gateway (CTC Connect Wireless) that manages vibration sensors. The client must authenticate, send commands, receive responses, and handle asynchronous notifications from sensors. This is a technical spike (Milestone 0) to validate gateway communication patterns before building a production system.

The recommended approach is to use Node.js 18+ with TypeScript 5.9+ and the `ws` library (RFC 6455 compliant, 145M+ weekly downloads). The client should implement a layered architecture with clear separation between connection management, message routing, and business logic. Critical infrastructure includes: connection state machine, exponential backoff reconnection, heartbeat/ping-pong for connection health, message correlation IDs for request-response matching, and runtime JSON validation with Zod.

The primary risk is over-engineering the spike. The goal is to validate gateway communication patterns, not build production-ready infrastructure. However, certain features are mandatory even for the spike: state machine (prevents race conditions), message correlation (enables multi-command testing), timeouts (measures gateway latency), and exponential backoff (prevents gateway overload during testing). The spike should fail fast and loudly on errors to expose gateway behavior, not hide problems with sophisticated error recovery.

## Key Findings

### Recommended Stack

**Core runtime and language:**
- **Node.js 18+ (LTS)**: Native ESM support, built-in .env loading (v20.6+), stable foundation for TypeScript
- **TypeScript 5.9.x**: Latest stable with strict mode for comprehensive type safety
- **ws 8.19.x**: Industry-standard WebSocket library with RFC 6455 compliance, minimal overhead, 50K+ connections capable

**Development and validation tools:**
- **tsx**: Development runtime (5-10x faster than ts-node, zero configuration)
- **pino**: Structured logging (up to 5x faster than Winston, async logging, JSON output for IoT)
- **zod**: Runtime validation for environment variables and message schemas (TypeScript-first, fails fast)
- **vitest**: Unit testing (10-20x faster than Jest in watch mode, native TypeScript/ESM support)

**What NOT to use:**
- Socket.IO (too heavyweight for point-to-point gateway communication, adds protocol overhead)
- ts-node (5-10x slower than tsx, legacy tool)
- dotenv (unnecessary for Node.js 20.6+ which has native .env support)
- CommonJS (legacy module system, use ES Modules)

### Expected Features

**Must have for spike (table stakes):**
- Basic connection lifecycle (connect, disconnect, handle open/close events)
- Authentication message (gateway requires auth before accepting commands)
- Command sending and response receiving (core use case)
- Error message handling (gateway returns RTN_ERR messages)
- Async notification handling (gateway pushes sensor events)
- Message correlation (match responses to sent commands)
- Basic logging (visibility into message flow)
- Graceful shutdown (prove clean disconnection)
- Connection error detection (network failures must be visible)
- Timeout handling (measure gateway latency, detect hung commands)

**Should have for production (defer for spike):**
- Auto-reconnection with exponential backoff (production resilience)
- Heartbeat/ping-pong (detect half-open connections)
- Message queuing (buffer messages when disconnected)
- State recovery (re-subscribe to notifications after reconnect)
- Structured logging (production debugging with correlation IDs)
- TLS/WSS support (encrypted transport)
- Metrics collection (observability - connection health, message rates)
- Comprehensive testing (unit tests, integration tests, mock server)

**Deliberately exclude from spike (anti-features):**
- Custom protocol layer (don't abstract before understanding requirements)
- Message batching (premature optimization)
- Connection pooling (out of scope for single-gateway spike)
- Offline queue persistence (spike is ephemeral)
- Configuration management (hardcode spike values)

### Architecture Approach

Production TypeScript WebSocket clients follow a layered architecture separating connection lifecycle, message routing, and business logic. This enables independent testing, clear boundaries, and future scalability.

**Major components:**

1. **Connection Management Layer** — WebSocket lifecycle (connect/disconnect/error), state machine (DISCONNECTED→CONNECTING→CONNECTED→AUTHENTICATED), reconnection with exponential backoff, heartbeat for keep-alive, send/receive primitives. No knowledge of message formats.

2. **Message Routing Layer** — Parse incoming messages, route by type (COMMAND/NOTIFY/ERROR), match responses to pending requests using correlation IDs, invoke registered handlers. Decouples message interpretation from connection.

3. **Application Layer** — User-facing APIs: CommandClient (request-response with Promise API), NotificationClient (pub/sub for async events), AuthClient (authentication flow), GatewayClient facade (orchestrates all components).

4. **Infrastructure Layer** — Config (connection parameters, timeouts), Logger (structured logging), Parser (JSON parsing with error handling), Types (TypeScript interfaces for all messages).

**Critical patterns:**
- **State machine**: Prevents race conditions (sending on closed connection), makes transitions explicit, simplifies debugging
- **Request-response registry**: Track pending requests with correlation IDs, automatic timeout handling, Promise-based API
- **Pub/sub for notifications**: Separate notification stream from command responses, supports multiple subscribers per topic
- **Exponential backoff**: Automatic reconnection with increasing delays (1s, 2s, 4s...) to avoid overwhelming server
- **Message type discrimination**: TypeScript discriminated unions for type-safe message parsing with exhaustive checking

### Critical Pitfalls

1. **No connection lifecycle state machine** — Messages sent on closed connections, duplicate reconnection attempts, inability to determine when it's safe to send. Implement explicit state tracking (Disconnected/Connecting/Connected/Authenticated), queue messages while Connecting, block sends during Disconnecting. *Must address in spike.*

2. **No exponential backoff for reconnection** — Immediate reconnection creates storms that overwhelm gateway, especially during network outages. Implement backoff: `delay = min(baseDelay * 2^attempt + jitter, maxDelay)` with values like baseDelay=1s, maxDelay=30s. Reset on successful connection lasting >30s. *Must address in spike.*

3. **Missing heartbeat/ping-pong mechanism** — Cannot distinguish "connection alive but silent" from "connection dead". Idle connections timeout after 60-90s due to proxies/firewalls. Commands sent on zombie connections disappear without error. Send ping every 30s, track lastPongReceived, reconnect if no pong within 10s. *Must address in spike.*

4. **No message correlation ID system** — Responses get matched to wrong commands when multiple commands in flight. Cannot implement per-command timeouts. Generate unique correlationId (UUID) for each command, gateway echoes in response, store pending requests in Map with timeout handling. *Must address in spike.*

5. **Parsing untrusted JSON without runtime validation** — TypeScript types provide zero runtime safety. Malformed gateway messages cause crashes. Use Zod/io-ts for runtime validation: `schema.safeParse(JSON.parse(data))`, reject messages with unknown fields, log validation failures. *Must address in spike.*

6. **No timeout handling for command responses** — Client waits forever if gateway is slow/crashed/response lost. Promise never resolves, memory leaks from unbounded pending request map. Every command needs timeout (suggest 30s for industrial IoT), reject with TimeoutError, cleanup pending map. *Must address in spike.*

7. **Event listener accumulation and memory leaks** — On reconnection, new listeners added without removing old ones. After N reconnections, have N copies of every handler. Always call `removeAllListeners()` before reconnecting, store handler references (no inline functions). *Must address in spike.*

8. **No handling for duplicate notifications** — Gateway may send same notification twice due to retry logic or bugs. For idempotent operations this is harmless, for non-idempotent it corrupts state. Track last N received message IDs, discard duplicates. *Spike should detect and document, defer deduplication.*

9. **Not handling abnormal connection closure (code 1006)** — Connection drops without close handshake. Cannot distinguish network failure vs gateway shutdown vs manual disconnect. Log close code and reason, check if close was expected, document patterns (e.g., "always after 60s = idle timeout"). *Must address in spike.*

10. **Testing only happy path** — Spike validates "send command, receive success" but doesn't test: command timeout, connection loss during command, multiple commands in flight, gateway errors, reconnection during command, gateway offline on startup. Industrial environments are unreliable. *Must address in spike.*

## Implications for Roadmap

Based on research, suggested phase structure for this technical spike:

### Phase 1: Foundation and Connection Management
**Rationale:** Cannot test gateway communication without reliable connection. State machine and basic lifecycle are prerequisites for all other features.

**Delivers:** Working WebSocket connection with state machine (Disconnected/Connecting/Connected), basic open/close event handling, graceful shutdown, logging infrastructure (pino), configuration loading with Zod validation.

**Addresses:** Basic connection lifecycle (table stakes), graceful shutdown, connection error detection, basic logging.

**Avoids:** Pitfall #1 (no state machine), enables proper testing of subsequent phases.

**Complexity:** LOW - foundational layer with clear requirements.

### Phase 2: Core Message Infrastructure
**Rationale:** Must establish request-response pattern before testing actual gateway commands. Message correlation and timeout handling are required for any multi-command testing.

**Delivers:** Message correlation system with UUID generation, request registry with timeout handling (30s default), JSON parsing with Zod validation, message type discrimination (TypeScript discriminated unions), error response handling (RTN_ERR).

**Addresses:** Command sending, response receiving, error message handling, message correlation, timeout handling, JSON validation.

**Avoids:** Pitfall #4 (no correlation IDs), Pitfall #5 (no JSON validation), Pitfall #6 (no timeout handling).

**Complexity:** MEDIUM - requires careful Promise/timeout orchestration.

### Phase 3: Authentication and Basic Commands
**Rationale:** With connection and messaging infrastructure in place, can now test actual gateway API. Authentication must work before any commands.

**Delivers:** Authentication flow (POST_LOGIN command with credentials), command client with Promise-based API, test harness to send commands and verify responses, documentation of gateway message formats.

**Addresses:** Authentication message (table stakes), validates core use case (send command, receive response).

**Avoids:** Testing before infrastructure ready, enables validation of gateway timing/behavior.

**Complexity:** LOW-MEDIUM - depends on gateway protocol complexity (discovered during this phase).

### Phase 4: Async Notifications and Pub/Sub
**Rationale:** Notifications are separate message stream from command responses. Must handle unsolicited messages without breaking correlation system.

**Delivers:** Notification bus with topic-based subscriptions, separation of notification stream from command responses, handling of async sensor events, test scenarios for receiving notifications.

**Addresses:** Async notification handling (table stakes), validates sensor event pattern.

**Avoids:** Mixing notifications with command responses (architectural pitfall).

**Complexity:** MEDIUM - pub/sub pattern with multiple subscribers.

### Phase 5: Resilience and Reconnection
**Rationale:** Industrial environments are unreliable. Must test behavior during network failures, gateway restarts, and connection loss.

**Delivers:** Exponential backoff reconnection (1s, 2s, 4s... up to 30s), heartbeat/ping-pong (30s interval, 10s timeout), connection health monitoring, reconnection testing scenarios (gateway offline, network interruption, idle timeout).

**Addresses:** Auto-reconnection, heartbeat, handles zombie connections.

**Avoids:** Pitfall #2 (no backoff), Pitfall #3 (no heartbeat), Pitfall #7 (listener leaks).

**Complexity:** MEDIUM-HIGH - requires careful testing of failure scenarios.

### Phase 6: Comprehensive Testing and Documentation
**Rationale:** Spike value comes from documenting gateway behavior across edge cases. Must test failure scenarios systematically.

**Delivers:** Test matrix covering: gateway offline on startup, connection loss mid-command, multiple concurrent commands, gateway error responses, malformed responses, reconnection during command, duplicate notification detection, close code logging. Documentation of findings: gateway latency, timeout behaviors, error patterns, undocumented quirks.

**Addresses:** All pitfalls through systematic testing, validates spike conclusions.

**Avoids:** Pitfall #10 (only happy path tested), Pitfall #8 (duplicate notifications - document behavior), Pitfall #9 (close codes - document patterns).

**Complexity:** MEDIUM - systematic testing across scenarios, requires test discipline.

### Phase Ordering Rationale

- **Bottom-up build order**: Foundation (connection) → Core infrastructure (messaging) → Application features (auth, commands, notifications) → Resilience (reconnection, heartbeat) → Validation (comprehensive testing). Each phase is testable before moving to next.

- **Spike-appropriate scope**: Phases 1-4 are minimal viable infrastructure to prove gateway communication works. Phase 5 adds resilience necessary for realistic testing. Phase 6 delivers spike value through documentation of edge cases.

- **Architectural alignment**: Layers match research architecture (connection → routing → application). Dependencies flow naturally: can't send commands without connection, can't test notifications without commands working, can't validate resilience without baseline functionality.

- **Pitfall prevention**: Critical pitfalls (state machine, correlation, backoff) addressed in early phases before they block testing. Less critical pitfalls (duplicate detection) deferred to later phases or documented without full implementation.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 3 (Authentication)**: Gateway protocol specifics unknown until tested. May need research if authentication flow is complex (multi-step handshake, token refresh, etc.). WebSearch research would focus on CTC Connect Wireless API documentation if available.

- **Phase 4 (Notifications)**: Notification subscription pattern unclear (implicit after auth, or explicit POST_SUB_CHANGES command?). May need research on gateway's notification delivery guarantees (at-most-once, at-least-once, exactly-once).

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation)**: WebSocket connection management is well-documented, state machine pattern is standard.

- **Phase 2 (Messaging)**: Request-response over WebSocket is established pattern with clear implementation guidance from research.

- **Phase 5 (Resilience)**: Exponential backoff and heartbeat are standard patterns with clear best practices from research.

- **Phase 6 (Testing)**: Testing methodology is standard, no additional research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official sources (Node.js docs, ws GitHub, TypeScript releases), npm download statistics verify popularity, multiple comparison articles confirm recommendations |
| Features | HIGH | Based on established WebSocket best practices, IoT patterns, and explicit spike vs production distinction. Feature prioritization matrix validated against multiple sources. |
| Architecture | HIGH | Architecture patterns verified across multiple authoritative sources (Ably, WebSocket.org, websockets docs, production case studies). Layered approach is consensus best practice. |
| Pitfalls | MEDIUM | Pitfalls verified across multiple sources (WebSocket troubleshooting guides, production war stories, best practice articles). Some are WebSocket-general, some inferred from industrial IoT context. Need real-world validation. |

**Overall confidence:** HIGH

The recommended stack, architecture patterns, and core features are backed by official documentation and industry consensus. Pitfalls are well-documented in WebSocket literature, though specific manifestation in industrial IoT context needs validation during spike execution.

### Gaps to Address

**Gateway-specific protocol details:** Research is based on general WebSocket/IoT patterns. Actual gateway message formats, authentication flow, notification subscription mechanism, and timing behaviors are unknown until spike testing begins. Phases 3-4 will discover and document these specifics.

**Performance characteristics:** Research provides general guidance (30s command timeout, 30s heartbeat interval, 30s max reconnect delay), but optimal values depend on gateway's actual performance. Spike should measure and tune based on observations.

**Duplicate notification behavior:** Research identifies duplicate notifications as potential pitfall but doesn't know if this gateway exhibits this behavior. Phase 6 testing should actively check for duplicates (compare consecutive notifications, test gateway restart scenarios).

**Idle timeout behavior:** Research assumes 60-90s idle timeout based on typical proxy/firewall behavior, but gateway may have different timeout. Phase 5 should measure actual idle timeout through testing.

**Firmware version differences:** Research assumes single gateway firmware version. If multiple versions exist with protocol differences, spike should document version-specific behaviors and recommend version requirements for production system.

**Concurrent client behavior:** Unknown whether gateway supports multiple simultaneous WebSocket clients, enforces exclusive access, or uses connection limits. Spike should document if tested, or flag as unknown for production planning.

**TLS/certificate requirements:** Research recommends wss:// for production, but spike may use ws:// for simplicity. Document whether gateway supports TLS, what certificate validation is required, and any hostname verification quirks.

## Sources

### Primary (HIGH confidence)

**Stack:**
- [ws GitHub Repository](https://github.com/websockets/ws) - Official source for ws library
- [TypeScript Official Releases](https://github.com/microsoft/typescript/releases) - Latest version information
- [Node.js Official Documentation](https://nodejs.org/en/learn/getting-started/websocket) - WebSocket in Node.js
- [tsx vs ts-node: TypeScript Runtime Comparison | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/) - Performance benchmarks
- [Pino vs Winston | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/pino-vs-winston/) - Logging comparison

**Architecture:**
- [WebSocket Architecture Best Practices - Ably](https://ably.com/topic/websocket-architecture-best-practices)
- [Design a WebSocket Application - websockets 16.0 Documentation](https://websockets.readthedocs.io/en/stable/howto/patterns.html)
- [WebSockets at Scale - Production Architecture | WebSocket.org](https://websocket.org/guides/websockets-at-scale/)

### Secondary (MEDIUM confidence)

**Features:**
- [TypeScript and WebSockets: Client-Side Engineering Challenges - Ably](https://ably.com/topic/websockets-typescript)
- [How to Implement Reconnection Logic for WebSockets - OneUptime](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view)
- [Request-Response Model in WebSockets - Medium](https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44)
- [Writing Integration Tests for WebSocket Servers - Medium](https://thomason-isaiah.medium.com/writing-integration-tests-for-websocket-servers-using-jest-and-ws-8e5c61726b2a)

**Pitfalls:**
- [How to Handle WebSocket Reconnection Logic - OneUptime](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [Robust WebSocket Reconnection with Exponential Backoff - DEV](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [Type-Safe JSON in TypeScript - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/typescript-json-type-safety/)
- [How to Fix Connection Closed Abnormally Errors - OneUptime](https://oneuptime.com/blog/post/2026-01-24-websocket-connection-closed-abnormally/view)

### Tertiary (LOW confidence - ecosystem patterns)

**WebSocket ecosystem:**
- [ws npm package](https://www.npmjs.com/package/ws) - Weekly download statistics
- [Best Node.js WebSocket Libraries Compared - Velt](https://velt.dev/blog/best-nodejs-websocket-libraries)
- [Node.js + TypeScript Setup for 2025 - DEV](https://dev.to/woovi/a-modern-nodejs-typescript-setup-for-2025-nlk)

**IoT context:**
- [Understanding Differences Between MQTT and WebSockets for IoT - HiveMQ](https://www.hivemq.com/blog/understanding-the-differences-between-mqtt-and-websockets-for-iot/)
- [LavinMQ for IoT: Device to Dashboard - LavinMQ](https://lavinmq.com/blog/lavinmq-for-iot-from-device-to-dashboard-in-minutes)

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
