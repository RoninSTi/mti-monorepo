# Factory Vibration Monitoring Application

## What This Is

A TypeScript/Node.js application for industrial vibration monitoring that connects to CTC Connect Wireless gateways to manage sensors, collect waveform data, and monitor equipment health across multiple factories. Currently building the production data layer and REST API for factory and gateway management.

## Core Value

Build a reliable foundation for multi-gateway factory monitoring: persistent data model, REST API for management operations, and real-time connection orchestration that scales to production workloads.

## Current Milestone: v1.0 Factory and Gateway CRUD (Database + API Layer)

**Goal:** Establish production-ready persistence and REST API for managing factories and gateways, without multi-gateway orchestration yet.

**Target features:**
- PostgreSQL database with organizations, factories, gateways tables
- Type-safe repository layer with Kysely query builder
- REST API with Fastify (Factory CRUD + Gateway CRUD endpoints)
- Encrypted gateway credential storage (AES-256-GCM)
- Request validation with Zod schemas
- Standardized error responses

**Deferred to next milestone:**
- Multi-gateway connection orchestration (after M0 Phase 6 complete)
- Gateway lifecycle management (API → connect/disconnect)
- Real-time connection status monitoring

## Requirements

### Validated

**Milestone 0** (83% complete - Phase 6 pending):
- ✓ **CONN-01**: WebSocket connection to gateway established — Milestone 0
- ✓ **AUTH-01**: POST_LOGIN authentication working — Milestone 0
- ✓ **SUB-01**: Notification subscription via POST_SUB_CHANGES — Milestone 0
- ✓ **DISC-01**: Sensor discovery via GET_DYN_CONNECTED — Milestone 0
- ✓ **DISC-02**: Sensor metadata parsing (serial, part number, etc.) — Milestone 0
- ✓ **ACQ-01**: Trigger reading via TAKE_DYN_READING — Milestone 0
- ✓ **ACQ-02**: Handle NOT_DYN_READING_STARTED notification — Milestone 0
- ✓ **ACQ-03**: Handle NOT_DYN_READING with waveform data — Milestone 0
- ✓ **PARSE-01**: Decode X/Y/Z waveform data (CSV format discovered) — Milestone 0
- ✓ **OUT-01**: Display waveform statistics — Milestone 0
- ✓ **ERR-01**: RTN_ERR error handling — Milestone 0
- ✓ **CLEAN-01**: Clean connection shutdown — Milestone 0
- ✓ **CODE-01**: Modular architecture (connection, commands, notifications) — Milestone 0
- ✓ **CODE-02**: TypeScript types for gateway protocol — Milestone 0
- ✓ **CODE-03**: Configuration externalized (environment variables) — Milestone 0

### Active

**Milestone 1: Database + API Layer:**
- [ ] **DB-01**: PostgreSQL database setup with Docker Compose
- [ ] **DB-02**: Schema migrations for organizations, factories, gateways tables
- [ ] **DB-03**: UUID primary keys, soft deletes, JSONB metadata columns
- [ ] **REPO-01**: Type-safe repository layer with Kysely
- [ ] **REPO-02**: FactoryRepository (create, findById, findAll, update, softDelete)
- [ ] **REPO-03**: GatewayRepository (create, findById, findAll, findActive, update, softDelete)
- [ ] **CRYPTO-01**: Encrypt gateway passwords before storage (AES-256-GCM)
- [ ] **CRYPTO-02**: Decrypt passwords for gateway connections
- [ ] **API-01**: Fastify server with CORS, Helmet, Zod validation
- [ ] **API-02**: Health check endpoint (GET /api/health)
- [ ] **API-03**: Standardized error responses with codes
- [ ] **FACTORY-01**: Create factory (POST /api/factories)
- [ ] **FACTORY-02**: List factories (GET /api/factories with pagination)
- [ ] **FACTORY-03**: Get factory by ID (GET /api/factories/:id)
- [ ] **FACTORY-04**: Update factory (PUT /api/factories/:id)
- [ ] **FACTORY-05**: Soft delete factory (DELETE /api/factories/:id)
- [ ] **GATEWAY-01**: Create gateway (POST /api/gateways, encrypt password)
- [ ] **GATEWAY-02**: List gateways (GET /api/gateways with pagination, filter by factory)
- [ ] **GATEWAY-03**: Get gateway by ID (GET /api/gateways/:id)
- [ ] **GATEWAY-04**: Update gateway (PUT /api/gateways/:id, re-encrypt if password changed)
- [ ] **GATEWAY-05**: Soft delete gateway (DELETE /api/gateways/:id)

### Out of Scope

**This Milestone:**
- Multi-gateway connection orchestration — next milestone (after M0 Phase 6)
- Gateway lifecycle management (API → connect/disconnect) — next milestone
- Real-time connection status monitoring — next milestone
- Sensor assignment to equipment — Milestone 2
- Acquisition scheduling — Milestone 3
- Waveform data persistence — Milestone 3
- Web UI — future milestone
- API authentication (JWT/OAuth) — future security milestone
- Multi-tenancy enforcement — schema supports, but API hardcodes single org for now

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

- **Tech stack**: TypeScript + Node.js 18+ — type safety, async model, code sharing between API and CLI
- **Database**: PostgreSQL 15+ — production-ready, JSONB support, excellent TypeScript ecosystem
- **API framework**: Fastify 5+ — TypeScript-first, high performance, built-in validation
- **Query builder**: Kysely — type-safe SQL, no ORM magic, explicit queries
- **Deployment**: Local development (Docker Compose) — production deployment deferred
- **Testing**: Manual end-to-end — automated tests deferred to future milestone
- **Timeline**: Incremental — build foundation without blocking M0 Phase 6 completion
- **Quality bar**: Production patterns — establish architecture for scale, even if features are limited

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript + Node.js | Type safety + async model + code sharing | ✓ Good — Validated in M0 |
| `ws` package for WebSocket | Standard, well-maintained, lower-level control | ✓ Good — Works reliably in M0 |
| Modular architecture | Separate concerns for multi-gateway future | ✓ Good — M0 patterns scale to M1 |
| PostgreSQL over MongoDB | Relational model + JSONB flexibility + TypeScript ecosystem | — Pending |
| Kysely over ORM | Type-safe SQL without magic, explicit queries | — Pending |
| Fastify over Express | TypeScript-first, high performance, built-in validation | — Pending |
| Encrypt (not hash) gateway passwords | Need plaintext to authenticate with gateways | — Pending |
| Soft deletes | Preserve audit trail, avoid cascading hard deletes | — Pending |
| In-memory connection state | Ephemeral by nature, only last_seen_at persisted | — Pending |
| Split M1 into API-first then orchestration | Can progress while M0 Phase 6 pending | — Pending |

---
*Last updated: 2026-02-08 after Milestone 1 initialization*
