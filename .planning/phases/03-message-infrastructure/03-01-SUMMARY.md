---
phase: 03-message-infrastructure
plan: 01
subsystem: types
tags: [zod, typescript, validation, message-types]

requires:
  - 01-01-foundation-config # Uses Zod validation pattern
  - 02-02-connection-composition # Message types will integrate with WebSocketConnection

provides:
  - Complete type definitions for all CTC gateway message types
  - Runtime validation schemas using Zod
  - TypeScript type inference from schemas (single source of truth)
  - Command-to-response type mapping for command client

affects:
  - 03-02-command-client # Will use SendCommand types and schemas
  - 03-03-message-router # Will use GatewayMessage union for routing
  - 04-auth-flow # Will use POST_LOGIN command type
  - 05-data-acquisition # Will use TAKE_DYN_READING and notification types

tech-stack:
  added: []
  patterns:
    - Zod schema-first type definitions
    - z.infer<> for single source of truth
    - Discriminated unions for message routing

key-files:
  created:
    - src/types/messages.ts # All gateway message schemas and types
  modified:
    - src/types/index.ts # Re-exports message types

decisions:
  - slug: zod-union-over-discriminated-union
    title: Use z.union() instead of z.discriminatedUnion()
    context: Zod 4.x API compatibility
    choice: z.union([schema1, schema2])
    alternatives:
      - z.discriminatedUnion('Type', [schema1, schema2]) # Zod 3.x API
    reasoning: Zod 4.x changed the discriminatedUnion API signature, z.union() works correctly
    impact: All message unions use z.union(), still allows type narrowing with discriminator

  - slug: permissive-rtn-dyn-data
    title: Use z.record(z.string(), z.unknown()) for RTN_DYN Data field
    context: RTN_DYN response structure varies by command
    choice: z.record(z.string(), z.unknown())
    alternatives:
      - Define separate schemas for each command's RTN_DYN response
      - Use z.any() for complete permissiveness
    reasoning: RTN_DYN returns different data structures (login returns tokens, GET_DYN_CONNECTED returns sensor array). z.record() allows any string-keyed object while maintaining some type safety.
    impact: Command client will need to narrow RTN_DYN.Data type based on command sent

  - slug: sensor-metadata-passthrough
    title: Use z.passthrough() on SensorMetadata schema
    context: Gateway may return additional undocumented sensor fields
    choice: SensorMetadataSchema.passthrough()
    alternatives:
      - Strict schema (no additional fields)
      - z.record() for complete flexibility
    reasoning: Allow gateway to add fields without breaking validation, but still validate known fields
    impact: Future-proof against gateway API additions

metrics:
  duration: 2 minutes
  completed: 2026-02-07

status: complete
---

# Phase 3 Plan 01: Message Type Definitions Summary

**One-liner:** Zod schemas and TypeScript types for all CTC gateway messages (5 commands, 2 responses, 3 notifications)

## What Was Built

Created comprehensive type definitions for the entire CTC gateway message protocol. All message types are defined as Zod schemas with TypeScript types inferred using `z.infer<>`, establishing a single source of truth that provides both compile-time type safety and runtime JSON validation.

**Message categories:**
- **TYPE-01 Send Commands (5):** POST_LOGIN, POST_SUB_CHANGES, POST_UNSUB_CHANGES, GET_DYN_CONNECTED, TAKE_DYN_READING
- **TYPE-02 Return Responses (2):** RTN_DYN (success), RTN_ERR (error)
- **TYPE-03 Notifications (3):** NOT_DYN_READING_STARTED, NOT_DYN_READING, NOT_DYN_TEMP
- **TYPE-04 Sensor Metadata:** SensorMetadata with passthrough for unknown fields

**Key design decisions:**
- Used `z.literal()` for Type field to enable discriminated union type narrowing
- Made RTN_DYN Data field permissive (`z.record()`) since structure varies by command
- Added optional CorrelationId to all commands (will be injected by command client)
- Used `z.union()` API (Zod 4.x compatible) instead of `z.discriminatedUnion()`
- Exported both Zod schemas AND inferred TypeScript types for maximum flexibility

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create Zod message schemas for all gateway message types | 2d45eb8 | src/types/messages.ts |
| 2 | Update types/index.ts to re-export message types | 91974b8 | src/types/index.ts |

## Decisions Made

### Use z.union() instead of z.discriminatedUnion()
**Context:** Zod 4.x API compatibility
**Decision:** Use `z.union([schema1, schema2])` syntax
**Alternatives:** `z.discriminatedUnion('Type', [schema1, schema2])` (Zod 3.x API)
**Reasoning:** Zod 4.x changed the discriminatedUnion API signature. z.union() works correctly and still allows type narrowing with the Type discriminator field.
**Impact:** All message unions use z.union(), TypeScript can still narrow types based on Type field.

### Permissive RTN_DYN Data field
**Context:** RTN_DYN response structure varies by command (login returns tokens, GET_DYN_CONNECTED returns sensor array)
**Decision:** Use `z.record(z.string(), z.unknown())` for Data field
**Alternatives:** Define separate schemas for each command's response, or use z.any()
**Reasoning:** z.record() allows any string-keyed object while maintaining some type safety. Separate schemas would require complex union logic in command client.
**Impact:** Command client will need to narrow RTN_DYN.Data type based on command sent. Phase 03-02 will handle this.

### SensorMetadata passthrough
**Context:** Gateway may return additional undocumented sensor fields
**Decision:** Use `.passthrough()` on SensorMetadata schema
**Alternatives:** Strict schema (no additional fields), or z.record() for complete flexibility
**Reasoning:** Allow gateway to add fields without breaking validation, but still validate all documented fields.
**Impact:** Future-proof against gateway API additions. Unknown fields will pass through to application code.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for Phase 3 Plan 02 (Command Client):**
- ✅ All send command types defined
- ✅ Response types defined with union
- ✅ commandTypeToResponseType mapping ready
- ✅ CorrelationId field on all commands

**Ready for Phase 3 Plan 03 (Message Router):**
- ✅ GatewayMessage union defined
- ✅ Notification types defined
- ✅ Type discriminator enables routing logic

**Blockers:** None

**Concerns:** None - RTN_DYN Data permissiveness is expected and will be handled in command client.

## Performance

**Execution time:** 2 minutes
**Velocity:** On track (consistent with Phase 1-2 velocity)

## Self-Check: PASSED
