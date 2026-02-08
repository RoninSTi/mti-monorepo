# Phase 7: Database Setup - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up PostgreSQL database with complete schema (organizations, factories, gateways tables) and migration infrastructure. This phase establishes the data model foundation for the REST API but does not include repository layer or API implementation (those are separate phases).

</domain>

<decisions>
## Implementation Decisions

### Migration tooling & workflow
- **Tool:** node-pg-migrate - lightweight, SQL-focused, good TypeScript support
- **Versioning:** Timestamp-based filenames (e.g., `20260207123045_create_factories.js`) - sortable, avoids conflicts in multi-developer scenarios
- **Rollback:** Append-only (up migrations only) - simpler, matches production reality, use new migrations to fix issues
- **Structure:** One file per table (separate migrations) - cleaner diffs, easier to understand

### Development ergonomics
- **Seed data:** Yes, realistic seed data - comprehensive test data that mirrors production scenarios for better edge case testing
- **Reset flow:** npm script (`npm run db:reset`) - single command that drops database, recreates schema, runs migrations, applies seed data
- **Isolation:** One database per developer - isolated PostgreSQL containers so developers can break things freely without conflicts
- **Dev tools:** None needed beyond basics - no additional tooling (pgAdmin, CLI utilities, etc.) required

### Claude's Discretion
- Docker Compose configuration details (ports, volumes, networks)
- Index strategy beyond foreign keys
- Exact seed data content and structure
- Migration file naming conventions beyond timestamp format

</decisions>

<specifics>
## Specific Ideas

No specific requirements - standard PostgreSQL setup with docker-compose and node-pg-migrate workflow.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 07-database-setup*
*Context gathered: 2026-02-07*
