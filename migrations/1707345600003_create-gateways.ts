import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create gateways table
  pgm.createTable('gateways', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    factory_id: {
      type: 'uuid',
      notNull: true,
      references: 'factories(id)',
      onDelete: 'CASCADE',
    },
    gateway_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    url: {
      type: 'varchar(500)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
    },
    password_encrypted: {
      type: 'text',
      notNull: true,
    },
    model: {
      type: 'varchar(100)',
      notNull: false,
    },
    firmware_version: {
      type: 'varchar(50)',
      notNull: false,
    },
    last_seen_at: {
      type: 'timestamptz',
      notNull: false,
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

  // Index on factory_id (foreign key - CASCADE performance)
  pgm.createIndex('gateways', 'factory_id', {
    name: 'gateways_factory_id_idx',
  });

  // Unique partial index on gateway_id (prevent duplicate active gateways)
  pgm.createIndex('gateways', 'gateway_id', {
    name: 'gateways_gateway_id_unique_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // Partial index on deleted_at for active record queries
  pgm.createIndex('gateways', 'deleted_at', {
    name: 'gateways_deleted_at_idx',
    where: 'deleted_at IS NULL',
  });

  // Index on last_seen_at (monitoring/health check queries)
  pgm.createIndex('gateways', 'last_seen_at', {
    name: 'gateways_last_seen_at_idx',
  });

  // Apply updated_at trigger to gateways table
  pgm.createTrigger('gateways', 'update_gateways_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_updated_at_column',
  });
}
