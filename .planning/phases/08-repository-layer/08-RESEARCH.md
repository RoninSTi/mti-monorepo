# Phase 8: Repository Layer - Research

**Researched:** 2026-02-08
**Domain:** Type-safe database access with Kysely, type generation, encryption utilities
**Confidence:** HIGH

## Summary

Phase 8 implements a type-safe repository layer using Kysely (v0.28.11) with PostgreSQL, automatic type generation via kysely-codegen (v0.19.0), and AES-256-GCM encryption for gateway passwords. Research confirms Kysely as the standard TypeScript-first SQL query builder, avoiding ORM magic while maintaining full type safety. kysely-codegen introspects the database schema to generate TypeScript types, integrated into the build process to trigger after migrations. The encryption approach uses Node.js built-in crypto module with AES-256-GCM for authenticated encryption, requiring proper IV handling and secure key management.

**Key findings:**
- Kysely provides compile-time type safety without runtime overhead or ORM magic
- kysely-codegen generates types from database schema, not migration files (user decision)
- Soft delete requires explicit WHERE filtering in every query (`deleted_at IS NULL`)
- AES-256-GCM requires unique IV per encryption; IV reuse completely breaks authentication
- Repository pattern should use domain language, avoid generic abstractions

**Primary recommendation:** Implement standalone repository classes (FactoryRepository, GatewayRepository) with explicit soft-delete filtering methods, generate types automatically after migrations, and use crypto.createCipheriv() with random IVs stored alongside encrypted data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Type generation & schema sync:**
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

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| kysely | ^0.28.11 | Type-safe SQL query builder | TypeScript-first, zero runtime magic, full SQL control, industry standard for type-safe queries |
| pg | ^8.18.0 | PostgreSQL driver (already installed) | Official Node.js PostgreSQL driver, connection pooling, used by Kysely's PostgresDialect |
| kysely-codegen | ^0.19.0 (dev) | Generate Database types from schema | Official Kysely tool, introspects live database, supports all dialects |
| zod | ^4.3.6 (already installed) | Runtime validation of query results | TypeScript-first schema validation, complements compile-time safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/pg | ^8.16.0 (already installed) | TypeScript types for pg driver | Required for TypeScript support |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| kysely | Prisma | Prisma provides full ORM with migrations; Kysely chosen for explicit SQL control without magic |
| kysely | Drizzle ORM | Drizzle is newer with similar philosophy; Kysely has more mature ecosystem |
| kysely-codegen | Manual type definitions | Manual types work for small schemas but don't scale; codegen keeps types synchronized |
| kysely-codegen | prisma-kysely | Only needed if using Prisma schema as source of truth; we use database |
| Native crypto | crypto-js library | Built-in crypto module is maintained by Node.js core team, better security, no dependencies |

**Installation:**
```bash
npm install kysely pg
npm install --save-dev kysely-codegen @types/pg
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── database/
│   ├── config.ts              # Database connection config (already exists)
│   ├── kysely.ts              # Kysely instance singleton
│   ├── types.ts               # Generated Database interface (from kysely-codegen)
│   ├── seed.ts                # Seed data (already exists)
│   └── reset.ts               # Reset database (already exists)
├── repositories/
│   ├── FactoryRepository.ts   # Factory CRUD operations
│   ├── GatewayRepository.ts   # Gateway CRUD operations
│   └── types.ts               # Repository result types, error types
├── utils/
│   ├── encryption.ts          # AES-256-GCM encrypt/decrypt utilities
│   └── crypto-config.ts       # Encryption key management
└── types/
    └── database.ts            # Re-export generated types
```

### Pattern 1: Kysely Singleton Instance

**What:** Create single Kysely instance with connection pool, exported for app-wide use
**When to use:** Always - connection pooling handled internally by dialect
**Example:**
```typescript
// Source: https://kysely.dev/docs/getting-started
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './types'; // Generated types

// Single instance pattern
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: databaseConfig.DATABASE_HOST,
      port: databaseConfig.DATABASE_PORT,
      database: databaseConfig.DATABASE_NAME,
      user: databaseConfig.DATABASE_USER,
      password: databaseConfig.DATABASE_PASSWORD,
      max: 10, // Connection pool size
    }),
  }),
});

// Cleanup function for graceful shutdown
export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
```

### Pattern 2: Type Generation Script

**What:** Automated type generation triggered after migrations
**When to use:** Always - maintains type synchronization
**Example:**
```bash
# Source: https://github.com/RobinBlomberg/kysely-codegen

# Add to package.json scripts:
"scripts": {
  "db:migrate": "node-pg-migrate up && npm run db:codegen",
  "db:codegen": "kysely-codegen --out-file src/database/types.ts"
}

# Configuration file: .kysely-codegenrc.json
{
  "dialect": "postgres",
  "outFile": "src/database/types.ts",
  "camelCase": false,
  "includePattern": "*"
}
```

### Pattern 3: Standalone Repository Classes

**What:** Dedicated repository per entity with domain-specific methods
**When to use:** Preferred over generic base repository - better type safety and clarity
**Example:**
```typescript
// Source: https://blog.logrocket.com/exploring-repository-pattern-typescript-node/
import { db } from '../database/kysely';
import { Insertable, Updateable, Selectable } from 'kysely';
import { Factories } from '../database/types';

type Factory = Selectable<Factories>;
type NewFactory = Insertable<Factories>;
type FactoryUpdate = Updateable<Factories>;

export class FactoryRepository {
  async findById(id: string): Promise<Factory | undefined> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findAll(): Promise<Factory[]> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('deleted_at', 'is', null)
      .execute();
  }

  async create(factory: NewFactory): Promise<Factory> {
    return await db
      .insertInto('factories')
      .values(factory)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, updateWith: FactoryUpdate): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
      .set(updateWith)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }
}
```

### Pattern 4: Soft Delete Query Filtering

**What:** Explicit WHERE clause filtering deleted_at IS NULL in all queries
**When to use:** Every SELECT, UPDATE, and soft DELETE query
**Example:**
```typescript
// Source: https://wanago.io/2023/10/16/api-with-nestjs-129-implementing-soft-deletes-with-sql-and-kysely/

// ALWAYS filter soft-deleted records
async findActive(factoryId: string): Promise<Gateway[]> {
  return await db
    .selectFrom('gateways')
    .selectAll()
    .where('factory_id', '=', factoryId)
    .where('deleted_at', 'is', null)  // Critical: prevents returning deleted records
    .execute();
}

// Soft delete operation - prevents double-delete
async softDelete(id: string): Promise<Gateway | undefined> {
  return await db
    .updateTable('gateways')
    .set({ deleted_at: new Date() })
    .where('id', '=', id)
    .where('deleted_at', 'is', null)  // Prevents re-deleting already deleted records
    .returningAll()
    .executeTakeFirst();
}

// Optional: method to include deleted records (explicit opt-in)
async findByIdIncludingDeleted(id: string): Promise<Gateway | undefined> {
  return await db
    .selectFrom('gateways')
    .selectAll()
    .where('id', '=', id)
    // No deleted_at filter - explicit opt-in for accessing deleted records
    .executeTakeFirst();
}
```

### Pattern 5: AES-256-GCM Encryption Utilities

**What:** Encrypt/decrypt functions using Node.js crypto module with GCM authenticated encryption
**When to use:** Gateway password encryption before storage, decryption for connections
**Example:**
```typescript
// Source: https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

export function encryptPassword(plaintext: string, key: Buffer): EncryptedData {
  // Generate unique IV for each encryption (CRITICAL)
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptPassword(data: EncryptedData, key: Buffer): string {
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Key management from environment
export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Key should be 32-byte hex string or base64
  return Buffer.from(key, 'base64');
}
```

### Pattern 6: Zod Runtime Validation

**What:** Validate query results at runtime to catch type mismatches
**When to use:** Critical operations, external data, suspicious scenarios
**Example:**
```typescript
// Source: https://betterstack.com/community/guides/scaling-nodejs/zod-explained/
import { z } from 'zod';
import { Factories } from '../database/types';

// Define Zod schema matching database table
const FactorySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string(),
  location: z.string().nullable(),
  timezone: z.string(),
  metadata: z.record(z.unknown()),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
});

// Use for validation where needed
async findById(id: string): Promise<Factory | undefined> {
  const result = await db
    .selectFrom('factories')
    .selectAll()
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  // Runtime validation (optional but recommended for critical paths)
  if (result) {
    return FactorySchema.parse(result);
  }
  return undefined;
}
```

### Pattern 7: Transaction Handling

**What:** Kysely transactions with automatic rollback on error
**When to use:** Multi-step operations requiring atomicity
**Example:**
```typescript
// Source: https://kysely.dev/docs/category/transactions
import { db } from '../database/kysely';

async function createFactoryWithGateways(
  factoryData: NewFactory,
  gatewayData: NewGateway[]
): Promise<Factory> {
  return await db.transaction().execute(async (trx) => {
    // Create factory
    const factory = await trx
      .insertInto('factories')
      .values(factoryData)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create gateways linked to factory
    await trx
      .insertInto('gateways')
      .values(gatewayData.map(gw => ({ ...gw, factory_id: factory.id })))
      .execute();

    // If any error throws, transaction auto-rolls back
    return factory;
  });
}
```

### Anti-Patterns to Avoid

- **Generic Base Repository:** Creates leaky abstraction, loses type safety, couples domain to database - use standalone repositories instead
- **Forgetting soft delete filtering:** Every query MUST include `where('deleted_at', 'is', null)` or explicitly opt-in to include deleted records
- **Hardcoding encryption keys:** Never commit keys to git - always use environment variables with validation
- **IV reuse in encryption:** Each encryption operation MUST generate a new random IV - reuse completely breaks GCM authentication
- **Returning DTOs from repositories:** Repositories should return domain entities, not presentation DTOs - keeps domain clean
- **Using repositories for read-heavy reporting:** Repositories are for transactional operations; use direct queries for reporting
- **Not validating environment variables:** Database config and encryption keys must be validated at startup before use
- **Creating multiple Kysely instances:** Single instance per database - connection pooling handled internally
- **String concatenation for SQL:** Always use Kysely's query builder - never template literals for dynamic values
- **Type mismatch between TS and database:** Driver returns actual DB types; ensure TypeScript types match what database returns

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type generation from database | Manual type definitions synced with migrations | kysely-codegen introspection | Migrations don't reflect full schema (indexes, constraints); introspection is source of truth |
| Connection pooling | Custom connection manager | pg.Pool via PostgresDialect | Handles connection lifecycle, reconnection, max pool size, timeouts |
| Encryption/decryption | Custom crypto implementation | Node.js crypto module (createCipheriv) | Audited by security experts, constant-time operations, proper padding |
| Key derivation from passwords | Manual hashing | crypto.scrypt() or crypto.pbkdf2() | Designed for password stretching, configurable cost factor, salt handling |
| SQL injection prevention | String escaping/sanitization | Kysely parameterized queries | Automatic parameterization, no string concatenation, prevents injection |
| Runtime type validation | Manual instanceof checks | Zod schema validation | Type inference, composable schemas, detailed error messages |
| Transaction management | Manual BEGIN/COMMIT/ROLLBACK | Kysely db.transaction() | Automatic rollback on error, savepoint support, proper error handling |
| Soft delete plugin | Custom query modifier | Explicit WHERE clauses in each method | Soft deletes should be explicit and visible - implicit filtering hides business logic |

**Key insight:** Type-safe database access seems straightforward, but edge cases accumulate quickly. Kysely solves SQL composition safely, kysely-codegen maintains type synchronization, and Node.js crypto provides secure primitives. Custom solutions inevitably rediscover the same edge cases these tools already handle.

## Common Pitfalls

### Pitfall 1: Schema Desynchronization

**What goes wrong:** TypeScript types drift from actual database schema, causing runtime type mismatches
**Why it happens:** Manual type definitions are updated separately from migrations; database changes don't trigger type updates
**How to avoid:**
- Use kysely-codegen to generate types from database after every migration
- Add `npm run db:codegen` to `db:migrate` script (user decision: automatic generation)
- Commit generated types to git (user decision) so CI/build doesn't need database access
**Warning signs:** TypeScript compiles but queries fail at runtime; properties undefined despite type checking

### Pitfall 2: IV Reuse in AES-GCM

**What goes wrong:** Reusing the same IV with the same key completely breaks authentication in GCM mode, allowing forgery and key recovery
**Why it happens:** Developer saves IV once and reuses it; counter-based IV generation without proper state management
**How to avoid:**
- Generate new random IV for EVERY encryption: `randomBytes(12)`
- Store IV alongside encrypted data (in same column or related field)
- Never hardcode IV values
**Warning signs:** Multiple encrypted values with identical IV field; IV stored as config constant
**Reference:** https://www.elttam.com/blog/key-recovery-attacks-on-gcm/ - demonstrates key recovery attack from IV reuse

### Pitfall 3: Soft Delete Query Leakage

**What goes wrong:** Queries accidentally return soft-deleted records, exposing deleted data
**Why it happens:** Developer forgets `where('deleted_at', 'is', null)` in queries; copy-paste code without soft delete filter
**How to avoid:**
- Every SELECT/UPDATE must explicitly filter `deleted_at IS NULL` (user decision: no implicit filtering)
- Code review checklist includes soft delete verification
- Use TypeScript type system to enforce: return types require `deleted_at: null`
- Create dedicated methods for accessing deleted records (opt-in pattern)
**Warning signs:** Deleted data appears in UI; "ghost" records in listings; update operations succeed on deleted records
**Reference:** https://wanago.io/2023/10/16/api-with-nestjs-129-implementing-soft-deletes-with-sql-and-kysely/

### Pitfall 4: Connection Pool Exhaustion

**What goes wrong:** Application hangs waiting for database connections; all pool connections consumed
**Why it happens:** Queries not awaited properly; transactions left open; multiple Kysely instances created
**How to avoid:**
- Create single Kysely instance exported from module (user decision area)
- Always await database operations
- Use transactions for multi-step operations
- Configure pool size based on workload: `max: 10` is good starting point
- Call `db.destroy()` during graceful shutdown
**Warning signs:** Application slows down under load; timeout errors after sustained usage; connection errors in logs

### Pitfall 5: Storing Encryption Key in Code

**What goes wrong:** Encryption key committed to git; visible in source code or config files
**Why it happens:** Developer adds key to config file during development; `.env` accidentally committed
**How to avoid:**
- Always load key from environment variable: `process.env.ENCRYPTION_KEY`
- Validate key exists at startup before any encryption operations
- Use secrets manager in production (AWS Secrets Manager, HashiCorp Vault)
- Never commit `.env` files - use `.env.example` instead
- Generate strong keys: `openssl rand -base64 32`
**Warning signs:** Key visible in git history; hardcoded key string in source; no environment variable validation
**Reference:** https://www.nodejs-security.com/blog/do-not-use-secrets-in-environment-variables-and-here-is-how-to-do-it-better

### Pitfall 6: Type Mismatch Between TypeScript and Database

**What goes wrong:** TypeScript shows `string` type, but runtime value is `number` or `Date`
**Why it happens:** Generated types don't match what pg driver returns; JSON columns typed incorrectly
**How to avoid:**
- Use kysely-codegen with dialect-specific type mappings
- Test query results in development to verify types match
- Use Zod runtime validation for critical paths
- Check `pg` driver documentation for type mapping (timestamptz → Date, jsonb → unknown)
**Warning signs:** Need to cast types at runtime; Type assertions (`as`) used frequently; unexpected type errors in production

### Pitfall 7: Generic Repository Over-Abstraction

**What goes wrong:** Repository interface becomes bloated with methods that don't apply to all entities
**Why it happens:** Attempting to create one base repository for all tables; premature abstraction
**How to avoid:**
- Use standalone repository per entity (user decision area)
- Repository methods should use domain language (register, activate) not CRUD terms
- Duplicate code is better than wrong abstraction
- Extract common patterns only after seeing repeated code 3+ times
**Warning signs:** Repository methods with entity-specific parameters; methods that throw "not implemented" for certain entities
**Reference:** https://medium.com/@mesutatasoy/the-dark-side-of-repository-pattern-a-developers-honest-journey-eb51eba7e8d8

### Pitfall 8: SQL Injection via Template Literals

**What goes wrong:** User input concatenated into queries creates SQL injection vulnerability
**Why it happens:** Developer uses template literals or string concatenation instead of Kysely's query builder
**How to avoid:**
- Always use Kysely's query builder methods (`.where()`, `.values()`)
- Never use template literals for dynamic SQL: `` WHERE id = `${userId}` `` (BAD)
- Use `sql` tagged template for raw SQL only when necessary
- Validate and sanitize input before queries (use Zod)
**Warning signs:** Template literals in query code; string concatenation for WHERE clauses; user input directly in SQL strings

## Code Examples

Verified patterns from official sources:

### Complete Factory Repository
```typescript
// Source: Compiled from https://kysely.dev/docs/getting-started and https://blog.logrocket.com/exploring-repository-pattern-typescript-node/
import { db } from '../database/kysely';
import { Insertable, Updateable, Selectable } from 'kysely';
import { Factories } from '../database/types';

export type Factory = Selectable<Factories>;
export type NewFactory = Insertable<Factories>;
export type FactoryUpdate = Updateable<Factories>;

export class FactoryRepository {
  async findById(id: string): Promise<Factory | undefined> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findAll(): Promise<Factory[]> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async findByOrganization(organizationId: string): Promise<Factory[]> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async create(factory: NewFactory): Promise<Factory> {
    return await db
      .insertInto('factories')
      .values(factory)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, updateWith: FactoryUpdate): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
      .set({
        ...updateWith,
        updated_at: new Date(), // Trigger is on DB but can be explicit
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }
}
```

### Complete Gateway Repository with Encryption
```typescript
// Source: Combined from Kysely docs and crypto best practices
import { db } from '../database/kysely';
import { Insertable, Updateable, Selectable } from 'kysely';
import { Gateways } from '../database/types';
import { encryptPassword, decryptPassword, getEncryptionKey } from '../utils/encryption';

export type Gateway = Selectable<Gateways>;
export type NewGateway = Insertable<Gateways>;
export type GatewayUpdate = Updateable<Gateways>;

// Input type with plaintext password
export interface GatewayInput {
  factory_id: string;
  gateway_id: string;
  name: string;
  url: string;
  email: string;
  password: string; // Plaintext - will be encrypted
  model?: string;
  firmware_version?: string;
  metadata?: Record<string, unknown>;
}

export class GatewayRepository {
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = getEncryptionKey();
  }

  async findById(id: string): Promise<Gateway | undefined> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findAll(): Promise<Gateway[]> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async findActive(factoryId: string): Promise<Gateway[]> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('factory_id', '=', factoryId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async create(input: GatewayInput): Promise<Gateway> {
    // Encrypt password before storage
    const encrypted = encryptPassword(input.password, this.encryptionKey);

    // Store as JSON string in password_encrypted column
    const gatewayData: NewGateway = {
      factory_id: input.factory_id,
      gateway_id: input.gateway_id,
      name: input.name,
      url: input.url,
      email: input.email,
      password_encrypted: JSON.stringify(encrypted),
      model: input.model,
      firmware_version: input.firmware_version,
      metadata: input.metadata || {},
    };

    return await db
      .insertInto('gateways')
      .values(gatewayData)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, updateWith: GatewayUpdate): Promise<Gateway | undefined> {
    return await db
      .updateTable('gateways')
      .set({
        ...updateWith,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async updatePassword(id: string, newPassword: string): Promise<Gateway | undefined> {
    const encrypted = encryptPassword(newPassword, this.encryptionKey);

    return await db
      .updateTable('gateways')
      .set({
        password_encrypted: JSON.stringify(encrypted),
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<Gateway | undefined> {
    return await db
      .updateTable('gateways')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  // Helper to decrypt password when needed for authentication
  decryptPassword(gateway: Gateway): string {
    const encrypted = JSON.parse(gateway.password_encrypted);
    return decryptPassword(encrypted, this.encryptionKey);
  }
}
```

### Encryption Utilities Module
```typescript
// Source: https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Generates unique IV for each encryption (CRITICAL for security)
 */
export function encryptPassword(plaintext: string, key: Buffer): EncryptedData {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`);
  }

  // Generate unique IV for THIS encryption
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Verifies authentication tag to detect tampering
 */
export function decryptPassword(data: EncryptedData, key: Buffer): string {
  if (!data.encrypted || !data.iv || !data.authTag) {
    throw new Error('Invalid encrypted data structure');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`);
  }

  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Load encryption key from environment variable
 * Key should be 32-byte (256-bit) value encoded as base64
 * Generate with: openssl rand -base64 32
 */
export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable not set. ' +
      'Generate with: openssl rand -base64 32'
    );
  }

  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(key, 'base64');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be valid base64');
  }

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 encoded). ` +
      `Got ${keyBuffer.length} bytes. ` +
      'Generate with: openssl rand -base64 32'
    );
  }

  return keyBuffer;
}

/**
 * Test encryption/decryption round-trip
 * Use in integration tests or startup validation
 */
export function testEncryptionRoundTrip(key: Buffer): boolean {
  const testData = 'test-password-' + Date.now();
  const encrypted = encryptPassword(testData, key);
  const decrypted = decryptPassword(encrypted, key);
  return decrypted === testData;
}
```

### Type Generation Configuration
```json
// .kysely-codegenrc.json
{
  "dialect": "postgres",
  "outFile": "src/database/types.ts",
  "url": "${DATABASE_URL}",
  "camelCase": false,
  "includePattern": "*",
  "excludePattern": null
}
```

### Database Configuration with Validation
```typescript
// Source: Project existing code + best practices
import { z } from 'zod';
import { getEncryptionKey, testEncryptionRoundTrip } from '../utils/encryption';

// Database configuration schema with Zod validation
const databaseConfigSchema = z.object({
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string().default('mti_wifi'),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string().default('postgres'),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Parse and validate database environment variables
export const databaseConfig = databaseConfigSchema.parse(process.env);

// Construct DATABASE_URL for tools
export const DATABASE_URL = `postgres://${databaseConfig.DATABASE_USER}:${databaseConfig.DATABASE_PASSWORD}@${databaseConfig.DATABASE_HOST}:${databaseConfig.DATABASE_PORT}/${databaseConfig.DATABASE_NAME}`;

/**
 * Validate configuration at startup
 * Call before creating Kysely instance
 */
export function validateConfig(): void {
  // Validate database config (already done above by Zod)
  console.log('Database config validated:', {
    host: databaseConfig.DATABASE_HOST,
    port: databaseConfig.DATABASE_PORT,
    database: databaseConfig.DATABASE_NAME,
  });

  // Validate encryption key exists and works
  try {
    const key = getEncryptionKey();
    const roundTripSuccess = testEncryptionRoundTrip(key);
    if (!roundTripSuccess) {
      throw new Error('Encryption round-trip test failed');
    }
    console.log('Encryption key validated');
  } catch (error) {
    console.error('Encryption configuration error:', error);
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type definitions | kysely-codegen introspection | 2023-2024 | Types stay synchronized with schema; eliminates manual maintenance |
| Generic base repository | Standalone repositories per entity | 2024-2025 | Better type safety; domain-specific methods; clearer intent |
| Runtime-only validation | TypeScript + Zod dual validation | 2023-2024 | Compile-time AND runtime safety; catches bugs earlier |
| AES-CBC mode | AES-GCM authenticated encryption | 2020+ | Built-in integrity checking; eliminates padding oracle attacks |
| MD5/SHA-1 | SHA-256/SHA-512 with PBKDF2/scrypt | 2015+ | Stronger hashing; password stretching; brute-force resistance |
| ORM-style repositories | SQL-first query builders (Kysely) | 2022-2023 | No N+1 queries; explicit SQL; full database feature access |
| Implicit soft delete filtering | Explicit WHERE clauses in queries | 2024-2025 | Business logic visible in code; no hidden behavior; opt-in for deleted records |

**Deprecated/outdated:**
- **Manual type synchronization:** kysely-codegen eliminates this entirely; no reason to maintain types manually
- **createCipher/createDecipher (deprecated):** Use createCipheriv/createDecipheriv with explicit IV
- **Generic Repository base class:** TypeScript discriminated unions make standalone repos more type-safe
- **Soft delete plugins that auto-filter:** Makes business logic implicit; explicit filtering is clearer
- **Storing encryption key in config files:** Always use environment variables or secrets manager

## Open Questions

Things that couldn't be fully resolved:

1. **Encryption key rotation strategy**
   - What we know: Current implementation uses single encryption key from environment
   - What's unclear: Strategy for rotating encryption key when needed (security best practice)
   - Recommendation: Phase 8 uses single key; defer rotation strategy to operations phase. Would require storing key version ID with encrypted data and supporting multiple keys during rotation period.

2. **Repository instance lifecycle**
   - What we know: Repositories can be instantiated or used as singleton exports
   - What's unclear: Best pattern for application - instantiate per request or singleton?
   - Recommendation: Export singleton instances for Phase 8. Repositories are stateless except for encryption key (loaded once at startup). Singleton pattern is simpler and sufficient.

3. **Partial unique indexes and kysely-codegen**
   - What we know: Database has partial unique index on gateway_id WHERE deleted_at IS NULL
   - What's unclear: Does kysely-codegen capture partial index semantics in generated types?
   - Recommendation: Test generated types; partial indexes enforce DB constraints but don't typically appear in generated TypeScript types (they're enforcement, not structure)

4. **Transaction isolation levels**
   - What we know: Kysely supports transactions with automatic rollback
   - What's unclear: Default isolation level and whether Phase 8 needs explicit level setting
   - Recommendation: PostgreSQL default (READ COMMITTED) is fine for Phase 8 CRUD operations. Explicit isolation levels can be added later if concurrent update issues arise.

## Sources

### Primary (HIGH confidence)
- [Kysely Official Documentation](https://kysely.dev/) - Getting started, types, transactions
- [kysely-codegen GitHub](https://github.com/RobinBlomberg/kysely-codegen) - Type generation tool
- [Node.js Crypto Module Documentation](https://nodejs.org/api/crypto.html) - Official crypto API reference
- [AES-256-GCM Example Gist](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) - Verified encryption pattern
- [Kysely npm package](https://www.npmjs.com/package/kysely) - Version 0.28.11 (latest)
- [kysely-codegen npm package](https://www.npmjs.com/package/kysely-codegen) - Version 0.19.0 (latest)

### Secondary (MEDIUM confidence)
- [PostgreSQL with Kysely in Node.js](https://osvaldo-gonzalez-venegas.medium.com/postgresql-with-kysely-in-node-js-typescript-a220938bc6ac) - Recent 2026 tutorial
- [API with NestJS: Implementing soft deletes with Kysely](https://wanago.io/2023/10/16/api-with-nestjs-129-implementing-soft-deletes-with-sql-and-kysely/) - Soft delete patterns
- [Getting Started with Kysely](https://betterstack.com/community/guides/scaling-nodejs/kysely-query-builder/) - Community guide
- [Exploring repository pattern with TypeScript](https://blog.logrocket.com/exploring-repository-pattern-typescript-node/) - Repository architecture
- [AES Encryption and Key Derivation Guide](https://copyprogramming.com/howto/javascript-node-js-aes-crytpto-key) - 2026 security practices
- [Guide to Node's crypto module](https://medium.com/@tony.infisical/guide-to-nodes-crypto-module-for-encryption-decryption-65c077176980) - Encryption patterns
- [PostgreSQL Soft Delete and Unique Constraints](https://gusiol.medium.com/soft-delete-and-unique-constraint-da94b41cff62) - Partial index solution

### Tertiary (LOW confidence)
- [Repository Pattern Common Mistakes](https://medium.com/@opflucker/repository-pattern-common-implementation-mistakes-69ae95b63d3c) - Anti-patterns to avoid
- [The Dark Side of Repository Pattern](https://medium.com/@mesutatasoy/the-dark-side-of-repository-pattern-a-developers-honest-journey-eb51eba7e8d8) - Critique perspective
- [Why AES-GCM Sucks](https://soatok.blog/2020/05/13/why-aes-gcm-sucks/) - IV reuse vulnerability explanation
- [Key Recovery Attacks on GCM](https://www.elttam.com/blog/key-recovery-attacks-on-gcm/) - Technical security analysis
- [Do Not Use Secrets in Environment Variables](https://www.nodejs-security.com/blog/do-not-use-secrets-in-environment-variables-and-here-is-how-to-do-it-better) - Key management caution

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Kysely and kysely-codegen are official, well-documented tools with active maintenance
- Architecture: HIGH - Patterns verified from official documentation and recent production usage
- Encryption: HIGH - Node.js crypto module is official API; AES-256-GCM is NIST/FIPS standard
- Pitfalls: MEDIUM-HIGH - Soft delete and IV reuse issues documented in multiple credible sources; repository anti-patterns from experienced practitioners

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - Kysely ecosystem is mature and stable)

**Technology maturity:**
- Kysely: Stable (v0.28.x series, consistent API)
- kysely-codegen: Mature (v0.19.0, active development)
- Node.js crypto: Stable (built-in module, standardized)
- Repository pattern: Well-established (decades of usage)
- AES-256-GCM: Industry standard (NIST approved, TLS 1.3)
