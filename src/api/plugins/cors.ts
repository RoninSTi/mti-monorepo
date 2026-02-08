import fastifyPlugin from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { apiConfig } from '../config';

/**
 * CORS plugin for cross-origin requests
 *
 * Development/test: Reflects request origin (origin: true)
 * Production: Parses CORS_ORIGIN as comma-separated list of allowed origins
 */
export default fastifyPlugin(async (fastify: FastifyInstance) => {
  const isDevelopment = apiConfig.NODE_ENV === 'development' || apiConfig.NODE_ENV === 'test';

  await fastify.register(cors, {
    origin: isDevelopment
      ? true  // Reflect request origin in dev/test
      : apiConfig.CORS_ORIGIN.split(',').map(o => o.trim()),  // Parse comma-separated list in production
    credentials: true,
  });
});
