import { z } from 'zod';
import { Selectable, Insertable, Updateable } from 'kysely';
import { Factories, Gateways, Organizations } from '../database/types';

// Kysely type aliases for factory operations
export type Factory = Selectable<Factories>;
export type NewFactory = Insertable<Factories>;
export type FactoryUpdate = Updateable<Factories>;

// Kysely type aliases for gateway operations
export type Gateway = Selectable<Gateways>;
export type NewGateway = Insertable<Gateways>;
export type GatewayUpdate = Updateable<Gateways>;

// Kysely type aliases for organization operations
export type Organization = Selectable<Organizations>;
export type NewOrganization = Insertable<Organizations>;
export type OrganizationUpdate = Updateable<Organizations>;

// Zod schema for runtime validation of Factory query results
export const FactorySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string(),
  location: z.string().nullable(),
  timezone: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
});

// Zod schema for runtime validation of Gateway query results
export const GatewaySchema = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  gateway_id: z.string(),
  name: z.string(),
  url: z.string(),
  email: z.string(),
  password_encrypted: z.string(),
  model: z.string().nullable(),
  firmware_version: z.string().nullable(),
  last_seen_at: z.date().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
});

// Zod schema for runtime validation of Organization query results
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
});
