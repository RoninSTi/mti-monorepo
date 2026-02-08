/**
 * Frontend TypeScript types matching backend API schemas.
 *
 * These are manually maintained to match the Zod schemas in:
 * - src/api/schemas/factories.ts
 * - src/api/schemas/gateways.ts
 * - src/api/schemas/common.ts
 *
 * If backend schemas change, update these types to match.
 */

// Pagination (matches paginationResponseSchema)
export interface Pagination {
  total: number
  limit: number
  offset: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

// Factory (matches factoryResponseSchema)
export interface Factory {
  id: string
  organization_id: string
  name: string
  location: string | null
  timezone: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Factory create input (matches createFactorySchema)
export interface CreateFactoryInput {
  organization_id: string
  name: string
  location?: string | null
  timezone?: string
  metadata?: Record<string, unknown>
}

// Factory update input (matches updateFactorySchema)
export interface UpdateFactoryInput {
  name?: string
  location?: string | null
  timezone?: string
  metadata?: Record<string, unknown>
}

// Gateway (matches gatewayResponseSchema - NO password fields per GATEWAY-07)
export interface Gateway {
  id: string
  factory_id: string
  gateway_id: string
  name: string
  url: string
  email: string
  model: string | null
  firmware_version: string | null
  last_seen_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Gateway create input (matches createGatewaySchema)
export interface CreateGatewayInput {
  factory_id: string
  gateway_id: string
  name: string
  url: string
  email: string
  password: string
  model?: string
  firmware_version?: string
  metadata?: Record<string, unknown>
}

// Gateway update input (matches updateGatewaySchema)
export interface UpdateGatewayInput {
  gateway_id?: string
  name?: string
  url?: string
  email?: string
  password?: string
  model?: string
  firmware_version?: string
  metadata?: Record<string, unknown>
}

// API error response
export interface ApiError {
  statusCode: number
  error: string
  message: string
}
