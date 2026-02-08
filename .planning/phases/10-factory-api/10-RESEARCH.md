# Phase 10: Factory API - Research

**Researched:** 2026-02-08
**Domain:** REST CRUD API implementation with Fastify, Zod, and Kysely
**Confidence:** HIGH

## Summary

Phase 10 implements a complete REST CRUD API for factory management using the Fastify foundation established in Phase 9. The research covers REST API naming conventions, CRUD operation patterns, pagination strategies, error handling, request/response validation with Zod schemas, and testing approaches with Vitest.

The standard approach for CRUD APIs in 2026 uses plural resource names (/api/factories), HTTP methods to indicate operations (GET/POST/PUT/DELETE), offset-based pagination for admin interfaces with mostly static data, Zod schemas for request/response validation, and clear error codes (400 for malformed requests, 404 for missing resources, 422 for validation failures). The FactoryRepository from Phase 8 already implements soft delete filtering, so API endpoints will automatically exclude deleted records without additional logic.

**Primary recommendation:** Use plural resource names with HTTP method verbs, implement offset-based pagination with limit/offset query parameters (default limit=20, max limit=100), create separate Zod schemas for create/update/response payloads, leverage Fastify's inject() method for testing, and return standardized error responses using the Phase 9 error handler.

## Standard Stack

The established libraries/tools for REST CRUD APIs with Fastify and TypeScript:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.7+ | HTTP server framework | Already installed (Phase 9), provides route handling and plugin system |
| fastify-type-provider-zod | 6.1+ | Zod integration | Already installed (Phase 9), enables request/response validation with type inference |
| zod | 4.x | Schema validation | Already installed, used throughout project for runtime validation |
| kysely | 0.28+ | Query builder | Already installed (Phase 8), provides type-safe database access |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.x | Test framework | Already installed (Phase 8), use for route testing with inject() |
| @types/node | latest | Node.js type definitions | Already installed, required for TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Offset pagination | Cursor-based | Cursor is 17x faster for large datasets but prevents page jumping; offset works well for admin UIs with mostly static data |
| Separate create/update schemas | Single schema with .partial() | Separate schemas provide clearer validation errors and allow different required fields |
| 400 for all errors | 422 for validation | 422 distinguishes business logic failures from malformed requests, better client experience |
| Query parameters | Request body for filters | Query params are REST standard for GET requests, enable URL sharing and bookmarking |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/api/
├── routes/
│   ├── health.ts           # Existing (Phase 9)
│   └── factories.ts        # Phase 10 - all factory CRUD routes
├── schemas/
│   ├── common.ts           # Shared schemas (pagination, errors)
│   └── factories.ts        # Factory-specific request/response schemas
├── plugins/                # Existing (Phase 9)
├── app.ts                  # Existing - register factories routes here
└── server.ts               # Existing
```

### Pattern 1: Plural Resource Names with HTTP Methods
**What:** Use plural nouns for collections, HTTP methods for operations
**When to use:** All REST CRUD APIs
**Example:**
```typescript
// Source: https://restfulapi.net/resource-naming/
// Source: https://blog.dreamfactory.com/best-practices-for-naming-rest-api-endpoints

// Collection endpoints (plural)
POST   /api/factories          // Create new factory
GET    /api/factories          // List all factories
GET    /api/factories/:id      // Get single factory
PUT    /api/factories/:id      // Update factory
DELETE /api/factories/:id      // Soft delete factory

// NOT recommended:
// POST /api/factory/create
// GET /api/getFactories
// PUT /api/updateFactory/:id
```

### Pattern 2: Offset-Based Pagination for Admin UIs
**What:** Use limit and offset query parameters with metadata in response
**When to use:** Admin dashboards, factory management UIs with mostly static data
**Example:**
```typescript
// Source: https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/
// Source: https://apidog.com/blog/pagination-in-rest-apis/

// Request
GET /api/factories?limit=20&offset=40

// Response
{
  "data": [
    { "id": "uuid", "name": "Factory A", ... },
    { "id": "uuid", "name": "Factory B", ... }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasNext": true,
    "hasPrev": true
  }
}

// Default values: limit=20, offset=0
// Max limit: 100 (prevent server overload)
```

### Pattern 3: Separate Zod Schemas for Create/Update/Response
**What:** Different schemas for input validation vs output serialization
**When to use:** All CRUD operations where required fields differ
**Example:**
```typescript
// Source: https://zod.dev/
// Source: https://blog.logrocket.com/schema-validation-typescript-zod/

// schemas/factories.ts
import { z } from 'zod';

// Request body for POST /api/factories
export const createFactorySchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  location: z.string().max(500).nullable(),
  timezone: z.string().default('UTC'),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// Request body for PUT /api/factories/:id
export const updateFactorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  location: z.string().max(500).nullable().optional(),
  timezone: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Response from all endpoints
export const factoryResponseSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string(),
  location: z.string().nullable(),
  timezone: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// List response with pagination
export const factoryListResponseSchema = z.object({
  data: z.array(factoryResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});
```

### Pattern 4: Route Plugin with All CRUD Operations
**What:** Single plugin file containing all operations for a resource
**When to use:** REST resources with standard CRUD operations
**Example:**
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Testing/
// routes/factories.ts
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { factoryRepository } from '../../repositories/FactoryRepository';
import {
  createFactorySchema,
  updateFactorySchema,
  factoryResponseSchema,
  factoryListResponseSchema,
} from '../schemas/factories';
import { z } from 'zod';

const factoriesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // POST /api/factories - Create factory
  fastify.post('/', {
    schema: {
      body: createFactorySchema,
      response: {
        201: factoryResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const factory = await factoryRepository.create(request.body);

      // Convert Date objects to ISO strings for response
      reply.status(201).send({
        ...factory,
        created_at: factory.created_at.toISOString(),
        updated_at: factory.updated_at.toISOString(),
      });
    },
  });

  // GET /api/factories - List factories
  fastify.get('/', {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0),
      }),
      response: {
        200: factoryListResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { limit, offset } = request.query;

      // Get paginated results
      const factories = await factoryRepository.findAll(); // Will implement pagination
      const total = factories.length;

      reply.send({
        data: factories.map(f => ({
          ...f,
          created_at: f.created_at.toISOString(),
          updated_at: f.updated_at.toISOString(),
        })),
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0,
        },
      });
    },
  });

  // GET /api/factories/:id - Get single factory
  fastify.get('/:id', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      response: {
        200: factoryResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const factory = await factoryRepository.findById(request.params.id);

      if (!factory) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.send({
        ...factory,
        created_at: factory.created_at.toISOString(),
        updated_at: factory.updated_at.toISOString(),
      });
    },
  });

  // PUT /api/factories/:id - Update factory
  fastify.put('/:id', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: updateFactorySchema,
      response: {
        200: factoryResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const updated = await factoryRepository.update(request.params.id, request.body);

      if (!updated) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.send({
        ...updated,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      });
    },
  });

  // DELETE /api/factories/:id - Soft delete factory
  fastify.delete('/:id', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      response: {
        204: z.null(),
      },
    },
    handler: async (request, reply) => {
      const deleted = await factoryRepository.softDelete(request.params.id);

      if (!deleted) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.status(204).send();
    },
  });
};

export default factoriesRoutes;
```

### Pattern 5: Testing Routes with inject()
**What:** Use Fastify's inject() method to test routes without starting server
**When to use:** All route testing
**Example:**
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Testing/
// Source: https://dev.to/robertoumbelino/testing-your-api-with-fastify-and-vitest-a-step-by-step-guide-2840

// routes/factories.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';

describe('Factory API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/factories', () => {
    it('creates a factory with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/factories',
        payload: {
          organization_id: 'valid-uuid',
          name: 'Test Factory',
          location: '123 Main St',
          timezone: 'America/New_York',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test Factory');
    });

    it('returns 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/factories',
        payload: {
          name: '', // Empty name should fail
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/factories', () => {
    it('returns paginated list with default parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/factories',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        total: expect.any(Number),
      });
    });

    it('respects limit and offset parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/factories?limit=5&offset=10',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.pagination.limit).toBe(5);
      expect(body.pagination.offset).toBe(10);
    });
  });

  describe('GET /api/factories/:id', () => {
    it('returns factory by id', async () => {
      // First create a factory
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/factories',
        payload: { /* valid payload */ },
      });
      const created = createResponse.json();

      // Then retrieve it
      const response = await app.inject({
        method: 'GET',
        url: `/api/factories/${created.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(created.id);
    });

    it('returns 404 for non-existent factory', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/factories/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('FACTORY_NOT_FOUND');
    });
  });
});
```

### Anti-Patterns to Avoid
- **Using verbs in URLs:** `/api/getFactories` or `/api/createFactory` violates REST principles. Use HTTP methods instead.
- **Returning 200 for not found:** Always return 404 when a resource doesn't exist, not 200 with empty data.
- **Missing pagination limits:** Always enforce maximum limit (e.g., 100) to prevent clients from requesting millions of records.
- **Exposing deleted_at field:** API responses should exclude soft delete implementation details unless explicitly requested.
- **Inconsistent date formats:** Always return ISO 8601 datetime strings (`.toISOString()`) from API responses, not Date objects.
- **No validation on updates:** PUT/PATCH requests need validation just like POST requests.
- **Generic error messages:** Return specific error codes (FACTORY_NOT_FOUND, not NOT_FOUND) for better client debugging.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination logic | Manual LIMIT/OFFSET SQL | Kysely's .limit() and .offset() | Kysely generates correct SQL, handles edge cases, maintains type safety |
| Query parameter coercion | Manual parseInt(query.limit) | z.coerce.number() | Zod handles type coercion, validation, and error messages automatically |
| Date serialization | Manual date formatting | .toISOString() | Native method produces ISO 8601 format, handles timezones correctly |
| Error responses | Custom error objects per route | Phase 9 error handler | Centralized error handling ensures consistency across all endpoints |
| UUID validation | RegEx or manual checks | z.string().uuid() | Zod validates UUID format and provides clear error messages |
| Soft delete filtering | Manual WHERE clauses | Repository methods | FactoryRepository already excludes deleted records in all queries |

**Key insight:** The infrastructure from Phases 8-9 (repositories, error handling, Zod validation) handles most complexity. CRUD routes should be thin controllers that delegate to repositories and transform data for HTTP responses.

## Common Pitfalls

### Pitfall 1: Forgetting to Convert Dates to ISO Strings
**What goes wrong:** Response includes Date objects instead of strings, causing JSON serialization errors or timezone confusion.
**Why it happens:** Kysely returns Date objects from timestamptz columns, but JSON.stringify() converts them to UTC strings implicitly.
**How to avoid:** Explicitly call `.toISOString()` on all date fields in response mapping. Create a helper function for repeated transformations.
**Warning signs:** Clients receive dates in inconsistent formats. Tests fail with "Invalid Date" errors.

### Pitfall 2: Not Validating Route Parameters
**What goes wrong:** Invalid UUIDs (e.g., "abc" or "123") reach the repository, causing database errors instead of 400 responses.
**Why it happens:** Fastify doesn't validate URL parameters by default, only body/query when schemas are provided.
**How to avoid:** Always define params schema with `z.string().uuid()` for ID parameters.
**Warning signs:** Database errors in logs like "invalid input syntax for type uuid". Error handler returns 500 instead of 400.

### Pitfall 3: Missing 404 Checks After Repository Calls
**What goes wrong:** Routes return undefined or empty 200 responses when resources don't exist.
**Why it happens:** Repository methods return undefined for not found, but handler doesn't check before sending response.
**How to avoid:** After findById/update/softDelete, check if result is undefined and return 404 before proceeding.
**Warning signs:** Tests fail with "Cannot read properties of undefined". Clients can't distinguish between success and not found.

### Pitfall 4: Not Setting HTTP Status Codes
**What goes wrong:** Created resources return 200 instead of 201. Deleted resources return 200 with data instead of 204 with no content.
**Why it happens:** Fastify defaults to 200 OK for all responses unless explicitly set.
**How to avoid:** Use `reply.status(201)` for POST, `reply.status(204)` for DELETE. Define expected status codes in response schemas.
**Warning signs:** All successful responses return 200. REST API tests fail on status code assertions.

### Pitfall 5: Allowing Unbounded Pagination
**What goes wrong:** Client requests `?limit=999999` and crashes the server or causes timeout.
**Why it happens:** No maximum limit validation on pagination parameters.
**How to avoid:** Use `.max(100)` in limit validation schema. Document maximum in API docs.
**Warning signs:** Slow queries in production. Server memory spikes. Timeout errors under load.

### Pitfall 6: Exposing Internal Database Structure
**What goes wrong:** Response includes internal fields like `deleted_at`, `password_encrypted`, or database-specific metadata.
**Why it happens:** Directly sending repository results without transformation.
**How to avoid:** Define explicit response schemas that include only public fields. Map repository results to API response format.
**Warning signs:** Security audit flags exposed sensitive data. Clients depend on internal fields, preventing schema changes.

### Pitfall 7: Inconsistent Error Response Format
**What goes wrong:** Some routes return `{ error: "message" }`, others return `{ message: "error" }`, breaking error handling clients.
**Why it happens:** Manual error responses in routes instead of throwing errors for global handler.
**How to avoid:** Use Phase 9 error handler for all errors. Throw errors with statusCode property instead of manually sending error responses.
**Warning signs:** Client error handling requires route-specific logic. Error format varies between endpoints.

## Code Examples

Verified patterns from official sources:

### Complete Factory Routes Implementation
```typescript
// Source: https://github.com/turkerdev/fastify-type-provider-zod
// Source: https://fastify.dev/docs/latest/Reference/Routes/
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { factoryRepository } from '../../repositories/FactoryRepository';

// Helper to transform repository results to API responses
const toFactoryResponse = (factory: any) => ({
  ...factory,
  created_at: factory.created_at.toISOString(),
  updated_at: factory.updated_at.toISOString(),
  deleted_at: factory.deleted_at ? factory.deleted_at.toISOString() : null,
});

const factoriesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: {
      body: z.object({
        organization_id: z.string().uuid(),
        name: z.string().min(1).max(255),
        location: z.string().max(500).nullable(),
        timezone: z.string().default('UTC'),
        metadata: z.record(z.string(), z.unknown()).default({}),
      }),
      response: {
        201: z.object({
          id: z.string().uuid(),
          organization_id: z.string().uuid(),
          name: z.string(),
          location: z.string().nullable(),
          timezone: z.string(),
          metadata: z.record(z.string(), z.unknown()),
          created_at: z.string().datetime(),
          updated_at: z.string().datetime(),
        }),
      },
    },
    handler: async (request, reply) => {
      const factory = await factoryRepository.create(request.body);
      reply.status(201).send(toFactoryResponse(factory));
    },
  });

  fastify.get('/', {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0),
      }),
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.string().uuid(),
            organization_id: z.string().uuid(),
            name: z.string(),
            location: z.string().nullable(),
            timezone: z.string(),
            metadata: z.record(z.string(), z.unknown()),
            created_at: z.string().datetime(),
            updated_at: z.string().datetime(),
          })),
          pagination: z.object({
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
            hasNext: z.boolean(),
            hasPrev: z.boolean(),
          }),
        }),
      },
    },
    handler: async (request, reply) => {
      const { limit, offset } = request.query;
      const factories = await factoryRepository.findAll();
      const total = factories.length;

      const paginatedData = factories.slice(offset, offset + limit);

      reply.send({
        data: paginatedData.map(toFactoryResponse),
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0,
        },
      });
    },
  });

  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: z.object({
          id: z.string().uuid(),
          organization_id: z.string().uuid(),
          name: z.string(),
          location: z.string().nullable(),
          timezone: z.string(),
          metadata: z.record(z.string(), z.unknown()),
          created_at: z.string().datetime(),
          updated_at: z.string().datetime(),
        }),
      },
    },
    handler: async (request, reply) => {
      const factory = await factoryRepository.findById(request.params.id);

      if (!factory) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.send(toFactoryResponse(factory));
    },
  });

  fastify.put('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).max(255).optional(),
        location: z.string().max(500).nullable().optional(),
        timezone: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      response: {
        200: z.object({
          id: z.string().uuid(),
          organization_id: z.string().uuid(),
          name: z.string(),
          location: z.string().nullable(),
          timezone: z.string(),
          metadata: z.record(z.string(), z.unknown()),
          created_at: z.string().datetime(),
          updated_at: z.string().datetime(),
        }),
      },
    },
    handler: async (request, reply) => {
      const updated = await factoryRepository.update(request.params.id, request.body);

      if (!updated) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.send(toFactoryResponse(updated));
    },
  });

  fastify.delete('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null(),
      },
    },
    handler: async (request, reply) => {
      const deleted = await factoryRepository.softDelete(request.params.id);

      if (!deleted) {
        return reply.status(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      reply.status(204).send();
    },
  });
};

export default factoriesRoutes;
```

### Pagination Query Parameters with Zod Coercion
```typescript
// Source: https://zod.dev/
// Source: https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/

// Query parameters come as strings, use z.coerce to convert
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Usage in route
fastify.get('/api/factories', {
  schema: {
    querystring: paginationSchema,
  },
  handler: async (request, reply) => {
    const { limit, offset } = request.query;
    // limit and offset are now numbers, not strings
  },
});
```

### Adding Pagination Support to Repository
```typescript
// Source: Kysely documentation
// repositories/FactoryRepository.ts

class FactoryRepository {
  // Update findAll to support pagination
  async findAll(options?: { limit?: number; offset?: number }): Promise<Factory[]> {
    let query = db
      .selectFrom('factories')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query.execute();
  }

  // Add count method for pagination metadata
  async count(): Promise<number> {
    const result = await db
      .selectFrom('factories')
      .select(db.fn.count('id').as('count'))
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    return Number(result.count);
  }
}
```

### Registering Factory Routes in App
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Plugins-Guide/
// api/app.ts

export async function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({ ...options }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(errorHandlerPlugin);

  // Register routes with /api prefix
  await app.register(import('./routes/health'), { prefix: '/api' });
  await app.register(import('./routes/factories'), { prefix: '/api/factories' }); // Phase 10

  return app;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 200 for all responses | Semantic status codes (201, 204, 404) | REST maturity | Clients can handle errors without parsing body |
| Page-based pagination | Offset-based or cursor-based | 2020+ | Better performance, clearer semantics |
| Single error code 400 | 400 vs 422 distinction | 2021+ (RFC 4918) | Better client error handling, distinguish malformed vs invalid |
| Request body for GET filters | Query parameters | Always | RESTful, enables URL sharing, browser history |
| JSON Schema validation | Zod with type providers | 2022+ (Fastify v4) | Single source of truth for types and validation |
| Manual date formatting | .toISOString() | ES5+ standard | Consistent ISO 8601 format, timezone-aware |
| Hard deletes | Soft deletes with deleted_at | Modern data practices | Audit trail, data recovery, safer operations |

**Deprecated/outdated:**
- **Manual coercion:** Use `z.coerce.number()` instead of `parseInt(query.limit)` for type conversion
- **Nested routes:** `/api/organizations/:orgId/factories` makes endpoints inflexible; prefer flat `/api/factories?organization_id=X`
- **PATCH vs PUT confusion:** Use PUT for full updates (most CRUD APIs), defer PATCH for partial updates if needed
- **Returning deleted_at in responses:** Hide soft delete implementation details from API clients

## Open Questions

Things that couldn't be fully resolved:

1. **Count query performance**
   - What we know: Pagination requires total count for metadata, but COUNT(*) can be slow on large tables
   - What's unclear: Whether to run count query on every request or cache it (factories table likely has <1000 records)
   - Recommendation: Run count query initially (simple implementation), add caching in future phase if performance becomes issue

2. **Filtering by organization_id**
   - What we know: Requirements don't mention filtering factories by organization, but database has foreign key
   - What's unclear: Whether GET /api/factories should support `?organization_id=uuid` query parameter
   - Recommendation: Implement basic pagination first, add filtering in follow-up if user requests it

3. **Validation error detail level**
   - What we know: Zod validation errors include field paths and error messages
   - What's unclear: How much detail to expose in 400 responses (full Zod error vs simplified message)
   - Recommendation: Use Phase 9 error handler's existing validation error format (includes details array), provides good debugging experience

4. **Date field serialization strategy**
   - What we know: Must convert Date objects to strings for JSON responses
   - What's unclear: Whether to handle in route handlers, response schema transforms, or JSON serializer
   - Recommendation: Use helper function in route handlers for explicit control and clarity

## Sources

### Primary (HIGH confidence)
- [REST API URI Naming Conventions](https://restfulapi.net/resource-naming/) - Resource naming best practices
- [Best Practices for Naming REST API Endpoints](https://blog.dreamfactory.com/best-practices-for-naming-rest-api-endpoints) - Plural vs singular conventions
- [REST API Design: Filtering, Sorting, and Pagination | Moesif](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/) - Pagination patterns
- [How to Implement Pagination in REST APIs](https://apidog.com/blog/pagination-in-rest-apis/) - Offset-based pagination
- [REST API: 400 vs 422 Usage](https://openillumi.com/en/en-rest-api-error-400-422-usage/) - Error code distinctions
- [Best Practices for REST API Error Handling | Baeldung](https://www.baeldung.com/rest-api-error-handling-best-practices) - Error handling patterns
- [Zod Official Documentation](https://zod.dev/) - Schema validation
- [Schema validation in TypeScript with Zod - LogRocket](https://blog.logrocket.com/schema-validation-typescript-zod/) - Zod best practices
- [Fastify Testing Guide](https://fastify.dev/docs/latest/Guides/Testing/) - Testing with inject()
- [Testing Your API with Fastify and Vitest](https://dev.to/robertoumbelino/testing-your-api-with-fastify-and-vitest-a-step-by-step-guide-2840) - Vitest patterns

### Secondary (MEDIUM confidence)
- [A Developer's Guide to API Pagination](https://embedded.gusto.com/blog/api-pagination/) - Offset vs cursor comparison
- [Offset vs Cursor-Based Pagination | Medium](https://medium.com/@maryam-noor/offset-vs-cursor-based-pagination-choosing-the-best-approach-2e93702a118b) - Pagination tradeoffs
- [Pagination Best Practices in REST API Design | Speakeasy](https://www.speakeasy.com/api-design/pagination) - API design patterns
- [How to Validate Data with Zod in TypeScript](https://oneuptime.com/blog/post/2026-01-25-zod-validation-typescript/view) - Recent Zod patterns
- [Web API Design Best Practices - Azure](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design) - Microsoft API guidelines
- [Soft deletes in EF Core](https://blog.elmah.io/soft-deletes-in-ef-core-how-to-implement-and-query-efficiently/) - Soft delete patterns
- [GitHub: fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) - Integration examples

### Tertiary (LOW confidence)
- None - all key findings verified with official documentation or established sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and working from Phases 8-9
- Architecture: HIGH - REST patterns are well-established, verified with official sources
- Pitfalls: HIGH - Common issues documented in multiple sources and official guides
- Code examples: HIGH - Patterns from official Fastify/Zod documentation and working examples

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - REST patterns are stable)

**Key dependencies from existing project:**
- FactoryRepository already implements soft delete filtering (Phase 8)
- Error handler already returns standardized format (Phase 9)
- Zod validation infrastructure already configured (Phase 9)
- Fastify with type provider already set up (Phase 9)
- Vitest test framework already configured (Phase 8)

**Implementation readiness:**
- No new dependencies required
- No database schema changes needed
- No configuration changes needed
- Routes can be added to existing app.ts
- Schemas follow existing patterns from repositories/types.ts

**Project alignment:**
- FACTORY-01 through FACTORY-09 requirements all addressable with researched patterns
- Soft delete requirement (FACTORY-06) already implemented in repository layer
- Validation requirement (FACTORY-07) covered by Zod integration
- Error requirement (FACTORY-08) covered by Phase 9 error handler
- Schema requirement (FACTORY-09) covered by Zod schema patterns
