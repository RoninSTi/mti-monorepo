import { z } from 'zod';

/**
 * Common pagination schemas for API requests/responses
 *
 * Reusable across factory and gateway endpoints.
 * Query params arrive as strings and are coerced to numbers.
 */

// Pagination query parameters
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Pagination response metadata
export const paginationResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
