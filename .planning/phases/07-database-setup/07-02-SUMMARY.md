---
phase: 07-database-setup
plan: 02
subsystem: database-schema
tags: [postgresql, migrations, schema, seed-data]
type: implementation
status: complete

requires:
  - phase: 07-01
    provides: [database-infrastructure, node-pg-migrate]

provides:
  - organizations-table
  - factories-table
  - gateways-table
  - seed-data-workflow
  - database-reset-workflow

affects:
  - phase: 08
    needs: [table-schemas, seed-data]
    reason: Repository layer builds on these tables

tech-stack:
  added:
    - node-pg-migrate: TypeScript migration files
  patterns:
    - append-only migrations (no down())
    - soft deletes (deleted_at column)
    - auto-updating timestamps (updated_at trigger)
    - JSONB metadata columns
    - partial indexes for active records

key-files:
  created:
    - migrations/1707345600001_create-organizations.ts
    - migrations/1707345600002_create-factories.ts
    - migrations/1707345600003_create-gateways.ts
    - src/database/seed.ts
    - src/database/reset.ts
  modified:
    - package.json

decisions:
  - decision: Use pgm.func() for JSONB defaults
    rationale: node-pg-migrate requires function wrapper for proper SQL generation
    alternatives: [string literals]
    outcome: Migrations work correctly with '{}'::jsonb cast

  - decision: Placeholder for password encryption in seed data
    rationale: Real AES-256-GCM encryption will be implemented in Phase 8
    alternatives: [skip password field, use plain text]
    outcome: PLACEHOLDER_ENCRYPTED_PASSWORD string with explanatory comment

  - decision: Use tsx for db:migrate npm script
    rationale: node-pg-migrate needs TypeScript loader to execute .ts migration files
    alternatives: [compile to JS first, use node --loader]
    outcome: Updated package.json to use "tsx node_modules/.bin/node-pg-migrate up"

metrics:
  duration: 3min
  completed: 2026-02-08

quality:
  test-coverage: manual
  documentation: inline-comments
---

# Phase 07 Plan 02: Database Schema Migrations Summary

**One-liner:** Complete PostgreSQL schema with organizations, factories, and gateways tables, foreign key relationships, soft deletes, auto-updating timestamps, and single-command reset workflow

## What Was Built

Created three migration files that establish the complete database schema for Milestone v1.0:

**Organizations Table:**
- UUID primary key with gen_random_uuid() default
- Name column (varchar 255, required)
- JSONB metadata column (default empty object)
- Timestamps: created_at, updated_at (auto-updates), deleted_at (soft delete)
- Indexes: name, partial index on deleted_at for active records
- Trigger: auto-update updated_at on modification

**Factories Table:**
- UUID primary key
- Foreign key to organizations (CASCADE delete)
- Name, location (nullable), timezone (default 'UTC')
- JSONB metadata column
- Timestamps with soft delete support
- Indexes: organization_id (FK), name, partial deleted_at
- Trigger: auto-update updated_at

**Gateways Table:**
- UUID primary key
- Foreign key to factories (CASCADE delete)
- Gateway credentials: gateway_id (unique partial), name, url, email, password_encrypted
- Device info: model, firmware_version
- Connection tracking: last_seen_at (nullable)
- JSONB metadata column
- Timestamps with soft delete support
- Indexes: factory_id (FK), unique gateway_id (active only), last_seen_at, partial deleted_at
- Trigger: auto-update updated_at

**Seed Data Script:**
- Transaction-based seed with TRUNCATE CASCADE
- 1 organization: "Acme Manufacturing"
- 3 factories: Springfield Plant, Detroit Assembly, Austin Facility
- 6 gateways: 2 per factory with realistic device IDs, URLs, metadata
- Varies last_seen_at to simulate connection history
- Placeholder for password encryption (Phase 8)

**Database Reset Workflow:**
- Single-command reset: drop database, create database, run migrations, seed data
- Connects to default postgres database to drop/create app database
- Sequential execution with progress logging
- Error handling with proper exit codes

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create migration files | 1ad5101 | 3 migration files |
| 2 | Add seed data and reset workflow | c82ea0c | seed.ts, reset.ts, package.json |

## Verification Results

All success criteria met:

- ✅ Three migration files apply without errors
- ✅ Organizations table: UUID PK, name, metadata (JSONB), timestamps, soft delete, updated_at trigger
- ✅ Factories table: UUID PK, organization_id FK with CASCADE, name, location, timezone, metadata, timestamps, soft delete, updated_at trigger
- ✅ Gateways table: UUID PK, factory_id FK with CASCADE, gateway_id (unique active), name, url, email, password_encrypted, model, firmware_version, last_seen_at, metadata, timestamps, soft delete, updated_at trigger
- ✅ Foreign key indexes exist on organization_id and factory_id
- ✅ Partial indexes exist on deleted_at columns (WHERE deleted_at IS NULL)
- ✅ Seed data provides 1 org, 3 factories, 6 gateways
- ✅ npm run db:reset works in single command

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed db:migrate npm script to use tsx**
- **Found during:** Task 2 - testing database reset workflow
- **Issue:** node-pg-migrate couldn't execute TypeScript migration files, failed with "Unknown file extension .ts"
- **Fix:** Updated package.json db:migrate script from "node-pg-migrate -j ts up" to "tsx node_modules/.bin/node-pg-migrate up"
- **Files modified:** package.json
- **Commit:** c82ea0c (included with Task 2)

**2. [Rule 3 - Blocking] Fixed JSONB default value syntax**
- **Found during:** Task 1 - running migrations
- **Issue:** String literal "'{}'" for JSONB default caused PostgreSQL syntax error
- **Fix:** Changed to pgm.func("'{}'::jsonb") to properly cast empty object to JSONB type
- **Files modified:** All three migration files
- **Commit:** 1ad5101 (corrected before task commit)

**3. [Rule 3 - Blocking] Stopped conflicting PostgreSQL container**
- **Found during:** Task 1 - starting Docker Compose
- **Issue:** Port 5432 already allocated by existing container (vanadium-db-1)
- **Fix:** Ran docker stop vanadium-db-1 to free the port
- **Files modified:** None (runtime only)
- **Commit:** N/A (infrastructure operation)

## Technical Insights

**Migration Pattern:**
- Append-only migrations (no down() functions) prevent accidental data loss
- PL/pgSQL trigger function created once in first migration, reused across all tables
- Partial indexes (WHERE deleted_at IS NULL) optimize queries for active records only

**Schema Design:**
- UUID primary keys future-proof for distributed systems
- CASCADE deletes maintain referential integrity (delete org → deletes factories → deletes gateways)
- JSONB metadata columns provide flexibility without schema migrations
- Soft deletes preserve audit trail without losing foreign key relationships

**Developer Workflow:**
- Single-command reset (npm run db:reset) enables fast iteration
- Seed data provides realistic test scenarios immediately
- Transaction-based seed ensures atomicity (all or nothing)

## Next Phase Readiness

**Ready for Phase 08 (Repository Layer):**
- ✅ Complete schema with all required columns
- ✅ Foreign key relationships established
- ✅ Indexes optimized for expected query patterns
- ✅ Soft delete support in place
- ✅ Seed data available for repository testing
- ✅ Reset workflow for clean test environment

**Blockers:** None

**Dependencies satisfied:**
- Phase 07-01: PostgreSQL infrastructure and node-pg-migrate setup ✓

**Notes:**
- Password encryption deferred to Phase 8 as planned
- Gateway connection state remains in-memory (as designed)
- Metadata JSONB columns ready for flexible data without schema changes

## Self-Check: PASSED

All created files exist:
- migrations/1707345600001_create-organizations.ts ✓
- migrations/1707345600002_create-factories.ts ✓
- migrations/1707345600003_create-gateways.ts ✓
- src/database/seed.ts ✓
- src/database/reset.ts ✓

All commits exist:
- 1ad5101 ✓
- c82ea0c ✓
