---
phase: 04-authentication-and-discovery
plan: 01
subsystem: authentication
status: complete
tags: [authentication, post_login, sensor-metadata, config, state-transition]
requires: [03-03]
provides:
  - authenticate() function for POST_LOGIN
  - markAuthenticated()/isAuthenticated() state transition methods
  - SensorMetadata with Connected field for filtering
  - Optional SENSOR_SERIAL config
affects: [04-02, 04-03]
tech-stack:
  added: []
  patterns: [state-validation, optional-config]
key-files:
  created:
    - src/gateway/authenticator.ts
  modified:
    - src/types/messages.ts
    - src/config.ts
    - src/gateway/connection.ts
decisions:
  - decision: "10-second auth timeout (not default 30s)"
    rationale: "Authentication should be fast; industry best practice"
    impact: "authenticate() uses AUTH_TIMEOUT_MS = 10_000"
  - decision: "markAuthenticated() validates state transition"
    rationale: "Only allow CONNECTED -> AUTHENTICATED, prevent double-auth"
    impact: "Warns and returns if called from wrong state"
  - decision: "SENSOR_SERIAL as optional number"
    rationale: "Research recommends optional (use first available if not specified); Serial in SensorMetadata is number, so config should match"
    impact: "Config type changed from string (required) to number | undefined"
  - decision: "authenticate() returns unknown"
    rationale: "POST_LOGIN response structure is open question from research"
    impact: "Response data logged at debug level for discovery in Phase 6"
  - decision: "authenticate() logs email but never password"
    rationale: "Security: avoid credential exposure in logs"
    impact: "Only email logged in info message"
metrics:
  duration: 1min
  completed: 2026-02-07
---

# Phase 4 Plan 01: Authentication Foundation Summary

JWT auth with POST_LOGIN command, sensor metadata filtering via Connected field, optional SENSOR_SERIAL config

## Objective Delivered

Created authentication foundation for Phase 4: `authenticate()` function that sends POST_LOGIN via CommandClient, updated SensorMetadataSchema to include Connected field for filtering connected sensors, made SENSOR_SERIAL optional in config (per research recommendation), and added `markAuthenticated()`/`isAuthenticated()` methods to WebSocketConnection for state management.

## Task Commits

| Task | Description | Commit | Files Changed |
|------|-------------|--------|---------------|
| 1 | Update SensorMetadata schema and config | ef8afed | src/types/messages.ts, src/config.ts |
| 2 | Create authenticate function and add connection state methods | 3164292 | src/gateway/authenticator.ts, src/gateway/connection.ts |

## Decisions Made

### 1. 10-second auth timeout (not default 30s)

**Context:** authenticate() function needs timeout parameter

**Decision:** Use AUTH_TIMEOUT_MS = 10_000 (10 seconds), not the default 30s CommandClient timeout

**Rationale:**
- Authentication should be fast (network round-trip + credential validation)
- Industry best practice: short auth timeouts prevent hung connections
- If auth takes >10s, likely network or gateway problem

**Impact:** authenticate() passes 10_000 as timeout override to commandClient.sendCommand()

**Affects:** All authentication attempts in Phase 4+

---

### 2. markAuthenticated() validates state transition

**Context:** WebSocketConnection needs method to transition to AUTHENTICATED state

**Decision:** markAuthenticated() only allows transition from CONNECTED state, warns and returns if called from wrong state

**Rationale:**
- Prevents double-authentication (can't authenticate from AUTHENTICATED state)
- Prevents authenticating from wrong states (DISCONNECTED, CONNECTING, CLOSING, CLOSED)
- Clear error message if misused

**Impact:** Caller must ensure connection is CONNECTED before calling markAuthenticated()

**Affects:** Plan 02 (authentication flow orchestration)

---

### 3. SENSOR_SERIAL as optional number

**Context:** Phase 4 research recommended making SENSOR_SERIAL optional; current config has it as required string

**Decision:** Change from `z.string().min(1)` to `z.coerce.number().optional()`

**Rationale:**
- Research says: if not specified, use first available connected sensor
- Serial numbers in SensorMetadata are `z.number()`, so config should match for comparison
- z.coerce.number() handles string env vars being coerced to number
- Makes application startup more flexible

**Impact:**
- Config type changed: SENSOR_SERIAL becomes `number | undefined`
- Application can start without SENSOR_SERIAL in .env
- Phase 5 will need to handle undefined (select first available)

**Affects:** Phase 5 (sensor discovery and selection)

---

### 4. authenticate() returns unknown

**Context:** POST_LOGIN response structure not documented in research

**Decision:** authenticate() return type is `Promise<unknown>`, response data logged at debug level

**Rationale:**
- Research identified POST_LOGIN response structure as open question
- Don't make assumptions about shape until we see actual response
- Logging at debug level allows discovery during Phase 6 testing

**Impact:** Caller receives response but can't rely on specific structure until discovered

**Affects:** Phase 6 (testing will reveal actual structure)

---

### 5. authenticate() logs email but never password

**Context:** Need authentication logging for debugging

**Decision:** Log email in info message, never log password, response data only at debug level

**Rationale:**
- Security: avoid credential exposure in logs
- Email not sensitive (already transmitted over TLS)
- Password exposure could compromise account

**Impact:** Debug logs show "Authenticating with gateway as <email>" but no password

**Affects:** All authentication attempts, log security posture

## Implementation Notes

### SensorMetadataSchema Updates

Added all fields from DISC-03 requirement:
- `Connected: z.number()` (required) - Critical for filtering connected sensors
- `AccessPoint: z.string().optional()` - AP the sensor is connected to
- `GMode: z.number().optional()` - G-force mode
- `FreqMode: z.number().optional()` - Frequency mode
- `ReadPeriod: z.number().optional()` - Reading period
- `HwVer: z.string().optional()` - Hardware version
- `FmVer: z.string().optional()` - Firmware version

Most fields optional because gateway may not return all fields for every sensor. Connected is required because it's critical for filtering. Kept `.passthrough()` for forward compatibility (decision from Phase 3).

### authenticate() Function Design

**Function signature:**
```typescript
export async function authenticate(
  commandClient: CommandClient,
  config: Config
): Promise<unknown>
```

**Key behaviors:**
- Sends POST_LOGIN via CommandClient with email/password from config
- Uses 10s timeout (AUTH_TIMEOUT_MS constant)
- Logs success at info level, response data at debug level
- On error: logs error message, provides actionable guidance for credential errors
- Re-throws errors for caller to handle (close connection, exit)
- Does NOT call markAuthenticated() - that's caller's responsibility

**Error handling:**
- Catches CommandClient errors (timeout, RTN_ERR)
- Provides actionable guidance if error message contains "Invalid" or "credential"
- Re-throws to allow caller to decide what to do (close connection, exit with code 1)

### WebSocketConnection State Methods

**markAuthenticated():**
- Validates state is CONNECTED before transition
- Warns and returns if called from wrong state
- Calls setState(ConnectionState.AUTHENTICATED)

**isAuthenticated():**
- Simple boolean check: `return this.state === ConnectionState.AUTHENTICATED`

## Verification Results

All verification criteria passed:

1. ✅ `npx tsc --noEmit` passes with zero errors
2. ✅ `src/gateway/authenticator.ts` exists and exports `authenticate` function
3. ✅ `src/types/messages.ts` SensorMetadataSchema includes `Connected: z.number()`
4. ✅ `src/config.ts` SENSOR_SERIAL uses `z.coerce.number().optional()`
5. ✅ `src/gateway/connection.ts` has `markAuthenticated()` and `isAuthenticated()` methods
6. ⚠️ No test infrastructure exists yet (Vitest not configured)

## Success Criteria

All success criteria met:

- ✅ SensorMetadata type includes all DISC-03 fields (Serial, Connected, AccessPoint, PartNum, ReadRate, GMode, FreqMode, ReadPeriod, Samples, HwVer, FmVer)
- ✅ SENSOR_SERIAL config is optional (application starts without it)
- ✅ authenticate() sends POST_LOGIN with correct structure via CommandClient
- ✅ authenticate() uses 10s timeout, not default 30s
- ✅ authenticate() logs email but never password
- ✅ markAuthenticated() only transitions from CONNECTED state
- ✅ TypeScript compiles with no errors

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Open Questions:**
1. POST_LOGIN response structure unknown (will be discovered in Phase 6 testing)
2. Actual sensor serial number values unknown until Phase 6 testing

**Readiness for Plan 02:** ✅ Ready
- authenticate() function available
- markAuthenticated()/isAuthenticated() methods available
- Plan 02 can integrate authentication into connection lifecycle

**Readiness for Plan 03:** ✅ Ready
- SensorMetadata.Connected field available for filtering
- SENSOR_SERIAL optional config available
- Plan 03 can implement sensor discovery and selection logic

## Self-Check: PASSED

✅ All created files exist:
- src/gateway/authenticator.ts

✅ All commits exist:
- ef8afed
- 3164292
