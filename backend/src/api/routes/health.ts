import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

// Health check response schema
const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
});

/**
 * Health check endpoint
 *
 * Returns server status, timestamp, uptime, and version.
 * Used for monitoring and verifying the API server is running.
 */
const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => {
      return {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
      };
    }
  );
};

export default healthRoutes;
