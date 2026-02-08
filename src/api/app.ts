import Fastify, { FastifyServerOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { apiConfig } from './config';
import corsPlugin from './plugins/cors';
import helmetPlugin from './plugins/helmet';
import errorHandlerPlugin from './plugins/error-handler';

/**
 * Build and configure Fastify application
 *
 * @param options - Optional Fastify server options to override defaults
 * @returns Configured Fastify instance with Zod type provider and all plugins
 */
export async function buildApp(options: FastifyServerOptions = {}) {
  // Configure logger based on environment
  let logger: FastifyServerOptions['logger'];

  if (apiConfig.NODE_ENV === 'test') {
    logger = false;  // Disable logging in tests
  } else if (apiConfig.NODE_ENV === 'production') {
    logger = {
      level: apiConfig.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.body.password'],
    };
  } else {
    // Development: use pino-pretty for human-readable logs
    logger = {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    };
  }

  // Create Fastify instance with Zod type provider
  const app = Fastify({
    ...options,
    logger,
  }).withTypeProvider<ZodTypeProvider>();

  // CRITICAL: Set validator and serializer compilers BEFORE any route registration
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register plugins in order: CORS, security headers, error handling
  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(errorHandlerPlugin);

  // Register routes with /api prefix
  await app.register(import('./routes/health'), { prefix: '/api' });

  return app;
}
