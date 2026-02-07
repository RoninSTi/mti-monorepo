---
phase: 04-authentication-and-discovery
plan: 02
subsystem: authentication
tags: [websocket, authentication, sensor-discovery, zod, nodejs]

# Dependency graph
requires:
  - phase: 04-01
    provides: authenticate() function and markAuthenticated() method
  - phase: 03-02
    provides: CommandClient for sending commands and receiving responses
  - phase: 03-01
    provides: SensorMetadata schema for validation
provides:
  - discoverSensor() function for querying and selecting connected sensors
  - Complete application flow: connect -> authenticate -> discover -> ready
  - Error handling for no sensors (exit 0) and auth failures (exit 1)
affects: [05-acquisition, sensor-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onOpen callback pattern for connection lifecycle events
    - Async flow orchestration with try/catch error handling

key-files:
  created:
    - src/gateway/sensor-discovery.ts
  modified:
    - src/gateway/connection.ts
    - src/main.ts

key-decisions:
  - "onOpen callback pattern matches existing onMessage pattern for consistency"
  - "discoverSensor() receives preferredSerial parameter rather than importing config for testability"
  - "SensorMetadataSchema.safeParse() per entry allows invalid entries to be logged without failing entire discovery"
  - "No sensors exits code 0 (valid operational state), auth failure exits code 1 (error)"
  - "Selected sensor logged but not stored globally - Phase 5 will add storage for acquisition"

patterns-established:
  - "Callback-based lifecycle events (onOpen, onMessage) for connection state changes"
  - "Async flow orchestration in onConnectionOpen() with centralized error handling"
  - "Per-entry validation with safeParse() for dictionary responses from gateway"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 4 Plan 2: Sensor Discovery and Flow Orchestration Summary

**Full application orchestration: connect -> authenticate -> discover sensor -> ready for acquisition**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T17:51:18Z
- **Completed:** 2026-02-07T17:53:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created discoverSensor() function that queries gateway, validates responses, filters connected sensors
- Added onOpen callback to WebSocketConnection for lifecycle event handling
- Wired complete application flow: connect -> authenticate -> transition to AUTHENTICATED -> discover sensor -> ready
- Graceful error handling: no sensors exits code 0, auth failure exits code 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sensor discovery function** - `46bb8c2` (feat)
2. **Task 2: Wire authentication and discovery flow into main.ts** - `58edb27` (feat)

## Files Created/Modified
- `src/gateway/sensor-discovery.ts` - Discovers connected sensors via GET_DYN_CONNECTED, validates metadata per-entry with safeParse, filters for Connected === 1, selects preferred or first
- `src/gateway/connection.ts` - Added onOpen callback method and invocation in handleOpen()
- `src/main.ts` - Orchestrates full flow with onConnectionOpen() async function, calls authenticate() and discoverSensor(), handles errors with appropriate exit codes

## Decisions Made

**1. onOpen callback pattern matches onMessage**
- Rationale: Consistency with existing connection callback architecture
- Impact: Clean lifecycle event handling without polling state or returning Promises from connect()

**2. discoverSensor() receives preferredSerial as parameter**
- Rationale: Avoids importing config directly, improves testability
- Impact: Function can be tested with mock CommandClient and different serial numbers

**3. SensorMetadataSchema.safeParse() per dictionary entry**
- Rationale: Invalid entries should be logged without failing entire discovery
- Impact: Resilient to partial gateway data corruption or schema evolution

**4. Exit code semantics: no sensors (0) vs auth failure (1)**
- Rationale: No sensors is a valid operational state (nothing to do), auth failure is an error
- Impact: Clear distinction for monitoring and orchestration systems

**5. Selected sensor logged but not stored globally yet**
- Rationale: Phase 5 will need sensor storage for acquisition flow
- Impact: Defers global state decision until acquisition requirements known

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

**Ready for Phase 5 (Acquisition):**
- Full connection lifecycle working: connect -> authenticate -> discover
- Sensor selection complete with metadata available
- Error paths tested (no sensors, auth failure)

**Needs for Phase 5:**
- Store selected sensor for TAKE_DYN_READING command
- Subscribe to NOT_DYN_READING notifications
- Trigger reading and display waveform data

**No blockers or concerns.**

---
*Phase: 04-authentication-and-discovery*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files and commits verified.
