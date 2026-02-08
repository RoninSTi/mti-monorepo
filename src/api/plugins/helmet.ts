import fastifyPlugin from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

/**
 * Helmet security headers plugin
 *
 * Disables CSP for API-only server (no HTML responses)
 */
export default fastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false,  // API-only server, CSP not needed
  });
});
