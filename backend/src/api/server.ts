import { buildApp } from './app';
import { apiConfig } from './config';
import { closeDatabase } from '../database/kysely';

/**
 * Start the Fastify API server
 *
 * Listens on the configured port (default 3000) and handles graceful shutdown
 * including database connection cleanup on SIGINT/SIGTERM.
 */
export async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({ port: apiConfig.API_PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${apiConfig.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();       // Complete in-flight requests
    await closeDatabase();   // Close Kysely connection pool
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start server when file is executed directly
startServer();
