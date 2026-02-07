# Feature Research: TypeScript WebSocket Client

**Domain:** Industrial IoT WebSocket Client for Gateway Communication
**Researched:** 2026-02-07
**Confidence:** HIGH

## Context

This research focuses on features for a TypeScript WebSocket client that communicates with an industrial IoT gateway. The client must authenticate, send commands, receive responses, and handle async notifications from wireless vibration sensors.

**Critical distinction:** This is a technical spike (Milestone 0) to validate gateway API communication before building a production system. Feature scope should validate core patterns without over-engineering.

## Feature Landscape

### Table Stakes (Essential for Spike Validation)

Features required to prove the gateway communication patterns work. Missing these = spike cannot validate the approach.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Basic Connection Lifecycle** | Must prove we can connect/disconnect cleanly | LOW | Open connection, close connection, handle onopen/onclose events |
| **Authentication Message** | Gateway requires auth before accepting commands | LOW | Send auth command on connect, verify success response |
| **Command Sending** | Core use case - send commands to gateway | LOW | Send JSON message with command structure |
| **Response Receiving** | Must receive gateway responses | LOW | Parse incoming JSON messages |
| **Error Message Handling** | Gateway returns RTN_ERR messages | LOW | Parse error responses, distinguish from success |
| **Async Notification Handling** | Gateway pushes sensor events asynchronously | MEDIUM | Handle messages not tied to commands |
| **Message Correlation** | Must match responses to sent commands | MEDIUM | Track request IDs, resolve pending commands |
| **Basic Logging** | Must see what's happening during spike | LOW | Console logging for connection events, messages |
| **Graceful Shutdown** | Prove clean disconnection | LOW | Close connection without hanging |
| **Connection Error Detection** | Network failures must be visible | LOW | Handle onerror event, connection timeout |

### Differentiators (Production Features - Defer for Spike)

Features that production clients need but are not required to validate gateway communication patterns. These add robustness but don't prove the approach works.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-Reconnection** | Production resilience - recover from network blips | MEDIUM | Exponential backoff, max retry logic |
| **Heartbeat/Ping-Pong** | Detect half-open connections, keep connection alive | MEDIUM | Ping every 30-60s, timeout on missing pong |
| **Message Queuing** | Buffer messages when disconnected | MEDIUM | Queue outgoing during reconnect, replay on restore |
| **State Recovery** | Re-subscribe to notifications after reconnect | HIGH | Remember subscriptions, restore on reconnect |
| **Structured Logging** | Production debugging - trace message flows | MEDIUM | Log levels, context IDs, JSON output |
| **Configurable Timeouts** | Tune for different network conditions | LOW | Connection timeout, message timeout, heartbeat interval |
| **TLS/WSS Support** | Encrypted transport for production | LOW | Use wss:// instead of ws:// |
| **Metrics Collection** | Observability - connection health, message rates | MEDIUM | Prometheus/Grafana integration |
| **Rate Limiting** | Protect gateway from message floods | MEDIUM | Throttle outgoing messages |
| **Backpressure Handling** | Handle slow consumers gracefully | MEDIUM | Pause reading when buffer full |
| **Multiple Connection Support** | Connect to multiple gateways | MEDIUM | Connection pool, per-connection state |
| **Event Emitter API** | Clean event-driven programming model | LOW | Emit 'message', 'error', 'connect' events |
| **TypeScript Message Types** | Type-safe message handling | LOW | Define interfaces for command/response/notification |
| **Comprehensive Testing** | Confidence in edge cases | HIGH | Unit tests, integration tests, mock server |

### Anti-Features (Deliberately Exclude from Spike)

Features that seem useful but create complexity without validating core patterns. Avoid these in the spike.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Full Reconnection Logic in Spike** | "Production clients need this" | Over-engineering for validation - adds complexity before proving base patterns work | Manual reconnect test - disconnect and reconnect to prove it works, automate later |
| **Custom Protocol Layer** | "Wrap WebSocket with our own protocol" | Premature abstraction - don't know requirements yet | Use raw JSON messages first, abstract if patterns emerge |
| **Message Batching** | "Optimize network efficiency" | Optimization before knowing bottlenecks | Send one message at a time, optimize later if needed |
| **Connection Pooling** | "Support multiple gateways" | Out of scope - spike validates single gateway | Single connection, add pooling in production if needed |
| **Offline Queue Persistence** | "Don't lose messages" | Spike is ephemeral - persistence adds storage layer | In-memory only, add persistence post-validation |
| **Advanced Error Recovery** | "Handle all error cases" | Spike should expose errors, not hide them | Let errors surface, document patterns, handle in production |
| **Full Observability Stack** | "Need metrics from day one" | Instrumentation overhead before patterns proven | Console logs sufficient, add metrics to production |
| **Configuration Management** | "Make everything configurable" | Premature flexibility | Hardcode spike values, extract config in production |

## Feature Dependencies

```
Connection Lifecycle
    └──requires──> Authentication
                       └──requires──> Command Sending
                                          └──requires──> Response Receiving
                                                             └──requires──> Message Correlation (if async)

Async Notification Handling ──enhances──> Response Receiving (separate message stream)

Heartbeat/Ping-Pong ──requires──> Connection Lifecycle
                  └──enables──> Auto-Reconnection (detects dead connections)

Message Queuing ──requires──> Auto-Reconnection (queue during disconnect)
                └──conflicts──> Spike Simplicity (adds state management complexity)

State Recovery ──requires──> Auto-Reconnection + Message Queuing (complex dependency chain)

Testing ──requires──> All core features complete (test what exists)
```

### Dependency Notes

- **Authentication requires Connection:** Can't auth until connected
- **Message Correlation optional for sync patterns:** If gateway guarantees FIFO response order, correlation may not be needed - spike will determine this
- **Heartbeat enables reconnection:** Can't detect half-open connections without heartbeat, so auto-reconnect is blind without it
- **State Recovery requires Message Queuing:** Can't restore state if messages were lost during disconnect
- **Spike should stay on the left side of dependency tree:** Connection → Auth → Command → Response → Correlation is the validation path

## MVP Definition (Technical Spike)

### Spike Must Validate (Build These)

Minimum features to prove gateway communication patterns work.

- [x] **Basic Connection Lifecycle** — Prove we can connect and disconnect
- [x] **Authentication via Command Message** — Validate gateway auth flow
- [x] **Send Commands (JSON)** — Send structured commands to gateway
- [x] **Receive Responses (JSON)** — Parse gateway responses
- [x] **Handle RTN_ERR Responses** — Detect and parse error messages
- [x] **Handle Async Notifications** — Receive unsolicited messages from gateway
- [x] **Message Correlation (if needed)** — Match responses to commands if gateway is async
- [x] **Basic Console Logging** — Visibility into message flow
- [x] **Graceful Shutdown** — Clean disconnect without leaks

### Add After Validation (Production Features)

Features to add once spike proves the patterns work.

- [ ] **Auto-Reconnection with Exponential Backoff** — Trigger: Moving to production, need resilience
- [ ] **Heartbeat/Ping-Pong** — Trigger: Seeing half-open connections in testing
- [ ] **Message Queuing** — Trigger: Messages lost during brief disconnects
- [ ] **Structured Logging** — Trigger: Need to debug production issues
- [ ] **Metrics Collection** — Trigger: Need observability dashboard
- [ ] **TLS/WSS Support** — Trigger: Security requirement for production deployment
- [ ] **Configurable Timeouts** — Trigger: Different network environments need tuning
- [ ] **TypeScript Message Types** — Trigger: Refactoring to improve type safety
- [ ] **Event Emitter API** — Trigger: Multiple consumers need to listen to events

### Deliberately Excluded (Never Build)

Features that seem useful but add complexity without value.

- [ ] **Offline Queue Persistence** — Use server-side queuing instead
- [ ] **Custom Protocol Layer** — Stick with JSON over WebSocket, don't invent protocols
- [ ] **Message Batching** — Optimize only if profiling shows it's needed
- [ ] **Connection Pooling in Client** — Gateway should handle multiple clients, not client handling multiple gateways

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Basic Connection | HIGH | LOW | P1 | Foundation for everything |
| Authentication | HIGH | LOW | P1 | Required by gateway |
| Command Sending | HIGH | LOW | P1 | Core use case |
| Response Receiving | HIGH | LOW | P1 | Core use case |
| Error Handling (RTN_ERR) | HIGH | LOW | P1 | Must detect failures |
| Async Notifications | HIGH | MEDIUM | P1 | Core use case for sensors |
| Message Correlation | HIGH | MEDIUM | P1 | May be optional - spike determines |
| Basic Logging | MEDIUM | LOW | P1 | Debugging visibility |
| Graceful Shutdown | MEDIUM | LOW | P1 | Resource cleanup |
| Connection Error Detection | MEDIUM | LOW | P1 | Network failure visibility |
| Auto-Reconnection | HIGH | MEDIUM | P2 | Production resilience |
| Heartbeat/Ping-Pong | HIGH | MEDIUM | P2 | Connection health |
| Message Queuing | MEDIUM | MEDIUM | P2 | Prevent message loss |
| Structured Logging | MEDIUM | LOW | P2 | Production debugging |
| TLS/WSS Support | HIGH | LOW | P2 | Security requirement |
| TypeScript Types | MEDIUM | LOW | P2 | Type safety |
| Metrics Collection | MEDIUM | MEDIUM | P3 | Nice to have |
| State Recovery | MEDIUM | HIGH | P3 | Complex, defer |
| Rate Limiting | LOW | MEDIUM | P3 | Unlikely bottleneck |
| Event Emitter API | LOW | LOW | P3 | Refactoring convenience |

**Priority key:**
- P1: Must have for spike - validates core patterns
- P2: Should have for production - adds resilience
- P3: Nice to have - improves DX or ops, not critical

## Spike vs Production Feature Comparison

### What the Spike Proves

The technical spike validates that:
1. We can establish WebSocket connection to gateway
2. Gateway authentication flow works as documented
3. Command/response message structure is understood
4. Async notification pattern is understood
5. Error handling patterns are clear
6. Message correlation requirement is understood (or not needed)

### What Production Adds

Production implementation layers on resilience:
1. **Auto-reconnection** - Handle network interruptions without operator intervention
2. **Heartbeat** - Detect and recover from half-open connections
3. **Message queuing** - Buffer commands during brief disconnects
4. **Structured logging** - Debug production issues with context
5. **Metrics** - Monitor connection health, message rates
6. **Security** - TLS encryption, token refresh
7. **Testing** - Comprehensive test coverage for edge cases

The spike is a thin client that proves patterns work. Production is a robust client that handles failures gracefully.

## Implementation Recommendations

### For the Spike (Milestone 0)

**Keep it simple:**
- Single TypeScript file if possible (< 300 lines)
- Console.log for debugging
- Hardcoded connection parameters
- Synchronous command sending (no queue)
- Manual reconnect (restart process)
- Exit on fatal errors (don't hide problems)

**Focus on learning:**
- Document message formats as you discover them
- Note timing behaviors (does auth happen sync or async?)
- Identify edge cases (what happens if command sent before auth?)
- Capture unknown message types

**Success criteria:**
- Can connect, authenticate, send command, receive response, disconnect
- Can receive async notifications
- Errors are visible and understood
- Patterns are documented for production implementation

### For Production (Post-Spike)

**Add robustness:**
- Extract WebSocket client class
- Add reconnection with exponential backoff
- Implement heartbeat/ping-pong
- Queue messages during reconnect
- Add structured logging with correlation IDs
- Comprehensive error handling
- Integration tests with mock server
- Metrics for observability

**Refactor for maintainability:**
- TypeScript interfaces for all message types
- Event-driven architecture (event emitter)
- Configuration management
- Dependency injection for testing
- Separate concerns (connection, auth, commands, notifications)

## Testing Strategy

### Spike Testing (Manual)

- Connect to real gateway
- Send known command, verify response
- Trigger error, verify RTN_ERR received
- Wait for async notification
- Disconnect cleanly
- Document what worked and what didn't

### Production Testing (Automated)

**Unit tests:**
- Message serialization/deserialization
- State machine transitions
- Error handling logic

**Integration tests:**
- Mock WebSocket server
- Test connection lifecycle
- Test reconnection logic
- Test heartbeat timeout
- Test message correlation
- Test error scenarios

**Tools (from research):**
- ws library for mock server
- vitest or jest for test framework
- Mock server helpers for WebSocket testing

## Sources

### WebSocket Best Practices
- [TypeScript and WebSockets: client-side engineering challenges](https://ably.com/topic/websockets-typescript)
- [WebSocket is Not Defined: Complete Fix Guide & 2026 Best Practices](https://copyprogramming.com/howto/referenceerror-websocket-is-not-defined)
- [Writing WebSocket client applications - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)

### Reconnection and Error Handling
- [How to Implement Reconnection Logic for WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view)
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [WebSocket onerror: Comprehensive Guide to Error Handling in 2025](https://www.videosdk.live/developer-hub/websocket/websocket-onerror)
- [WebSocket Reconnect: Strategies for Reliable Communication](https://apidog.com/blog/websocket-reconnect/)

### Message Correlation Pattern
- [Request-Response model in web-sockets](https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44)
- [Implementing the Request-Response pattern using C# with JSON-RPC and WebSockets](https://jonathancrozier.com/blog/implementing-the-request-response-pattern-using-c-sharp-with-json-rpc-and-websockets)
- [A simple way to use WebSockets](https://worlds-slowest.dev/posts/rpc-using-websockets/)

### Common Pitfalls
- [Stop Using WebSockets for Everything](https://medium.com/@ppp.mishra124/stop-using-websockets-for-everything-and-other-real-time-mistakes-youre-probably-making-2290394badde)
- [WebSocket Best Practices: Building Secure, Efficient Real-Time Applications](https://blog.nashtechglobal.com/websocket-best-practices-building-secure-efficient-real-time-applications-while-avoiding-common-mistakes/)
- [Common Pitfalls When Using Socket.io and How to Avoid Them](https://moldstud.com/articles/p-common-pitfalls-when-using-socketio-and-how-to-avoid-them-essential-tips-for-developers)

### IoT and Message Queuing
- [LavinMQ for IoT: from device to LavinMQ to dashboard](https://lavinmq.com/blog/lavinmq-for-iot-from-device-to-dashboard-in-minutes)
- [Understanding the Differences between MQTT and WebSockets for IoT](https://www.hivemq.com/blog/understanding-the-differences-between-mqtt-and-websockets-for-iot/)
- [Offline behavior - Socket.IO](https://socket.io/docs/v3/client-offline-behavior/)

### Testing Patterns
- [Writing Integration Tests for WebSocket Servers Using Jest/Vitest and WS](https://thomason-isaiah.medium.com/writing-integration-tests-for-websocket-servers-using-jest-and-ws-8e5c61726b2a)
- [Top 10 WebSocket Testing Tools for Real-Time Applications (Updated 2026)](https://apidog.com/blog/websocket-testing-tools/)
- [WebSocket Testing Essentials: Strategies and Code for Real-Time Apps](https://www.thegreenreport.blog/articles/websocket-testing-essentials-strategies-and-code-for-real-time-apps/websocket-testing-essentials-strategies-and-code-for-real-time-apps.html)

### Logging and Observability
- [Logging - websockets 16.0 documentation](https://websockets.readthedocs.io/en/stable/topics/logging.html)
- [How to Implement Heartbeat/Ping-Pong in WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-heartbeat/view)
- [WebSocket Application Monitoring: An In-Depth Guide](https://www.dotcom-monitor.com/blog/websocket-monitoring/)
- [Debugging and Monitoring WebSocket Applications](https://www.appetenza.com/debugging-and-monitoring-websocket-applications)

---
*Feature research for: TypeScript WebSocket Client for Industrial IoT Gateway*
*Researched: 2026-02-07*
*Confidence: HIGH - Based on current WebSocket best practices, IoT patterns, and 2026 ecosystem research*
