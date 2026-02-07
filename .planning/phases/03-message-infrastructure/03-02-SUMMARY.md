---
phase: 03-message-infrastructure
plan: 02
subsystem: message-infrastructure
tags: [websocket, command-response, correlation-id, uuid, promises, timeout]

# Dependency graph
requires:
  - phase: 03-01
    provides: Message type definitions (SendCommand, ResponseMessage, RTN_ERR, RTN_DYN)
provides:
  - CommandClient class for Promise-based command/response correlation
  - UUID-based correlation ID injection (crypto.randomUUID)
  - Configurable timeout with automatic cleanup (default 30s)
  - RTN_ERR error response parsing and rejection
  - Race condition protection via delete-first pattern
affects: [03-03, phase-4, phase-5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise-based request/response over WebSocket via correlation IDs"
    - "Delete-first pattern for race condition protection (timeout vs response)"
    - "Callback-based composition pattern (sendFn decouples from WebSocket)"

key-files:
  created:
    - src/gateway/command-client.ts
    - src/gateway/command-client.test.ts
  modified: []

key-decisions:
  - "Native crypto.randomUUID() for correlation IDs (no uuid package dependency)"
  - "Delete-first pattern in handleResponse prevents timeout/response races"
  - "Callback-based sendFn enables independent testing and composition"
  - "getPendingCount() provides visibility for debugging/monitoring"

patterns-established:
  - "TDD pattern: RED (failing tests) → GREEN (implementation) → REFACTOR (cleanup)"
  - "Race condition handling: whoever deletes from Map first wins"
  - "Stale response handling: log warning for unknown CorrelationId, don't crash"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 2: Command Client Summary

**Promise-based command/response correlation over WebSocket with UUID correlation IDs, configurable timeout, and race-condition-safe cleanup**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T17:16:05Z
- **Completed:** 2026-02-07T17:18:33Z
- **Tasks:** 1 TDD feature (2 commits: test + feat)
- **Files modified:** 2

## Accomplishments
- CommandClient class with sendCommand returning Promise for response
- UUID-based CorrelationId injection via crypto.randomUUID()
- Configurable timeout (default 30s) with clear error messages
- RTN_ERR responses parsed and rejected with Attempt/Error fields
- Race condition protection: delete-first pattern prevents double-handling
- Stale response handling: unknown CorrelationIds logged but don't crash
- Memory-safe cleanup: all pending requests rejected on shutdown

## Task Commits

Each TDD phase was committed atomically:

1. **TDD RED Phase: Failing tests** - `4cf9d1c` (test)
   - 7 test cases covering correlation, timeout, error handling, cleanup, races
   - Tests written before implementation (TDD)

2. **TDD GREEN Phase: Implementation** - `faacac7` (feat)
   - CommandClient class with all features
   - All 7 tests passing

**No refactor phase needed** - code clean on first pass

## Files Created/Modified
- `src/gateway/command-client.ts` - CommandClient class with sendCommand, handleResponse, cleanup, getPendingCount
- `src/gateway/command-client.test.ts` - 7 test cases with Node.js test runner

## Decisions Made

**1. Native crypto.randomUUID() over uuid package**
- **Rationale:** Node.js 20+ built-in, no external dependency, same format
- **Impact:** Simpler dependency tree, matches existing project patterns

**2. Delete-first pattern for race condition protection**
- **Rationale:** Prevents both timeout and response from handling same request
- **Implementation:** Both timeout and handleResponse call `pending.delete()` first, whoever succeeds wins
- **Impact:** Safe against all timing edge cases

**3. Callback-based sendFn composition**
- **Rationale:** Decouples CommandClient from WebSocketConnection (same pattern as HeartbeatManager)
- **Impact:** CommandClient independently testable with mock sendFn

**4. getPendingCount() for monitoring**
- **Rationale:** Enables debugging of stuck commands and memory leak detection
- **Impact:** Visibility into CommandClient internal state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TDD workflow proceeded smoothly:
1. Tests written and verified failing (RED)
2. Implementation written to pass tests (GREEN)
3. No refactoring needed (code clean on first pass)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 03-03 (Authentication Client):**
- CommandClient provides Promise-based command sending
- Authentication client can use `await commandClient.sendCommand(loginCmd)` pattern
- Correlation, timeout, and error handling all abstracted away

**Blockers/Concerns:**
- None

---
*Phase: 03-message-infrastructure*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified:
- ✓ src/gateway/command-client.ts
- ✓ src/gateway/command-client.test.ts
- ✓ 4cf9d1c (test commit)
- ✓ faacac7 (feat commit)
