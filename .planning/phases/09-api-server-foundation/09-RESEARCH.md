# Phase 9: API Server Foundation - Research

**Researched:** 2026-02-08
**Domain:** Fastify web framework with TypeScript
**Confidence:** HIGH

## Summary

Phase 9 establishes the API server foundation using Fastify, a TypeScript-first Node.js web framework known for high performance and low overhead. The research covers the complete Fastify stack for production-ready APIs including CORS, security headers, Zod validation integration, error handling, and logging.

Fastify's architecture is built on encapsulation through plugins, enabling modular code organization where each domain (factories, gateways) can be isolated. The framework provides native support for schema-based validation via its type provider system, and includes Pino logging by default for production-grade observability.

**Primary recommendation:** Use Fastify 5.x with fastify-type-provider-zod for Zod schema integration, @fastify/cors and @fastify/helmet for security, and environment-based Pino logging. Structure the API as plugins following Fastify's encapsulation model to prepare for future route additions in Phases 10-11.

## Standard Stack

The established libraries/tools for Fastify API servers with TypeScript:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.7+ | HTTP server framework | TypeScript-first, high performance (65,000+ req/sec), built-in validation, plugin architecture |
| @types/node | latest | Node.js type definitions | Required for TypeScript Node.js development |
| fastify-type-provider-zod | 5.0+ | Zod integration | Enables Zod schemas for request validation with full type inference (v5+ supports Zod v4) |
| zod | 4.x | Schema validation | Already in project (package.json), pairs with type provider for end-to-end type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/cors | 10.x | CORS middleware | Required for API-03 - enables cross-origin requests |
| @fastify/helmet | 12.x | Security headers | Required for API-04 - sets Content Security Policy, X-Frame-Options, etc. |
| pino-pretty | 13.x | Dev log formatting | Development only - human-readable log output (requires separate install) |
| @fastify/env | 5.x | Env variable validation | Optional - provides startup validation of environment vars with schema |
| fastify-plugin | 5.x | Break encapsulation | When a plugin needs to expose decorators/hooks globally across all contexts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fastify-type-provider-zod | @sinclair/typebox | TypeBox is Fastify's recommended validator, but project already uses Zod throughout |
| Fastify | Express | Express has larger ecosystem but lacks native TypeScript support, async error handling, and built-in schema validation |
| @fastify/cors | Custom CORS | Fastify's plugin handles preflight, wildcard routes, and edge cases correctly |
| Built-in logging | Winston/Bunyan | Pino is Fastify-native, 5x faster, and supports automatic request context propagation |

**Installation:**
```bash
npm install fastify fastify-type-provider-zod @fastify/cors @fastify/helmet
npm install -D pino-pretty
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/                     # API server code (Phase 9-11)
│   ├── server.ts           # Fastify instance creation and config
│   ├── app.ts              # App factory with plugins registered
│   ├── plugins/            # Shared plugins (logging, error handler)
│   │   ├── cors.ts
│   │   ├── helmet.ts
│   │   ├── validation.ts   # Zod type provider setup
│   │   └── error-handler.ts
│   ├── routes/             # Route modules (added in Phase 10-11)
│   │   ├── health.ts       # Health check endpoint
│   │   ├── factories.ts    # Phase 10
│   │   └── gateways.ts     # Phase 11
│   └── schemas/            # Zod schemas for validation
│       ├── common.ts       # Shared schemas (pagination, errors)
│       ├── factories.ts    # Phase 10
│       └── gateways.ts     # Phase 11
├── database/               # Existing (Phase 7-8)
├── repositories/           # Existing (Phase 8)
├── gateway/                # Existing (Phase 1-6)
├── config.ts               # Existing configuration
└── main.ts                 # Entry point - starts server
```

### Pattern 1: App Factory with Plugin Registration
**What:** Separate server creation from instance configuration for testability
**When to use:** All Fastify applications
**Example:**
```typescript
// api/app.ts
import Fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: true, // Configure based on NODE_ENV
    ...options
  }).withTypeProvider<ZodTypeProvider>();

  // Set Zod validators BEFORE registering routes
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register plugins in order
  await app.register(import('./plugins/cors'));
  await app.register(import('./plugins/helmet'));
  await app.register(import('./plugins/error-handler'));

  // Register routes
  await app.register(import('./routes/health'), { prefix: '/api' });

  return app;
}
```

### Pattern 2: Encapsulated Route Plugins
**What:** Each route module is a plugin with its own context
**When to use:** All route definitions
**Example:**
```typescript
// api/routes/health.ts
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/health',
    schema: {
      response: {
        200: z.object({
          status: z.literal('ok'),
          timestamp: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    },
  });
};

export default healthRoutes;
```

### Pattern 3: Environment-Based Logging Configuration
**What:** Different log config for dev, test, prod
**When to use:** Application startup
**Example:**
```typescript
// api/server.ts
const loggerConfig =
  process.env.NODE_ENV === 'test'
    ? false // Disable in tests
    : process.env.NODE_ENV === 'production'
    ? { level: 'info' } // JSON logs for production
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      };

const app = Fastify({ logger: loggerConfig });
```

### Pattern 4: Standardized Error Responses
**What:** Custom error handler for consistent API error format
**When to use:** All Fastify applications
**Example:**
```typescript
// api/plugins/error-handler.ts
import { FastifyPluginAsync } from 'fastify';

const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    // Log error with context
    request.log.error({
      err: error,
      statusCode,
      url: request.url,
      method: request.method,
    });

    // Send standardized response
    reply.status(statusCode).send({
      error: {
        code,
        message: error.message,
        statusCode,
        // Include validation details if present
        ...(error.validation && { details: error.validation }),
      },
    });
  });
};

export default errorHandler;
```

### Pattern 5: Lifecycle Management
**What:** Proper startup and shutdown handling
**When to use:** main.ts entry point
**Example:**
```typescript
// main.ts
import { buildApp } from './api/app';

async function start() {
  const app = await buildApp();

  try {
    const port = Number(process.env.API_PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      app.log.info(`${signal} received, closing server`);
      await app.close();
      process.exit(0);
    });
  });
}

start();
```

### Anti-Patterns to Avoid
- **Mutating fastify instance after await register:** Once a plugin is registered with await, its encapsulation is finalized. Further changes won't propagate to child contexts.
- **Missing error handling in async routes:** Fastify catches async errors automatically, but ensure you don't return undefined (use proper reply methods).
- **Using require() for imports:** TypeScript types won't resolve correctly. Always use import/from syntax.
- **Incorrect TypeScript target:** Setting target below ES2017 causes FastifyDeprecation warnings.
- **Global decorators without fastify-plugin:** Decorators are encapsulated by default. Use fastify-plugin wrapper if global access is needed.
- **Validation without type provider:** Using Zod schemas directly doesn't provide type inference. Always use withTypeProvider<ZodTypeProvider>() and the type provider compilers.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS handling | Custom Access-Control headers | @fastify/cors | Handles preflight OPTIONS, origin matching (string/regex/array), credentials, exposed headers, max-age, edge cases |
| Security headers | Manual reply.header() calls | @fastify/helmet | Sets 15+ security headers (CSP, HSTS, X-Frame-Options, etc.) with sensible defaults, supports CSP nonces |
| Request validation | Manual Zod parsing in handlers | fastify-type-provider-zod | Automatic validation before handler, type inference, validation error formatting, serialization |
| Health checks | Custom /health endpoint | fastify-healthcheck (optional) | Provides uptime, under-pressure integration, customizable checks, consistent format |
| Environment validation | Manual process.env checks | @fastify/env or Zod config | Fail-fast validation at startup, type-safe access, clear error messages |
| Error serialization | Custom try/catch in each handler | setErrorHandler | Centralized error handling, automatic async error catching, consistent format |
| Request logging | console.log or custom logger | Pino (built-in) | 5x faster than alternatives, automatic request ID, context propagation, log levels, redaction |
| Graceful shutdown | Manual process.on listeners | Fastify close hooks + fastify.close() | Completes in-flight requests, closes connections, triggers cleanup hooks |

**Key insight:** Fastify's plugin ecosystem has mature solutions for cross-cutting concerns. Custom implementations miss edge cases (e.g., CORS preflight with credentials, CSP nonce generation, validation error formatting). Use official plugins from @fastify/ namespace - they're maintained by the core team and tested extensively.

## Common Pitfalls

### Pitfall 1: Type Provider Not Applied to Routes
**What goes wrong:** Routes defined without `.withTypeProvider<ZodTypeProvider>()` lose type inference, requiring manual type annotations.
**Why it happens:** Type providers don't propagate globally in Fastify. Each plugin context needs explicit type provider declaration.
**How to avoid:** Call `.withTypeProvider<ZodTypeProvider>()` on the fastify instance in your app factory, OR use `FastifyPluginAsyncZod` type for route plugins which includes the type provider.
**Warning signs:** TypeScript complains about request.body, request.query types. No autocomplete in route handlers.

### Pitfall 2: Validation Before Compiler Setup
**What goes wrong:** Routes registered before `setValidatorCompiler()`/`setSerializerCompiler()` don't get Zod validation.
**Why it happens:** Fastify applies compilers to routes at registration time, not retroactively.
**How to avoid:** Set compilers IMMEDIATELY after creating the Fastify instance, before any route registration.
**Warning signs:** Validation schemas are ignored. Invalid requests pass through to handlers. Errors like "Failed building the serialization schema" appear.

### Pitfall 3: Missing Logger Redaction
**What goes wrong:** Sensitive data (Authorization headers, passwords) logged in production, violating privacy laws (GDPR).
**Why it happens:** Pino logs full request/response objects by default, including all headers.
**How to avoid:** Configure redaction in logger options: `redact: ['req.headers.authorization', 'req.body.password']`
**Warning signs:** API keys, tokens, or passwords visible in production logs.

### Pitfall 4: CORS Configuration Too Permissive
**What goes wrong:** Using `origin: true` (reflect request origin) or `origin: '*'` in production allows any domain to call your API.
**Why it happens:** Developers copy development config to production.
**How to avoid:** Set explicit `origin` array or regex in production: `origin: ['https://app.example.com', /\.example\.com$/]`
**Warning signs:** CORS warnings in browser console from unexpected domains. Security audit flags permissive CORS.

### Pitfall 5: Incorrect Error Status Codes
**What goes wrong:** Validation errors return 500 instead of 400. Not found returns 500 instead of 404.
**Why it happens:** Custom error handler doesn't check error type/code before setting status.
**How to avoid:** Check `error.statusCode`, `error.validation`, and set appropriate codes: validation = 400, not found = 404, auth = 401/403, server = 500.
**Warning signs:** All errors return same status code. Clients can't distinguish validation failures from server errors.

### Pitfall 6: Encapsulation Confusion
**What goes wrong:** Decorators or hooks registered in a plugin aren't accessible in other plugins at the same level.
**Why it happens:** Misunderstanding Fastify's encapsulation model (siblings are isolated, only parent-to-child inheritance).
**How to avoid:** Shared utilities should be registered in parent context before sibling plugins, OR use fastify-plugin to break encapsulation.
**Warning signs:** "X is not a function" errors when trying to use decorators. Hooks don't run for sibling routes.

### Pitfall 7: Missing TypeScript Target Configuration
**What goes wrong:** `FastifyDeprecation` warnings flood logs about deprecated functionality.
**Why it happens:** TypeScript target set to ES5/ES6, but Fastify requires ES2017+ for async/await.
**How to avoid:** Set `"target": "ES2017"` or higher in tsconfig.json.
**Warning signs:** Deprecation warnings at startup. Unexpected transpilation of async functions.

## Code Examples

Verified patterns from official sources:

### Complete Server Setup with All Plugins
```typescript
// Source: https://fastify.dev/docs/latest/Reference/TypeScript/
// Source: https://github.com/turkerdev/fastify-type-provider-zod
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'production'
      ? { level: 'info' }
      : {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' }
          }
        }
  }).withTypeProvider<ZodTypeProvider>();

  // Set compilers FIRST
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.example.com']
      : true, // Reflect origin in dev
    credentials: true,
  });

  // Register Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // Custom error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, url: request.url });

    reply.status(error.statusCode || 500).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        statusCode: error.statusCode || 500,
        ...(error.validation && { details: error.validation }),
      },
    });
  });

  return app;
}
```

### Health Check Endpoint
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Plugins-Guide/
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/health',
    schema: {
      response: {
        200: z.object({
          status: z.literal('ok'),
          timestamp: z.string().datetime(),
          uptime: z.number(),
        }),
      },
    },
    handler: async (request, reply) => {
      return {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  });
};

export default healthRoutes;
```

### Route with Request Validation
```typescript
// Source: https://github.com/turkerdev/fastify-type-provider-zod
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const schema = {
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
  }),
  response: {
    201: z.object({
      id: z.string().uuid(),
      name: z.string(),
      createdAt: z.string().datetime(),
    }),
  },
};

const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    method: 'POST',
    url: '/items',
    schema,
    handler: async (request, reply) => {
      // request.body is fully typed from schema
      const { name, email } = request.body;

      // Business logic here
      const item = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };

      reply.status(201).send(item);
    },
  });
};

export default routes;
```

### Environment-Based Configuration
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Logging/
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const loggerConfig = isTest
  ? false // Disable in tests
  : isProd
  ? {
      level: 'info',
      redact: ['req.headers.authorization', 'req.body.password'],
    }
  : {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express + manual types | Fastify with native TypeScript | 2021 (Fastify v3) | First-class TS support, better DX, automatic type inference |
| JSON Schema validation | Zod/TypeBox with type providers | 2022 (Fastify v4) | Single source of truth for types and validation |
| Manual CORS headers | @fastify/cors plugin | Always | Preflight handling, credential support, security |
| winston/bunyan logging | Pino (built-in) | 2016 (Fastify inception) | 5x performance, request context, log levels |
| Global middleware | Encapsulated plugins | 2016 (Fastify inception) | Modularity, isolation, testability |
| Callback-based handlers | Async/await handlers | 2018 (Fastify v2) | Automatic error handling, cleaner code |

**Deprecated/outdated:**
- **fastify-helmet**: Renamed to @fastify/helmet (all @fastify/* are official)
- **fastify-cors**: Renamed to @fastify/cors
- **JSON Schema for validation**: Still supported but Zod/TypeBox provide better TypeScript integration
- **fastify-env**: Still works but manual Zod schemas in config.ts provide same benefits with less dependencies

## Open Questions

Things that couldn't be fully resolved:

1. **Health check plugin vs manual endpoint**
   - What we know: fastify-healthcheck plugin exists, provides under-pressure integration and uptime
   - What's unclear: Whether additional complexity is worth it for a simple health check (API-02 only requires 200 OK response)
   - Recommendation: Start with manual endpoint in Phase 9, evaluate plugin in Phase 12 if under-pressure monitoring is needed

2. **CORS origin configuration for development**
   - What we know: Project currently has no frontend (API-first approach), REQUIREMENTS.md confirms "Web UI" is future milestone
   - What's unclear: What origins to allow in development without a frontend client
   - Recommendation: Use `origin: true` (reflect request origin) in development, add specific origins when frontend is built

3. **Logger redaction fields**
   - What we know: Should redact sensitive fields like Authorization headers and password fields
   - What's unclear: Full list of sensitive fields in this specific project (gateway passwords are encrypted in DB, but might be in request bodies)
   - Recommendation: Start with `['req.headers.authorization', 'req.body.password']`, expand based on CRUD API schemas in Phases 10-11

## Sources

### Primary (HIGH confidence)
- Fastify Official Docs (https://fastify.dev/docs/latest/) - TypeScript, Validation, Logging, Errors, Plugins, Encapsulation
- fastify-type-provider-zod GitHub (https://github.com/turkerdev/fastify-type-provider-zod) - Complete setup examples
- @fastify/cors GitHub (https://github.com/fastify/fastify-cors) - Configuration options
- @fastify/helmet npm (https://www.npmjs.com/package/@fastify/helmet) - Security headers setup

### Secondary (MEDIUM confidence)
- [TypeScript | Fastify](https://fastify.dev/docs/latest/Reference/TypeScript/) - TypeScript setup and patterns
- [🚀 Fastify with TypeScript: High-Performance Server - Tutorial | Krython](https://krython.com/tutorial/typescript/fastify-with-typescript-high-performance-server/) - Best practices
- [How to build blazing fast APIs with Fastify and TypeScript](https://daily.dev/blog/how-to-build-blazing-fast-apis-with-fastify-and-typescript) - Architecture patterns
- [Fastify with TypeScript: A Comprehensive Guide — xjavascript.com](https://www.xjavascript.com/blog/fastify-typescript/) - Code organization
- [The complete guide to the Fastify plugin system | Nearform](https://nearform.com/digital-community/the-complete-guide-to-fastify-plugin-system/) - Plugin architecture
- [Fastify Best Practices #1: Environment Variables - Swift Code Chronicles](https://blog.hushukang.com/en/blog/0197aa81-a99c-7200-8540-08c70b697adb/) - Environment configuration
- [A Complete Guide to Pino Logging in Node.js | Better Stack Community](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) - Pino logging patterns

### Tertiary (LOW confidence)
- None - all key findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Fastify docs and npm packages
- Architecture: HIGH - Official plugin guide and TypeScript reference
- Pitfalls: MEDIUM - Combination of GitHub issues and community articles (verified patterns)
- Code examples: HIGH - Taken directly from official documentation and official plugin READMEs

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - Fastify ecosystem is stable)

**Key dependencies from existing project:**
- Zod 4.x already installed (package.json)
- TypeScript 5.9.3 configured with strict mode (package.json)
- Node.js 20.6+ required (for --env-file flag used in dev script)
- Existing config.ts uses Zod for validation pattern

**Environment variables needed (add to .env.example):**
```bash
# API Server (Phase 9)
API_PORT=3000
NODE_ENV=development
```

**Project alignment:**
- Fastify decision already documented in STATE.md (prior decisions)
- Modular architecture supports QUAL-01 requirement (api/, database/, gateway-manager/ directories)
- Zod validation supports QUAL-03 requirement (All API requests validated with Zod)
- Pino logging supports QUAL-05 requirement (Logging provides actionable information)
- Environment variables support QUAL-06 requirement (Configuration externalized)
