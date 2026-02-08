import { db } from '../database/kysely';
import { Gateway, NewGateway, GatewayUpdate } from './types';
import { encryptPassword, decryptPassword, getEncryptionKey, EncryptedData } from '../utils/encryption';
import { Json } from '../database/types';

/**
 * Input type for gateway creation with plaintext password
 */
export interface GatewayCreateInput {
  factory_id: string;
  gateway_id: string;
  name: string;
  url: string;
  email: string;
  password: string; // Plaintext - will be encrypted
  model?: string;
  firmware_version?: string;
  metadata?: Json;
}

/**
 * GatewayRepository - Type-safe data access for gateways
 *
 * Provides CRUD operations with soft delete filtering and automatic password encryption.
 * All queries automatically exclude soft-deleted records (deleted_at IS NULL).
 * Gateway passwords are encrypted with AES-256-GCM before storage.
 */
class GatewayRepository {
  private encryptionKey: Buffer;

  constructor() {
    // Initialize encryption key at startup
    // Fails fast if ENCRYPTION_KEY not configured
    this.encryptionKey = getEncryptionKey();
  }

  /**
   * Find gateway by ID (excludes soft-deleted)
   */
  async findById(id: string): Promise<Gateway | undefined> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  /**
   * Find all gateways (excludes soft-deleted)
   */
  async findAll(): Promise<Gateway[]> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  /**
   * Find active gateways for a factory (excludes soft-deleted)
   */
  async findActive(factoryId: string): Promise<Gateway[]> {
    return await db
      .selectFrom('gateways')
      .selectAll()
      .where('factory_id', '=', factoryId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  /**
   * Create new gateway with encrypted password
   */
  async create(input: GatewayCreateInput): Promise<Gateway> {
    // Encrypt password before storage
    const encrypted = encryptPassword(input.password, this.encryptionKey);
    const passwordEncrypted = JSON.stringify(encrypted);

    const newGateway: NewGateway = {
      factory_id: input.factory_id,
      gateway_id: input.gateway_id,
      name: input.name,
      url: input.url,
      email: input.email,
      password_encrypted: passwordEncrypted,
      model: input.model,
      firmware_version: input.firmware_version,
      metadata: input.metadata,
    };

    return await db
      .insertInto('gateways')
      .values(newGateway)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Update gateway (only if not soft-deleted)
   */
  async update(id: string, updates: GatewayUpdate): Promise<Gateway | undefined> {
    return await db
      .updateTable('gateways')
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Update gateway password (only if not soft-deleted)
   */
  async updatePassword(id: string, newPassword: string): Promise<Gateway | undefined> {
    // Encrypt new password
    const encrypted = encryptPassword(newPassword, this.encryptionKey);
    const passwordEncrypted = JSON.stringify(encrypted);

    return await db
      .updateTable('gateways')
      .set({
        password_encrypted: passwordEncrypted,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Soft delete gateway (only if not already deleted)
   */
  async softDelete(id: string): Promise<Gateway | undefined> {
    return await db
      .updateTable('gateways')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null) // Prevent double-delete
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Decrypt gateway password for connection
   */
  getDecryptedPassword(gateway: Gateway): string {
    const encrypted: EncryptedData = JSON.parse(gateway.password_encrypted);
    return decryptPassword(encrypted, this.encryptionKey);
  }
}

// Export singleton instance
export const gatewayRepository = new GatewayRepository();
