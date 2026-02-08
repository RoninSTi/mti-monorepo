# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Validate gateway communication layer works reliably before building full architecture
**Current focus:** Phase 5 - Acquisition and Notifications

## Current Position

Phase: 5 of 6 (Acquisition and Notifications)
Plan: 1 of 3 (in progress)
Status: In progress
Last activity: 2026-02-07 - Completed 05-01-PLAN.md

Progress: [████░░░░░░] 60% (4/6 phases complete - partial)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 2 min
- Total execution time: 0.28 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Configuration | 1/1 | 2min | 2min |
| 2. Connection Management | 2/2 | 4min | 2min |
| 3. Message Infrastructure | 3/3 | 6min | 2min |
| 4. Authentication and Discovery | 2/3 | 3min | 2min |
| 5. Acquisition and Notifications | 1/3 | 1min | 1min |

**Recent Trend:**
- Last 5 plans: 03-03 (2min), 04-01 (1min), 04-02 (2min), 05-01 (1min)
- Trend: Consistent velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Phase | Rationale | Impact |
|----------|-------|-----------|--------|
| Zod for config validation | 01-01 | Type-safe schemas with detailed error messages and fail-fast behavior | All phases use validated config |
| Node.js native --env-file | 01-01 | Avoid dotenv dependency, use built-in Node 20.6+ feature | Simplified dependency tree |
| Mutable logger singleton | 01-01 | Enable config-driven initialization with global access | All phases use logger singleton |
| String enum for ConnectionState | 02-01 | String values provide readable logging output vs numeric enums | All log messages show "CONNECTED" instead of "2" |
| Decorrelated jitter backoff | 02-01 | AWS-recommended pattern reduces thundering herd effect | More distributed reconnection timing under load |
| Application-level heartbeat | 02-01 | Better control, easier debugging, can log timestamps | Heartbeat flow visible in application logs |
| Callback-based sendFn in HeartbeatManager | 02-01 | Decouples HeartbeatManager from WebSocket instance | HeartbeatManager is independently testable |
| Composition pattern for WebSocketConnection | 02-02 | WebSocketConnection composes ReconnectionManager and HeartbeatManager | Clear separation of concerns, independent testing |
| Callback-based message routing | 02-02 | onMessage() allows Phase 3+ to register handlers without modifying WebSocketConnection | Phase 3 can implement auth protocol flexibly |
| 2-second graceful shutdown timeout | 02-02 | Prevents hung processes while giving timers time to clear | Application exits cleanly on SIGINT/SIGTERM |
| Close codes 1000 and 1008 non-reconnectable | 02-02 | 1000=intentional, 1008=policy violation | Only reconnect on abnormal failures |
| Zod z.union() over discriminatedUnion | 03-01 | Zod 4.x API compatibility | All message unions use z.union(), still allows type narrowing |
| Permissive RTN_DYN Data field | 03-01 | RTN_DYN response structure varies by command | Command client narrows Data type based on command sent |
| SensorMetadata passthrough | 03-01 | Gateway may return additional undocumented fields | Future-proof against gateway API additions |
| Native crypto.randomUUID() for correlation IDs | 03-02 | Node.js 20+ built-in, no external dependency | Simpler dependency tree, matches existing patterns |
| Delete-first pattern for race protection | 03-02 | Prevents both timeout and response from handling same request | Safe against all timing edge cases |
| Callback-based sendFn in CommandClient | 03-02 | Decouples CommandClient from WebSocketConnection | CommandClient independently testable with mock sendFn |
| Zod safeParse for gateway messages | 03-03 | Gateway is untrusted, invalid messages shouldn't crash | Invalid messages logged as warnings, application stays running |
| MessageRouter logs all received messages | 03-03 | Satisfies CMD-06 requirement for debug tracing | Full message flow visible in debug logs |
| NotificationHandler callback registry | 03-03 | Phase 5 needs to register handlers for NOT_ types | Flexible notification handling without modifying router |
| 10-second auth timeout | 04-01 | Authentication should be fast, industry best practice | authenticate() uses AUTH_TIMEOUT_MS = 10_000 |
| markAuthenticated() validates state transition | 04-01 | Only allow CONNECTED -> AUTHENTICATED, prevent double-auth | Warns and returns if called from wrong state |
| SENSOR_SERIAL as optional number | 04-01 | Research recommends optional; Serial in metadata is number | Config type changed from required string to optional number |
| authenticate() returns unknown | 04-01 | POST_LOGIN response structure is open question | Response data logged at debug level for discovery |
| authenticate() logs email but never password | 04-01 | Security: avoid credential exposure in logs | Only email logged in info message |
| onOpen callback pattern matches onMessage | 04-02 | Consistency with existing connection callback architecture | Clean lifecycle event handling |
| discoverSensor() receives preferredSerial parameter | 04-02 | Avoids importing config, improves testability | Function testable with mock CommandClient |
| SensorMetadataSchema.safeParse() per entry | 04-02 | Invalid entries logged without failing entire discovery | Resilient to partial gateway data issues |
| Exit code semantics: no sensors (0) vs auth (1) | 04-02 | No sensors is valid state, auth failure is error | Clear distinction for monitoring systems |
| Progressive parsing strategy (CSV->JSON->Base64) | 05-01 | Waveform encoding format unknown (ACQ-06), need flexible discovery | Parser IS the discovery mechanism for format |
| Reduce pattern for statistics | 05-01 | Math.min/max(...array) causes stack overflow on large arrays | Handles arrays of any size safely |
| Generous validation range (±200g) | 05-01 | Actual sensor range unknown during development | Accept valid data during discovery, narrow later |
| Console.log formatting over console.table | 05-01 | Need reliable, clean output with precise control | Works everywhere, no dependencies, easy alignment |

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-08T00:01:40Z (plan execution)
Stopped at: Completed 05-01-PLAN.md - Created progressive waveform parser (CSV/JSON/Base64 strategies) and console display formatter for reading results
Resume file: None
