# Stack Research

**Domain:** TypeScript WebSocket Client for Industrial IoT
**Researched:** 2026-02-07
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Node.js** | 18+ (LTS) | Runtime environment | Project requirement, provides native ESM support, built-in .env loading (v20.6+), and stable foundation for TypeScript |
| **TypeScript** | 5.9.x | Type-safe development | Latest stable version (as of 2025), provides comprehensive type safety with "strict" mode, prevents runtime errors through compile-time checking |
| **ws** | 8.19.x | WebSocket client/server | Industry standard with 145M+ weekly downloads, RFC 6455 compliant, minimal overhead, blazing fast performance (50K+ connections capable), no unnecessary abstractions for point-to-point gateway communication |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **tsx** | latest | TypeScript execution | Development runtime - 5-10x faster than ts-node, built on esbuild, zero configuration, use for `npm run dev` and rapid iteration |
| **pino** | latest | Structured logging | Production logging - up to 5x faster than Winston, async logging, JSON-structured output, ideal for IoT applications with high message throughput |
| **zod** | latest | Runtime validation | Environment variable validation and message schema validation - TypeScript-first, fails fast at startup, provides type inference |
| **@types/ws** | latest | TypeScript definitions for ws | Always - provides complete type safety for WebSocket API |
| **@types/node** | latest | TypeScript definitions for Node.js | Always - provides types for Node.js built-in modules |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest** | Unit testing | Modern Jest alternative, native TypeScript/ESM support, 10-20x faster in watch mode, zero config for TS projects, Jest-compatible API |
| **mock-socket** | WebSocket testing | Mock WebSocket servers for unit tests, works with Vitest/Jest, captures messages for assertions |
| **ESLint** | Code linting | Use flat config format (2025 standard), TypeScript-aware rules, catches common mistakes |
| **Prettier** | Code formatting | Consistent formatting, integrate with ESLint, autoformat on save |
| **Node.js native .env support** | Configuration | Built-in since v20.6.0, use `--env-file` flag, no dotenv dependency needed |

## Installation

```bash
# Initialize project
npm init -y

# Core dependencies
npm install ws pino zod

# TypeScript and type definitions
npm install -D typescript @types/node @types/ws

# Development tools
npm install -D tsx vitest @vitest/ui eslint prettier mock-socket

# Optional: ESLint TypeScript support
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| **WebSocket Library** | ws | Socket.IO | Use Socket.IO if you need rooms, broadcasting, automatic reconnection, or fallback transports. For direct gateway communication, ws is simpler and faster. |
| **WebSocket Library** | ws | Native WebSocket (browser API) | For browser clients only. ws is specifically for Node.js. |
| **TypeScript Runner** | tsx | ts-node | Use ts-node only if you need its advanced features (REPL, programmatic usage). tsx is faster and simpler for most cases. |
| **TypeScript Runner** | tsx | Node.js native (`--experimental-strip-types`) | Available in Node.js 22.18+, but still experimental. Use tsx for production stability. |
| **TypeScript Runner** | tsx | Bun | Use Bun if you want 2-3x faster startup and are okay with a non-Node.js runtime. Requires rewriting package management. |
| **Logging** | pino | winston | Use Winston if you need multiple transports (files, databases, cloud) or complex custom formatting. Pino is faster for high-throughput scenarios. |
| **Testing** | vitest | jest | Use Jest if you have existing Jest infrastructure. Vitest is faster and has better TypeScript/ESM support for new projects. |
| **Config** | Node.js native .env | dotenv | Use dotenv if you need Node.js < 20.6 or need dotenv-expand features. Native support is simpler. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **socket.io** (for this spike) | Too heavyweight for point-to-point gateway communication, adds protocol overhead, unnecessary features (rooms, broadcasting) complicate simple request/response pattern | **ws** - lightweight, standard WebSocket protocol, perfect for industrial IoT gateway communication |
| **ts-node** | 5-10x slower than tsx, requires more configuration, legacy tool for new projects | **tsx** - modern, fast, zero-config alternative |
| **dotenv** | Unnecessary dependency for Node.js 20.6+, adds package bloat | **Node.js native .env support** - built-in with `--env-file` flag |
| **@types packages** from DefinitelyTyped for libraries with native types | Outdated, may conflict with library's own types | Check if library includes types natively (most modern libraries do) |
| **jest + babel-jest/ts-jest** | Complex configuration, slower than vitest, requires additional setup for TypeScript | **vitest** - native TypeScript support, faster, simpler |
| **CommonJS (require/module.exports)** | Legacy module system, TypeScript defaults to ESM now | **ES Modules (import/export)** - modern standard, better tree-shaking, native Node.js support |

## Stack Patterns by Variant

**If this were a production system (not a spike):**
- Add reconnection logic (exponential backoff)
- Add heartbeat/ping-pong for connection health
- Add message queuing for offline resilience
- Use winston for multi-transport logging (files + console + monitoring service)
- Add OpenTelemetry for distributed tracing

**If building a browser client (instead of Node.js):**
- Use native WebSocket API (not ws library)
- Use vite for bundling
- Use websocket-ts for auto-reconnect wrapper
- Skip Node.js-specific tools (tsx, pino)

**If targeting multiple gateways (not single spike):**
- Add connection pooling
- Add per-gateway rate limiting
- Use pino with structured context (gatewayId field)
- Consider socket.io for connection management

**If Node.js < 20.6:**
- Use dotenv for .env loading
- Add `import 'dotenv/config'` at entry point

## TypeScript Configuration

Recommended `tsconfig.json` for this project:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings:**
- `"module": "NodeNext"` - enables modern Node.js ESM support
- `"strict": true` - enables all strict type-checking options
- `"isolatedModules": true` - required for tsx/esbuild-based runners

## Package.json Scripts

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node --env-file .env dist/index.js",
    "build": "tsc",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

**Key points:**
- `"type": "module"` - enables ES modules
- `tsx watch` - auto-restart on file changes during development
- `--env-file .env` - native .env loading for production
- `vitest` - no config needed for basic TypeScript

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| ws@8.19.x | Node.js 10+ | Works with all Node.js LTS versions, no peer dependency issues |
| typescript@5.9.x | Node.js 18+ | Requires ES2020+ target for best features |
| tsx@latest | Node.js 18+ | Uses esbuild internally, requires modern Node.js |
| pino@latest | Node.js 14+ | Uses worker threads for async logging on v14+ |
| vitest@latest | Node.js 18+ | Requires native ESM support |
| zod@latest | TypeScript 5.0+ | Uses advanced TypeScript features, needs modern TS version |

**Critical compatibility note:** Using Node.js 18+ (as required) ensures all recommended packages work without issues. No known compatibility conflicts in this stack.

## Environment Variable Pattern with Zod

```typescript
// src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  GATEWAY_HOST: z.string().ip(),
  GATEWAY_PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  USERNAME: z.string().min(1),
  PASSWORD: z.string().min(1),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

**Benefits:**
- Fails fast at startup with clear error messages
- Automatic type inference (no manual type definitions)
- Runtime validation + compile-time types
- Coercion (string "5000" → number 5000)

## Sources

### High Confidence (Official Docs & Context7)
- [ws GitHub Repository](https://github.com/websockets/ws) - Official source for ws library
- [TypeScript Official Releases](https://github.com/microsoft/typescript/releases) - Latest version information
- [Node.js Official Documentation](https://nodejs.org/en/learn/getting-started/websocket) - WebSocket in Node.js

### Medium Confidence (Multiple Verified Sources)
- [Best Node.js WebSocket Libraries Compared | Velt](https://velt.dev/blog/best-nodejs-websocket-libraries) - Comprehensive comparison of ws vs alternatives
- [Node.js + WebSockets: When to Use ws vs socket.io (And Why We Switched) | DEV](https://dev.to/alex_aslam/nodejs-websockets-when-to-use-ws-vs-socketio-and-why-we-switched-di9) - Real-world decision rationale
- [A Modern Node.js + TypeScript Setup for 2025 | DEV](https://dev.to/woovi/a-modern-nodejs-typescript-setup-for-2025-nlk) - Current best practices
- [You Don't Need dotenv Anymore | TypeScript.tv](https://typescript.tv/best-practices/you-dont-need-dotenv-anymore/) - Native .env support explanation
- [TSX vs ts-node: The Definitive TypeScript Runtime Comparison | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/) - Performance benchmarks
- [Pino vs. Winston: Choosing the Right Logger | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/pino-vs-winston/) - Logging library comparison
- [Jest vs Vitest: Which Test Runner Should You Use in 2025? | Medium](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) - Testing framework comparison
- [Environment variables type safety and validation with Zod | creatures.sh](https://www.creatures.sh/blog/env-type-safety-and-validation/) - Zod validation pattern
- [mock-socket GitHub Repository](https://github.com/thoov/mock-socket) - WebSocket mocking for tests

### WebSearch Discovery (Ecosystem Patterns)
- [ws npm package](https://www.npmjs.com/package/ws) - Weekly download statistics (145M+)
- [Progress on TypeScript 7 | Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/) - TypeScript roadmap
- [The Top 6 ts-node Alternatives for TypeScript | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/ts-node-alternatives/) - Runner alternatives survey

---
*Stack research for: TypeScript WebSocket Client for Industrial IoT Gateway*
*Researched: 2026-02-07*
*Context: Milestone 0 technical spike for CTC Connect Wireless gateway communication*
