import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create factories table
  pgm.createTable('factories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations(id)',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    location: {
      type: 'varchar(500)',
      notNull: false,
    },
    timezone: {
      type: 'varchar(100)',
      notNull: true,
      default: pgm.func("'UTC'"),
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    deleted_at: {
      type: 'timestamptz',
      notNull: false,
    },
  });

  // Index on organization_id (foreign key - required for CASCADE performance)
  pgm.createIndex('factories', 'organization_id', {
    name: 'factories_organization_id_idx',
  });

  // Partial index on deleted_at for active record queries
  pgm.createIndex('factories', 'deleted_at', {
    name: 'factories_deleted_at_idx',
    where: 'deleted_at IS NULL',
  });

  // Index on name (query-heavy column)
  pgm.createIndex('factories', 'name', {
    name: 'factories_name_idx',
  });

  // Apply updated_at trigger to factories table
  pgm.createTrigger('factories', 'update_factories_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_updated_at_column',
  });
}
