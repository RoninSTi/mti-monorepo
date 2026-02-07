# Pitfalls Research

**Domain:** TypeScript WebSocket Client for Industrial IoT Gateway
**Researched:** 2026-02-07
**Confidence:** MEDIUM (WebSearch results verified across multiple sources, spike-specific concerns based on project context)

## Critical Pitfalls

### Pitfall 1: No Connection Lifecycle State Machine

**What goes wrong:**
Client code directly calls `connect()` and `send()` without tracking connection state, leading to messages sent on closed connections, duplicate reconnection attempts, and inability to determine when it's safe to send commands.

**Why it happens:**
WebSocket API only provides `readyState` property (CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3), but async operations happen between these states. Developers try to send immediately after calling `connect()`, forgetting WebSocket opens asynchronously.

**How to avoid:**
Implement explicit state machine with states: `Disconnected`, `Connecting`, `Connected`, `Disconnecting`, `Reconnecting`. Queue messages sent while `Connecting` and flush on `Connected`. Block sends during `Disconnecting` and `Reconnecting`.

**Warning signs:**
- Errors like "WebSocket is not open: readyState 0 (CONNECTING)" in logs
- Intermittent message loss, especially on startup
- Race conditions where first few commands fail

**Phase to address:**
Spike must implement this. Without state tracking, spike cannot reliably send commands or validate connection behavior. This is foundational infrastructure.

---

### Pitfall 2: No Exponential Backoff for Reconnection

**What goes wrong:**
Client reconnects immediately on disconnect, creating reconnection storms that overwhelm the gateway, especially when multiple clients disconnect simultaneously (network outage, gateway restart). Gateway sees hundreds of connection attempts per second and becomes unresponsive.

**Why it happens:**
Developers implement simple `on('close', () => connect())` logic, thinking fast reconnection is better for users. They don't consider cascading failures or server load during outages.

**How to avoid:**
Implement exponential backoff with jitter: `delay = min(baseDelay * 2^attempt + random(0, jitter), maxDelay)`. Recommended values: `baseDelay=1000ms`, `maxDelay=30000ms`, `maxAttempts=10`, `jitter=1000ms`. Reset attempt counter on successful connection lasting >30s.

**Warning signs:**
- Gateway becomes unresponsive after network issues
- Logs show reconnection attempts every few milliseconds
- Other clients experience degraded performance when your client reconnects
- Gateway administrators report connection spam

**Phase to address:**
Spike must implement this. Testing spike behavior during connection failures is critical for learning about gateway resilience. Reconnection storms invalidate spike results by changing gateway behavior under test.

---

### Pitfall 3: Missing Heartbeat/Ping-Pong Mechanism

**What goes wrong:**
Client cannot distinguish between "connection alive but gateway silent" vs "connection dead". Idle connections timeout after 60-90 seconds due to intermediate proxies/firewalls, but client thinks connection is still open (`readyState=1`). Commands sent on zombie connections disappear without error.

**Why it happens:**
WebSocket API doesn't expose browser's built-in ping/pong frames. Node.js `ws` library exposes them, but developers forget to implement client-side heartbeat logic. Connections through corporate networks often have aggressive idle timeouts (60s).

**How to avoid:**
Send ping every 30s using `ws.ping()`. Track `lastPongReceived` timestamp. If no pong within 10s, consider connection dead and trigger reconnection. On browser WebSocket (no ping access), send application-level heartbeat message `{type: 'heartbeat'}` every 30s and expect response within 10s.

**Warning signs:**
- Commands hang indefinitely with no response or error
- `readyState=1` but messages never arrive
- Connections fail after 60-90s of inactivity
- Works fine with constant traffic, breaks when idle

**Phase to address:**
Spike should implement basic heartbeat. Industrial gateways may have long idle periods between commands. Without heartbeat, spike cannot distinguish "gateway processing slowly" from "connection dead", leading to incorrect timeout conclusions.

---

### Pitfall 4: No Message Correlation ID System

**What goes wrong:**
Client sends command, then waits for "any response" from gateway. If multiple commands are in flight, responses get matched to wrong commands. If gateway sends unsolicited notifications, they're mistaken for command responses. Cannot implement per-command timeouts because you don't know which response goes with which command.

**Why it happens:**
WebSocket is bidirectional message stream, not request-response. Developers trained on HTTP assume messages have implicit correlation. Gateway APIs often send async notifications on same channel as command responses, without clear response-to-command mapping.

**How to avoid:**
Generate unique `correlationId` (UUID) for each command. Include in command payload: `{id: '...', type: 'setSSID', ...}`. Gateway must echo `correlationId` in response: `{id: '...', status: 'success', ...}`. Store pending requests in `Map<correlationId, {resolve, reject, timer}>`. On response, lookup by `id`, clear timeout, resolve/reject promise. On timeout, reject promise and delete from map.

**Warning signs:**
- Response for command B processed as response for command A
- Unsolicited gateway events cause promise resolutions
- Cannot implement reliable timeouts per-command
- Flaky tests that pass/fail based on command timing
- Error "Cannot read property X of undefined" when parsing responses

**Phase to address:**
Spike must implement this. Without correlation IDs, spike cannot test multiple commands in sequence or measure per-command latencies accurately. This is required infrastructure for any command-response testing.

---

### Pitfall 5: Parsing Untrusted JSON Without Runtime Validation

**What goes wrong:**
Client uses `JSON.parse(message)` and casts to TypeScript interface: `const response = JSON.parse(data) as GatewayResponse`. TypeScript types provide zero runtime safety. If gateway sends malformed JSON or unexpected fields, client crashes with "Cannot read property X of undefined" or silently uses wrong data types.

**Why it happens:**
TypeScript developers assume type annotations enforce runtime types. `JSON.parse()` returns `any`, and casting `as T` tells TypeScript "trust me, it's this type" without validation. Industrial gateways may have firmware bugs, version mismatches, or undocumented message formats.

**How to avoid:**
Use runtime validation library (Zod, io-ts, ajv). Define schemas for every gateway message type. Parse with `schema.safeParse(JSON.parse(data))`, check `success`, and handle parse failures explicitly. Reject messages with unknown fields or wrong types. Log validation failures with full message for debugging.

**Warning signs:**
- Crashes with "TypeError: Cannot read property X of undefined"
- Silent data corruption (string parsed as number, etc.)
- Client works with one gateway firmware version, breaks with another
- Integration tests pass, production crashes
- Error messages like "response.data.ssid is not a string"

**Phase to address:**
Spike must implement basic validation. Without it, spike cannot distinguish "gateway sent invalid response" from "my code has bug". Validation failures should be logged for protocol learning, not crash the spike.

---

### Pitfall 6: No Timeout Handling for Command Responses

**What goes wrong:**
Client sends command and waits forever for response. If gateway is processing slowly, crashed, or response gets lost, promise never resolves. In async/await code, this means function hangs indefinitely. Memory leaks as pending request map grows without cleanup.

**Why it happens:**
Promises in JavaScript don't have built-in timeouts. Developers implement command sending but forget timeout handling. Testing with responsive gateway doesn't expose this issue.

**How to avoid:**
Every command must have timeout (suggest 30s for industrial IoT, tune based on gateway specs). Store `setTimeout()` handle in pending request map. On timeout, reject promise with `TimeoutError`, log warning with command details, and delete from map. Consider command "failed" and don't process late response. On response arrival, `clearTimeout()` to prevent spurious timeout.

**Warning signs:**
- `await client.setSSID()` never returns
- Node process memory grows over time
- Pending request map size increases indefinitely
- After gateway restart, old commands never resolve
- Tests hang instead of failing

**Phase to address:**
Spike must implement this. Spike success criteria includes measuring timeout behavior. Without timeout handling, spike hangs instead of reporting "gateway took >30s to respond", masking important latency findings.

---

### Pitfall 7: Event Listener Accumulation and Memory Leaks

**What goes wrong:**
Client adds event listeners (`on('message', handler)`) but never removes them. On reconnection, adds new listeners without removing old ones. After N reconnections, have N copies of every handler. Memory usage grows unbounded. Handlers run multiple times per message, causing duplicate processing.

**Why it happens:**
WebSocket API keeps references to event listeners indefinitely. Reconnection logic creates new connection but doesn't clean up old one. JavaScript engines can't garbage collect WebSocket until all listeners are removed. Developers test with single connection and don't notice listener accumulation.

**How to avoid:**
Always call `removeAllListeners()` or `off(eventName, handler)` before reconnecting. Store handler references (no inline functions) so you can remove same function instance. On manual disconnect, call `ws.close()` and `ws.removeAllListeners()`. Use `once()` instead of `on()` for one-time events. Consider weak references or cleanup patterns.

**Warning signs:**
- Node process memory grows by ~100KB per reconnection
- After reconnections, messages processed 2x, 3x, 4x times
- Logs show duplicate handler executions
- Memory profiler shows increasing WebSocket objects
- `MaxListenersExceededWarning: Possible EventEmitter memory leak detected`

**Phase to address:**
Spike should test reconnection scenarios, so basic listener cleanup is required. However, comprehensive memory leak testing is post-spike. Spike should: remove listeners on disconnect, log reconnection count, verify handlers run exactly once.

---

### Pitfall 8: No Handling for Duplicate Notifications

**What goes wrong:**
Gateway sends same notification twice (due to retry logic, message queue duplication, or gateway bug). Client processes it twice, applying state change twice. For idempotent operations (like "SSID changed to X"), this might be harmless. For non-idempotent operations (like "increment counter"), this corrupts state.

**Why it happens:**
WebSocket doesn't guarantee exactly-once delivery. Message queuing systems often guarantee at-least-once. Gateway may retry notifications if it doesn't receive acknowledgment. Developers assume messages arrive exactly once like HTTP responses.

**How to avoid:**
For critical operations, implement idempotency with message IDs. Gateway includes unique `messageId` in notifications. Client tracks last N received message IDs (sliding window or bloom filter). On receiving notification, check if `messageId` already seen. If yes, log warning and discard. If no, process and add to seen set. Alternative: make all operations naturally idempotent (set value instead of increment).

**Warning signs:**
- State gets corrupted in ways that can't be explained by command sequence
- Logs show same notification payload appearing twice
- Gateway restarts cause client state to double-apply changes
- Counters drift higher than expected
- Tests fail intermittently with "duplicate processing" symptoms

**Phase to address:**
Spike doesn't need full idempotency system, but should detect duplicates. Log if gateway sends duplicate notifications (compare consecutive messages or track recent IDs). Document whether gateway exhibits duplicate behavior - important for production system design.

---

### Pitfall 9: Not Handling Abnormal Connection Closure (Code 1006)

**What goes wrong:**
Connection closes with code 1006 (abnormal closure) when network interruption or gateway crash occurs. Close event fires with no reason string. Client logs "connection closed" but has no context about whether this is: network failure (retry), gateway shutdown (wait), authentication failure (don't retry), or protocol violation (fix bug).

**Why it happens:**
Code 1006 means connection dropped without proper WebSocket close handshake. Could be TCP reset, timeout, TLS failure, or intermediate proxy closure. Browser/Node.js can't provide reason because none was received. Developers treat all closes identically instead of distinguishing clean shutdown (1000) from errors (1006, 1011, etc.).

**How to avoid:**
Log close code and reason. For 1006: check if close was expected (manual disconnect) vs unexpected (network failure). If unexpected, log last successfully sent/received message timestamps to diagnose. If pattern emerges (always after 60s = idle timeout, always during gateway restart = graceful shutdown detection failure), document and adjust reconnection logic. For other codes (1000=normal, 1002=protocol error, 1011=server error), map to appropriate responses.

**Warning signs:**
- Logs show "WebSocket closed: 1006" with no context
- Can't distinguish between "my disconnect call" and "network failure"
- Reconnection logic triggers on intentional disconnects
- Can't debug whether gateway is crashing or network is flaky
- Production team asks "was this client disconnect or server disconnect?" and you can't answer

**Phase to address:**
Spike must log close codes and context. Learning gateway behavior requires distinguishing "I called disconnect()" from "gateway crashed" from "network issue". This is critical observability for spike conclusions.

---

### Pitfall 10: Testing Only Happy Path (Single Command Success)

**What goes wrong:**
Spike validates "send command, receive success response" but doesn't test: command timeout, connection loss during command, multiple commands in flight, gateway error responses, malformed responses, reconnection during command, or gateway offline on startup. Production system encounters these scenarios immediately and fails.

**Why it happens:**
Gateway is reliable during testing. Developer manually ensures gateway is online and responsive. Automated tests only cover success case. Industrial environments have: power cycling, network instability, firmware updates, configuration changes, and concurrent access from multiple clients.

**How to avoid:**
Spike test matrix must include:
- Gateway offline on client startup (connection failure loop)
- Gateway goes offline mid-command (timeout, reconnection, retry)
- Gateway returns error response (parsing, error handling)
- Multiple commands in sequence (queueing, correlation)
- Multiple commands concurrent (correlation ID uniqueness)
- Network hiccup during command (reconnection doesn't lose command)
- Gateway sends unexpected notification during command wait
- Gateway firmware returns different JSON schema than expected

Create test scenarios: unplug gateway ethernet, use `tc` (traffic control) to add latency/loss, mock responses with errors, send malformed JSON.

**Warning signs:**
- Spike report says "works perfectly" but lists zero failure scenarios tested
- First production deployment immediately fails
- Error handling code paths are never executed during testing
- Team discovers basic failures (like "what happens if gateway offline?") weeks later
- Spike conclusions only valid if gateway is 100% reliable

**Phase to address:**
Spike must test failure scenarios. Industrial IoT gateways are unreliable by nature. If spike only tests happy path, it hasn't validated the hard parts (reconnection, timeouts, error recovery). Spike deliverable should document failure behavior, not just success behavior.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No correlation IDs, assume responses in order | Simpler code, faster spike | Cannot handle concurrent commands, breaks with async notifications | Never - breaks immediately with real usage |
| Single global timeout (30s) for all commands | One config value | Cannot tune per-command, slow commands always timeout | Acceptable for spike, must fix for production |
| Inline event handlers with closure over state | Less boilerplate | Cannot remove listeners, causes memory leaks | Never - memory leaks invalidate long-running tests |
| Cast `JSON.parse()` as type without validation | TypeScript happy, less code | Runtime crashes on schema changes | Never - gateway firmware changes break client |
| Reconnect immediately without backoff | Fast recovery feel | Reconnection storms overload gateway | Never - destroys gateway under failure conditions |
| Store pending requests in plain object not Map | Simpler code | Slower lookups, prototype pollution risks | Acceptable for spike, use Map for production |
| No message deduplication tracking | Simpler code | Duplicate processing corrupts state | Acceptable if all ops idempotent, otherwise must implement |
| Log only errors, not info/debug events | Clean logs | Cannot debug intermittent issues | Acceptable for spike, must add structured logging for production |

## Integration Gotchas

Common mistakes when connecting to industrial IoT gateways.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gateway WebSocket URL | Hardcode `ws://192.168.1.1` | Use `wss://` in production, make URL configurable, validate TLS certificates |
| Authentication | Send credentials in first message after connect | Check if gateway requires auth during HTTP upgrade handshake (headers) vs post-connect message |
| Message format | Assume gateway sends/expects JSON | Verify format (JSON, MessagePack, Protocol Buffers?), check for length-prefixed frames |
| Connection lifetime | Keep single connection forever | Industrial gateways may force disconnect after idle time or N messages, implement graceful reconnection |
| Gateway notifications | Expect explicit response to every command | Some gateways send async notifications separately from command responses, need correlation system |
| Error responses | Check only for `{status: 'success'}` | Gateway may send error as different schema, different channel, connection close, or timeout |
| Configuration changes | Send command and assume immediate effect | Config changes may require gateway restart or delay, poll status rather than assume |
| Concurrent clients | Assume exclusive gateway access | Other clients may trigger notifications, change state, or cause commands to fail with "busy" |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous JSON parsing in message handler | No immediate symptoms | Use streaming parser or offload to worker thread | Messages >10MB or high message rate (>1000/s) |
| Storing all received messages in array | Memory grows slowly | Use circular buffer or stream to disk | After ~10K messages or 24hr runtime |
| No backpressure on send queue | Commands enqueued faster than sent | Limit pending commands queue size (100), reject new commands when full | >50 commands/sec sustained |
| Linear search through pending requests | Latency increases over time | Use Map with O(1) lookup by correlation ID | >100 pending requests simultaneously |
| Creating new Error objects for validation | No immediate symptoms | Reuse error instances or use error codes | >10K messages/sec parsing rate |

Note: Industrial IoT WebSocket clients typically have low throughput (1-10 commands/sec), so many performance traps won't manifest. Focus on memory leaks and unbounded growth, not optimization.

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `ws://` instead of `wss://` in production | Credentials and commands visible in cleartext, MITM attacks | Always use `wss://` with certificate validation, never skip certificate checks |
| Storing gateway credentials in source code | Credentials leak via git, logs, error messages | Use environment variables, config files excluded from git, or secrets management |
| No origin validation on client | Not applicable (client initiates, doesn't accept connections) | N/A - this is server concern, but validate gateway URL before connecting |
| Executing gateway responses as code | RCE if gateway compromised | Never `eval()` or `Function()` gateway messages, parse as data only |
| Logging sensitive data (passwords, tokens) | Credentials leak in logs | Sanitize logs, redact sensitive fields before logging messages |
| No rate limiting on commands | Client could DOS gateway | Implement client-side rate limit (e.g., max 10 commands/sec) to protect gateway |
| Accepting any TLS certificate | MITM attacks | Validate certificate chain, check hostname, don't set `rejectUnauthorized: false` |
| Command injection in gateway messages | If gateway sends strings used in shell commands | Validate and sanitize all gateway data, never pass directly to `exec()` or `spawn()` |

## UX Pitfalls

Common user experience mistakes for validation spikes (developer-facing tool).

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during long commands | Developer doesn't know if stuck or working | Log "sent command", "waiting for response", "received response" with timestamps |
| Cryptic error messages ("Error: timeout") | Cannot diagnose what timed out or why | Log context: which command, how long waited, last gateway message received, connection state |
| No reconnection feedback | Developer doesn't know client is reconnecting vs hung | Log "connection lost", "reconnecting (attempt N/10)", "reconnected successfully" |
| Binary "pass/fail" spike result | Cannot see partial success or edge cases | Output structured test results: latency histogram, failure rate, error types, edge cases discovered |
| Spike crashes on first error | Cannot complete test suite if early test fails | Catch errors, log, continue testing, summarize all failures at end |
| No way to reproduce failed test | Cannot debug intermittent issues | Log full command sequence, timestamps, gateway responses, and random seed for reproduction |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Connection management:** Often missing state machine - verify client correctly handles `Connecting`, `Connected`, `Disconnecting` states, not just `readyState`
- [ ] **Reconnection logic:** Often missing exponential backoff - verify delay increases on failures (check logs for reconnection timestamps)
- [ ] **Heartbeat:** Often missing pong timeout - verify client detects zombie connections, not just sends pings
- [ ] **Message correlation:** Often missing timeout cleanup - verify pending requests map is cleaned up on timeout, not just on response
- [ ] **JSON parsing:** Often missing validation - verify runtime validation with Zod/io-ts, not just TypeScript `as` cast
- [ ] **Error handling:** Often missing `on('error')` handler - verify error events are logged, client doesn't crash
- [ ] **Resource cleanup:** Often missing listener removal - verify `removeAllListeners()` called on disconnect, check listener count doesn't grow
- [ ] **Logging:** Often missing structured context - verify logs include timestamp, correlation ID, connection state, not just message text
- [ ] **Timeout configuration:** Often hardcoded - verify timeout is configurable per environment (dev=5s, prod=30s)
- [ ] **Test coverage:** Often missing failure scenarios - verify tests include gateway offline, network loss, timeout, concurrent commands

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No correlation IDs | HIGH | Must redesign message flow, gateway may need protocol change, breaks existing code |
| No exponential backoff | LOW | Add backoff logic, configuration, test with network interruption |
| Missing heartbeat | MEDIUM | Add ping/pong or app-level heartbeat, requires testing to tune intervals |
| Event listener leaks | MEDIUM | Refactor to remove inline handlers, add cleanup logic, verify with memory profiler |
| No JSON validation | MEDIUM | Add Zod schemas, wrap all parsing, test with malformed messages |
| Missing timeout handling | MEDIUM | Add timeout to all command promises, track with `setTimeout`, test timeout scenarios |
| No state machine | HIGH | Redesign connection lifecycle, refactor command queueing, extensive testing required |
| No duplicate detection | MEDIUM | Add message ID tracking, decide on deduplication strategy (time window, bloom filter) |
| Close code not logged | LOW | Add close event logging with code/reason, correlate with connection history |
| Only happy path tested | LOW | Create failure test suite, add chaos engineering scenarios, document failure modes |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No connection state machine | Spike - foundational | Run tests, check logs show state transitions, no "not open" errors |
| No exponential backoff | Spike - reliability critical | Disconnect gateway, verify logs show increasing delays (1s, 2s, 4s, ...) |
| Missing heartbeat | Spike - validates timeout assumptions | Leave idle 90s, verify client detects disconnect within 10s |
| No message correlation | Spike - multi-command testing required | Send 3 commands concurrently, verify responses matched correctly |
| No JSON validation | Spike - prevents crash on schema changes | Send malformed JSON, verify client logs error and continues |
| No timeout handling | Spike - measures gateway latency | Block gateway responses, verify client times out in configured period |
| Event listener leaks | Spike - testing reconnection behavior | Reconnect 100 times, verify memory constant (not growing linearly) |
| No duplicate detection | Post-spike - production concern | Spike documents if gateway sends duplicates, implement based on findings |
| Close code not logged | Spike - learning gateway behavior | Force disconnect scenarios, verify logs distinguish closure reasons |
| Only happy path tested | Spike - purpose is to find edge cases | Spike test matrix includes 10+ failure scenarios, not just success |

## Sources

**Connection Lifecycle & Reconnection:**
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [How to Implement Reconnection Logic for WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view)
- [Reconnecting WebSockets with TypeScript: A Comprehensive Guide](https://www.webdevtutor.net/blog/typescript-reconnecting-websocket)
- [Building Resilient Websocket Connections In Typescript Applications](https://peerdh.com/blogs/programming-insights/building-resilient-websocket-connections-in-typescript-applications)
- [Robust WebSocket Reconnection Strategies in JavaScript With Exponential Backoff](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)

**Message Correlation & Async Patterns:**
- [Request-Response model in web-sockets](https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44)
- [A simple way to use WebSockets](https://worlds-slowest.dev/posts/rpc-using-websockets/)
- [Design a WebSocket application - websockets documentation](https://websockets.readthedocs.io/en/stable/howto/patterns.html)

**Timeout Handling:**
- [How do you handle WebSocket timeouts in Node.js?](https://clouddevs.com/node/websocket-timeouts/)
- [Working With Websocket Timeout](https://www.jstips.co/en/javascript/working-with-websocket-timeout/)
- [Socket connection timeouts don't fire - ws library issue](https://github.com/websockets/ws/issues/1523)

**Type Safety & Validation:**
- [Type-Safe JSON in TypeScript: Parsing, Typing, and Runtime Validation](https://betterstack.com/community/guides/scaling-nodejs/typescript-json-type-safety/)
- [Make a Type-safe and Runtime-safe WebSocket Communication with Zod](https://egghead.io/lessons/make-a-type-safe-and-runtime-safe-web-socket-communication-with-zod~efw0y)

**Memory Leaks & Resource Cleanup:**
- [How to Fix WebSocket Performance Issues](https://oneuptime.com/blog/post/2026-01-24-websocket-performance/view)
- [Memory leak? - ws library issue](https://github.com/websockets/ws/issues/804)
- [Why Websocket objects aren't destroyed when out of scope](https://useaxentix.com/blog/websockets/why-websocket-objects-arent-destroyed-when-out-of-scope/)

**Idempotency & Duplicate Messages:**
- [Idempotent Consumer - Handling Duplicate Messages](https://www.milanjovanovic.tech/blog/idempotent-consumer-handling-duplicate-messages)
- [Handling duplicate messages using the Idempotent consumer pattern](https://microservices.io/post/microservices/patterns/2020/10/16/idempotent-consumer.html)
- [WebSocket architecture best practices](https://ably.com/topic/websocket-architecture-best-practices)

**Connection Closure & Error Handling:**
- [How to Fix "Connection Closed Abnormally" WebSocket Errors](https://oneuptime.com/blog/post/2026-01-24-websocket-connection-closed-abnormally/view)
- [WebSocket Connection Failed: Quick Troubleshooting Guide](https://blog.postman.com/websocket-connection-failed/)

**Security:**
- [WebSocket security: How to prevent 9 common vulnerabilities](https://ably.com/topic/websocket-security)
- [WebSocket Security: Top 8 Vulnerabilities and How to Solve Them](https://brightsec.com/blog/websocket-security-top-vulnerabilities/)

**Testing:**
- [Testing WebSockets - OWASP](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/11-Client_Side_Testing/10-Testing_WebSockets)
- [WebSocket Testing Essentials: Strategies and Code for Real-Time Apps](https://www.thegreenreport.blog/articles/websocket-testing-essentials-strategies-and-code-for-real-time-apps/websocket-testing-essentials-strategies-and-code-for-real-time-apps.html)

**Industrial IoT Context:**
- [MQTT vs WebSocket: Key Differences & Applications](https://www.emqx.com/en/blog/mqtt-vs-websocket)
- [The Role of WebSockets in IoT](https://www.numberanalytics.com/blog/role-of-websockets-in-iot)

---
*Pitfalls research for: TypeScript WebSocket Client for Industrial IoT Gateway*
*Researched: 2026-02-07*
