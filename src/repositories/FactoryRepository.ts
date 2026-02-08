import { db } from '../database/kysely';
import { Factory, NewFactory, FactoryUpdate } from './types';

/**
 * FactoryRepository - Type-safe data access for factories
 *
 * Provides CRUD operations with soft delete filtering.
 * All queries automatically exclude soft-deleted records (deleted_at IS NULL).
 */
class FactoryRepository {
  /**
   * Find factory by ID (excludes soft-deleted)
   */
  async findById(id: string): Promise<Factory | undefined> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  /**
   * Find all factories (excludes soft-deleted)
   */
  async findAll(): Promise<Factory[]> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  /**
   * Find factories by organization (excludes soft-deleted)
   */
  async findByOrganization(organizationId: string): Promise<Factory[]> {
    return await db
      .selectFrom('factories')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  /**
   * Create new factory
   */
  async create(factory: NewFactory): Promise<Factory> {
    return await db
      .insertInto('factories')
      .values(factory)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Update factory (only if not soft-deleted)
   */
  async update(id: string, updates: FactoryUpdate): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
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
   * Soft delete factory (only if not already deleted)
   */
  async softDelete(id: string): Promise<Factory | undefined> {
    return await db
      .updateTable('factories')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null) // Prevent double-delete
      .returningAll()
      .executeTakeFirst();
  }
}

// Export singleton instance
export const factoryRepository = new FactoryRepository();
