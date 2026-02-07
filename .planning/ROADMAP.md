# Roadmap: Gateway Integration Spike (Milestone 0)

## Overview

This roadmap validates the CTC Connect Wireless gateway WebSocket API through six phases. Starting with project infrastructure and connection management, progressing through message handling and authentication, enabling sensor discovery and vibration readings, and concluding with comprehensive testing. Each phase delivers working, verifiable functionality that enables the next. The spike proves the gateway communication layer before committing to the full multi-gateway architecture.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Configuration** - Project structure, TypeScript setup, configuration loading
- [ ] **Phase 2: Connection Management** - WebSocket connection with state machine and lifecycle handling
- [ ] **Phase 3: Message Infrastructure** - Command/response pattern with correlation and timeout handling
- [ ] **Phase 4: Authentication & Discovery** - Gateway authentication and sensor discovery
- [ ] **Phase 5: Acquisition & Notifications** - Vibration readings with async notifications and output display
- [ ] **Phase 6: Testing & Documentation** - End-to-end testing, edge cases, and behavior documentation

## Phase Details

### Phase 1: Foundation & Configuration
**Goal**: Establish project structure with TypeScript, configuration loading, and logging infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, CODE-01, CODE-02, CODE-03, CODE-04, CODE-05, TYPE-05
**Success Criteria** (what must be TRUE):
  1. Project builds successfully with TypeScript strict mode enabled
  2. Configuration loads from environment variables and validates with clear error messages
  3. Logger utility outputs timestamped messages with configurable log levels
  4. Code is organized into modules (types/, gateway/, utils/, config.ts, main.ts)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md -- Project init, config validation, logger, and module structure

### Phase 2: Connection Management
**Goal**: Establish reliable WebSocket connection with state machine and lifecycle handling
**Depends on**: Phase 1
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06
**Success Criteria** (what must be TRUE):
  1. Application connects to gateway WebSocket endpoint at ws://ip:5000
  2. Connection state transitions correctly (DISCONNECTED -> CONNECTING -> CONNECTED -> closed)
  3. Connection handles open, close, and error events with appropriate logging
  4. Application implements exponential backoff reconnection (1s, 2s, 4s up to 30s max)
  5. Heartbeat/ping-pong detects connection health (30s interval, configurable)
  6. Application shuts down gracefully with cleanup (close WebSocket, clear timers)
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 3: Message Infrastructure
**Goal**: Implement command/response pattern with message correlation, timeout handling, and error processing
**Depends on**: Phase 2
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, TYPE-01, TYPE-02, TYPE-03, TYPE-04
**Success Criteria** (what must be TRUE):
  1. Application sends commands as JSON with Type/From/To/Data structure
  2. Application receives and parses RTN_ response messages correctly
  3. Responses match commands via correlation IDs (UUID-based)
  4. Commands timeout after configurable duration (default 30s) with clear error
  5. Application handles RTN_ERR responses by parsing Attempt and Error fields
  6. All sent commands and received responses are logged for debugging
  7. TypeScript interfaces exist for all command, response, and notification types
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Authentication & Discovery
**Goal**: Authenticate with gateway and discover connected sensors
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):
  1. Application sends POST_LOGIN command after connection with email/password from config
  2. Application transitions to AUTHENTICATED state only after successful authentication
  3. Application handles authentication failures with clear error messages
  4. Application sends GET_DYN_CONNECTED command and receives sensor metadata
  5. Application parses sensor fields (Serial, PartNum, ReadRate, Samples, etc.)
  6. Application selects first connected sensor or specific sensor from config
  7. Application handles case when no sensors are connected (logs warning, exits gracefully)
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Acquisition & Notifications
**Goal**: Trigger vibration readings, receive async notifications, and display waveform data
**Depends on**: Phase 4
**Requirements**: SUB-01, SUB-02, SUB-03, SUB-04, ACQ-01, ACQ-02, ACQ-03, ACQ-04, ACQ-05, ACQ-06, ACQ-07, ACQ-08, OUT-01, OUT-02, OUT-03, OUT-04, OUT-05, OUT-06
**Success Criteria** (what must be TRUE):
  1. Application sends POST_SUB_CHANGES command after authentication
  2. Application registers handlers for notification types (NOT_DYN_READING_STARTED, NOT_DYN_READING, NOT_DYN_TEMP)
  3. Application sends TAKE_DYN_READING command with sensor Serial number
  4. Application receives NOT_DYN_READING_STARTED notification and checks Success field
  5. Application receives NOT_DYN_READING notification and decodes X/Y/Z waveform strings
  6. Application receives NOT_DYN_TEMP notification with temperature data
  7. Application displays sensor metadata, reading metadata, and waveform statistics to console
  8. Application displays first 10 samples and min/max/mean values for each axis
  9. Application implements timeout for acquisition completion (default 60s)
  10. Application sends POST_UNSUB_CHANGES before shutdown
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 6: Testing & Documentation
**Goal**: Execute comprehensive end-to-end testing, validate edge cases, and document gateway behavior
**Depends on**: Phase 5
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. Manual test with real gateway hardware completes full end-to-end flow successfully
  2. All test scenarios pass: connection establishes, authentication succeeds, sensor discovery returns sensors, reading triggers successfully, waveform data received and parsed, clean shutdown completes
  3. X/Y/Z waveform encoding format is documented based on actual gateway responses
  4. Gateway behavior is documented (timeouts, close codes, error messages, timing characteristics)
  5. README exists with setup instructions, configuration options, and usage examples
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Configuration | 1/1 | Complete | 2026-02-07 |
| 2. Connection Management | 0/TBD | Not started | - |
| 3. Message Infrastructure | 0/TBD | Not started | - |
| 4. Authentication & Discovery | 0/TBD | Not started | - |
| 5. Acquisition & Notifications | 0/TBD | Not started | - |
| 6. Testing & Documentation | 0/TBD | Not started | - |
