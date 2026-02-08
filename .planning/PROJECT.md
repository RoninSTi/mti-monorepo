# Factory Vibration Monitoring Application

## What This Is

A TypeScript/Node.js application for industrial vibration monitoring that connects to CTC Connect Wireless gateways to manage sensors, collect waveform data, and monitor equipment health across multiple factories. Currently building the production data layer and REST API for factory and gateway management.

## Core Value

Build a reliable foundation for multi-gateway factory monitoring: persistent data model, REST API for management operations, and real-time connection orchestration that scales to production workloads.

## Current State

**Latest Release:** v1.0 Database + API Layer (Shipped: 2026-02-08)

Production-ready REST API for managing factories and gateways with encrypted credential storage. Complete database schema with PostgreSQL, type-safe repository layer with Kysely, and full CRUD operations via Fastify.

**Tech Stack:** TypeScript, Node.js, PostgreSQL 15, Kysely, Fastify, Zod, AES-256-GCM encryption
**Codebase:** 3,988 lines TypeScript across 59 files
**UAT:** 10/10 tests passed

## Next Milestone Goals

**v1.1: Gateway Orchestration & Lifecycle Management**

Connect the database + API layer (v1.0) to the gateway integration spike (Milestone 0) with multi-gateway orchestration, lifecycle management, and real-time connection monitoring.

**Target Features:**
- GatewayConnectionManager for multi-gateway orchestration
- GatewayRegistry for in-memory connection state tracking
- Load active gateways from database on startup
- Parallel connection management (3+ gateways concurrently)
- Gateway lifecycle management (API operations trigger connect/disconnect)
- Real-time connection status endpoints

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

**Milestone v1.0** (shipped 2026-02-08):
- ✓ **DB-01 through DB-05**: PostgreSQL database with UUID PKs, soft deletes, JSONB metadata, FK constraints — v1.0
- ✓ **REPO-01 through REPO-06**: Type-safe repository layer with Kysely query builder — v1.0
- ✓ **CRYPTO-01 through CRYPTO-04**: AES-256-GCM encryption for gateway credentials — v1.0
- ✓ **API-01 through API-07**: Fastify server with health check, CORS, Helmet, Zod validation — v1.0
- ✓ **FACTORY-01 through FACTORY-09**: Complete factory CRUD API with pagination — v1.0
- ✓ **GATEWAY-01 through GATEWAY-09**: Complete gateway CRUD API with encrypted passwords — v1.0
- ✓ **QUAL-01 through QUAL-08**: Modular architecture, type safety, documentation — v1.0

### Active

**Milestone v1.1: Gateway Orchestration & Lifecycle Management:**
- [ ] **ORCH-01**: GatewayConnectionManager orchestrates multiple WebSocket connections
- [ ] **ORCH-02**: GatewayRegistry tracks in-memory connection state
- [ ] **ORCH-03**: Load active gateways from database on startup
- [ ] **ORCH-04**: Connect all gateways in parallel
- [ ] **ORCH-05**: Manage 3+ gateways concurrently without interference
- [ ] **ORCH-06**: Independent failure domains (one gateway failure doesn't cascade)
- [ ] **LIFECYCLE-01**: Creating gateway via API triggers automatic connection
- [ ] **LIFECYCLE-02**: Updating gateway URL/credentials triggers reconnection
- [ ] **LIFECYCLE-03**: Deleting gateway disconnects cleanly and removes from registry
- [ ] **STATUS-01**: GET /api/gateways/:id/status returns real-time connection state
- [ ] **STATUS-02**: POST /api/gateways/:id/connect triggers connection
- [ ] **STATUS-03**: POST /api/gateways/:id/disconnect triggers disconnection
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
*Last updated: 2026-02-08 after v1.0 milestone completion*
