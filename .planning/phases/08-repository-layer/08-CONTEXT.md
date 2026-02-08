# Phase 8: Repository Layer - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Create type-safe data access layer using Kysely that wraps database operations for factories and gateways. Includes encryption utilities for sensitive gateway credentials (passwords). This phase provides the repository abstraction that API endpoints (Phases 10-11) will use to interact with the database. Does not include API server setup or HTTP endpoints (those are Phase 9+).

</domain>

<decisions>
## Implementation Decisions

### Type generation & schema sync
- **Source of truth:** Generate TypeScript types directly from the running database schema (not from migration files)
- **Generation tool:** Use kysely-codegen or similar to introspect PostgreSQL and generate Database interface
- **When:** Automatically generate types after migrations run (npm run db:migrate should trigger type generation)
- **Safety:** Both compile-time (TypeScript) AND runtime validation (Zod schemas for query results)
- **Git strategy:** Commit generated types to git (easier CI, reviewable type changes, no database required for builds)

### Claude's Discretion
- Repository method signatures and organization
- Base repository pattern vs standalone repositories
- Error handling approach
- Encryption utility structure and key management
- Soft delete query behavior (default filtering, opt-in for deleted records)

</decisions>

<specifics>
## Specific Ideas

No specific requirements - standard Kysely + code generation workflow.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 08-repository-layer*
*Context gathered: 2026-02-08*
