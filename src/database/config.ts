import { z } from 'zod';

// Database configuration schema with Zod validation
const databaseConfigSchema = z.object({
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string().default('mti_wifi'),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string().default('postgres'),
});

// Export the DatabaseConfig type
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Parse and validate database environment variables
export const databaseConfig = databaseConfigSchema.parse(process.env);

// Construct and export DATABASE_URL for use with node-pg-migrate and other tools
export const DATABASE_URL = `postgres://${databaseConfig.DATABASE_USER}:${databaseConfig.DATABASE_PASSWORD}@${databaseConfig.DATABASE_HOST}:${databaseConfig.DATABASE_PORT}/${databaseConfig.DATABASE_NAME}`;
