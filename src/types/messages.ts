import { z } from 'zod';

// ============================================================================
// TYPE-01: Send Commands (outbound messages from UI to SERV)
// ============================================================================

// POST_LOGIN: Authenticate with email/password
export const PostLoginCommandSchema = z.object({
  Type: z.literal('POST_LOGIN'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  CorrelationId: z.string().uuid().optional(),
  Data: z.object({
    Email: z.string().email(),
    Password: z.string(),
  }),
});

// POST_SUB_CHANGES: Subscribe to change notifications
export const PostSubChangesCommandSchema = z.object({
  Type: z.literal('POST_SUB_CHANGES'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  CorrelationId: z.string().uuid().optional(),
  Data: z.object({}),
});

// POST_UNSUB_CHANGES: Unsubscribe from change notifications
export const PostUnsubChangesCommandSchema = z.object({
  Type: z.literal('POST_UNSUB_CHANGES'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  CorrelationId: z.string().uuid().optional(),
  Data: z.object({}),
});

// GET_DYN_CONNECTED: Request list of connected sensors
export const GetDynConnectedCommandSchema = z.object({
  Type: z.literal('GET_DYN_CONNECTED'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  CorrelationId: z.string().uuid().optional(),
  Data: z.object({}),
});

// TAKE_DYN_READING: Trigger vibration reading for a sensor
export const TakeDynReadingCommandSchema = z.object({
  Type: z.literal('TAKE_DYN_READING'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  CorrelationId: z.string().uuid().optional(),
  Data: z.object({
    Serial: z.number(),
  }),
});

// Discriminated union of all send commands
export const SendCommandSchema = z.union([
  PostLoginCommandSchema,
  PostSubChangesCommandSchema,
  PostUnsubChangesCommandSchema,
  GetDynConnectedCommandSchema,
  TakeDynReadingCommandSchema,
]);

// ============================================================================
// TYPE-02: Return Responses (inbound responses from SERV to UI)
// ============================================================================

// RTN_DYN: Successful response with data (structure varies by command)
export const ReturnDynResponseSchema = z.object({
  Type: z.literal('RTN_DYN'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  CorrelationId: z.string().uuid(),
  Data: z.record(z.string(), z.unknown()), // Permissive: structure varies by command
});

// RTN_ERR: Error response
export const ReturnErrorResponseSchema = z.object({
  Type: z.literal('RTN_ERR'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  CorrelationId: z.string().uuid(),
  Data: z.object({
    Attempt: z.string(), // String describing what was attempted (e.g., "POST_LOGIN")
    Error: z.string(), // Error description
  }),
});

// Discriminated union of all response messages
export const ResponseMessageSchema = z.union([
  ReturnDynResponseSchema,
  ReturnErrorResponseSchema,
]);

// ============================================================================
// TYPE-03: Notification Messages (inbound async push from SERV to UI)
// ============================================================================

// NOT_DYN_READING_STARTED: Notification that reading has started
export const NotDynReadingStartedSchema = z.object({
  Type: z.literal('NOT_DYN_READING_STARTED'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Serial: z.number(),
    Success: z.boolean(),
  }),
});

// NOT_DYN_READING: Vibration waveform data notification
export const NotDynReadingSchema = z.object({
  Type: z.literal('NOT_DYN_READING'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    ID: z.number(),
    Serial: z.string(), // Note: string in notifications, number in commands
    Time: z.string(),
    X: z.string(), // Waveform data (encoding TBD, decoded in Phase 5)
    Y: z.string(),
    Z: z.string(),
  }),
});

// NOT_DYN_TEMP: Temperature reading notification
export const NotDynTempSchema = z.object({
  Type: z.literal('NOT_DYN_TEMP'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Serial: z.string(),
    Temp: z.number(),
  }),
});

// Discriminated union of all notification messages
export const NotificationMessageSchema = z.union([
  NotDynReadingStartedSchema,
  NotDynReadingSchema,
  NotDynTempSchema,
]);

// ============================================================================
// TYPE-04: Sensor Metadata
// ============================================================================

// Sensor metadata from GET_DYN_CONNECTED response
export const SensorMetadataSchema = z.object({
  Serial: z.number(),
  PartNum: z.string(),
  ReadRate: z.number(),
  Samples: z.number(),
  Name: z.string().optional(),
}).passthrough(); // Allow additional unknown fields from gateway

// ============================================================================
// Top-level Gateway Message Union (for routing incoming messages)
// ============================================================================

// Union of all inbound message types (responses + notifications)
// Note: Does NOT include SendCommand (those are outbound only)
export const GatewayMessageSchema = z.union([
  ReturnDynResponseSchema,
  ReturnErrorResponseSchema,
  NotDynReadingStartedSchema,
  NotDynReadingSchema,
  NotDynTempSchema,
]);

// ============================================================================
// TypeScript Type Exports (inferred from Zod schemas)
// ============================================================================

// Send command types
export type PostLoginCommand = z.infer<typeof PostLoginCommandSchema>;
export type PostSubChangesCommand = z.infer<typeof PostSubChangesCommandSchema>;
export type PostUnsubChangesCommand = z.infer<typeof PostUnsubChangesCommandSchema>;
export type GetDynConnectedCommand = z.infer<typeof GetDynConnectedCommandSchema>;
export type TakeDynReadingCommand = z.infer<typeof TakeDynReadingCommandSchema>;
export type SendCommand = z.infer<typeof SendCommandSchema>;

// Response types
export type ReturnDynResponse = z.infer<typeof ReturnDynResponseSchema>;
export type ReturnErrorResponse = z.infer<typeof ReturnErrorResponseSchema>;
export type ResponseMessage = z.infer<typeof ResponseMessageSchema>;

// Notification types
export type NotDynReadingStarted = z.infer<typeof NotDynReadingStartedSchema>;
export type NotDynReading = z.infer<typeof NotDynReadingSchema>;
export type NotDynTemp = z.infer<typeof NotDynTempSchema>;
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>;

// Sensor metadata type
export type SensorMetadata = z.infer<typeof SensorMetadataSchema>;

// Gateway message type (all inbound)
export type GatewayMessage = z.infer<typeof GatewayMessageSchema>;

// ============================================================================
// Command Type Utilities
// ============================================================================

// Union of all command type literals
export type CommandType = SendCommand['Type'];

// Mapping from command types to their expected response types
// This helps the command client know which response type to expect
export const commandTypeToResponseType: Record<CommandType, 'RTN_DYN' | 'RTN_ERR'> = {
  POST_LOGIN: 'RTN_DYN',
  POST_SUB_CHANGES: 'RTN_DYN',
  POST_UNSUB_CHANGES: 'RTN_DYN',
  GET_DYN_CONNECTED: 'RTN_DYN',
  TAKE_DYN_READING: 'RTN_DYN',
};
