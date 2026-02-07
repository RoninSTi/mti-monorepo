---
phase: 03-message-infrastructure
plan: 03
subsystem: message-infrastructure
tags: [websocket, message-routing, zod, validation, callback-pattern]

# Dependency graph
requires:
  - phase: 03-01
    provides: Message type definitions (ResponseMessageSchema, NotificationMessageSchema, command/notification types)
  - phase: 03-02
    provides: CommandClient class for handling RTN_ responses via correlation
provides:
  - MessageRouter class that parses/validates/routes incoming WebSocket messages
  - NotificationHandler class providing callback registration for NOT_ messages
  - Complete message pipeline: WebSocket -> MessageRouter -> CommandClient/NotificationHandler
  - Application-level integration: all components wired in main.ts
affects: [phase-4-auth-flow, phase-5-data-acquisition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Message routing by Type prefix (RTN_ vs NOT_)"
    - "Zod safeParse for untrusted gateway messages (no throw on invalid)"
    - "Callback composition pattern (MessageRouter receives CommandClient/NotificationHandler)"

key-files:
  created:
    - src/gateway/message-router.ts
  modified:
    - src/gateway/notification-handler.ts
    - src/main.ts

key-decisions:
  - "Zod safeParse (not parse) to avoid throwing on invalid messages from untrusted gateway"
  - "MessageRouter logs all received messages at debug level (CMD-06 requirement)"
  - "NotificationHandler provides callback registry pattern for Phase 5 to register handlers"
  - "CommandClient cleanup added to shutdown path before connection close"

patterns-established:
  - "Decoupled routing: MessageRouter doesn't import WebSocket, receives raw string"
  - "Graceful invalid message handling: log warnings, don't crash"
  - "Unknown notification types: logged but don't crash (Phase 5 will register handlers)"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 3: Message Routing and Integration Summary

**Complete message pipeline wired: WebSocket -> JSON parse -> Zod validation -> CommandClient (RTN_) / NotificationHandler (NOT_), integrated in main.ts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T17:20:22Z
- **Completed:** 2026-02-07T17:22:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- MessageRouter parses JSON, validates with Zod, routes by Type prefix (RTN_ → CommandClient, NOT_ → NotificationHandler)
- NotificationHandler provides callback registry for notification types (Phase 5 will register handlers)
- All message infrastructure wired in main.ts: CommandClient with connection.send callback, MessageRouter with connection.onMessage
- CommandClient cleanup integrated into graceful shutdown path
- All received messages logged at debug level (satisfies CMD-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement MessageRouter and NotificationHandler** - `58b9f7d` (feat)
   - NotificationHandler: callback registry with .on() method
   - MessageRouter: JSON parse → Zod safeParse → route by Type prefix
   - Invalid/unknown messages logged without crashing

2. **Task 2: Wire message infrastructure into main.ts** - `49a47f9` (feat)
   - Create CommandClient with connection.send and config.COMMAND_TIMEOUT
   - Create NotificationHandler and MessageRouter
   - Wire messageRouter.handleMessage into connection.onMessage
   - Add commandClient.cleanup() to shutdown function

## Files Created/Modified
- `src/gateway/message-router.ts` - Parses/validates/routes incoming WebSocket messages by Type prefix
- `src/gateway/notification-handler.ts` - Callback registry for NOT_ message types
- `src/main.ts` - Wires CommandClient, NotificationHandler, MessageRouter into WebSocketConnection

## Decisions Made

**1. Use Zod safeParse instead of parse**
- **Rationale:** Gateway is untrusted, invalid messages shouldn't crash the application
- **Impact:** Invalid messages logged as warnings, application stays running

**2. Log all received messages at debug level**
- **Rationale:** Satisfies CMD-06 requirement for received message logging
- **Implementation:** MessageRouter logs raw message (truncated to 200 chars) before parsing
- **Impact:** Full message tracing available in debug logs

**3. NotificationHandler callback registry pattern**
- **Rationale:** Phase 5 needs to register handlers for NOT_DYN_READING and other notification types
- **Implementation:** .on(type, callback) method stores handlers in Map
- **Impact:** Flexible notification handling, no handler = debug log only

**4. CommandClient cleanup in shutdown path**
- **Rationale:** Reject pending promises before closing connection
- **Implementation:** commandClient.cleanup() called before connection.close()
- **Impact:** Graceful shutdown rejects pending requests with "shutting down" error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components compiled cleanly and integrated as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 4 (Authentication Flow):**
- ✅ CommandClient available for POST_LOGIN command
- ✅ Message routing infrastructure complete
- ✅ All message types defined and validated
- ✅ Application entry point (main.ts) ready for authentication logic

**Blockers/Concerns:**
- None

---
*Phase: 03-message-infrastructure*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified:
- ✓ src/gateway/message-router.ts
- ✓ 58b9f7d (feat commit - Task 1)
- ✓ 49a47f9 (feat commit - Task 2)
