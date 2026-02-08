import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Standardized error handler plugin
 *
 * Error response format:
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human-readable message",
 *     "statusCode": 400,
 *     "details": [...] // Optional, for validation errors
 *   }
 * }
 */
export default fastifyPlugin(async (fastify: FastifyInstance) => {
  // Global error handler
  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    // Log error with request context
    request.log.error({
      err: error,
      statusCode,
      url: request.url,
      method: request.method,
    });

    // Handle Zod validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: error.validation,
        },
      });
    }

    // For 500 errors, use generic message (don't leak internals)
    const message = statusCode === 500 ? 'Internal server error' : error.message;

    return reply.status(statusCode).send({
      error: {
        code,
        message,
        statusCode,
      },
    });
  });

  // 404 Not Found handler
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
    });
  });
});
