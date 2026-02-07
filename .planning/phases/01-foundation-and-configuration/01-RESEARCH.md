# Phase 1: Foundation & Configuration - Research

**Researched:** 2026-02-07
**Domain:** TypeScript project setup, configuration validation, logging infrastructure
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for a TypeScript/Node.js WebSocket client project with type-safe configuration loading and simple logging infrastructure. The standard approach uses TypeScript 5.9+ with strict mode, Zod for runtime schema validation of environment variables, and a minimal custom logger utility.

The key technical decisions center on:
1. **TypeScript strict mode** - Comprehensive type safety with all strict flags enabled
2. **Zod for config validation** - Type-safe runtime validation with automatic TypeScript type inference
3. **Fail-fast startup** - Configuration validation at module load prevents runtime surprises
4. **Simple custom logger** - Lightweight utility with timestamps and log levels (no external logging library needed)
5. **Node.js native env support** - Use Node.js 20.6+ `--env-file` flag instead of dotenv package

**Primary recommendation:** Use Zod schema validation with `parse()` at module load to fail-fast on missing/invalid configuration, enabling both runtime safety and compile-time type inference through `z.infer<>`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9+ | Type-safe JavaScript | Industry standard for Node.js projects requiring type safety, mature tooling |
| Zod | 4.3.6+ | Runtime schema validation | Zero dependencies, 2kb gzipped, automatic type inference, best-in-class for config validation |
| tsx | latest | TypeScript execution | Standard dev-time runner, faster than ts-node, supports ESM |
| Node.js | 18+ | Runtime | LTS version with native --env-file support (20.6+) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | latest | Node.js type definitions | Always include for TypeScript Node.js projects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Joi, Yup | Zod provides better TypeScript integration and type inference |
| Custom logger | Winston, Pino | For this phase, custom logger is simpler; libraries add complexity for basic needs |
| dotenv | Native Node.js | Node.js 20.6+ has `--env-file` flag built-in, eliminating dependency |

**Installation:**
```bash
npm install zod
npm install -D typescript tsx @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/           # TypeScript type definitions, interfaces
├── gateway/         # WebSocket gateway client modules (future phases)
├── utils/           # Utility modules (logger, helpers)
├── config.ts        # Configuration loading and validation
└── main.ts          # Application entry point
```

### Pattern 1: Zod Environment Variable Validation
**What:** Define Zod schema for environment variables, validate at module load, export typed config object
**When to use:** All configuration loading from environment variables
**Example:**
```typescript
// Source: https://www.creatures.sh/blog/env-type-safety-and-validation/
import { z } from 'zod';

const configSchema = z.object({
  // Required string fields
  GATEWAY_URL: z.string().url(),
  GATEWAY_EMAIL: z.string().email(),
  GATEWAY_PASSWORD: z.string().min(1),
  SENSOR_SERIAL: z.string().min(1),

  // Optional with defaults - numeric values need coercion
  CONNECTION_TIMEOUT: z.coerce.number().min(1000).default(10000),
  COMMAND_TIMEOUT: z.coerce.number().min(1000).default(30000),
  ACQUISITION_TIMEOUT: z.coerce.number().min(1000).default(60000),

  // Optional enum with default
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Fail-fast: parse throws on validation failure
export const config = configSchema.parse(process.env);

// Export inferred type for use throughout application
export type Config = z.infer<typeof configSchema>;
```

### Pattern 2: Simple Logger Utility
**What:** Minimal logger with timestamp formatting and log levels
**When to use:** Basic logging needs without external dependencies
**Example:**
```typescript
// Source: https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger(process.env.LOG_LEVEL as LogLevel);
```

### Pattern 3: TypeScript Strict Mode Configuration
**What:** tsconfig.json with strict mode and Node.js-optimized settings
**When to use:** All TypeScript Node.js projects
**Example:**
```json
// Source: https://oneuptime.com/blog/post/2026-01-24-typescript-tsconfig-configuration/view
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",

    // Strict mode - enables all strict flags
    "strict": true,

    // Module interop
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,

    // Output options
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmitOnError": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Anti-Patterns to Avoid
- **Lazy validation:** Don't validate config on first use - validate at startup so failures happen immediately
- **String-only schemas:** Don't forget `z.coerce.number()` - environment variables are always strings
- **Using `any` type:** Defeats TypeScript's purpose; use `unknown` or specific types
- **Global logger instance before config loads:** Logger configuration should wait for config validation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validation functions | Zod | Handles type coercion, nested objects, detailed errors, type inference automatically |
| Environment variable loading | Custom file parsing | Node.js `--env-file` (20.6+) | Native support eliminates dependency, handles parsing correctly |
| Type checking | Manual runtime checks | TypeScript strict mode | Catches errors at compile time, prevents entire classes of bugs |

**Key insight:** Configuration validation has many edge cases (type coercion, nested validation, clear error messages). Zod solves these problems in 2kb, battle-tested across thousands of projects.

## Common Pitfalls

### Pitfall 1: Environment Variable Type Coercion
**What goes wrong:** Environment variables are always strings, but schema defines numbers/booleans. Without coercion, validation fails or produces wrong types.
**Why it happens:** `process.env.PORT` returns `"3000"` (string), not `3000` (number).
**How to avoid:** Use `z.coerce.number()` for numeric values, not `z.number()`.
**Warning signs:** TypeScript shows correct type but runtime value is string, causing unexpected behavior.

**Example:**
```typescript
// WRONG - will fail or produce NaN
const schema = z.object({
  PORT: z.number().default(3000)
});

// RIGHT - coerces string to number
const schema = z.object({
  PORT: z.coerce.number().default(3000)
});
```

### Pitfall 2: Late Configuration Validation
**What goes wrong:** Application starts successfully but crashes later when accessing invalid configuration.
**Why it happens:** Configuration validated on first use instead of at startup.
**How to avoid:** Call `configSchema.parse(process.env)` at module load time (top-level), not inside functions.
**Warning signs:** Application runs for seconds/minutes before configuration error appears.

**Example:**
```typescript
// WRONG - validates lazily
export function getConfig() {
  return configSchema.parse(process.env);
}

// RIGHT - validates at module load (fail-fast)
export const config = configSchema.parse(process.env);
```

### Pitfall 3: Uninitialized Class Properties (strictPropertyInitialization)
**What goes wrong:** Class properties declared but not initialized in constructor, causing `undefined` at runtime.
**Why it happens:** `strict: true` enables `strictPropertyInitialization`, which catches this error.
**How to avoid:** Initialize all properties in constructor or use definite assignment assertion `!` if initialized elsewhere.
**Warning signs:** TypeScript error: "Property 'X' has no initializer and is not definitely assigned in the constructor."

**Example:**
```typescript
// WRONG - property not initialized
class Client {
  private socket: WebSocket;

  constructor(url: string) {
    // socket not initialized here
  }
}

// RIGHT - initialize in constructor
class Client {
  private socket: WebSocket;

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }
}

// ALTERNATIVE - definite assignment assertion (if initialized elsewhere)
class Client {
  private socket!: WebSocket;

  constructor(url: string) {
    this.initializeSocket(url);
  }

  private initializeSocket(url: string): void {
    this.socket = new WebSocket(url);
  }
}
```

### Pitfall 4: Mixing `parse()` and `safeParse()` Without Purpose
**What goes wrong:** Using `safeParse()` but not checking `success` property, or using `parse()` but trying to catch errors inconsistently.
**Why it happens:** Misunderstanding the difference between the two methods.
**How to avoid:** Use `parse()` for fail-fast startup (throws on error). Use `safeParse()` only when you need to handle validation errors gracefully.
**Warning signs:** Uncaught promise rejections or unhandled errors during config loading.

**Example:**
```typescript
// WRONG - safeParse but not checking success
const result = configSchema.safeParse(process.env);
const config = result.data; // May be undefined!

// RIGHT - safeParse with proper checking
const result = configSchema.safeParse(process.env);
if (!result.success) {
  console.error('Configuration validation failed:', result.error);
  process.exit(1);
}
const config = result.data;

// BETTER - use parse for fail-fast (simpler)
const config = configSchema.parse(process.env);
// Throws ZodError with clear messages if validation fails
```

### Pitfall 5: Missing `esModuleInterop` in tsconfig.json
**What goes wrong:** Import statements fail or require workarounds like `import * as zod from 'zod'` instead of `import { z } from 'zod'`.
**Why it happens:** TypeScript's default handling of CommonJS/ESM interop is restrictive.
**How to avoid:** Always enable `"esModuleInterop": true` in tsconfig.json.
**Warning signs:** Cannot use default imports from CommonJS modules, requiring namespace imports instead.

### Pitfall 6: Overly Complex Environment Variable Schemas
**What goes wrong:** Attempting to pass large JSON objects or arrays via environment variables.
**Why it happens:** Environment variables have length limits and are meant for simple configuration.
**How to avoid:** Keep environment variables simple (strings, numbers, booleans, enums). Use config files for complex structures.
**Warning signs:** Platform limits on environment variable length, difficulty reading `.env` files.

## Code Examples

Verified patterns from official sources:

### Complete config.ts Module
```typescript
// Source: https://www.creatures.sh/blog/env-type-safety-and-validation/
// Combined with project requirements
import { z } from 'zod';

const configSchema = z.object({
  // Required fields (CFG-01)
  GATEWAY_URL: z.string().url(),
  GATEWAY_EMAIL: z.string().email(),
  GATEWAY_PASSWORD: z.string().min(1),
  SENSOR_SERIAL: z.string().min(1),

  // Optional with defaults (CFG-03, CFG-05)
  CONNECTION_TIMEOUT: z.coerce.number().min(1000).default(10000),
  COMMAND_TIMEOUT: z.coerce.number().min(1000).default(30000),
  ACQUISITION_TIMEOUT: z.coerce.number().min(1000).default(60000),
  HEARTBEAT_INTERVAL: z.coerce.number().min(1000).default(30000),

  // Log level (CFG-05)
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Fail-fast validation (CFG-04)
export const config = configSchema.parse(process.env);

// Export type for use throughout application (TYPE-05)
export type Config = z.infer<typeof configSchema>;
```

### Complete utils/logger.ts Module
```typescript
// Source: https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/
// Adapted for CODE-05 requirements
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

// Export singleton instance - can be configured after config loads
export let logger: Logger;

export function initLogger(level: LogLevel): void {
  logger = new Logger(level);
}
```

### Main Entry Point Pattern
```typescript
// src/main.ts
import { config } from './config';
import { initLogger, logger } from './utils/logger';

// Initialize logger with config
initLogger(config.LOG_LEVEL);

logger.info('Application starting');
logger.debug('Configuration loaded', {
  gatewayUrl: config.GATEWAY_URL,
  sensorSerial: config.SENSOR_SERIAL,
});

// Application logic here
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| dotenv package | Node.js `--env-file` flag | Node.js v20.6.0 (Sept 2023) | Eliminates dependency, use native support for Node 20+ |
| Manual validation | Zod schemas | 2021-present | Type safety + runtime validation in one, automatic type inference |
| `any` types everywhere | TypeScript strict mode | TypeScript 3.0+ (2018) | Catches bugs at compile time, required for modern TS projects |
| Winston/Pino for simple logging | Custom minimal logger | N/A - context-dependent | For basic needs, custom logger avoids dependency overhead |

**Deprecated/outdated:**
- **dotenv package**: Still works but unnecessary for Node.js 20.6+, native `--env-file` flag preferred
- **ts-node**: tsx is faster and has better ESM support for development
- **`moduleResolution: "node"`**: Use `"node16"` or `"nodenext"` for newer Node.js with ESM support (future consideration)

## Open Questions

Things that couldn't be fully resolved:

1. **Node.js version constraint**
   - What we know: Node.js 20.6+ has native `--env-file` support, Node.js 18+ is LTS
   - What's unclear: Project specifies "Node.js 18+", which predates native env file support
   - Recommendation: Use dotenv for Node 18.x compatibility, or require Node 20.6+ and use native support. Document the choice.

2. **Build tooling details**
   - What we know: tsx for development, TypeScript compiler for production builds
   - What's unclear: Whether production deployment needs compiled JavaScript or can run tsx
   - Recommendation: Plan for `tsc` compilation to `dist/` for production, tsx for development only

3. **Error handling for config validation**
   - What we know: Zod `parse()` throws ZodError with detailed validation messages
   - What's unclear: Whether to pretty-print errors or let default error output suffice
   - Recommendation: Start with default ZodError output (very detailed), enhance if needed in later phases

## Sources

### Primary (HIGH confidence)
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) - Verified TypeScript version
- [TypeScript strict mode documentation](https://www.typescriptlang.org/tsconfig/strict.html) - Strict mode flags
- [Zod GitHub repository](https://github.com/colinhacks/zod) - Version 4.3.6, installation, usage
- [Zod official documentation](https://zod.dev/) - Schema definition, parse vs safeParse, type inference
- [Better Stack: TypeScript Strict Option](https://betterstack.com/community/guides/scaling-nodejs/typescript-strict-option/) - Complete list of strict flags with examples
- [OneUpTime: TypeScript tsconfig Configuration](https://oneuptime.com/blog/post/2026-01-24-typescript-tsconfig-configuration/view) - Recommended Node.js tsconfig.json
- [Pawel Grzybek: Node.js Native .env Support](https://pawelgrzybek.com/node-js-with-native-support-for-env-files-you-may-not-need-dotenv-anymore/) - --env-file flag usage

### Secondary (MEDIUM confidence)
- [creatures.sh: Environment Variables with Zod](https://www.creatures.sh/blog/env-type-safety-and-validation/) - Complete Zod env validation pattern
- [Better Stack: Node.js Logging Best Practices](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/) - Logger implementation guidance
- [Infisical: Should You Still Use dotenv in 2025?](https://infisical.com/blog/stop-using-dotenv-in-nodejs-v20.6.0+) - dotenv vs native comparison
- [Medium: Ultimate TypeScript Project Structure 2026](https://medium.com/@mernstackdevbykevin/an-ultimate-typescript-project-structure-2026-edition-4a2d02faf2e0) - Project organization patterns

### Tertiary (LOW confidence)
- WebSearch results for TypeScript best practices 2026 - General ecosystem trends
- WebSearch results for Node.js logging patterns - Multiple library comparisons

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod, TypeScript, Node.js are verified through official documentation and GitHub
- Architecture: HIGH - Patterns verified through authoritative sources (creatures.sh, Better Stack technical guides)
- Pitfalls: HIGH - Common mistakes documented in multiple technical guides, verified with official docs
- Code examples: HIGH - All examples sourced from official documentation or authoritative technical guides

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable technologies, TypeScript/Zod changes are infrequent)

**Notes:**
- No CONTEXT.md exists for this phase (no prior `/gsd:discuss-phase` session), providing full discretion on implementation approach
- Research focused on battle-tested, minimal-dependency solutions aligned with "balanced quality" and "ASAP timeline" constraints
- All patterns verified against current (2026) documentation and community practices
