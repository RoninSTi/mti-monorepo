// Application entry point

import { config } from './config';
import { initLogger, logger } from './utils/logger';
import { WebSocketConnection } from './gateway/connection';
import { ConnectionConfig } from './types/connection';

// Initialize logger with configured log level
initLogger(config.LOG_LEVEL);

// Log startup message
logger.info('Gateway Integration Spike starting');

// Log configuration summary (without password)
logger.debug('Configuration:', {
  gatewayUrl: config.GATEWAY_URL,
  sensorSerial: config.SENSOR_SERIAL,
  connectionTimeout: config.CONNECTION_TIMEOUT,
  commandTimeout: config.COMMAND_TIMEOUT,
  acquisitionTimeout: config.ACQUISITION_TIMEOUT,
  heartbeatInterval: config.HEARTBEAT_INTERVAL,
  logLevel: config.LOG_LEVEL,
});

// Build connection configuration from validated config
const connectionConfig: ConnectionConfig = {
  url: config.GATEWAY_URL,
  reconnect: {
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
  },
  heartbeat: {
    interval: config.HEARTBEAT_INTERVAL,
    timeout: 5000, // 5s timeout for heartbeat response
  },
};

// Create WebSocket connection
const connection = new WebSocketConnection(connectionConfig);

// Register message handler (Phase 3 will replace with proper message routing)
connection.onMessage((data) => {
  logger.debug('Message received (unhandled):', data.substring(0, 200));
});

// Graceful shutdown handling
let isShuttingDown = false;

function shutdown(signal: string): void {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  isShuttingDown = true;
  logger.info(`Received ${signal} - starting graceful shutdown`);

  connection.close(1000, 'Application shutdown');

  // Give connection 2 seconds to close gracefully, then force exit
  setTimeout(() => {
    logger.warn('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 2000);
}

// Register signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the connection
logger.info(`Connecting to gateway at ${config.GATEWAY_URL}`);
connection.connect();
