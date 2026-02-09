import { z } from 'zod';
import { paginationResponseSchema } from './common';

/**
 * Zod schemas for factory API validation
 *
 * - createFactorySchema: Validates POST /api/factories request body
 * - updateFactorySchema: Validates PATCH /api/factories/:id request body
 * - factoryResponseSchema: Validates individual factory response (excludes deleted_at)
 * - factoryListResponseSchema: Validates paginated list response with metadata
 */

// Create factory request body
export const createFactorySchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  location: z.string().max(500).nullable().optional(),
  timezone: z.string().default('UTC'),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// Update factory request body (all fields optional, organization_id not updatable)
export const updateFactorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  location: z.string().max(500).nullable().optional(),
  timezone: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Factory response (excludes deleted_at, dates as ISO strings)
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

// Paginated factory list response
export const factoryListResponseSchema = z.object({
  data: z.array(factoryResponseSchema),
  pagination: paginationResponseSchema,
});
