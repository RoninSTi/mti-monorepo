import { z } from 'zod';

// API configuration schema with Zod validation
const apiConfigSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Export the ApiConfig type
export type ApiConfig = z.infer<typeof apiConfigSchema>;

// Parse and validate API environment variables
export const apiConfig = apiConfigSchema.parse(process.env);
