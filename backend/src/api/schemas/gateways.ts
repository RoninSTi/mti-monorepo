import { z } from 'zod';
import { paginationQuerySchema, paginationResponseSchema } from './common';

/**
 * Zod schemas for gateway API validation
 *
 * - createGatewaySchema: Validates POST /api/gateways request body (includes plaintext password)
 * - updateGatewaySchema: Validates PATCH /api/gateways/:id request body (all fields optional)
 * - gatewayResponseSchema: Validates individual gateway response (EXCLUDES password fields for GATEWAY-07 security)
 * - gatewayListQuerySchema: Extends pagination with optional factory_id filter
 * - gatewayListResponseSchema: Validates paginated list response with metadata
 */

// Create gateway request body (password will be encrypted by repository)
export const createGatewaySchema = z.object({
  factory_id: z.string().uuid(),
  gateway_id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  email: z.string().email().max(255),
  password: z.string().min(1), // Plaintext - repository encrypts before storage
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// Update gateway request body (all fields optional, factory_id not updatable)
export const updateGatewaySchema = z.object({
  gateway_id: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(1).optional(), // If provided, triggers password re-encryption
  model: z.string().max(100).optional(),
  firmware_version: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Gateway response schema (excludes password fields for security)
 *
 * GATEWAY-07 requirement: Never expose password or password_encrypted in API responses.
 * Clients cannot retrieve stored passwords - this is by design for security.
 * Gateway credentials are only used internally for WebSocket authentication.
 */
export const gatewayResponseSchema = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  gateway_id: z.string(),
  name: z.string(),
  url: z.string(),
  email: z.string(),
  // NO password field - GATEWAY-07 security requirement
  // NO password_encrypted field - GATEWAY-07 security requirement
  model: z.string().nullable(),
  firmware_version: z.string().nullable(),
  last_seen_at: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // NO deleted_at - internal implementation detail (same as factory pattern)
});

// Gateway list query parameters (pagination + optional factory filter)
export const gatewayListQuerySchema = paginationQuerySchema.extend({
  factory_id: z.string().uuid().optional(),
});

// Paginated gateway list response
export const gatewayListResponseSchema = z.object({
  data: z.array(gatewayResponseSchema),
  pagination: paginationResponseSchema,
});
