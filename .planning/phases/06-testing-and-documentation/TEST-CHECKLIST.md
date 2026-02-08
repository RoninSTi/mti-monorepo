# Gateway Integration Spike - Manual Test Checklist

**Purpose:** Validate the complete spike end-to-end with real CTC Connect Wireless gateway hardware. This checklist captures actual gateway behavior to inform Milestone 1+ development.

## Test Environment

**Hardware:**
- Gateway Model: _____________________
- Gateway Serial: _____________________
- Gateway Firmware: _____________________
- Sensor Model: _____________________
- Sensor Serial: _____________________

**Test Details:**
- Tester: _____________________
- Date: _____________________
- Application Commit: _____________________

**Network Environment:**
- Gateway IP: _____________________
- Network Type: _____________________
- Client Machine OS: _____________________

**Configuration:**
- GATEWAY_URL: _____________________
- GATEWAY_EMAIL: _____________________
- LOG_LEVEL: _____________________ (recommend: debug)
- COMMAND_TIMEOUT: _____________________
- ACQUISITION_TIMEOUT: _____________________

---

## Test Scenario 1: Full End-to-End Flow (TEST-01)

**Requirement:** Verify complete application flow from connection through waveform display to clean exit

**Prerequisites:**
- [ ] Gateway powered on and accessible on network
- [ ] At least one sensor powered on and connected to gateway
- [ ] `.env` file configured with valid GATEWAY_URL, GATEWAY_EMAIL, GATEWAY_PASSWORD
- [ ] LOG_LEVEL=debug set for maximum visibility
- [ ] Application built: `npm run build`

**Steps:**
1. [ ] Run `npm run dev` from project root
2. [ ] Observe complete flow execution:
   - Connection establishment
   - Authentication
   - Sensor discovery
   - Subscription
   - Reading acquisition
   - Waveform display
   - Unsubscribe
   - Clean exit
3. [ ] Note process exit code

**Expected Results:**
- Application runs to completion without errors
- Waveform statistics displayed in console
- Process exits with code 0
- No error messages or warnings (except debug-level informational messages)

**Actual Results:**
```
[Record complete console output or summary here]

Total execution time: _____ seconds
Exit code: _____
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Any warnings, unexpected behavior, performance observations]
```

---

## Test Scenario 2: Connection Establishment (TEST-02)

**Requirement:** Verify WebSocket connection establishes successfully

**Prerequisites:**
- [ ] Gateway accessible on network
- [ ] Valid GATEWAY_URL in .env

**Steps:**
1. [ ] Start application with `npm run dev`
2. [ ] Observe connection logs
3. [ ] Verify state transitions logged:
   - DISCONNECTED (initial state)
   - CONNECTING (attempting connection)
   - CONNECTED (connection established)
4. [ ] Note connection establishment time

**Expected Results:**
- Connection establishes within 10 seconds
- State transitions logged in correct order
- No connection errors
- WebSocket state is "open"
- Log message: "Connection established"

**Actual Results:**
```
Connection attempt started: [timestamp]
Connection established: [timestamp]
Connection time: _____ ms
State transitions observed: _____________________
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Actual connection time, any retries, network conditions]
```

---

## Test Scenario 3: Authentication (TEST-03)

**Requirement:** Verify POST_LOGIN command authenticates successfully

**Prerequisites:**
- [ ] Connection established (Scenario 2 passed)
- [ ] Valid credentials in .env

**Steps:**
1. [ ] Observe POST_LOGIN command sent after connection opens
2. [ ] Check for authentication success log message
3. [ ] Verify state transition to AUTHENTICATED
4. [ ] Note authentication response time

**Expected Results:**
- POST_LOGIN command sent with Email/Password fields
- Authentication succeeds (no RTN_ERR)
- Log message: "Authenticated successfully as [email]"
- State transitions to AUTHENTICATED
- Password NOT logged (security check)

**Actual Results:**
```
POST_LOGIN sent: [timestamp]
Response received: [timestamp]
Auth response time: _____ ms
State transition: CONNECTED -> AUTHENTICATED
Response data (if any): _____________________
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Any response data logged, auth timing, security observations]
```

---

## Test Scenario 4: Sensor Discovery (TEST-04)

**Requirement:** Verify GET_DYN_CONNECTED returns at least one sensor with complete metadata

**Prerequisites:**
- [ ] Authentication successful (Scenario 3 passed)
- [ ] At least one sensor powered on and connected to gateway

**Steps:**
1. [ ] Observe GET_DYN_CONNECTED command execution
2. [ ] Review sensor list in console output
3. [ ] Verify sensor metadata fields present
4. [ ] Note which sensor was selected for testing

**Expected Results:**
- GET_DYN_CONNECTED returns at least one sensor
- Each sensor has: Serial, PartNum, ReadRate, Samples
- Optional fields may include: GMode, FreqMode, BatteryPercent, Temperature
- Application selects sensor (first in list or SENSOR_SERIAL match)
- Log message: "Selected sensor [serial] (Part: [partnum])"

**Actual Results:**
```
GET_DYN_CONNECTED response time: _____ ms

Sensor count: _____

Sensor 1:
  Serial: _____________________
  PartNum: _____________________
  ReadRate: _____________________ Hz
  Samples: _____________________
  GMode: _____________________
  FreqMode: _____________________
  BatteryPercent: _____________________
  Temperature: _____________________
  [Other fields]: _____________________

Sensor 2 (if present):
  [Same structure]

Selected sensor: _____________________
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Response timing, sensor configuration observations, unexpected fields]
```

---

## Test Scenario 5: Reading Trigger (TEST-05)

**Requirement:** Verify TAKE_DYN_READING command triggers acquisition successfully

**Prerequisites:**
- [ ] Sensor discovered and selected (Scenario 4 passed)
- [ ] POST_SUB_CHANGES subscription completed

**Steps:**
1. [ ] Observe TAKE_DYN_READING command sent with selected sensor Serial
2. [ ] Check for NOT_DYN_READING_STARTED notification
3. [ ] Verify Success=true in notification Data
4. [ ] Measure time between command and notification

**Expected Results:**
- TAKE_DYN_READING command sent with Serial field matching selected sensor
- Command accepted (no RTN_ERR)
- NOT_DYN_READING_STARTED notification received
- Notification Data.Success = true
- Log message: "Reading started successfully"
- Notification arrives within 1 second of command

**Actual Results:**
```
TAKE_DYN_READING sent: [timestamp]
NOT_DYN_READING_STARTED received: [timestamp]
Command-to-notification delay: _____ ms

Notification Data:
  Success: _____
  [Other fields]: _____________________
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Command response time, notification timing, any error indicators]
```

---

## Test Scenario 6: Waveform Data (TEST-06)

**Requirement:** Verify NOT_DYN_READING notification contains valid waveform data that can be parsed and displayed

**CRITICAL:** This is the primary discovery test - capture detailed waveform encoding information.

**Prerequisites:**
- [ ] Reading triggered successfully (Scenario 5 passed)

**Steps:**
1. [ ] Observe NOT_DYN_READING notification arrival
2. [ ] Check parser output for encoding format detection
3. [ ] Review waveform statistics display
4. [ ] Capture raw X/Y/Z string samples
5. [ ] Note sample counts and value ranges

**Expected Results:**
- NOT_DYN_READING notification received
- Notification Data contains: X, Y, Z fields (waveform strings)
- Parser successfully identifies encoding format
- Waveform statistics displayed:
  - Sample count per axis
  - Min/Max/Mean per axis
  - First 10 samples per axis
- Log message: "Waveform data received ([count] samples per axis)"

**Actual Results:**

### Waveform Encoding Discovery

**Encoding format detected:** _____________________ (CSV / JSON / Base64 / Other)

**Parser strategy that succeeded:** _____________________

**Raw waveform data samples (first 200 characters):**

X string:
```
[Paste first 200 chars of X string from logs]
```

Y string:
```
[Paste first 200 chars of Y string from logs]
```

Z string:
```
[Paste first 200 chars of Z string from logs]
```

### Waveform Statistics

**Sample count per axis:** _____________________

**Value ranges observed:**
```
X-axis: min = _____ g, max = _____ g, mean = _____ g
Y-axis: min = _____ g, max = _____ g, mean = _____ g
Z-axis: min = _____ g, max = _____ g, mean = _____ g
```

**First 10 samples (X, Y, Z):**
```
[Copy from console output]
```

**Units:** _____________________ (g / milli-g / raw counts / unknown)

### Timing

```
NOT_DYN_READING_STARTED received: [timestamp]
NOT_DYN_READING received: [timestamp]
Acquisition duration: _____ seconds
```

### Temperature Notification

```
NOT_DYN_TEMP received: [ ] YES  [ ] NO
If YES:
  Temperature value: _____________________
  Timing: _____ seconds after TAKE_DYN_READING
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Parser behavior, data quality observations, any anomalies in waveform data]
```

---

## Test Scenario 7: Clean Shutdown (TEST-07)

**Requirement:** Verify application unsubscribes and exits cleanly

**Prerequisites:**
- [ ] Full acquisition flow completed (Scenario 6 passed)

**Steps:**
1. [ ] Observe POST_UNSUB_CHANGES command sent
2. [ ] Check for connection close logged
3. [ ] Verify process exits with code 0
4. [ ] Note shutdown timing

**Expected Results:**
- POST_UNSUB_CHANGES command sent before exit
- Connection closes with code 1000 (normal closure)
- Log message: "Acquisition complete - shutting down"
- Process exits with code 0
- No hanging processes or unclosed connections

**Actual Results:**
```
POST_UNSUB_CHANGES sent: [timestamp]
Connection close code: _____
Process exit code: _____
Shutdown duration: _____ ms
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
[Shutdown timing, any cleanup warnings, process exit behavior]
```

---

## Edge Case Scenarios (Optional - Test if Time Permits)

### Edge Case 1: Invalid Authentication

**Scenario:** Wrong password in .env configuration

**Steps:**
1. [ ] Modify GATEWAY_PASSWORD to incorrect value
2. [ ] Run `npm run dev`
3. [ ] Observe error handling

**Expected Results:**
- POST_LOGIN returns RTN_ERR
- Error message logged
- Application exits gracefully (no crash)
- Exit code 1 (error)

**Actual Results:**
```
RTN_ERR received:
  Attempt: _____________________
  Error: _____________________

Application behavior: _____________________
Exit code: _____
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Edge Case 2: No Sensors Connected

**Scenario:** All sensors disconnected/powered off

**Steps:**
1. [ ] Power off all sensors or ensure none connected to gateway
2. [ ] Run `npm run dev`
3. [ ] Observe graceful handling

**Expected Results:**
- GET_DYN_CONNECTED returns empty list or no sensors
- Log message: "No sensors currently connected"
- Application exits gracefully with code 0 (valid state, nothing to do)

**Actual Results:**
```
GET_DYN_CONNECTED response: _____________________
Log messages: _____________________
Exit code: _____
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Edge Case 3: Network Interruption During Acquisition

**Scenario:** Network disconnected while waiting for waveform data

**Steps:**
1. [ ] Start acquisition flow
2. [ ] After TAKE_DYN_READING sent, briefly disconnect network (unplug Ethernet or disable WiFi)
3. [ ] Observe error handling and recovery attempts

**Expected Results:**
- WebSocket close event detected
- Close code 1006 (abnormal closure) logged
- Application logs connection loss
- May attempt reconnection (depending on timing)
- Eventually times out or recovers

**Actual Results:**
```
Close code: _____
Error messages: _____________________
Recovery behavior: _____________________
Final outcome: _____________________
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Edge Case 4: SIGINT During Acquisition (Ctrl+C)

**Scenario:** User interrupts application during reading

**Steps:**
1. [ ] Start acquisition flow
2. [ ] After TAKE_DYN_READING sent, press Ctrl+C
3. [ ] Observe shutdown behavior

**Expected Results:**
- SIGINT handler catches signal
- Log message: "Received SIGINT - starting graceful shutdown"
- POST_UNSUB_CHANGES attempted (best-effort)
- Connection closes
- Process exits within 2 seconds

**Actual Results:**
```
Shutdown sequence observed: _____________________
POST_UNSUB_CHANGES sent: [ ] YES  [ ] NO
Shutdown duration: _____ ms
Exit code: _____
```

**Pass/Fail:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

## Summary

**Overall Test Result:** [ ] PASS  [ ] FAIL  [ ] PARTIAL

**Total Execution Time (full flow):** _____ seconds

**Test Coverage:**
- Scenarios executed: _____ / 7 core scenarios
- Edge cases executed: _____ / 4 edge cases

### Key Discoveries

**Waveform Encoding:**
```
[Summary of encoding format discovered, parser strategy, data characteristics]
```

**Timing Characteristics:**
```
Connection: _____ ms
Authentication: _____ ms
Discovery: _____ ms
Reading trigger: _____ ms
Acquisition duration: _____ seconds
```

**Sensor Configuration:**
```
Read Rate: _____ Hz
Samples: _____
G-Range: _____
Capture duration: _____ seconds
```

### Issues Encountered

**Blockers:**
```
[Any issues that prevented test completion]
```

**Failures:**
```
[Any test scenarios that failed]
```

**Unexpected Behavior:**
```
[Anything that didn't match expected results but didn't fail the test]
```

### Recommendations for Milestone 1

**Architecture:**
```
[Based on observed behavior, any architectural recommendations for production system]
```

**Timeout Adjustments:**
```
[Based on actual timing, are configured timeouts appropriate?]
```

**Error Handling:**
```
[Based on edge case testing, any error handling improvements needed?]
```

**Performance:**
```
[Any performance observations or concerns]
```

### Validation Status

- [ ] Connection layer validated
- [ ] Authentication protocol validated
- [ ] Sensor discovery validated
- [ ] Acquisition flow validated
- [ ] Waveform encoding identified
- [ ] Parser functionality validated
- [ ] Display output validated
- [ ] Cleanup/shutdown validated

**Ready for Milestone 1:** [ ] YES  [ ] NO  [ ] CONDITIONAL

**Conditions (if applicable):**
```
[What needs to be addressed before Milestone 1]
```

---

**Test Checklist Completed By:** _____________________
**Date:** _____________________
**Signature:** _____________________
