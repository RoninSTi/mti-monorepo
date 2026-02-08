import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createFactorySchema,
  updateFactorySchema,
  factoryResponseSchema,
  factoryListResponseSchema,
} from '../schemas/factories';
import { paginationQuerySchema } from '../schemas/common';
import { factoryRepository } from '../../repositories/FactoryRepository';
import { Factory } from '../../repositories/types';

/**
 * Convert repository Factory type to API response format
 *
 * Serializes Date objects to ISO strings and excludes deleted_at
 */
function toFactoryResponse(factory: Factory) {
  return {
    id: factory.id,
    organization_id: factory.organization_id,
    name: factory.name,
    location: factory.location,
    timezone: factory.timezone,
    metadata: (factory.metadata || {}) as Record<string, unknown>,
    created_at: factory.created_at.toISOString(),
    updated_at: factory.updated_at.toISOString(),
  };
}

/**
 * Factory CRUD routes
 *
 * Provides all five REST operations for factory management:
 * - POST / - Create factory (FACTORY-01)
 * - GET / - List factories with pagination (FACTORY-02)
 * - GET /:id - Get factory by ID (FACTORY-03)
 * - PUT /:id - Update factory (FACTORY-04)
 * - DELETE /:id - Soft delete factory (FACTORY-05)
 *
 * Validation errors return 400 VALIDATION_ERROR (FACTORY-07)
 * Missing resources return 404 FACTORY_NOT_FOUND
 * Soft-deleted factories are excluded from all queries (FACTORY-06)
 */
const factoryRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST / - Create factory
  app.post(
    '/',
    {
      schema: {
        body: createFactorySchema,
        response: {
          201: factoryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const factory = await factoryRepository.create(request.body as any);
      return reply.status(201).send(toFactoryResponse(factory));
    }
  );

  // GET / - List factories with pagination
  app.get(
    '/',
    {
      schema: {
        querystring: paginationQuerySchema,
        response: {
          200: factoryListResponseSchema,
        },
      },
    },
    async (request) => {
      const { limit, offset } = request.query;

      // Fetch paginated data and total count in parallel
      const [factories, total] = await Promise.all([
        factoryRepository.findAll({ limit, offset }),
        factoryRepository.count(),
      ]);

      return {
        data: factories.map(toFactoryResponse),
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0,
        },
      };
    }
  );

  // GET /:id - Get factory by ID
  app.get(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: factoryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const factory = await factoryRepository.findById(request.params.id);

      if (!factory) {
        return (reply as any).code(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      return toFactoryResponse(factory);
    }
  );

  // PUT /:id - Update factory
  app.put(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateFactorySchema,
        response: {
          200: factoryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await factoryRepository.update(
        request.params.id,
        request.body as any
      );

      if (!updated) {
        return (reply as any).code(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      return toFactoryResponse(updated);
    }
  );

  // DELETE /:id - Soft delete factory
  app.delete(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const deleted = await factoryRepository.softDelete(request.params.id);

      if (!deleted) {
        return reply.code(404).send({
          error: {
            code: 'FACTORY_NOT_FOUND',
            message: 'Factory not found',
            statusCode: 404,
          },
        });
      }

      return reply.code(204).send();
    }
  );
};

export default factoryRoutes;
