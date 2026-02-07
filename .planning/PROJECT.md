# Gateway Integration Spike (Milestone 0)

## What This Is

A TypeScript/Node.js technical spike that validates the CTC Connect Wireless gateway WebSocket API before building the full factory vibration monitoring system. Connects to one gateway, discovers sensors, triggers a vibration reading, and parses the returned waveform data to prove the communication layer works as documented.

## Core Value

Validate that the gateway communication layer works reliably before committing to the full multi-gateway architecture. This de-risks the foundation on which scheduling, persistence, and analysis will be built.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **CONN-01**: Establish WebSocket connection to gateway at ws://ip:5000
- [ ] **AUTH-01**: Authenticate using POST_LOGIN command with email/password
- [ ] **SUB-01**: Subscribe to change notifications via POST_SUB_CHANGES
- [ ] **DISC-01**: Discover connected sensors via GET_DYN_CONNECTED
- [ ] **DISC-02**: Parse sensor metadata (serial, part number, read rate, samples, etc.)
- [ ] **ACQ-01**: Trigger vibration reading for one sensor via TAKE_DYN_READING
- [ ] **ACQ-02**: Receive and handle NOT_DYN_READING_STARTED notification
- [ ] **ACQ-03**: Receive and handle NOT_DYN_READING notification with waveform data
- [ ] **PARSE-01**: Decode X/Y/Z waveform data (encoding format TBD during testing)
- [ ] **OUT-01**: Display waveform data summary (sample count, first 10 samples, min/max/mean)
- [ ] **ERR-01**: Handle RTN_ERR responses with clear error logging
- [ ] **CLEAN-01**: Unsubscribe and close connection cleanly on exit
- [ ] **CODE-01**: Modular architecture (separate connection, commands, notifications)
- [ ] **CODE-02**: TypeScript type definitions for all API messages
- [ ] **CODE-03**: Configuration externalized (no hardcoded URLs/credentials)

### Out of Scope

- Multiple gateway support — single gateway only for validation
- Database persistence — no storage, just print to console
- Scheduled acquisition — manual trigger only
- Waveform analysis (FFT, RMS, etc.) — display raw data only
- Production error handling/retry logic — log and exit is sufficient
- Historical data retrieval (GET_DYN_READINGS) — defer to future milestone
- Temperature/battery-only readings — TAKE_DYN_READING includes temp already
- Connection pooling — single persistent connection
- Automated tests — manual verification sufficient for spike

## Context

### System Architecture
This spike is Milestone 0 of a larger factory vibration monitoring application. The full system will:
- Manage multiple factories with hierarchical zones and equipment
- Support multiple wireless gateways per factory
- Schedule automated vibration data collection
- Persist waveforms and analyze for equipment health
- Generate alarms based on vibration thresholds

This milestone validates only the gateway communication layer.

### Domain Background
- **Industrial vibration monitoring** for predictive maintenance
- **Wireless sensors** mounted on rotating equipment (motors, pumps, fans, gearboxes)
- Sensors measure **tri-axial acceleration** (X/Y/Z) at high sample rates (25.6kHz typical)
- **Gateways** (access points) relay commands and data between application and sensors
- Sensors associate dynamically with gateways (not fixed assignments)

### API Characteristics
- **WebSocket-based** command/response/notification pattern
- **Synchronous communication** between layers (real-time bidirectional)
- Three message types: **Send** (client-initiated), **Return** (direct responses), **Notify** (async push events)
- Authentication via POST_LOGIN command after connection
- Subscription required to receive notifications (POST_SUB_CHANGES)
- Acquisition is **async**: command returns immediately, completion via notification

### Known API Details
From CTC Connect Wireless API documentation:
- **Endpoint**: `ws://<gateway-ip>:5000` (no path, just host:port)
- **Auth**: POST_LOGIN with Email/Password fields
- **Message structure**: All messages have Type/From/To or Target/Data fields
- **Field types documented** (see API reference in docs/ctc-api.pdf)
- **Serial field**: integer in commands, string in notifications (inconsistency)

### Known Unknowns (Resolve During Implementation)
- **Waveform encoding**: X/Y/Z fields are strings, but format unclear (CSV? Base64? JSON array?)
- **Units**: Likely gs (gravitational acceleration) but not documented
- **Value ranges**: Expected min/max for validation
- **Duplicate notifications**: Whether gateway can send duplicates
- **Connection keepalive**: Whether WebSocket ping/pong needed

## Constraints

- **Tech stack**: TypeScript + Node.js 18+ — TypeScript provides type safety for complex API contracts, Node.js async model aligns with WebSocket event-driven architecture
- **WebSocket library**: `ws` package — standard, well-maintained WebSocket client
- **Timeline**: ASAP / Days — need to validate quickly and move to Milestone 1
- **Quality bar**: Balanced — working code with reasonable structure, don't over-engineer
- **Hardware dependency**: Requires access to physical gateway and at least one connected sensor for testing
- **Single gateway**: Only one gateway connection for this spike (multi-gateway in future milestones)
- **No persistence**: No database or file storage (just console output)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript over JavaScript | Type safety for complex API message structures, better tooling, establishes pattern for full system | — Pending |
| Node.js over other runtimes | Native async/await, excellent WebSocket ecosystem, enables code sharing with future API service | — Pending |
| `ws` package for WebSocket | Standard, well-maintained, lower-level control vs frameworks | — Pending |
| Log and exit on errors | Sufficient for spike; production retry logic deferred to future milestones | — Pending |
| Modular architecture | Separate connection/command/notification concerns to establish patterns for multi-gateway future | — Pending |
| Environment variables for config | Standard practice; sensitive credentials never committed | — Pending |

---
*Last updated: 2026-02-07 after initialization*
