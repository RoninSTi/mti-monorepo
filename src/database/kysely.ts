import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB } from './types';
import { databaseConfig } from './config';

// Create PostgreSQL connection pool
const pool = new Pool({
  host: databaseConfig.DATABASE_HOST,
  port: databaseConfig.DATABASE_PORT,
  database: databaseConfig.DATABASE_NAME,
  user: databaseConfig.DATABASE_USER,
  password: databaseConfig.DATABASE_PASSWORD,
  max: 10,
});

// Create Kysely instance with type-safe database schema
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});

// Graceful shutdown helper
export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
