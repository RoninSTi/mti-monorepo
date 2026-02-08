# Roadmap: Factory Vibration Monitoring Application

## Milestones

- ✅ **Milestone 0: Gateway Integration Spike** - Phases 1-6 (83% complete, Phase 6 pending)
- 🚧 **Milestone v1.0: Database + API Layer** - Phases 7-11 (not started)

## Phases

<details>
<summary>✅ Milestone 0: Gateway Integration Spike (Phases 1-6) - 83% COMPLETE</summary>

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
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Install ws, ConnectionState types, ExponentialBackoff, HeartbeatManager
- [x] 02-02-PLAN.md -- WebSocketConnection class and main.ts graceful shutdown integration

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
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Zod message schemas and TypeScript types for all gateway messages
- [x] 03-02-PLAN.md -- CommandClient with correlation ID matching, timeout, and error handling (TDD)
- [x] 03-03-PLAN.md -- MessageRouter, NotificationHandler, and main.ts wiring

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
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Update types (SensorMetadata, config), create authenticate function, add connection state methods
- [x] 04-02-PLAN.md -- Create sensor discovery function, wire auth+discovery flow into main.ts

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
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md -- Waveform parser (progressive CSV/JSON/Base64) and console display utilities
- [x] 05-02-PLAN.md -- Enhance NotificationHandler with EventEmitter, create AcquisitionManager
- [x] 05-03-PLAN.md -- Wire acquisition flow into main.ts with subscribe/acquire/unsubscribe/shutdown

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
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md -- Manual test checklist creation and hardware test execution
- [ ] 06-02-PLAN.md -- Gateway behavior documentation and README

</details>

### 🚧 Milestone v1.0: Database + API Layer (In Progress)

**Milestone Goal:** Establish production-ready persistence and REST API for managing factories and gateways, without multi-gateway orchestration yet.

#### Phase 7: Database Setup
**Goal**: PostgreSQL database running with complete schema and migrations
**Depends on**: Phase 6 (Milestone 0)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05
**Success Criteria** (what must be TRUE):
  1. PostgreSQL runs via Docker Compose on configured port
  2. Migrations apply successfully and create all three tables (organizations, factories, gateways)
  3. All tables have UUID primary keys, soft delete columns (deleted_at), and JSONB metadata
  4. Foreign key constraints enforce data integrity (factories reference organizations, gateways reference factories)
  5. Indexes exist on foreign keys and query-heavy columns for performance
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md -- Docker Compose, database config, npm scripts, dependency installation
- [x] 07-02-PLAN.md -- Migration files (organizations, factories, gateways), seed data, reset script

#### Phase 8: Repository Layer
**Goal**: Type-safe data access layer with encryption for sensitive credentials
**Depends on**: Phase 7
**Requirements**: REPO-01, REPO-02, REPO-03, REPO-04, REPO-05, REPO-06, CRYPTO-01, CRYPTO-02, CRYPTO-03, CRYPTO-04, QUAL-02, QUAL-08
**Success Criteria** (what must be TRUE):
  1. Kysely connection pool connects to PostgreSQL and generates type-safe query builders
  2. FactoryRepository provides create, findById, findAll, update, and softDelete methods
  3. GatewayRepository provides create, findById, findAll, findActive, update, and softDelete methods
  4. Soft delete queries automatically exclude deleted records (WHERE deleted_at IS NULL)
  5. Gateway passwords are encrypted before storage using AES-256-GCM and decrypt successfully for connections
  6. All repository methods return correctly typed results
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md -- Kysely connection pool, type generation (kysely-codegen), Zod validation schemas
- [x] 08-02-PLAN.md -- AES-256-GCM encryption utilities (TDD)
- [x] 08-03-PLAN.md -- FactoryRepository, GatewayRepository, seed data encryption

#### Phase 9: API Server Foundation
**Goal**: Fastify server running with health check, validation, and error handling
**Depends on**: Phase 8
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, QUAL-01, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. Fastify server starts on configured port (default 3000) and responds to requests
  2. Health check endpoint (GET /api/health) returns 200 OK with status information
  3. CORS headers are present on all responses for configured origins
  4. Security headers are present via Helmet middleware
  5. Zod validation plugin rejects invalid requests with detailed error messages
  6. All errors return standardized JSON format with error code, message, and details
  7. Request logging provides actionable information (method, path, status, duration)
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md -- Fastify app factory with Zod validation, CORS, Helmet, error handler
- [x] 09-02-PLAN.md -- Health check endpoint, server entry point, npm scripts, graceful shutdown

#### Phase 10: Factory API
**Goal**: Complete CRUD operations for factory management via REST endpoints
**Depends on**: Phase 9
**Requirements**: FACTORY-01, FACTORY-02, FACTORY-03, FACTORY-04, FACTORY-05, FACTORY-06, FACTORY-07, FACTORY-08, FACTORY-09
**Success Criteria** (what must be TRUE):
  1. User can create factories via POST /api/factories with validated input
  2. User can list all factories via GET /api/factories with pagination support
  3. User can retrieve a single factory by ID via GET /api/factories/:id
  4. User can update factory details via PUT /api/factories/:id
  5. User can soft delete factories via DELETE /api/factories/:id (deleted factories excluded from default queries)
  6. Invalid requests return 400 with Zod validation details
  7. Missing factories return 404 with appropriate error message
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md -- Zod schemas for factory API and FactoryRepository pagination support
- [ ] 10-02-PLAN.md -- Factory CRUD route handlers and app.ts registration

#### Phase 11: Gateway API CRUD
**Goal**: Complete CRUD operations for gateway management with encrypted credential storage
**Depends on**: Phase 10
**Requirements**: GATEWAY-01, GATEWAY-02, GATEWAY-03, GATEWAY-04, GATEWAY-05, GATEWAY-06, GATEWAY-07, GATEWAY-08, GATEWAY-09, QUAL-07
**Success Criteria** (what must be TRUE):
  1. User can create gateways via POST /api/gateways with automatic password encryption
  2. User can list gateways via GET /api/gateways with pagination and factory filtering
  3. User can retrieve a single gateway by ID via GET /api/gateways/:id
  4. User can update gateway details via PUT /api/gateways/:id (password re-encrypted if changed)
  5. User can soft delete gateways via DELETE /api/gateways/:id
  6. Gateway passwords are never returned in plaintext via API responses
  7. Database errors return 500 with safe error messages (no credential leakage)
  8. README documents setup, configuration, and API usage
**Plans**: TBD

Plans:
- [ ] 11-01: [To be planned]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Configuration | M0 | 1/1 | Complete | 2026-02-07 |
| 2. Connection Management | M0 | 2/2 | Complete | 2026-02-07 |
| 3. Message Infrastructure | M0 | 3/3 | Complete | 2026-02-07 |
| 4. Authentication & Discovery | M0 | 2/2 | Complete | 2026-02-07 |
| 5. Acquisition & Notifications | M0 | 3/3 | Complete | 2026-02-07 |
| 6. Testing & Documentation | M0 | 0/2 | Not started | - |
| 7. Database Setup | v1.0 | 2/2 | Complete | 2026-02-08 |
| 8. Repository Layer | v1.0 | 3/3 | Complete | 2026-02-08 |
| 9. API Server Foundation | v1.0 | 2/2 | Complete | 2026-02-08 |
| 10. Factory API | v1.0 | 0/TBD | Not started | - |
| 11. Gateway API CRUD | v1.0 | 0/TBD | Not started | - |
