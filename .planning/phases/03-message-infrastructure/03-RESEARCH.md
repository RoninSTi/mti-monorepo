# Phase 3: Message Infrastructure - Research

**Researched:** 2026-02-07
**Domain:** WebSocket request/response pattern with message correlation
**Confidence:** HIGH

## Summary

This phase implements a command/response pattern over WebSocket with message correlation, enabling request-like semantics over a bidirectional channel. The core challenge is matching asynchronous RTN_ responses to their originating commands when responses may arrive out-of-order, while also handling timeouts for commands that never receive responses.

The standard approach uses a correlation ID (UUID v4) generated client-side for each command, stored with a Promise resolver in a Map of pending requests. When a response arrives, the correlation ID is matched to retrieve and resolve the pending promise. Timeouts are handled using native AbortSignal.timeout() (Node.js 15.7.0+), which provides automatic cancellation and clean error differentiation between timeouts and other abort reasons.

TypeScript discriminated unions with a "Type" field enable type-safe routing of different message categories (commands, responses, notifications). Zod schemas validate unknown JSON from the gateway at runtime, providing both type safety and runtime validation with a single schema definition.

**Primary recommendation:** Use Map<correlationId, Promise resolver> for pending requests, native crypto.randomUUID() for correlation IDs, AbortSignal.timeout() for command timeouts, and Zod discriminated unions for message type validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | Built-in (v15.7.0+) | UUID v4 generation via randomUUID() | Native, zero dependencies, 3x faster than uuid package, RFC 4122 compliant |
| AbortSignal | Built-in (v15.7.0+) | Promise timeout handling | Native, standardized across environments, automatic error differentiation |
| Zod | ^4.3.6 (latest) | Runtime JSON validation and TypeScript type inference | Already in project, provides both runtime and compile-time safety from single schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript discriminated unions | Built-in | Type-safe message routing by Type field | Always - enables exhaustive checking and type narrowing |
| Map<string, T> | Built-in | Correlation ID to pending Promise storage | Always - O(1) lookup, automatic cleanup on resolve/timeout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| crypto.randomUUID() | uuid package | uuid package adds dependency for no benefit - native is faster and RFC compliant |
| AbortSignal.timeout() | Manual setTimeout + Promise wrapper | Manual approach is error-prone, doesn't differentiate timeout from user abort |
| Zod | TypeScript interfaces only | Loses runtime validation - gateway can send anything, need defense at boundary |
| Map | Plain object {} | Object keys coerce to string, lacks type safety, no convenient has/delete methods |

**Installation:**
No additional packages needed - all core functionality is built-in or already in project (Zod).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── gateway/
│   ├── connection.ts           # Existing - WebSocket lifecycle
│   ├── message-router.ts       # NEW - Routes messages by Type field
│   ├── command-client.ts       # NEW - Send commands, await responses
│   └── notification-handler.ts # NEW - Handle async NOT_ messages
├── types/
│   ├── connection.ts           # Existing
│   ├── messages.ts             # NEW - All message schemas (Zod + TS)
│   └── index.ts                # Re-exports
└── utils/
    └── logger.ts               # Existing
```

### Pattern 1: Correlation ID with Pending Request Map
**What:** Store Promise resolve/reject functions keyed by correlation ID until response arrives or timeout occurs.

**When to use:** Always - this is the standard request/response pattern over bidirectional channels.

**Example:**
```typescript
// Simplified from community patterns and official WebSocket RPC examples
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class CommandClient {
  private pendingRequests = new Map<string, PendingRequest>();

  async sendCommand(command: Command): Promise<Response> {
    const correlationId = crypto.randomUUID(); // Native Node.js v15.7.0+

    return new Promise((resolve, reject) => {
      // Set up timeout using AbortSignal (native, modern)
      const timeoutMs = 30000;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(correlationId, { resolve, reject, timer });

      // Send command with correlation ID
      const message = {
        Type: command.type,
        CorrelationId: correlationId,
        From: "app",
        To: "gateway",
        Data: command.data
      };

      this.connection.send(JSON.stringify(message));
    });
  }

  handleResponse(correlationId: string, response: unknown): void {
    const pending = this.pendingRequests.get(correlationId);
    if (!pending) {
      // Response for unknown/timed-out request - log and ignore
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(correlationId);
    pending.resolve(response);
  }
}
```

### Pattern 2: Discriminated Union Message Routing
**What:** Use TypeScript discriminated unions with a common "Type" field to type-safely route messages to appropriate handlers.

**When to use:** Always - the gateway protocol has distinct message categories that need different handling.

**Example:**
```typescript
// Source: TypeScript handbook + Zod discriminated unions
// https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
// https://zod.dev/api?id=discriminated-unions

import { z } from 'zod';

// Base message structure
const BaseMessage = z.object({
  Type: z.string(),
  From: z.string(),
  To: z.string().optional(),
  Target: z.string().optional(),
});

// Response messages (RTN_*)
const ReturnDynResponse = BaseMessage.extend({
  Type: z.literal('RTN_DYN'),
  CorrelationId: z.string().uuid(),
  Data: z.object({
    Sensors: z.array(z.object({
      Id: z.string(),
      Name: z.string(),
      // ... sensor fields
    }))
  })
});

const ReturnErrorResponse = BaseMessage.extend({
  Type: z.literal('RTN_ERR'),
  CorrelationId: z.string().uuid(),
  Data: z.object({
    Attempt: z.number(),
    Error: z.string()
  })
});

// Discriminated union of all response types
const ResponseMessage = z.discriminatedUnion('Type', [
  ReturnDynResponse,
  ReturnErrorResponse,
  // ... other RTN_ types
]);

// Notification messages (NOT_*)
const NotificationMessage = z.discriminatedUnion('Type', [
  // ... NOT_DYN_READING_STARTED, etc.
]);

// Type inference from Zod schema
type ResponseMessage = z.infer<typeof ResponseMessage>;
type NotificationMessage = z.infer<typeof NotificationMessage>;

// Type-safe routing
function routeMessage(raw: unknown): void {
  // Parse and validate with Zod
  const parseResult = ResponseMessage.safeParse(raw);

  if (parseResult.success) {
    const msg = parseResult.data;

    // TypeScript knows msg.Type is one of the discriminated types
    switch (msg.Type) {
      case 'RTN_DYN':
        // TypeScript knows msg.Data has Sensors array
        handleReturnDyn(msg);
        break;
      case 'RTN_ERR':
        // TypeScript knows msg.Data has Attempt and Error
        handleReturnError(msg);
        break;
    }
  }
}
```

### Pattern 3: Timeout with AbortSignal
**What:** Use native AbortSignal.timeout() for automatic promise cancellation with error differentiation.

**When to use:** For command timeouts where you want to distinguish timeout errors from other abort reasons.

**Example:**
```typescript
// Source: MDN Web Docs - AbortSignal
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

async sendCommandWithTimeout(command: Command, timeoutMs: number = 30000): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const signal = AbortSignal.timeout(timeoutMs);

  return new Promise((resolve, reject) => {
    // Register abort handler
    signal.addEventListener('abort', () => {
      this.pendingRequests.delete(correlationId);

      // AbortSignal.timeout() sets signal.reason to TimeoutError
      if (signal.reason?.name === 'TimeoutError') {
        reject(new Error(`Command ${command.type} timeout after ${timeoutMs}ms`));
      } else {
        reject(signal.reason);
      }
    });

    // Store pending request
    this.pendingRequests.set(correlationId, { resolve, reject, signal });

    // Send command
    const message = { Type: command.type, CorrelationId: correlationId, /* ... */ };
    this.connection.send(JSON.stringify(message));
  });
}
```

### Pattern 4: Zod safeParse for Unknown Gateway Messages
**What:** Use Zod's safeParse() to validate unknown JSON from gateway without throwing exceptions.

**When to use:** Always at the boundary - gateway is untrusted, may send malformed or unexpected messages.

**Example:**
```typescript
// Source: Zod documentation
// https://zod.dev/basics

function handleIncomingMessage(raw: string): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn('Received invalid JSON from gateway');
    return;
  }

  // Zod safeParse returns discriminated union { success: true, data } | { success: false, error }
  const result = MessageSchema.safeParse(parsed);

  if (!result.success) {
    // result.error is ZodError with detailed validation issues
    logger.warn('Received invalid message structure', {
      issues: result.error.issues,
      raw: JSON.stringify(parsed)
    });
    return;
  }

  // result.data is now typed and validated
  const message = result.data;
  routeByType(message);
}
```

### Anti-Patterns to Avoid
- **Polling for responses:** Don't use setInterval to check for responses - use event-driven callbacks/promises
- **Global promise resolve:** Don't store a single resolve function - use Map keyed by correlation ID for concurrent requests
- **Type assertions for gateway JSON:** Don't use `as` to cast unknown to a type - always validate with Zod first
- **Manual timeout cleanup:** Don't manually manage setTimeout cleanup - use AbortSignal or encapsulate in a helper
- **Mixing RTN_ and NOT_ handling:** Keep command response handling (RTN_) separate from async notification handling (NOT_)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom random string generator | Node.js crypto.randomUUID() | Native since v15.7.0, RFC 4122 v4 compliant, cryptographically secure, 3x faster than uuid package |
| Promise timeouts | setTimeout wrapper class | AbortSignal.timeout() | Native since v15.7.0, automatic error differentiation (TimeoutError), composable with AbortSignal.any() |
| JSON schema validation | Manual property checking | Zod schemas | Zod provides runtime validation + TypeScript inference from single definition, handles nested objects, arrays, unions |
| Message type discrimination | if/else chains on type string | TypeScript discriminated unions | Compiler enforces exhaustive checking, automatic type narrowing, catches missing cases at compile time |
| Error parsing | String matching on error messages | Structured error types with Zod | Gateway RTN_ERR has structured Attempt/Error fields - parse them properly |

**Key insight:** WebSocket request/response correlation is a solved pattern - the complexity is in timeout edge cases (what if timeout fires just as response arrives?), cleanup (prevent memory leaks from abandoned requests), and type safety (gateway can send anything). Use proven primitives (AbortSignal, Map, Zod) rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Memory Leak from Abandoned Pending Requests
**What goes wrong:** If a command times out but the pending request entry is never deleted from the Map, memory leaks accumulate over long-running connections.

**Why it happens:** Forgot to delete from Map in timeout handler, or timeout fires but response arrives after and re-inserts.

**How to avoid:** Always delete from pendingRequests Map in BOTH timeout handler and response handler. Check if entry exists before processing response.

**Warning signs:** Memory usage grows over time, Map.size increases without bound, process eventually OOMs.

### Pitfall 2: Race Condition Between Timeout and Response
**What goes wrong:** Timeout fires and rejects promise, then response arrives and tries to resolve already-settled promise (silently fails), or vice versa.

**Why it happens:** Network latency causes response to arrive right at timeout boundary, handlers race.

**How to avoid:** Use the "delete first, then act" pattern - whoever successfully deletes from Map wins. If delete returns false, the other handler already won.

**Warning signs:** Intermittent "cannot resolve settled promise" errors, responses logged but not processed, timeout errors when response actually arrived.

### Pitfall 3: Not Handling RTN_ERR as Rejection
**What goes wrong:** RTN_ERR response resolves the promise with error data instead of rejecting it, causing calling code to think command succeeded.

**Why it happens:** All RTN_ messages look like "responses" so they're treated uniformly as success.

**How to avoid:** Check response.Type === 'RTN_ERR' and reject the promise with structured error including Attempt and Error fields.

**Warning signs:** Commands appear to succeed but have no effect, error responses logged as successful, retry logic never triggers.

### Pitfall 4: Assuming Response Order Matches Command Order
**What goes wrong:** Code expects responses in same order as commands were sent, breaks when gateway processes commands at different speeds.

**Why it happens:** WebSocket is bidirectional stream - no ordering guarantees across different logical operations.

**How to avoid:** Always use correlation IDs for matching - never rely on order. Support concurrent commands.

**Warning signs:** Responses occasionally matched to wrong commands, data corruption when multiple commands in flight, works with single command but fails with concurrent.

### Pitfall 5: Not Distinguishing RTN_ from NOT_ Messages
**What goes wrong:** Async notifications (NOT_DYN_READING, etc.) are mistaken for command responses and trigger "unknown correlation ID" warnings.

**Why it happens:** All messages have Type field, easy to treat them uniformly.

**How to avoid:** Route by message type prefix - RTN_ goes to command client response handler, NOT_ goes to notification handler, Send commands go outbound.

**Warning signs:** Frequent "received response for unknown request" logs, notifications ignored, correlation ID map fills with NOT_ messages.

### Pitfall 6: Validating with TypeScript Types Instead of Runtime Checks
**What goes wrong:** TypeScript interface says message has certain structure, but gateway sends different structure, crashes at runtime accessing undefined properties.

**Why it happens:** TypeScript types are compile-time only - erased at runtime. Unknown data from network needs runtime validation.

**How to avoid:** Always use Zod to validate unknown data at the boundary (WebSocket message handler). Trust types only after validation.

**Warning signs:** "Cannot read property X of undefined" on message fields, type errors in production but not development, crashes on unexpected gateway responses.

### Pitfall 7: Configurable Timeout Not Actually Configurable
**What goes wrong:** Timeout hardcoded to 30s in command client, can't adjust for different command types (some may need longer).

**Why it happens:** Start with fixed timeout for simplicity, forget to make it configurable.

**How to avoid:** Accept timeout parameter in sendCommand method with default value. Allow per-command-type timeout overrides.

**Warning signs:** Legitimate long-running commands always timeout, no way to extend timeout without code changes, users request timeout configuration.

## Code Examples

Verified patterns from official sources and established practices:

### Correlation ID Generation
```typescript
// Source: Node.js crypto documentation
// https://nodejs.org/api/crypto.html
import { randomUUID } from 'node:crypto';

const correlationId = randomUUID();
// Format: "550e8400-e29b-41d4-a716-446655440000"
// RFC 4122 version 4 UUID
```

### Promise with AbortSignal Timeout
```typescript
// Source: MDN Web Docs - AbortSignal
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

async function sendWithTimeout(data: string, timeoutMs: number): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);

  return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      if (signal.reason?.name === 'TimeoutError') {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      } else {
        reject(signal.reason);
      }
    });

    // Send and wait for response...
  });
}
```

### Zod Message Validation with Type Inference
```typescript
// Source: Zod documentation
// https://zod.dev/basics
// https://zod.dev/api?id=discriminated-unions
import { z } from 'zod';

// Define schema
const CommandResponseSchema = z.object({
  Type: z.enum(['RTN_DYN', 'RTN_ERR']),
  CorrelationId: z.string().uuid(),
  Data: z.unknown(), // Specific to response type
});

// Infer TypeScript type from schema
type CommandResponse = z.infer<typeof CommandResponseSchema>;

// Runtime validation
function parseMessage(raw: unknown): CommandResponse | null {
  const result = CommandResponseSchema.safeParse(raw);

  if (!result.success) {
    logger.warn('Invalid message', {
      errors: result.error.issues
    });
    return null;
  }

  return result.data; // Typed as CommandResponse
}
```

### Pending Request Management
```typescript
// Pattern from WebSocket RPC implementations and community best practices
interface PendingCommand {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
  sentAt: number;
}

class CommandClient {
  private pending = new Map<string, PendingCommand>();

  private cleanup(correlationId: string): void {
    const entry = this.pending.get(correlationId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      this.pending.delete(correlationId);
    }
  }

  handleResponse(correlationId: string, response: unknown): void {
    const entry = this.pending.get(correlationId);

    if (!entry) {
      logger.warn(`Response for unknown request: ${correlationId}`);
      return;
    }

    this.cleanup(correlationId);

    // Check if response is error
    if (isErrorResponse(response)) {
      entry.reject(new Error(response.Error));
    } else {
      entry.resolve(response);
    }
  }

  handleTimeout(correlationId: string): void {
    const entry = this.pending.get(correlationId);

    if (!entry) {
      return; // Already handled by response
    }

    this.cleanup(correlationId);
    entry.reject(new Error('Command timeout'));
  }
}
```

### Discriminated Union Type Guards
```typescript
// Source: TypeScript handbook
// https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html

type ReturnDyn = {
  Type: 'RTN_DYN';
  CorrelationId: string;
  Data: { Sensors: Sensor[] };
};

type ReturnError = {
  Type: 'RTN_ERR';
  CorrelationId: string;
  Data: { Attempt: number; Error: string };
};

type CommandResponse = ReturnDyn | ReturnError;

function handleResponse(response: CommandResponse): void {
  // TypeScript narrows type based on discriminant
  switch (response.Type) {
    case 'RTN_DYN':
      // response.Data.Sensors is accessible
      console.log(`Received ${response.Data.Sensors.length} sensors`);
      break;

    case 'RTN_ERR':
      // response.Data.Error is accessible
      throw new Error(`Command failed (attempt ${response.Data.Attempt}): ${response.Data.Error}`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| uuid package | crypto.randomUUID() | Node.js v15.7.0 (2021) | No external dependency, 3x faster, same RFC 4122 v4 compliance |
| Manual setTimeout + Promise | AbortSignal.timeout() | Node.js v15.7.0 (2021) | Automatic error differentiation, composable signals, standardized API |
| Manual JSON validation | Zod runtime validation | Zod v3.0 (2021) | Single source of truth for types and validation, compile-time + runtime safety |
| Union types with manual checks | Discriminated unions | TypeScript 2.0 (2016) | Exhaustive checking, automatic type narrowing, compile-time safety |

**Deprecated/outdated:**
- uuid npm package: Still works but unnecessary - native crypto.randomUUID() is preferred
- p-timeout package: Unnecessary with AbortSignal.timeout() built-in
- ajv/joi for JSON validation: Zod provides better TypeScript integration with z.infer<>

## Open Questions

Things that couldn't be fully resolved:

1. **CTC Gateway Correlation ID Field Name**
   - What we know: Correlation IDs are standard for request/response pattern over WebSocket
   - What's unclear: The exact field name the CTC gateway expects/returns (CorrelationId, RequestId, MessageId?)
   - Recommendation: Check CTC API documentation or example messages to confirm field name, assume "CorrelationId" for now

2. **Gateway Response Ordering Guarantees**
   - What we know: WebSocket provides ordered delivery within a single connection
   - What's unclear: Does the CTC gateway guarantee response order matches command order, or can it respond out-of-order?
   - Recommendation: Assume responses can arrive out-of-order (safer design), use correlation ID matching always

3. **RTN_ERR Retry Strategy**
   - What we know: RTN_ERR contains Attempt field suggesting gateway may retry internally
   - What's unclear: Does gateway auto-retry, or is Attempt field for client retry logic? What errors are retryable?
   - Recommendation: Log Attempt field, implement client-side retry for Phase 4 based on Error field content

4. **NOT_ Message Timing Relative to Commands**
   - What we know: NOT_DYN_READING_STARTED is an async notification, not tied to specific command
   - What's unclear: Can NOT_ messages arrive before corresponding RTN_ response? Do they need sequencing?
   - Recommendation: Treat NOT_ as fully async, independent from command responses, log timestamps for correlation

## Sources

### Primary (HIGH confidence)
- Node.js Crypto API Documentation: https://nodejs.org/api/crypto.html - crypto.randomUUID() specification
- MDN Web Docs - AbortSignal: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal - timeout and signal combining patterns
- Zod Official Documentation: https://zod.dev/basics - safeParse, type inference, discriminated unions
- TypeScript Handbook - Unions and Intersection Types: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html - discriminated union patterns

### Secondary (MEDIUM confidence)
- Medium - Request-Response model in web-sockets: https://medium.com/@anshulkahar2211/request-response-model-in-web-sockets-3314586aac44 - correlation ID pattern examples
- DEV Community - Canceling HTTP Requests with AbortController: https://dev.to/xenral/canceling-http-requests-in-react-typescript-why-it-matters-how-to-do-it-3hah - timeout patterns
- Refine Dev - 4 Ways to Generate UUIDs in Node.js: https://refine.dev/blog/node-js-uuid/ - comparison of UUID methods, crypto.randomUUID() performance
- TypeScript Deep Dive - Discriminated Unions: https://basarat.gitbook.io/typescript/type-system/discriminated-unions - pattern explanation

### Tertiary (LOW confidence)
- Multiple search results on WebSocket message routing patterns - general patterns but not CTC-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All recommendations are from official documentation (Node.js, MDN, Zod, TypeScript)
- Architecture: HIGH - Patterns verified across multiple authoritative sources (Node.js docs, TypeScript handbook, established WebSocket RPC patterns)
- Pitfalls: MEDIUM-HIGH - Based on common WebSocket/async patterns and general software engineering (race conditions, memory leaks)

**Research date:** 2026-02-07
**Valid until:** 2026-04-07 (60 days) - Stack is stable (Node.js crypto and AbortSignal since 2021, Zod mature), no fast-moving dependencies
