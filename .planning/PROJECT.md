# Factory Vibration Monitoring Application

## What This Is

A TypeScript/Node.js application for industrial vibration monitoring that connects to CTC Connect Wireless gateways to manage sensors, collect waveform data, and monitor equipment health across multiple factories. Includes production REST API for managing factories and gateways with encrypted credentials, plus complete React web interface for configuration.

## Core Value

Build a reliable foundation for multi-gateway factory monitoring: persistent data model, REST API for management operations, and real-time connection orchestration that scales to production workloads.

## Current State

**Latest Release:** v1.1 Factory & Gateway Management UI (Shipped: 2026-02-11)

Complete web application for managing factory and gateway configurations. Vibration analysts can create/edit/delete factories, manage gateway connections with factory filtering, and configure credentials through responsive UI with validation.

**Tech Stack:**
- **Backend:** TypeScript, Node.js, PostgreSQL 15, Kysely, Fastify, Zod, AES-256-GCM encryption
- **Frontend:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, shadcn/ui, React Query, React Hook Form

**Codebase:** 6,226 lines TypeScript (3,988 backend + 2,238 frontend) across 136 files
**Quality:** Zero TypeScript errors (strict mode), zero ESLint errors, production builds passing
**Testing:** Phase verification: 63/63 must-haves, integration check: 100% wiring, E2E flows: 3/3 complete

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

**Milestone v1.1** (shipped 2026-02-11):
- ✓ **SETUP-01 through SETUP-07**: React + Vite app with Tailwind CSS v4, shadcn/ui, React Query, React Hook Form, theming infrastructure — v1.1
- ✓ **NAV-01 through NAV-03**: Side navigation, page layout, React Router routing — v1.1
- ✓ **COMP-01 through COMP-05**: Component library with forms, organized directories, TypeScript types, Tailwind patterns — v1.1
- ✓ **FACTORY-UI-01 through FACTORY-UI-06**: Complete factory CRUD interface with table, dialogs, toasts, loading states — v1.1
- ✓ **GATEWAY-UI-01 through GATEWAY-UI-07**: Complete gateway CRUD interface with factory filtering and password security — v1.1
- ✓ **API-INT-01 through API-INT-05**: React Query hooks, error handling, optimistic updates — v1.1
- ✓ **QUAL-UI-01 through QUAL-UI-05**: TypeScript strict mode, consistent patterns, form validation, responsive design, comprehensive README — v1.1

### Active

None - Ready to plan next milestone.

### Out of Scope

**This Milestone (v1.1):**
- User authentication/login — future security milestone, focus on functionality first
- Real-time gateway connection status — needs gateway orchestration layer (deferred)
- Alarm monitoring dashboard — needs sensor data APIs (future milestone)
- Multi-gateway connection orchestration — future milestone (after v1.1)
- Gateway lifecycle management (API → connect/disconnect) — future milestone
- Sensor assignment to equipment — Milestone 2
- Acquisition scheduling — Milestone 3
- Waveform data persistence — Milestone 3
- Multi-tenancy UI — schema supports, but single org for now
- Mobile responsive (phone-sized) — tablet/desktop sufficient for v1.1

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
| PostgreSQL over MongoDB | Relational model + JSONB flexibility + TypeScript ecosystem | ✓ Good — Validated in v1.0 |
| Kysely over ORM | Type-safe SQL without magic, explicit queries | ✓ Good — Validated in v1.0 |
| Fastify over Express | TypeScript-first, high performance, built-in validation | ✓ Good — Validated in v1.0 |
| Encrypt (not hash) gateway passwords | Need plaintext to authenticate with gateways | ✓ Good — AES-256-GCM working in v1.0 |
| Soft deletes | Preserve audit trail, avoid cascading hard deletes | ✓ Good — v1.0 implementation |
| In-memory connection state | Ephemeral by nature, only last_seen_at persisted | — Pending (M0 Phase 6) |
| React + Vite + Tailwind CSS v4 | Modern frontend stack, fast dev, utility-first CSS | ✓ Good — Validated in v1.1 |
| shadcn/ui components | Copy-paste components, full control, consistent design | ✓ Good — Validated in v1.1 |
| React Query for server state | Caching, optimistic updates, excellent DX | ✓ Good — Validated in v1.1 |
| React Hook Form + Zod | Type-safe forms, minimal re-renders, clear validation | ✓ Good — Validated in v1.1 |
| No authentication in v1.1 | Focus on configuration UI, security in future milestone | ✓ Good — Shipped v1.1 on schedule |
| Native select elements | Sufficient for v1.1, accessible by default | ✓ Good — Works well in production |
| Client-side factory name lookup | Simple join via helper function vs backend join | ✓ Good — Keeps API simple |
| Password blank in edit mode | GATEWAY-07 security requirement | ✓ Good — Never exposes passwords |

---
*Last updated: 2026-02-11 after v1.1 milestone completion*
