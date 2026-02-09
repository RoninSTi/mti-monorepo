import { z } from 'zod';

// Configuration schema with Zod validation
const configSchema = z.object({
  GATEWAY_URL: z.string().refine(
    (val) => val.startsWith('ws://') || val.startsWith('wss://'),
    { message: 'GATEWAY_URL must start with ws:// or wss://' }
  ),
  GATEWAY_EMAIL: z.string().email(),
  GATEWAY_PASSWORD: z.string().min(1),
  SENSOR_SERIAL: z.coerce.number().optional(),
  CONNECTION_TIMEOUT: z.coerce.number().min(1000).default(10000),
  COMMAND_TIMEOUT: z.coerce.number().min(1000).default(30000),
  ACQUISITION_TIMEOUT: z.coerce.number().min(1000).default(60000),
  HEARTBEAT_INTERVAL: z.coerce.number().min(1000).default(30000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Export the Config type
export type Config = z.infer<typeof configSchema>;

// Parse and validate environment variables at module load (fail-fast)
export const config = configSchema.parse(process.env);
