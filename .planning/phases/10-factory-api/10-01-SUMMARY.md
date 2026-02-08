---
phase: 10-factory-api
plan: 01
subsystem: api
tags: [zod, validation, pagination, fastify, kysely]

# Dependency graph
requires:
  - phase: 08-repository-layer
    provides: FactoryRepository with CRUD operations
  - phase: 09-api-server-foundation
    provides: Fastify server with Zod type provider
provides:
  - Common pagination schemas (query params and response metadata)
  - Factory API validation schemas (create, update, response, list)
  - Paginated repository queries with limit/offset support
  - Count method for pagination total
affects: [10-02-factory-routes, 11-gateway-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schemas for API validation separate from repository types"
    - "Common pagination schemas reusable across resource endpoints"
    - "z.coerce for query parameter string-to-number conversion"
    - "Response schemas exclude soft delete internals (deleted_at)"
    - "Repository pagination via optional { limit, offset } parameters"

key-files:
  created:
    - src/api/schemas/common.ts
    - src/api/schemas/factories.ts
  modified:
    - src/repositories/FactoryRepository.ts

key-decisions:
  - "Separate API schemas from repository types - decouples validation from data access"
  - "z.coerce for query params - handles string-to-number conversion automatically"
  - "Response schemas exclude deleted_at - API consumers shouldn't see soft delete internals"
  - "Backward-compatible pagination - findAll() without options works unchanged"
  - "Common pagination schemas - reusable for Gateway API in Phase 11"

patterns-established:
  - "API schema pattern: common.ts for shared pagination, {resource}.ts for resource-specific"
  - "Pagination query schema: limit (1-100, default 20), offset (>= 0, default 0)"
  - "Pagination response: total, limit, offset, hasNext, hasPrev"
  - "Response schemas: dates as ISO strings via z.string().datetime()"
  - "Repository pagination: optional { limit?, offset? } parameter, count() for total"

# Metrics
duration: 1min
completed: 2026-02-08
---

# Phase 10 Plan 01: Factory API Schemas and Pagination Summary

**Zod validation schemas for factory CRUD with common pagination support and backward-compatible repository enhancements**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-08T06:53:05Z
- **Completed:** 2026-02-08T06:54:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Common pagination schemas reusable across Factory and Gateway APIs
- Factory-specific validation schemas for create, update, and response bodies
- Paginated FactoryRepository queries with limit/offset support
- Count method for pagination metadata (total, hasNext, hasPrev)
- Backward-compatible changes - existing callers work unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod schemas for factory API** - `b9edca7` (feat)
2. **Task 2: Add pagination support to FactoryRepository** - `1cab7bb` (feat)

## Files Created/Modified
- `src/api/schemas/common.ts` - Reusable pagination query and response schemas
- `src/api/schemas/factories.ts` - Factory create, update, response, and list validation schemas
- `src/repositories/FactoryRepository.ts` - Added optional pagination params to findAll(), added count() method

## Decisions Made

1. **Separate API schemas from repository types**
   - Rationale: Decouples API validation from database types. Repository types are Kysely-generated from DB schema, API schemas define request/response contracts.
   - Impact: Clean separation of concerns, enables API evolution independent of schema changes.

2. **Use z.coerce for query parameters**
   - Rationale: Query params arrive as strings, z.coerce.number() handles automatic conversion with validation.
   - Impact: Simplified route handlers - no manual parseInt/validation.

3. **Response schemas exclude deleted_at**
   - Rationale: Soft delete is internal implementation detail, API consumers shouldn't see it.
   - Impact: Cleaner API contract, prevents confusion about deleted_at field meaning.

4. **Backward-compatible pagination**
   - Rationale: Existing findAll() callers shouldn't break. Optional params preserve existing behavior.
   - Impact: No changes needed in seed scripts or future non-paginated use cases.

5. **Common pagination schemas**
   - Rationale: Factory and Gateway APIs (Phase 11) both need pagination. Extract once, reuse everywhere.
   - Impact: Consistent pagination behavior across all list endpoints.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 10-02 (Factory CRUD Routes):**
- Validation schemas complete and compiled
- Repository supports paginated queries
- Common pagination schemas ready for route handlers
- All TypeScript types properly exported

**No blockers.** Plan 10-02 can implement factory routes using these schemas.

---
*Phase: 10-factory-api*
*Completed: 2026-02-08*

## Self-Check: PASSED

All created files exist:
- src/api/schemas/common.ts
- src/api/schemas/factories.ts

All commits verified:
- b9edca7 (Task 1)
- 1cab7bb (Task 2)
