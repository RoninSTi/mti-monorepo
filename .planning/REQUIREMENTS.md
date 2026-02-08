# Requirements: Milestone v1.0 Factory and Gateway CRUD

**Defined:** 2026-02-08
**Core Value:** Build a reliable foundation for multi-gateway factory monitoring: persistent data model, REST API, and connection orchestration

## v1.0 Requirements

Requirements for Milestone v1.0: Database + API Layer (Phases 7-11). Multi-gateway orchestration deferred to next milestone.

### Database & Migrations

- [ ] **DB-01**: PostgreSQL runs via Docker Compose
- [ ] **DB-02**: Migrations create organizations, factories, gateways tables with correct schema
- [ ] **DB-03**: UUID primary keys, soft deletes (deleted_at), JSONB metadata columns
- [ ] **DB-04**: Indexes on foreign keys and query-heavy columns
- [ ] **DB-05**: Foreign key constraints for data integrity

### Repository Layer

- [ ] **REPO-01**: Database connection pool configured with Kysely
- [ ] **REPO-02**: Type definitions generated from schema
- [ ] **REPO-03**: FactoryRepository (create, findById, findAll, update, softDelete)
- [ ] **REPO-04**: GatewayRepository (create, findById, findAll, findActive, update, softDelete)
- [ ] **REPO-05**: Soft delete queries exclude deleted records (WHERE deleted_at IS NULL)
- [ ] **REPO-06**: Repository methods return correctly typed results

### Encryption

- [ ] **CRYPTO-01**: Encrypt gateway passwords before database storage (AES-256-GCM)
- [ ] **CRYPTO-02**: Decrypt passwords when needed for connections
- [ ] **CRYPTO-03**: Encryption key loaded from environment variable
- [ ] **CRYPTO-04**: Encryption/decryption round-trips successfully

### API Server Foundation

- [ ] **API-01**: Fastify server starts on configured port (default: 3000)
- [ ] **API-02**: Health check endpoint (GET /api/health) returns 200 OK
- [ ] **API-03**: CORS headers present (@fastify/cors)
- [ ] **API-04**: Security headers present (@fastify/helmet)
- [ ] **API-05**: Zod validation plugin registered (@fastify/type-provider-zod)
- [ ] **API-06**: Standardized error responses (code, message, details)
- [ ] **API-07**: Request logging middleware configured

### Factory CRUD

- [ ] **FACTORY-01**: Create factory (POST /api/factories)
- [ ] **FACTORY-02**: List factories (GET /api/factories with pagination)
- [ ] **FACTORY-03**: Get factory by ID (GET /api/factories/:id)
- [ ] **FACTORY-04**: Update factory (PUT /api/factories/:id)
- [ ] **FACTORY-05**: Soft delete factory (DELETE /api/factories/:id)
- [ ] **FACTORY-06**: Deleted factories excluded from default queries
- [ ] **FACTORY-07**: Invalid requests return 400 with validation details
- [ ] **FACTORY-08**: Missing resources return 404
- [ ] **FACTORY-09**: Zod schemas for factory requests/responses

### Gateway CRUD

- [ ] **GATEWAY-01**: Create gateway (POST /api/gateways, encrypt password)
- [ ] **GATEWAY-02**: List gateways (GET /api/gateways with pagination, filter by factory)
- [ ] **GATEWAY-03**: Get gateway by ID (GET /api/gateways/:id)
- [ ] **GATEWAY-04**: Update gateway (PUT /api/gateways/:id, re-encrypt if password changed)
- [ ] **GATEWAY-05**: Soft delete gateway (DELETE /api/gateways/:id)
- [ ] **GATEWAY-06**: Passwords are encrypted in database (not plaintext)
- [ ] **GATEWAY-07**: Cannot retrieve plaintext passwords via API
- [ ] **GATEWAY-08**: Database errors return 500 with safe error messages
- [ ] **GATEWAY-09**: Zod schemas for gateway requests/responses

### Code Quality

- [ ] **QUAL-01**: Modular architecture (api/, database/, gateway-manager/ directories)
- [ ] **QUAL-02**: All database queries use Kysely (type-safe)
- [ ] **QUAL-03**: All API requests validated with Zod
- [ ] **QUAL-04**: Error handling follows consistent patterns
- [ ] **QUAL-05**: Logging provides actionable information
- [ ] **QUAL-06**: Configuration externalized (environment variables)
- [ ] **QUAL-07**: README documents setup and usage
- [ ] **QUAL-08**: TypeScript strict mode enabled

## v1.1 Requirements

Deferred to next milestone (after Milestone 0 Phase 6 complete).

### Multi-Gateway Orchestration

- **ORCH-01**: GatewayConnectionManager orchestrates multiple WebSocketConnection instances
- **ORCH-02**: GatewayRegistry tracks in-memory connection state
- **ORCH-03**: Load active gateways from database on startup
- **ORCH-04**: Connect all gateways in parallel
- **ORCH-05**: Can manage 3+ gateways concurrently without interference
- **ORCH-06**: Each gateway is independent failure domain (one failure doesn't cascade)

### Gateway Lifecycle Management

- **LIFECYCLE-01**: Creating gateway via API triggers automatic connection
- **LIFECYCLE-02**: Updating gateway URL/credentials triggers reconnection
- **LIFECYCLE-03**: Deleting gateway disconnects cleanly and removes from registry
- **LIFECYCLE-04**: Application restart loads all active gateways
- **LIFECYCLE-05**: All gateways reconnect automatically on startup

### Connection Status Monitoring

- **STATUS-01**: GET /api/gateways/:id/status returns accurate real-time state
- **STATUS-02**: POST /api/gateways/:id/connect triggers connection
- **STATUS-03**: POST /api/gateways/:id/disconnect triggers disconnection
- **STATUS-04**: Connection state tracked accurately in GatewayRegistry
- **STATUS-05**: Update last_seen_at on successful connections

## Out of Scope

Explicitly excluded from v1.0 and v1.1:

| Feature | Reason |
|---------|--------|
| Sensor assignment to equipment | Milestone 2 - requires gateway orchestration working first |
| Acquisition scheduling | Milestone 3 - requires sensor assignment |
| Waveform data persistence | Milestone 3 - requires acquisition working |
| Web UI | Future milestone - API-first approach |
| API authentication (JWT/OAuth) | Future security milestone - focus on functionality first |
| Multi-tenancy enforcement | Schema supports it, but single org sufficient for now |
| Advanced monitoring (metrics, dashboards) | Future operational milestone |
| Load balancing | Single API instance sufficient for now |
| Database replication | Single database instance sufficient for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 7 | Pending |
| DB-02 | Phase 7 | Pending |
| DB-03 | Phase 7 | Pending |
| DB-04 | Phase 7 | Pending |
| DB-05 | Phase 7 | Pending |
| REPO-01 | Phase 8 | Pending |
| REPO-02 | Phase 8 | Pending |
| REPO-03 | Phase 8 | Pending |
| REPO-04 | Phase 8 | Pending |
| REPO-05 | Phase 8 | Pending |
| REPO-06 | Phase 8 | Pending |
| CRYPTO-01 | Phase 8 | Pending |
| CRYPTO-02 | Phase 8 | Pending |
| CRYPTO-03 | Phase 8 | Pending |
| CRYPTO-04 | Phase 8 | Pending |
| API-01 | Phase 9 | Pending |
| API-02 | Phase 9 | Pending |
| API-03 | Phase 9 | Pending |
| API-04 | Phase 9 | Pending |
| API-05 | Phase 9 | Pending |
| API-06 | Phase 9 | Pending |
| API-07 | Phase 9 | Pending |
| FACTORY-01 | Phase 10 | Pending |
| FACTORY-02 | Phase 10 | Pending |
| FACTORY-03 | Phase 10 | Pending |
| FACTORY-04 | Phase 10 | Pending |
| FACTORY-05 | Phase 10 | Pending |
| FACTORY-06 | Phase 10 | Pending |
| FACTORY-07 | Phase 10 | Pending |
| FACTORY-08 | Phase 10 | Pending |
| FACTORY-09 | Phase 10 | Pending |
| GATEWAY-01 | Phase 11 | Pending |
| GATEWAY-02 | Phase 11 | Pending |
| GATEWAY-03 | Phase 11 | Pending |
| GATEWAY-04 | Phase 11 | Pending |
| GATEWAY-05 | Phase 11 | Pending |
| GATEWAY-06 | Phase 11 | Pending |
| GATEWAY-07 | Phase 11 | Pending |
| GATEWAY-08 | Phase 11 | Pending |
| GATEWAY-09 | Phase 11 | Pending |
| QUAL-01 | Phase 9 | Pending |
| QUAL-02 | Phase 8 | Pending |
| QUAL-03 | Phase 9 | Pending |
| QUAL-04 | Phase 9 | Pending |
| QUAL-05 | Phase 9 | Pending |
| QUAL-06 | Phase 9 | Pending |
| QUAL-07 | Phase 11 | Pending |
| QUAL-08 | Phase 8 | Pending |

**Coverage:**
- v1.0 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after Milestone v1.0 roadmap creation*
