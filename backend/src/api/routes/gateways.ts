import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createGatewaySchema,
  updateGatewaySchema,
  gatewayResponseSchema,
  gatewayListResponseSchema,
  gatewayListQuerySchema,
} from '../schemas/gateways';
import { gatewayRepository } from '../../repositories/GatewayRepository';
import { Gateway } from '../../repositories/types';

/**
 * Convert repository Gateway type to API response format
 *
 * Serializes Date objects to ISO strings and excludes internal fields.
 * CRITICAL: Never includes password_encrypted (GATEWAY-07 security requirement).
 */
function toGatewayResponse(gateway: Gateway) {
  return {
    id: gateway.id,
    factory_id: gateway.factory_id,
    gateway_id: gateway.gateway_id,
    name: gateway.name,
    url: gateway.url,
    email: gateway.email,
    // NO password field - GATEWAY-07 security requirement
    // NO password_encrypted field - GATEWAY-07 security requirement
    model: gateway.model,
    firmware_version: gateway.firmware_version,
    last_seen_at: gateway.last_seen_at ? gateway.last_seen_at.toISOString() : null,
    metadata: (gateway.metadata || {}) as Record<string, unknown>,
    created_at: gateway.created_at.toISOString(),
    updated_at: gateway.updated_at.toISOString(),
    // NO deleted_at - internal implementation detail
  };
}

/**
 * Gateway CRUD routes
 *
 * Provides all five REST operations for gateway management:
 * - POST / - Create gateway with encrypted password (GATEWAY-01, GATEWAY-06)
 * - GET / - List gateways with pagination and factory filter (GATEWAY-02)
 * - GET /:id - Get gateway by ID (GATEWAY-03)
 * - PUT /:id - Update gateway with optional password re-encryption (GATEWAY-04)
 * - DELETE /:id - Soft delete gateway (GATEWAY-05)
 *
 * Validation errors return 400 VALIDATION_ERROR (GATEWAY-09)
 * Missing resources return 404 GATEWAY_NOT_FOUND
 * Soft-deleted gateways are excluded from all queries (GATEWAY-07)
 * Database errors return 500 with safe messages (GATEWAY-08)
 */
const gatewayRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST / - Create gateway
  app.post(
    '/',
    {
      schema: {
        body: createGatewaySchema,
        response: {
          201: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // Repository encrypts password automatically
      const gateway = await gatewayRepository.create(request.body as any);
      return reply.status(201).send(toGatewayResponse(gateway));
    }
  );

  // GET / - List gateways with pagination and optional factory filter
  app.get(
    '/',
    {
      schema: {
        querystring: gatewayListQuerySchema,
        response: {
          200: gatewayListResponseSchema,
        },
      },
    },
    async (request) => {
      const { limit, offset, factory_id } = request.query;

      let gateways: Gateway[];
      let total: number;

      if (factory_id) {
        // Filter by factory_id
        const factoryGateways = await gatewayRepository.findActive(factory_id);
        total = factoryGateways.length;
        // Apply manual pagination to filtered results
        gateways = factoryGateways.slice(offset, offset + limit);
      } else {
        // No filter - fetch all with pagination
        [gateways, total] = await Promise.all([
          gatewayRepository.findAll({ limit, offset }),
          gatewayRepository.count(),
        ]);
      }

      return {
        data: gateways.map(toGatewayResponse),
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

  // GET /:id - Get gateway by ID
  app.get(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const gateway = await gatewayRepository.findById(request.params.id);

      if (!gateway) {
        return (reply as any).code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }

      return toGatewayResponse(gateway);
    }
  );

  // PUT /:id - Update gateway
  app.put(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateGatewaySchema,
        response: {
          200: gatewayResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { password, ...otherUpdates } = request.body;
      let updated: Gateway | undefined;

      if (password) {
        // Re-encrypt password if provided
        updated = await gatewayRepository.updatePassword(request.params.id, password);

        if (!updated) {
          return (reply as any).code(404).send({
            error: {
              code: 'GATEWAY_NOT_FOUND',
              message: 'Gateway not found',
              statusCode: 404,
            },
          });
        }

        // Update other fields if present
        if (Object.keys(otherUpdates).length > 0) {
          const result = await gatewayRepository.update(request.params.id, otherUpdates as any);
          if (result) {
            updated = result;
          }
        }
      } else {
        // Only update non-password fields
        updated = await gatewayRepository.update(request.params.id, otherUpdates as any);

        if (!updated) {
          return (reply as any).code(404).send({
            error: {
              code: 'GATEWAY_NOT_FOUND',
              message: 'Gateway not found',
              statusCode: 404,
            },
          });
        }
      }

      return toGatewayResponse(updated);
    }
  );

  // DELETE /:id - Soft delete gateway
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
      const deleted = await gatewayRepository.softDelete(request.params.id);

      if (!deleted) {
        return reply.code(404).send({
          error: {
            code: 'GATEWAY_NOT_FOUND',
            message: 'Gateway not found',
            statusCode: 404,
          },
        });
      }

      return reply.code(204).send();
    }
  );
};

export default gatewayRoutes;
