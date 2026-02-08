# Phase 11: Gateway API CRUD - Research

**Researched:** 2026-02-08
**Domain:** REST CRUD API for gateway management with encrypted credential handling
**Confidence:** HIGH

## Summary

Phase 11 implements a complete REST CRUD API for gateway management, building on the Factory API patterns from Phase 10 while adding critical security requirements for encrypted credential storage. The research covers REST API patterns for sensitive data handling, password encryption workflows in CRUD operations, factory-based filtering for hierarchical resources, and preventing credential leakage in API responses.

The Gateway API follows identical patterns to Factory API (Fastify routes, Zod validation, offset pagination) but adds three critical differences: (1) password encryption on create, (2) password re-encryption on update when changed, (3) password field exclusion from all API responses. The GatewayRepository from Phase 8 already implements encryption transparently, so routes must never accept or return password_encrypted directly—only plaintext passwords for input, and complete omission for output.

The standard approach uses the GatewayRepository's create() method (accepts plaintext password) for POST requests, updatePassword() method for password changes in PUT requests, and excludes password-related fields (password, password_encrypted) from all response schemas. Factory filtering uses `?factory_id=uuid` query parameter for GET /api/gateways to support hierarchical queries (e.g., "show me all gateways in Factory X").

**Primary recommendation:** Mirror Factory API patterns (Phase 10) with three additions: (1) create gateway response schema excludes all password fields, (2) update gateway uses conditional logic—if password field present in request, call updatePassword() to re-encrypt, otherwise call update() for other fields, (3) add factory_id filter to list endpoint with pagination for hierarchical queries.

## Standard Stack

The established libraries/tools for REST CRUD APIs with encrypted credential handling:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.7+ | HTTP server framework | Already installed (Phase 9), handles routes and validation |
| fastify-type-provider-zod | 6.1+ | Zod integration | Already installed (Phase 9), type-safe request/response validation |
| zod | 4.x | Schema validation | Already installed, runtime validation throughout project |
| kysely | 0.28+ | Query builder | Already installed (Phase 8), type-safe database queries |
| crypto (Node.js) | built-in | AES-256-GCM encryption | Native module, no dependencies, used in Phase 8 encryption |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.x | Test framework | Already installed (Phase 8), route testing with inject() |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Exclude password in code | Database views without password | Views add complexity; code-level exclusion is clearer and easier to test |
| Hash passwords | Encrypt passwords | Hashing is one-way; need plaintext to authenticate with gateways (requirement) |
| Separate password update endpoint | Include in PUT | Separate endpoint (PATCH /gateways/:id/password) isolates password logic but adds routes; conditional update is simpler |
| Return encrypted password | Never return password | Encrypted data still leaks information (encryption doesn't change when password unchanged); omit entirely |

**Installation:**
```bash
# No new dependencies required - all libraries already installed and configured
```

## Architecture Patterns

### Recommended Project Structure
```
src/api/
├── routes/
│   ├── health.ts           # Existing (Phase 9)
│   ├── factories.ts        # Existing (Phase 10)
│   └── gateways.ts         # Phase 11 - all gateway CRUD routes
├── schemas/
│   ├── common.ts           # Existing (pagination schemas)
│   ├── factories.ts        # Existing (Phase 10)
│   └── gateways.ts         # Phase 11 - gateway request/response schemas
├── plugins/                # Existing (Phase 9)
├── app.ts                  # Existing - register gateway routes here
└── server.ts               # Existing
```

### Pattern 1: Password Field Handling in Gateway CRUD
**What:** Accept plaintext password on input, encrypt before storage, never return password on output
**When to use:** All gateway API operations involving credentials
**Example:**
```typescript
// Create gateway schema - accepts plaintext password
export const createGatewaySchema = z.object({
  factory_id: z.string().uuid(),
  gateway_id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  email: z.string().email().max(255),
  password: z.string().min(1),  // Plaintext - will be encrypted by repository
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// Update gateway schema - password optional, other fields optional
export const updateGatewaySchema = z.object({
  gateway_id: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(1).optional(),  // If present, triggers re-encryption
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Response schema - NEVER includes password or password_encrypted
export const gatewayResponseSchema = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  gateway_id: z.string(),
  name: z.string(),
  url: z.string(),
  email: z.string(),
  // NO password field
  // NO password_encrypted field
  model: z.string().nullable(),
  firmware_version: z.string().nullable(),
  last_seen_at: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

### Pattern 2: Conditional Password Update Logic
**What:** Update password separately if changed, otherwise update other fields
**When to use:** PUT /api/gateways/:id when request may or may not include password
**Example:**
```typescript
// PUT /:id - Update gateway
app.put('/:id', {
  schema: {
    params: z.object({ id: z.string().uuid() }),
    body: updateGatewaySchema,
    response: {
      200: gatewayResponseSchema,
    },
  },
  handler: async (request, reply) => {
    const { password, ...otherUpdates } = request.body;

    let updated: Gateway | undefined;

    if (password) {
      // Password changed - use updatePassword to re-encrypt
      // Then update other fields if any
      updated = await gatewayRepository.updatePassword(request.params.id, password);

      if (!updated) {
        return reply.code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }

      // If other fields also changed, update them separately
      if (Object.keys(otherUpdates).length > 0) {
        updated = await gatewayRepository.update(request.params.id, otherUpdates);
      }
    } else {
      // No password change - update other fields only
      updated = await gatewayRepository.update(request.params.id, otherUpdates);

      if (!updated) {
        return reply.code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }
    }

    return toGatewayResponse(updated);
  },
});

// Helper function to transform repository Gateway to API response
// CRITICAL: Excludes password_encrypted field
function toGatewayResponse(gateway: Gateway) {
  return {
    id: gateway.id,
    factory_id: gateway.factory_id,
    gateway_id: gateway.gateway_id,
    name: gateway.name,
    url: gateway.url,
    email: gateway.email,
    // password_encrypted is NOT included
    model: gateway.model,
    firmware_version: gateway.firmware_version,
    last_seen_at: gateway.last_seen_at ? gateway.last_seen_at.toISOString() : null,
    metadata: (gateway.metadata || {}) as Record<string, unknown>,
    created_at: gateway.created_at.toISOString(),
    updated_at: gateway.updated_at.toISOString(),
  };
}
```

### Pattern 3: Factory-Based Filtering with Pagination
**What:** Add optional factory_id query parameter to list endpoint for hierarchical queries
**When to use:** GET /api/gateways when filtering by parent factory
**Example:**
```typescript
// Extended pagination schema with factory filter
export const gatewayListQuerySchema = paginationQuerySchema.extend({
  factory_id: z.string().uuid().optional(),
});

// GET / - List gateways with optional factory filter
app.get('/', {
  schema: {
    querystring: gatewayListQuerySchema,
    response: {
      200: gatewayListResponseSchema,
    },
  },
  handler: async (request, reply) => {
    const { limit, offset, factory_id } = request.query;

    let gateways: Gateway[];
    let total: number;

    if (factory_id) {
      // Filter by factory
      const factoryGateways = await gatewayRepository.findActive(factory_id);
      total = factoryGateways.length;
      gateways = factoryGateways.slice(offset, offset + limit);
    } else {
      // All gateways with pagination
      [gateways, total] = await Promise.all([
        gatewayRepository.findAll({ limit, offset }),
        gatewayRepository.count(),
      ]);
    }

    return {
      data: gateways.map(toGatewayResponse),
      pagination: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrev: offset > 0,
      },
    };
  },
});
```

### Pattern 4: Adding Pagination Support to GatewayRepository
**What:** Update findAll() to accept optional limit/offset, add count() method
**When to use:** When repository doesn't yet support pagination
**Example:**
```typescript
// GatewayRepository modifications (if not already present)
class GatewayRepository {
  // Update findAll to support pagination
  async findAll(options?: { limit?: number; offset?: number }): Promise<Gateway[]> {
    let query = db
      .selectFrom('gateways')
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
      .selectFrom('gateways')
      .select(db.fn.countAll().as('count'))
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    return Number(result.count);
  }
}
```

### Anti-Patterns to Avoid
- **Returning password_encrypted field:** Even encrypted passwords leak information (unchanged encryption = unchanged password). Never include in responses.
- **Accepting password_encrypted in requests:** API consumers should never handle encrypted data directly. Accept plaintext password only.
- **Storing plaintext passwords:** Never store passwords unencrypted, even temporarily. Always use GatewayRepository methods that encrypt.
- **Re-encrypting unchanged passwords:** On update, only re-encrypt if password field is present in request. Otherwise encryption changes even though password didn't.
- **Missing factory_id validation:** Ensure factory exists before creating gateway (foreign key will error, but 400 is better than 500).
- **Exposing encryption errors:** Database errors with encryption should return 500 with generic message, never expose key configuration issues.
- **Not filtering soft-deleted gateways:** All queries must include `deleted_at IS NULL` (already handled by repository).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password encryption | Custom crypto implementation | Node.js crypto module with AES-256-GCM | Native module handles IV generation, authentication tags, edge cases correctly |
| Encrypted data storage format | Custom JSON format | EncryptedData interface from encryption.ts | Already tested in Phase 8, includes encrypted/iv/authTag fields |
| Password field exclusion | Manual spread operators | toGatewayResponse helper function | Centralized transformation ensures consistency, easier to maintain |
| Factory filtering logic | Complex if/else chains | Repository methods (findActive for factory, findAll for all) | Repository already implements filtering, maintains type safety |
| Pagination with filtering | Manual slice/offset logic | Kysely limit/offset + repository count | Database handles pagination efficiently, prevents memory issues |
| Conditional updates | Separate endpoints | Single PUT with conditional logic | Simpler for clients, fewer routes to test and document |

**Key insight:** The GatewayRepository from Phase 8 already handles encryption/decryption transparently. Route handlers should treat password as plaintext string on input, call repository methods to encrypt, and exclude password entirely from output. The repository's create() and updatePassword() methods handle all encryption complexity.

## Common Pitfalls

### Pitfall 1: Exposing Encrypted Passwords in API Responses
**What goes wrong:** API returns password_encrypted field thinking "it's encrypted, so it's safe."
**Why it happens:** Misunderstanding security—encryption protects data at rest, not in transit to unauthorized parties.
**How to avoid:** Response schemas MUST NOT include password or password_encrypted fields. Use toGatewayResponse helper that explicitly excludes password_encrypted.
**Warning signs:** Security audit flags password_encrypted in responses. Tests don't verify field exclusion.

### Pitfall 2: Not Re-Encrypting Passwords on Update
**What goes wrong:** Updating gateway without password field accidentally breaks password (leaves old encrypted value that no longer decrypts).
**Why it happens:** Forgetting that update() method doesn't touch password_encrypted column when password not provided.
**How to avoid:** Only call updatePassword() when request.body.password exists. For updates without password, call update() for other fields only.
**Warning signs:** Gateway authentication fails after updating gateway name/URL. Encrypted password field unchanged in database after PUT with password.

### Pitfall 3: Missing Factory Existence Validation
**What goes wrong:** Creating gateway with non-existent factory_id returns 500 instead of 400.
**Why it happens:** Foreign key constraint violation happens at database level, not validation level.
**How to avoid:** Add factoryRepository.findById check before gatewayRepository.create. Return 400 with "Factory not found" error.
**Warning signs:** Database errors like "violates foreign key constraint" in logs. 500 responses for invalid factory_id.

### Pitfall 4: Accepting Empty Passwords
**What goes wrong:** Empty string password passes validation but creates broken gateway that can't authenticate.
**Why it happens:** Zod z.string() allows empty strings unless .min(1) is added.
**How to avoid:** Use z.string().min(1) for password field in create/update schemas. Document minimum password length.
**Warning signs:** Gateways created but connection tests fail with authentication errors. Empty password_encrypted in database.

### Pitfall 5: Not Handling Factory Filtering Edge Cases
**What goes wrong:** GET /api/gateways?factory_id=invalid-uuid returns 500 or crashes, or filtering returns incorrect results.
**Why it happens:** Not validating factory_id format, or using findActive without checking if factory exists.
**How to avoid:** Zod validates factory_id as UUID in query schema. findActive returns empty array if factory has no gateways (no need for factory existence check).
**Warning signs:** Routes crash on malformed factory_id. Tests don't cover factory filtering with non-existent factory.

### Pitfall 6: Inconsistent Date Field Handling
**What goes wrong:** last_seen_at sometimes returns Date object, sometimes null, sometimes string, causing client parsing errors.
**Why it happens:** Forgetting to handle nullable datetime fields differently than required fields.
**How to avoid:** Explicitly handle nullable dates: `gateway.last_seen_at ? gateway.last_seen_at.toISOString() : null`
**Warning signs:** Type errors in tests. Clients report "Invalid Date" for last_seen_at. Inconsistent date formats between fields.

### Pitfall 7: Leaking Encryption Errors to API Responses
**What goes wrong:** Encryption key misconfiguration returns detailed error "ENCRYPTION_KEY environment variable not set" to API client.
**Why it happens:** Repository constructor throws error, unhandled by error handler, propagates to API response.
**How to avoid:** Repository singleton initializes at startup, fails fast before server starts. Production should never reach routes with missing encryption key.
**Warning signs:** Encryption errors in production API responses. 500 responses with detailed stack traces about encryption.

## Code Examples

Verified patterns from existing code and official sources:

### Complete Gateway Routes Implementation
```typescript
// routes/gateways.ts
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createGatewaySchema,
  updateGatewaySchema,
  gatewayResponseSchema,
  gatewayListResponseSchema,
  gatewayListQuerySchema,
} from '../schemas/gateways';
import { gatewayRepository } from '../../repositories/GatewayRepository';
import { Gateway } from '../../repositories/types';

/**
 * Convert repository Gateway type to API response format
 * CRITICAL: Excludes password_encrypted field for security
 */
function toGatewayResponse(gateway: Gateway) {
  return {
    id: gateway.id,
    factory_id: gateway.factory_id,
    gateway_id: gateway.gateway_id,
    name: gateway.name,
    url: gateway.url,
    email: gateway.email,
    // password_encrypted deliberately excluded
    model: gateway.model,
    firmware_version: gateway.firmware_version,
    last_seen_at: gateway.last_seen_at ? gateway.last_seen_at.toISOString() : null,
    metadata: (gateway.metadata || {}) as Record<string, unknown>,
    created_at: gateway.created_at.toISOString(),
    updated_at: gateway.updated_at.toISOString(),
  };
}

const gatewayRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST / - Create gateway with encrypted password
  app.post(
    '/',
    {
      schema: {
        body: createGatewaySchema,
        response: {
          201: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // Repository encrypts password automatically
      const gateway = await gatewayRepository.create(request.body as any);
      return reply.status(201).send(toGatewayResponse(gateway));
    }
  );

  // GET / - List gateways with optional factory filter
  app.get(
    '/',
    {
      schema: {
        querystring: gatewayListQuerySchema,
        response: {
          200: gatewayListResponseSchema,
        },
      },
    },
    async (request) => {
      const { limit, offset, factory_id } = request.query;

      let gateways: Gateway[];
      let total: number;

      if (factory_id) {
        // Filter by factory - use findActive
        const factoryGateways = await gatewayRepository.findActive(factory_id);
        total = factoryGateways.length;
        // Manual pagination for filtered results
        gateways = factoryGateways.slice(offset, offset + limit);
      } else {
        // All gateways - use paginated findAll
        [gateways, total] = await Promise.all([
          gatewayRepository.findAll({ limit, offset }),
          gatewayRepository.count(),
        ]);
      }

      return {
        data: gateways.map(toGatewayResponse),
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0,
        },
      };
    }
  );

  // GET /:id - Get gateway by ID
  app.get(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const gateway = await gatewayRepository.findById(request.params.id);

      if (!gateway) {
        return (reply as any).code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }

      return toGatewayResponse(gateway);
    }
  );

  // PUT /:id - Update gateway (re-encrypt if password changed)
  app.put(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateGatewaySchema,
        response: {
          200: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { password, ...otherUpdates } = request.body;

      let updated: Gateway | undefined;

      if (password) {
        // Password changed - re-encrypt
        updated = await gatewayRepository.updatePassword(request.params.id, password);

        if (!updated) {
          return (reply as any).code(404).send({
            error: {
              code: 'GATEWAY_NOT_FOUND',
              message: 'Gateway not found',
              statusCode: 404,
            },
          });
        }

        // Update other fields if present
        if (Object.keys(otherUpdates).length > 0) {
          updated = await gatewayRepository.update(request.params.id, otherUpdates as any);
        }
      } else {
        // No password change - update other fields only
        updated = await gatewayRepository.update(request.params.id, otherUpdates as any);

        if (!updated) {
          return (reply as any).code(404).send({
            error: {
              code: 'GATEWAY_NOT_FOUND',
              message: 'Gateway not found',
              statusCode: 404,
            },
          });
        }
      }

      return toGatewayResponse(updated);
    }
  );

  // DELETE /:id - Soft delete gateway
  app.delete(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const deleted = await gatewayRepository.softDelete(request.params.id);

      if (!deleted) {
        return reply.code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }

      return reply.code(204).send();
    }
  );
};

export default gatewayRoutes;
```

### Gateway Schemas with Password Handling
```typescript
// schemas/gateways.ts
import { z } from 'zod';
import { paginationQuerySchema, paginationResponseSchema } from './common';

/**
 * Create gateway request body
 * Accepts plaintext password - repository encrypts before storage
 */
export const createGatewaySchema = z.object({
  factory_id: z.string().uuid(),
  gateway_id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  email: z.string().email().max(255),
  password: z.string().min(1),  // Plaintext - will be encrypted
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Update gateway request body
 * All fields optional, including password
 * If password present, triggers re-encryption
 */
export const updateGatewaySchema = z.object({
  gateway_id: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(1).optional(),  // If present, re-encrypt
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Gateway response schema
 * NEVER includes password or password_encrypted fields
 */
export const gatewayResponseSchema = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  gateway_id: z.string(),
  name: z.string(),
  url: z.string(),
  email: z.string(),
  // NO password field - security requirement
  // NO password_encrypted field - security requirement
  model: z.string().nullable(),
  firmware_version: z.string().nullable(),
  last_seen_at: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * List gateways query parameters
 * Extends pagination with optional factory filter
 */
export const gatewayListQuerySchema = paginationQuerySchema.extend({
  factory_id: z.string().uuid().optional(),
});

/**
 * Paginated gateway list response
 */
export const gatewayListResponseSchema = z.object({
  data: z.array(gatewayResponseSchema),
  pagination: paginationResponseSchema,
});
```

### Adding Pagination to GatewayRepository
```typescript
// repositories/GatewayRepository.ts (modifications only)

class GatewayRepository {
  // ... existing methods ...

  /**
   * Find all gateways (excludes soft-deleted) with optional pagination
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<Gateway[]> {
    let query = db
      .selectFrom('gateways')
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

  /**
   * Count all non-deleted gateways for pagination metadata
   */
  async count(): Promise<number> {
    const result = await db
      .selectFrom('gateways')
      .select(db.fn.countAll().as('count'))
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    return Number(result.count);
  }
}
```

### Registering Gateway Routes in App
```typescript
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
  await app.register(import('./routes/factories'), { prefix: '/api/factories' });
  await app.register(import('./routes/gateways'), { prefix: '/api/gateways' }); // Phase 11

  return app;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Return encrypted passwords | Never return password fields | Security best practice | Prevents information leakage even with encryption |
| Hash passwords | Encrypt passwords | When need to retrieve plaintext | Enables gateway authentication with original password |
| Separate password endpoint | Conditional update logic | Modern API design | Simpler client code, fewer routes |
| Global gateway list only | Hierarchical filtering by factory | Multi-tenancy pattern | Supports "show me factory X's gateways" queries |
| Re-encrypt on every update | Re-encrypt only when password changes | Encryption performance | Avoids unnecessary crypto operations |
| Accept encrypted data in API | Accept plaintext only | API security design | Clients never handle encrypted data directly |

**Deprecated/outdated:**
- **Exposing password_encrypted field:** Even with encryption, field should never be returned in API responses
- **Hashing for retrievable passwords:** Use encryption when plaintext recovery is needed (gateway authentication)
- **Updating password without re-encryption:** Always call updatePassword() when password changes, not update()
- **Missing factory_id filter:** List endpoints for hierarchical resources should support parent filtering

## Open Questions

Things that couldn't be fully resolved:

1. **Password strength validation**
   - What we know: Schema requires password.min(1), but no complexity rules defined
   - What's unclear: Whether to enforce password complexity (uppercase/lowercase/numbers/symbols) at API layer
   - Recommendation: Start with min length only (Phase 11 scope), add complexity validation in future if required

2. **Factory existence check before gateway creation**
   - What we know: Foreign key constraint enforces factory_id references factories table
   - What's unclear: Whether to check factory existence before create (return 400) or let database error (return 500)
   - Recommendation: Let foreign key constraint handle it (simpler code), error handler returns safe 500 message

3. **Pagination strategy for factory filtering**
   - What we know: findActive(factory_id) returns all gateways for factory, manual slice for pagination
   - What's unclear: Whether to add pagination to findActive or keep manual slice (factories likely have <100 gateways each)
   - Recommendation: Manual slice in route handler for now (simpler), optimize later if factories have many gateways

4. **Password update success response**
   - What we know: PUT /api/gateways/:id with password returns updated gateway without password field
   - What's unclear: Whether client needs confirmation that password was actually updated (vs just other fields)
   - Recommendation: Standard 200 response with updated gateway (updated_at timestamp changes, clients can verify)

## Sources

### Primary (HIGH confidence)
- [AES-GCM Encryption in Node.js](https://nodejs.org/api/crypto.html) - Node.js crypto module documentation
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) - Encryption vs hashing guidance
- [REST API Security Best Practices](https://restfulapi.net/security-essentials/) - Credential handling in APIs
- [Fastify Type Provider Zod](https://github.com/turkerdev/fastify-type-provider-zod) - Zod integration examples
- [Kysely Query Builder](https://kysely.dev/docs/getting-started) - Type-safe queries with filters
- Phase 8-02 implementation (/src/utils/encryption.ts) - Existing AES-256-GCM encryption utilities
- Phase 8-03 implementation (/src/repositories/GatewayRepository.ts) - Existing gateway CRUD with encryption
- Phase 10 implementation (/src/api/routes/factories.ts) - Factory API patterns to mirror

### Secondary (MEDIUM confidence)
- [API Design: Hierarchical Resources](https://cloud.google.com/apis/design/resources) - Google Cloud API design guide
- [Filtering REST API Results](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/) - Query parameter patterns
- [Conditional Updates in REST APIs](https://stackoverflow.com/questions/19732423/rest-api-best-practice-how-to-update-only-few-fields-of-an-entity) - Partial update patterns

### Tertiary (LOW confidence)
- None - all key findings verified with official documentation or existing implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and working from Phases 8-10
- Architecture: HIGH - Gateway API mirrors Factory API patterns with encryption additions
- Pitfalls: HIGH - Password handling pitfalls well-documented in security resources
- Code examples: HIGH - Patterns from existing GatewayRepository and Factory API routes

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - REST and encryption patterns are stable)

**Key dependencies from existing project:**
- GatewayRepository already implements encryption (Phase 8) - create(), updatePassword(), getDecryptedPassword()
- Factory API patterns established (Phase 10) - routes, schemas, pagination, error handling
- Common pagination schemas available (Phase 10) - paginationQuerySchema, paginationResponseSchema
- Error handler returns standardized format (Phase 9) - VALIDATION_ERROR, GATEWAY_NOT_FOUND codes
- Fastify with Zod type provider configured (Phase 9) - request/response validation

**Implementation readiness:**
- No new dependencies required
- No database schema changes needed (gateways table exists from Phase 7)
- No configuration changes needed (ENCRYPTION_KEY already configured)
- Gateway routes can be added to existing app.ts
- Schemas follow existing Factory API patterns with password exclusion

**Project alignment:**
- GATEWAY-01 through GATEWAY-09 requirements all addressable with researched patterns
- GATEWAY-06 (passwords encrypted) already implemented in GatewayRepository
- GATEWAY-07 (no plaintext retrieval) enforced by response schema exclusion
- GATEWAY-08 (safe error messages) covered by Phase 9 error handler
- GATEWAY-09 (Zod schemas) covered by schema patterns
- QUAL-07 (README documentation) to be updated with Gateway API endpoints

**Security considerations:**
- Password encryption handled transparently by GatewayRepository (AES-256-GCM)
- Response schemas never include password or password_encrypted fields
- Conditional update logic prevents accidental password corruption
- Error handler prevents leaking encryption key configuration to API clients
- Factory filtering validated by Zod to prevent SQL injection
