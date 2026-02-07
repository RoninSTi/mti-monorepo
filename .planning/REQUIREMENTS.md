# Requirements: Gateway Integration Spike (Milestone 0)

**Defined:** 2026-02-07
**Core Value:** Validate gateway communication layer works reliably before building full architecture

## v1 Requirements

Requirements for the technical spike. Each maps to roadmap phases.

### Connection Management

- [ ] **CONN-01**: Establish WebSocket connection to ws://\<gateway-ip\>:5000
- [ ] **CONN-02**: Implement connection state machine (DISCONNECTED → CONNECTING → CONNECTED → AUTHENTICATED)
- [ ] **CONN-03**: Handle connection lifecycle events (open, close, error)
- [ ] **CONN-04**: Implement exponential backoff for reconnection (initial: 1s, max: 30s, multiplier: 2x)
- [ ] **CONN-05**: Implement heartbeat/ping-pong for connection health (interval: configurable, default 30s)
- [ ] **CONN-06**: Graceful shutdown with cleanup (close WebSocket, clear timers, unsubscribe)

### Authentication

- [ ] **AUTH-01**: Send POST_LOGIN command after connection established
- [ ] **AUTH-02**: Include email/password from configuration in POST_LOGIN Data field
- [ ] **AUTH-03**: Wait for authentication response before allowing commands
- [ ] **AUTH-04**: Handle authentication failures with clear error messages
- [ ] **AUTH-05**: Transition to AUTHENTICATED state only after successful auth

### Command/Response Pattern

- [ ] **CMD-01**: Send commands as JSON with Type/From/To/Data structure
- [ ] **CMD-02**: Receive and parse RTN_ response messages
- [ ] **CMD-03**: Implement message correlation to match responses to commands
- [ ] **CMD-04**: Implement configurable timeout for command responses (default: 30s)
- [ ] **CMD-05**: Handle RTN_ERR responses by parsing Attempt and Error fields
- [ ] **CMD-06**: Log all sent commands and received responses

### Notification Subscription

- [ ] **SUB-01**: Send POST_SUB_CHANGES command after authentication
- [ ] **SUB-02**: Handle async NOT_ notification messages
- [ ] **SUB-03**: Register handlers for specific notification types (NOT_DYN_READING_STARTED, NOT_DYN_READING, NOT_DYN_TEMP)
- [ ] **SUB-04**: Send POST_UNSUB_CHANGES before shutdown

### Sensor Discovery

- [ ] **DISC-01**: Send GET_DYN_CONNECTED command to query connected sensors
- [ ] **DISC-02**: Parse RTN_DYN response with sensor metadata dictionary
- [ ] **DISC-03**: Extract sensor fields: Serial (int), Connected (int), AccessPoint (int), PartNum (str), ReadRate (int), GMode (str), FreqMode (str), ReadPeriod (int), Samples (int), HwVer (str), FmVer (str)
- [ ] **DISC-04**: Select first connected sensor (or specific sensor from config if provided)
- [ ] **DISC-05**: Handle case when no sensors are connected (log warning and exit gracefully)

### Vibration Reading Acquisition

- [ ] **ACQ-01**: Send TAKE_DYN_READING command with sensor Serial number
- [ ] **ACQ-02**: Receive and handle NOT_DYN_READING_STARTED notification
- [ ] **ACQ-03**: Check Success field in NOT_DYN_READING_STARTED (log error if false)
- [ ] **ACQ-04**: Receive NOT_DYN_READING notification with waveform data
- [ ] **ACQ-05**: Parse notification fields: ID (int), Serial (str), Time (str), X (str), Y (str), Z (str)
- [ ] **ACQ-06**: Decode X/Y/Z waveform strings (format TBD during testing - document encoding)
- [ ] **ACQ-07**: Receive NOT_DYN_TEMP notification with temperature data
- [ ] **ACQ-08**: Implement timeout for acquisition completion (default: 60s)

### Output & Display

- [ ] **OUT-01**: Display sensor metadata (serial, part number, config) to console
- [ ] **OUT-02**: Display reading metadata (timestamp, reading ID) to console
- [ ] **OUT-03**: Display waveform statistics: number of samples per axis
- [ ] **OUT-04**: Display first 10 samples of each axis (X, Y, Z)
- [ ] **OUT-05**: Calculate and display min/max/mean values for each axis
- [ ] **OUT-06**: Display temperature value if present

### Configuration & Infrastructure

- [ ] **CFG-01**: Load configuration from environment variables (GATEWAY_URL, GATEWAY_EMAIL, GATEWAY_PASSWORD, SENSOR_SERIAL)
- [ ] **CFG-02**: Implement Zod schema for type-safe config validation
- [ ] **CFG-03**: Provide default values for timeouts (connection: 10s, command: 30s, acquisition: 60s)
- [ ] **CFG-04**: Fail fast at startup if required config is missing or invalid
- [ ] **CFG-05**: Support optional config overrides (timeouts, heartbeat interval, log level)

### TypeScript Types

- [ ] **TYPE-01**: Define TypeScript interfaces for all Send commands (POST_LOGIN, POST_SUB_CHANGES, POST_UNSUB_CHANGES, GET_DYN_CONNECTED, TAKE_DYN_READING)
- [ ] **TYPE-02**: Define TypeScript interfaces for all Return responses (RTN_DYN, RTN_ERR)
- [ ] **TYPE-03**: Define TypeScript interfaces for all Notify messages (NOT_DYN_READING_STARTED, NOT_DYN_READING, NOT_DYN_TEMP)
- [ ] **TYPE-04**: Define TypeScript type for sensor metadata (SensorMetadata)
- [ ] **TYPE-05**: Use TypeScript strict mode with all checks enabled

### Code Structure

- [ ] **CODE-01**: Organize code into modules: types/, gateway/, utils/, config.ts, main.ts
- [ ] **CODE-02**: Separate connection management (gateway/connection.ts)
- [ ] **CODE-03**: Separate command client (gateway/command-client.ts)
- [ ] **CODE-04**: Separate notification handler (gateway/notification-handler.ts)
- [ ] **CODE-05**: Implement simple logger utility (utils/logger.ts) with timestamps and log levels

### Testing & Documentation

- [ ] **TEST-01**: Manual test with real gateway hardware executing full end-to-end flow
- [ ] **TEST-02**: Verify connection establishes successfully
- [ ] **TEST-03**: Verify authentication succeeds
- [ ] **TEST-04**: Verify sensor discovery returns at least one sensor
- [ ] **TEST-05**: Verify reading triggers successfully
- [ ] **TEST-06**: Verify waveform data received and parsed
- [ ] **TEST-07**: Verify clean shutdown completes
- [ ] **DOC-01**: Document X/Y/Z waveform encoding format (discovered during testing)
- [ ] **DOC-02**: Document observed gateway behavior (timeouts, close codes, error messages)
- [ ] **DOC-03**: Write README with setup, configuration, and usage instructions

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Resilience

- **RESIL-01**: Automatic reconnection on connection loss
- **RESIL-02**: Message queue for offline operation
- **RESIL-03**: Duplicate notification deduplication
- **RESIL-04**: Circuit breaker for repeated failures

### Observability

- **OBS-01**: Structured logging with pino or winston
- **OBS-02**: Metrics collection (message counts, latency, error rates)
- **OBS-03**: Health check endpoint
- **OBS-04**: Distributed tracing support

### Testing

- **TEST-PROD-01**: Automated unit tests with vitest
- **TEST-PROD-02**: Integration tests with mock-socket
- **TEST-PROD-03**: Failure scenario testing (offline gateway, connection loss, concurrent commands)
- **TEST-PROD-04**: Performance testing (latency measurement, throughput)

### Multi-Gateway

- **MULTI-01**: Support multiple concurrent gateway connections
- **MULTI-02**: Gateway discovery and registration
- **MULTI-03**: Load balancing across gateways
- **MULTI-04**: Per-gateway state management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Historical data retrieval (GET_DYN_READINGS) | Not needed for validation, defer to Milestone 3 |
| Temperature/battery-only readings | TAKE_DYN_READING includes temp, battery readings not needed for spike |
| Waveform analysis (FFT, RMS, metrics) | Defer to Milestone 4 (visualization and analysis) |
| Database persistence | Spike prints to console, persistence in Milestone 3 |
| Scheduled acquisition | Defer to Milestone 5 (acquisition programs) |
| Connection pooling | Single connection sufficient for spike, defer to multi-gateway support |
| Custom protocol extensions | Use API as documented, no custom additions |
| OAuth or advanced authentication | Email/password sufficient per API documentation |
| TLS/SSL support | ws:// for spike, wss:// for production if needed |
| Rate limiting | Not needed for single-client spike |
| Backpressure handling | Not needed for manual trigger spike |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CFG-01 | Phase 1 | Complete |
| CFG-02 | Phase 1 | Complete |
| CFG-03 | Phase 1 | Complete |
| CFG-04 | Phase 1 | Complete |
| CFG-05 | Phase 1 | Complete |
| CODE-01 | Phase 1 | Complete |
| CODE-02 | Phase 1 | Complete |
| CODE-03 | Phase 1 | Complete |
| CODE-04 | Phase 1 | Complete |
| CODE-05 | Phase 1 | Complete |
| TYPE-05 | Phase 1 | Complete |
| CONN-01 | Phase 2 | Complete |
| CONN-02 | Phase 2 | Complete |
| CONN-03 | Phase 2 | Complete |
| CONN-04 | Phase 2 | Complete |
| CONN-05 | Phase 2 | Complete |
| CONN-06 | Phase 2 | Complete |
| CMD-01 | Phase 3 | Complete |
| CMD-02 | Phase 3 | Complete |
| CMD-03 | Phase 3 | Complete |
| CMD-04 | Phase 3 | Complete |
| CMD-05 | Phase 3 | Complete |
| CMD-06 | Phase 3 | Complete |
| TYPE-01 | Phase 3 | Complete |
| TYPE-02 | Phase 3 | Complete |
| TYPE-03 | Phase 3 | Complete |
| TYPE-04 | Phase 3 | Complete |
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 4 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| AUTH-05 | Phase 4 | Pending |
| DISC-01 | Phase 4 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| DISC-05 | Phase 4 | Pending |
| SUB-01 | Phase 5 | Pending |
| SUB-02 | Phase 5 | Pending |
| SUB-03 | Phase 5 | Pending |
| SUB-04 | Phase 5 | Pending |
| ACQ-01 | Phase 5 | Pending |
| ACQ-02 | Phase 5 | Pending |
| ACQ-03 | Phase 5 | Pending |
| ACQ-04 | Phase 5 | Pending |
| ACQ-05 | Phase 5 | Pending |
| ACQ-06 | Phase 5 | Pending |
| ACQ-07 | Phase 5 | Pending |
| ACQ-08 | Phase 5 | Pending |
| OUT-01 | Phase 5 | Pending |
| OUT-02 | Phase 5 | Pending |
| OUT-03 | Phase 5 | Pending |
| OUT-04 | Phase 5 | Pending |
| OUT-05 | Phase 5 | Pending |
| OUT-06 | Phase 5 | Pending |
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| TEST-03 | Phase 6 | Pending |
| TEST-04 | Phase 6 | Pending |
| TEST-05 | Phase 6 | Pending |
| TEST-06 | Phase 6 | Pending |
| TEST-07 | Phase 6 | Pending |
| DOC-01 | Phase 6 | Pending |
| DOC-02 | Phase 6 | Pending |
| DOC-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 65 total
- Mapped to phases: 65/65 (100%)
- Unmapped: 0

**Phase Distribution:**
- Phase 1 (Foundation & Configuration): 11 requirements
- Phase 2 (Connection Management): 6 requirements
- Phase 3 (Message Infrastructure): 10 requirements
- Phase 4 (Authentication & Discovery): 10 requirements
- Phase 5 (Acquisition & Notifications): 18 requirements
- Phase 6 (Testing & Documentation): 10 requirements

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
