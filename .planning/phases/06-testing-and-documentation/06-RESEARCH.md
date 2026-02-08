# Phase 6: Testing & Documentation - Research

**Researched:** 2026-02-07
**Domain:** Manual hardware testing, technical spike documentation, behavior discovery
**Confidence:** MEDIUM

## Summary

This phase validates the complete spike with real CTC Connect gateway hardware and documents the findings for future milestones. Unlike typical automated testing phases, this is a validation and documentation phase for a technical spike - the goal is manual testing to discover actual hardware behavior, document findings, and create a README that enables others to run the spike.

Research focused on three core areas:
1. **Manual testing checklists for IoT hardware validation** - structured approaches to test real hardware with unpredictable behavior
2. **README best practices for technical spikes** - how to document spike findings, setup, and usage
3. **Behavior documentation patterns** - capturing discovered system characteristics (encoding formats, timing, error patterns)

**Primary recommendation:** Create three documentation artifacts - (1) a structured test checklist with manual execution tracking, (2) comprehensive behavior documentation capturing discovered gateway characteristics, and (3) a user-focused README with setup and usage instructions. Use progressive discovery approach for unknown behaviors (waveform encoding), document actual vs expected results, and capture lessons learned for future milestones.

## Standard Stack

No additional libraries needed - project already has everything required for Phase 6.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | 8.19.0 | WebSocket client | Already used in Phases 1-5 |
| zod | 4.3.6 | Configuration validation | Already used in Phases 1-5 |
| typescript | 5.9.3 | Type-safe development | Already used in Phases 1-5 |
| tsx | 4.21.0 | TypeScript execution | Already used in Phases 1-5 |

### Testing Tools (Optional - NOT recommended for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | latest | Unit testing | Future milestones, not spike |
| jest | latest | Unit testing | Future milestones, not spike |
| mock-socket | latest | WebSocket mocking | Future milestones, not spike |

**Key Decision:** Phase 6 is MANUAL testing with real hardware. Automated testing is deferred to Milestone 1+ per requirements (REQUIREMENTS.md explicitly lists automated tests as v2 requirements).

**Installation:**
```bash
# No new dependencies needed
# Project already has all required libraries
```

## Architecture Patterns

### Recommended Documentation Structure

Phase 6 produces three documentation artifacts in this order:

```
.
├── README.md                    # User-facing: setup, config, usage
├── docs/
│   ├── BEHAVIOR.md             # Discovered gateway behavior
│   └── TEST-RESULTS.md         # Manual test execution log
└── .planning/phases/06-testing-and-documentation/
    └── TEST-CHECKLIST.md       # Test scenarios with pass/fail tracking
```

### Pattern 1: Test Checklist Structure

**What:** A structured markdown checklist that guides manual test execution
**When to use:** Phase 6 manual hardware testing
**Example:**

```markdown
# Test Checklist: Gateway Integration Spike

**Hardware:** CTC Connect Gateway (Serial: XXX)
**Tester:** [Name]
**Date:** [Date]
**Environment:** [Network details, gateway IP]

## Test Scenario 1: Connection Establishment
**Requirement:** TEST-02 (Verify connection establishes successfully)
**Prerequisites:** Gateway powered on, network accessible

### Steps
- [ ] 1. Start application with valid GATEWAY_URL
- [ ] 2. Observe connection logs
- [ ] 3. Verify state transitions: DISCONNECTED → CONNECTING → CONNECTED

### Expected Results
- Connection establishes within 10 seconds
- No error messages in logs
- WebSocket state is "open"

### Actual Results
[Record what actually happened]

### Pass/Fail: [PASS/FAIL/BLOCKED]
**Notes:** [Any unexpected behavior, timing, error messages]

---

## Test Scenario 2: Authentication
[Similar structure...]
```

**Source:** Adapted from [The Importance of Test Documentation in Manual Testing](https://www.testdevlab.com/blog/the-importance-of-test-documentation-in-manual-testing-types-best-practices)

### Pattern 2: Behavior Documentation Structure

**What:** Technical documentation of discovered system behavior
**When to use:** Documenting IoT hardware characteristics during validation
**Example:**

```markdown
# Gateway Behavior Documentation

**Gateway Model:** CTC Connect Wireless
**Firmware Version:** [Discovered during testing]
**Documented:** 2026-02-07

## Waveform Encoding Format

**Discovery Date:** [Date]
**Requirement:** DOC-01

### Encoding Details
- **Format:** [CSV/JSON/Base64] - determined by parser
- **Data Type:** [Int16LE/Float32/etc]
- **Units:** [milli-g/g/raw counts]
- **Sample Count:** [Actual samples per axis]
- **Byte Order:** [Little-endian/Big-endian if binary]

### Example Raw Data
```
X: [First 100 chars of actual X string]
Y: [First 100 chars of actual Y string]
Z: [First 100 chars of actual Z string]
```

### Parsing Strategy
[Which parser strategy succeeded: CSV/JSON/Base64]

### Value Ranges Observed
- X-axis: [min] to [max] g
- Y-axis: [min] to [max] g
- Z-axis: [min] to [max] g

---

## Timeout Characteristics

**Requirement:** DOC-02

### Command Response Timeouts
| Command | Typical Response Time | Max Observed | Timeout Setting |
|---------|----------------------|--------------|-----------------|
| POST_LOGIN | [actual] ms | [max] ms | 30s configured |
| GET_DYN_CONNECTED | [actual] ms | [max] ms | 30s configured |
| TAKE_DYN_READING | [actual] ms | [max] ms | 30s configured |

### Notification Arrival Times
| Notification | After Command | Typical Delay | Max Observed |
|--------------|---------------|---------------|--------------|
| NOT_DYN_READING_STARTED | TAKE_DYN_READING | [actual] ms | [max] ms |
| NOT_DYN_READING | NOT_DYN_READING_STARTED | [actual] s | [max] s |
| NOT_DYN_TEMP | TAKE_DYN_READING | [actual] s | [max] s |

---

## Error Messages

**Requirement:** DOC-02

### Observed RTN_ERR Responses
| Scenario | Error.Attempt | Error.Error | Meaning |
|----------|---------------|-------------|---------|
| [Scenario] | [value] | [value] | [Interpretation] |

### Connection Close Codes
| Close Code | Scenario | Meaning |
|------------|----------|---------|
| [code] | [when it happened] | [what it means] |
```

**Source:** Adapted from [Test Documentation Best Practices](https://testrigor.com/blog/test-documentation-best-practices-with-examples/)

### Pattern 3: README Structure for Technical Spikes

**What:** User-facing documentation for running and understanding the spike
**When to use:** Phase 6 README creation (DOC-03)
**Example:**

```markdown
# Gateway Integration Spike

Technical spike validating CTC Connect Wireless gateway WebSocket API communication.

## What This Is

A TypeScript/Node.js application that connects to a CTC Connect gateway, discovers sensors, triggers a vibration reading, and displays the waveform data. This validates the communication layer before building the full multi-gateway monitoring system.

**Status:** ✅ Validated with real hardware on [date]

## Prerequisites

- Node.js 18+ installed
- Access to CTC Connect Wireless gateway on local network
- Gateway with at least one connected sensor
- Gateway credentials (email/password)

## Setup

1. Clone repository and install dependencies:
```bash
npm install
```

2. Create `.env` file with gateway configuration:
```bash
GATEWAY_URL=ws://192.168.1.100:5000
GATEWAY_EMAIL=your-email@example.com
GATEWAY_PASSWORD=your-password
# Optional: specific sensor serial to test
# SENSOR_SERIAL=12345
```

3. Build TypeScript:
```bash
npm run build
```

## Usage

Run the spike:
```bash
npm run dev
```

Expected output:
```
[timestamp] INFO: Connecting to gateway at ws://192.168.1.100:5000
[timestamp] INFO: Connection established
[timestamp] INFO: Authenticated successfully
[timestamp] INFO: Discovered 3 connected sensors
[timestamp] INFO: Selected sensor 12345 (Part: ABC123)
[timestamp] INFO: Triggering vibration reading...
[timestamp] INFO: Reading started successfully
[timestamp] INFO: Waveform data received (6400 samples per axis)

Waveform Statistics:
X-axis: min=-2.34g, max=3.12g, mean=0.05g
Y-axis: min=-1.87g, max=2.45g, mean=-0.02g
Z-axis: min=-9.91g, max=-9.65g, mean=-9.81g (gravity bias)

First 10 samples (X/Y/Z):
[displays sample data...]
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| GATEWAY_URL | Yes | - | WebSocket URL (ws://ip:5000) |
| GATEWAY_EMAIL | Yes | - | Gateway login email |
| GATEWAY_PASSWORD | Yes | - | Gateway login password |
| SENSOR_SERIAL | No | First discovered | Specific sensor to test |
| LOG_LEVEL | No | info | Log level (debug/info/warn/error) |
| HEARTBEAT_INTERVAL_MS | No | 30000 | Heartbeat interval (ms) |
| COMMAND_TIMEOUT_MS | No | 30000 | Command timeout (ms) |
| ACQUISITION_TIMEOUT_MS | No | 60000 | Reading timeout (ms) |

## What Was Validated

- ✅ WebSocket connection to gateway
- ✅ POST_LOGIN authentication
- ✅ GET_DYN_CONNECTED sensor discovery
- ✅ TAKE_DYN_READING acquisition trigger
- ✅ NOT_DYN_READING notification handling
- ✅ Waveform data parsing (format: [discovered format])
- ✅ Graceful shutdown and cleanup

## Key Findings

**Waveform Encoding:** [Format discovered - CSV/JSON/Base64]
**Typical Reading Time:** [actual time] seconds from trigger to completion
**Sensor Configuration:** [read rate, samples, g-range observed]

See `docs/BEHAVIOR.md` for detailed gateway behavior documentation.

## Project Structure

```
src/
├── config.ts                    # Configuration loading and validation
├── main.ts                      # Application entry point
├── types/                       # TypeScript type definitions
│   ├── connection.ts           # Connection state types
│   ├── messages.ts             # Gateway message types
│   └── index.ts                # Type exports
├── gateway/                     # Gateway communication
│   ├── connection.ts           # WebSocket connection management
│   ├── command-client.ts       # Command/response handling
│   ├── notification-handler.ts # Notification routing
│   ├── message-router.ts       # Message type routing
│   ├── authenticator.ts        # Authentication logic
│   ├── sensor-discovery.ts     # Sensor discovery
│   ├── heartbeat.ts            # Connection health monitoring
│   └── reconnect.ts            # Reconnection logic
├── acquisition/                 # Data acquisition
│   ├── acquisition-manager.ts  # Reading orchestration
│   └── waveform-parser.ts      # Waveform decoding
├── output/                      # Display utilities
│   └── waveform-display.ts     # Console output formatting
└── utils/                       # Shared utilities
    └── logger.ts               # Logging infrastructure
```

## Next Steps (Future Milestones)

This spike validates the foundation. Next milestones will add:
- **Milestone 1:** Factory and gateway CRUD operations
- **Milestone 2:** Sensor assignment to equipment
- **Milestone 3:** Persistent waveform storage
- **Milestone 4:** Waveform visualization and FFT analysis
- **Milestone 5:** Scheduled acquisition programs
- **Milestone 6:** Alarm rules and notifications

## Troubleshooting

**Connection fails:**
- Verify gateway IP and network accessibility
- Check gateway is powered on and ready
- Confirm WebSocket endpoint is ws://ip:5000 (no path)

**Authentication fails:**
- Verify email/password credentials
- Check gateway user account is active

**No sensors discovered:**
- Verify at least one sensor is powered on
- Check sensor is within wireless range of gateway
- Sensor LED should indicate connected state

**Reading timeout:**
- Check sensor is still connected during acquisition
- Increase ACQUISITION_TIMEOUT_MS if needed
- Verify sensor is not in low-battery state

## License

[Your license]
```

**Source:** Adapted from [README Best Practices](https://github.com/jehna/readme-best-practices) and [Technical Spike Template](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/templates/template-technical-spike/)

### Anti-Patterns to Avoid

- **Over-automating manual tests:** Don't build automated test infrastructure for a spike - manual execution is appropriate and faster
- **Assuming behavior without evidence:** Don't document what "should" happen - document what ACTUALLY happens with real hardware
- **Premature abstraction:** Don't create reusable test frameworks for single-use spike validation
- **README as implementation guide:** README should help users RUN the spike, not explain how it was BUILT (that's what code structure and inline comments are for)
- **Hiding test failures:** Document what didn't work or surprised you - these are valuable lessons

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test execution tracking | Custom test runner script | Markdown checklist with manual tracking | Spike is one-time validation, not repeated testing |
| Screenshot/recording tools | Custom screenshot code | OS native (Command+Shift+4 on Mac, Snipping Tool on Windows) | Built-in tools work fine for manual testing |
| Waveform encoding detection | Single parser | Progressive strategy (already implemented in waveform-parser.ts) | Unknown format requires fallback strategies |
| Log analysis | Custom log parser | Manual review with grep/search | Spike generates manageable log volume |

**Key insight:** For technical spike validation, manual approaches are faster and more appropriate than building automated infrastructure. The goal is to discover behavior and validate viability, not create a test suite.

## Common Pitfalls

### Pitfall 1: Testing Without Real Hardware
**What goes wrong:** Attempting to test with mocks or simulated gateway behavior fails to discover actual hardware characteristics
**Why it happens:** Real hardware isn't available or tests are written before hardware access
**How to avoid:** Block Phase 6 execution until real gateway access is confirmed. Mark requirements as BLOCKED if hardware unavailable
**Warning signs:** Tests pass but don't actually validate waveform encoding or real timing behavior

### Pitfall 2: Not Capturing Actual Error Messages
**What goes wrong:** Documentation says "handles errors gracefully" without recording actual RTN_ERR messages, close codes, or failure modes
**Why it happens:** Focus on happy path testing, not edge case validation
**How to avoid:** Deliberately trigger error scenarios (wrong password, invalid sensor serial, network disconnect). Copy actual error message text verbatim
**Warning signs:** BEHAVIOR.md has no error message examples, test results show only passing scenarios

### Pitfall 3: Assuming Waveform Encoding
**What goes wrong:** Documentation claims waveform format without actually receiving and parsing real data from gateway
**Why it happens:** Speculation based on API docs or assumptions about "standard" formats
**How to avoid:** Run application with real sensor, capture actual X/Y/Z strings, verify which parser strategy succeeds. Include raw data samples in documentation
**Warning signs:** DOC-01 completed but no actual waveform data samples captured

### Pitfall 4: Missing Timing Characteristics
**What goes wrong:** Documentation doesn't capture actual response times, notification delays, or timeout thresholds needed for future work
**Why it happens:** Focus on functionality (it worked!) rather than behavior characteristics
**How to avoid:** Use logger timestamps to measure actual delays between command and response, command and notification. Record min/max/typical timing
**Warning signs:** BEHAVIOR.md has no timing data, timeout values are "good enough" without evidence

### Pitfall 5: README Prerequisites Without Validation
**What goes wrong:** README lists prerequisites (Node version, gateway access, credentials) but setup instructions haven't been validated by fresh user
**Why it happens:** Developer who built the spike writes README from memory, not from actual setup experience
**How to avoid:** Test README setup instructions on clean machine or with fresh clone. Better yet, have someone else follow README without help
**Warning signs:** README says "just run npm install" but missing .env template, no troubleshooting section

### Pitfall 6: Test Checklist Without Failure Scenarios
**What goes wrong:** Test checklist only validates happy path (connection succeeds, auth succeeds, reading succeeds) without edge cases
**Why it happens:** Requirements focus on positive validation, edge cases feel "out of scope"
**How to avoid:** Explicitly test failure scenarios - wrong password, disconnected sensor, network interruption during reading. Requirements TEST-02 through TEST-07 cover positive cases, but add edge cases in checklist
**Warning signs:** All test scenarios marked PASS, no network error testing, no sensor disconnect testing

### Pitfall 7: Documentation That Duplicates Code
**What goes wrong:** BEHAVIOR.md describes what the code does rather than what the gateway does
**Why it happens:** Confusion between "behavior documentation" (gateway) and "implementation documentation" (code)
**How to avoid:** BEHAVIOR.md documents GATEWAY behavior (timeouts, encoding, errors from hardware). Code comments document IMPLEMENTATION (why parser has CSV/JSON/Base64 strategies)
**Warning signs:** BEHAVIOR.md explains TypeScript code logic instead of gateway response patterns

## Code Examples

### Example 1: Manual Test Execution Log Entry

```markdown
## Test Scenario 4: Sensor Discovery
**Requirement:** TEST-04 (Verify sensor discovery returns at least one sensor)
**Date:** 2026-02-07 15:23:00
**Tester:** Craig Cronin

### Steps
- [x] 1. Ensure at least one sensor is powered on
- [x] 2. Run application with npm run dev
- [x] 3. Wait for authentication to complete
- [x] 4. Observe GET_DYN_CONNECTED command execution
- [x] 5. Review sensor list in console output

### Expected Results
- GET_DYN_CONNECTED returns at least one sensor
- Sensor fields include: Serial, PartNum, ReadRate, Samples
- Application selects first sensor for testing

### Actual Results
- Command completed in 234ms
- Returned 2 sensors: Serial 12345 and Serial 67890
- Sensor 12345 metadata:
  - PartNum: "CTC-ACC-001"
  - ReadRate: 25600 (Hz)
  - Samples: 6400
  - GMode: "16g"
  - FreqMode: "Normal"
- Application selected sensor 12345 (first in list)

### Pass/Fail: PASS
**Notes:** Response faster than expected. Sensor configuration matches documentation (25.6kHz sample rate, 6400 samples = 0.25s capture window).
```

### Example 2: Capturing Actual Waveform Data

```typescript
// In test notes, capture actual waveform strings for documentation
// Run application, copy actual X/Y/Z strings from logs

// Example of what to record in BEHAVIOR.md:
// Waveform Encoding Discovery
// Date: 2026-02-07
// Sensor Serial: 12345
//
// Raw X string (first 200 chars):
// "AAECAQ4BEgEPARMBDQEKAQsB..."
//
// Raw Y string (first 200 chars):
// "BgEIAQkBCwEKAQkBCAEHAQYB..."
//
// Raw Z string (first 200 chars):
// "/P38/fz9/P38/fz9/P38/fz9..."
//
// Parser Result: Base64 strategy succeeded
// - Format: Base64-encoded Int16LE values
// - Conversion: rawValue / 1000 = gravity units
// - Sample count: 6400 per axis (matches sensor Samples field)
// - Value ranges: X [-2.34, 3.12]g, Y [-1.87, 2.45]g, Z [-9.91, -9.65]g
```

**Source:** Discovered pattern from waveform-parser.ts implementation

### Example 3: Documenting Timeout Behavior

```markdown
# Timeout Testing Log

## Test: Command Response Timeout
**Date:** 2026-02-07 16:45:00

### POST_LOGIN Timing
- Attempt 1: 156ms
- Attempt 2: 142ms
- Attempt 3: 178ms
- Average: 159ms
- Configured timeout: 30000ms
- **Assessment:** Timeout is appropriate (>100x margin)

### GET_DYN_CONNECTED Timing
- Attempt 1: 234ms
- Attempt 2: 198ms
- Attempt 3: 267ms
- Average: 233ms
- Configured timeout: 30000ms
- **Assessment:** Timeout is appropriate

### TAKE_DYN_READING → NOT_DYN_READING_STARTED
- Attempt 1: 89ms
- Attempt 2: 76ms
- Attempt 3: 102ms
- Average: 89ms
- **Assessment:** Very fast, indicates command accepted

### NOT_DYN_READING_STARTED → NOT_DYN_READING
- Attempt 1: 4.2s
- Attempt 2: 4.1s
- Attempt 3: 4.3s
- Average: 4.2s
- Configured timeout: 60000ms
- **Assessment:** Timeout appropriate for 0.25s capture + processing

### Recommendation
Current timeout settings are appropriate:
- Command timeout: 30s (adequate for network latency)
- Acquisition timeout: 60s (adequate for sensor reading + upload)
```

### Example 4: Error Message Capture

```markdown
# Error Scenarios Tested

## Invalid Authentication
**Scenario:** Wrong password in configuration
**Command:** POST_LOGIN with incorrect password
**Response:**
```json
{
  "Type": "RTN_ERR",
  "From": "Gateway",
  "To": "Client",
  "Data": {
    "Attempt": "POST_LOGIN",
    "Error": "Authentication failed"
  }
}
```
**Application Behavior:** Logged error, exited gracefully
**Close Code:** 1000 (normal closure after error logged)

## Invalid Sensor Serial
**Scenario:** TAKE_DYN_READING with non-existent sensor serial
**Command:** TAKE_DYN_READING with Serial: 99999
**Response:**
```json
{
  "Type": "RTN_ERR",
  "From": "Gateway",
  "To": "Client",
  "Data": {
    "Attempt": "TAKE_DYN_READING",
    "Error": "Sensor not found"
  }
}
```
**Application Behavior:** Logged error in CommandClient
**Note:** Application should validate sensor exists before triggering reading

## Network Disconnect During Reading
**Scenario:** Unplug gateway Ethernet during active reading
**Observable Behavior:**
- WebSocket close event fired
- Close code: 1006 (abnormal closure)
- Heartbeat detected failure after 30s
- Application logged "Connection lost" and attempted reconnect
**Recommendation:** Acceptable for spike. Future milestones need acquisition retry logic.
```

## State of the Art

Manual hardware testing practices are well-established, but documentation approaches have evolved.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Word/Excel test documents | Markdown checklists in repo | ~2020 | Version controlled, easier to update, visible in code review |
| Separate test management tools | Embedded test documentation | ~2022 | Reduced tool overhead for small projects/spikes |
| Post-testing documentation | Documentation during testing | ~2021 | Real-time capture reduces information loss |
| Static README templates | README-driven development | ~2019 | Writing README first clarifies scope and user experience |

**Deprecated/outdated:**
- Manual test tracking in JIRA/TestRail for spikes: Overkill for one-time validation, markdown checklist is sufficient
- Automated test frameworks for hardware spikes: WebSocket mocking doesn't validate real hardware behavior
- Separate bug tracking systems: Spike findings go in BEHAVIOR.md, not bug database

## Open Questions

Things that couldn't be fully resolved through research alone:

1. **Waveform Encoding Format**
   - What we know: Parser supports CSV, JSON, Base64 with progressive fallback
   - What's unclear: Which format gateway actually uses won't be known until Phase 6 execution
   - Recommendation: Run with real hardware, parser will discover and log format. Document in BEHAVIOR.md

2. **Actual Gateway Timeout Values**
   - What we know: Application configures 30s command timeout, 60s acquisition timeout
   - What's unclear: Whether these are appropriate for real gateway response times
   - Recommendation: Measure actual timing during Phase 6, document in BEHAVIOR.md, adjust if needed

3. **RTN_ERR Message Variations**
   - What we know: RTN_ERR has Attempt and Error fields
   - What's unclear: Full enumeration of possible Error values gateway returns
   - Recommendation: Test common failure scenarios (wrong password, invalid sensor, network errors), document actual messages

4. **Sensor Value Ranges**
   - What we know: Parser validates ±200g range, but actual sensor g-range is in metadata
   - What's unclear: Realistic min/max values for different sensor configurations (16g, 50g modes)
   - Recommendation: Document observed value ranges for tested sensor, note g-mode configuration

5. **Test Execution Time**
   - What we know: Phase requires manual testing with real hardware
   - What's unclear: How long full test checklist execution takes
   - Recommendation: Plan 2-4 hours for comprehensive testing including error scenarios and documentation

## Sources

### Primary (HIGH confidence)
- Project source code analysis:
  - `/Users/craigcronin/Development/mti-wifi-gsd/src/acquisition/waveform-parser.ts` - Progressive parsing strategy pattern
  - `/Users/craigcronin/Development/mti-wifi-gsd/.planning/REQUIREMENTS.md` - Phase 6 requirements TEST-01 through DOC-03
  - `/Users/craigcronin/Development/mti-wifi-gsd/.planning/PROJECT.md` - Spike scope and known unknowns

### Secondary (MEDIUM confidence)
- [How to Test IoT Devices for Reliability](https://www.testriq.com/blog/post/how-to-test-iot-devices-for-reliability) - IoT hardware testing practices
- [The Importance of Test Documentation in Manual Testing](https://www.testdevlab.com/blog/the-importance-of-test-documentation-in-manual-testing-types-best-practices) - Test documentation structure
- [Test Documentation Best Practices](https://testrigor.com/blog/test-documentation-best-practices-with-examples/) - Documentation patterns
- [Technical Spike Template - Microsoft](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/templates/template-technical-spike/) - Spike deliverable structure
- [README Best Practices GitHub](https://github.com/jehna/readme-best-practices) - README structure guidance
- [WebSocket Testing Essentials](https://www.thegreenreport.blog/articles/websocket-testing-essentials-strategies-and-code-for-real-time-apps/websocket-testing-essentials-strategies-and-code-for-real-time-apps.html) - WebSocket edge case testing

### Tertiary (LOW confidence)
- [IoT Testing Tools 2026](https://thectoclub.com/tools/best-iot-testing-tools/) - Tool survey (most tools inappropriate for spike)
- [Top WebSocket Testing Tools](https://apidog.com/blog/websocket-testing-tools/) - Mostly automated testing tools (not needed for Phase 6)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, everything already installed
- Architecture: MEDIUM - Patterns adapted from web sources and spike context, not verified with real execution yet
- Pitfalls: MEDIUM - Derived from IoT testing best practices and technical spike patterns, contextualized for this project

**Research date:** 2026-02-07
**Valid until:** 30 days (stable practices, unlikely to change rapidly)

**Notes:**
- Phase 6 is unique - it's validation and documentation, not implementation
- Manual testing with real hardware is the correct approach (not automated testing)
- Three documentation artifacts: TEST-CHECKLIST.md (planning artifact), BEHAVIOR.md (discovered behavior), README.md (user guide)
- Progressive discovery approach aligns with spike philosophy - test to learn, not to confirm
