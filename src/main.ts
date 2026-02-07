// Application entry point

import { config } from './config';
import { initLogger, logger } from './utils/logger';
import { WebSocketConnection } from './gateway/connection';
import { ConnectionConfig } from './types/connection';
import { CommandClient } from './gateway/command-client';
import { MessageRouter } from './gateway/message-router';
import { NotificationHandler } from './gateway/notification-handler';
import { authenticate } from './gateway/authenticator';
import { discoverSensor } from './gateway/sensor-discovery';

// Initialize logger with configured log level
initLogger(config.LOG_LEVEL);

// Log startup message
logger.info('Gateway Integration Spike starting');

// Log configuration summary (without password)
logger.debug('Configuration:', {
  gatewayUrl: config.GATEWAY_URL,
  sensorSerial: config.SENSOR_SERIAL ?? '(auto-detect)',
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

// Create message infrastructure
const commandClient = new CommandClient(
  (msg) => connection.send(msg),
  config.COMMAND_TIMEOUT
);
const notificationHandler = new NotificationHandler();
const messageRouter = new MessageRouter(commandClient, notificationHandler);

logger.info('Message infrastructure initialized (router, command client, notification handler)');

// Register message handler - route incoming messages through MessageRouter
connection.onMessage((data) => messageRouter.handleMessage(data));

// Graceful shutdown handling
let isShuttingDown = false;

function shutdown(signal: string): void {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  isShuttingDown = true;
  logger.info(`Received ${signal} - starting graceful shutdown`);

  // Clean up message infrastructure first
  commandClient.cleanup();

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

// ========================================================================
// Application flow: connect -> authenticate -> discover
// ========================================================================

/**
 * Run the authentication and discovery flow after connection opens.
 * Called by onOpen callback.
 */
async function onConnectionOpen(): Promise<void> {
  try {
    // AUTH-01, AUTH-02: Send POST_LOGIN with credentials
    await authenticate(commandClient, config);

    // AUTH-05: Transition to AUTHENTICATED state
    connection.markAuthenticated();

    // DISC-01, DISC-02, DISC-03, DISC-04: Discover and select sensor
    const sensor = await discoverSensor(commandClient, config.SENSOR_SERIAL);

    // Store selected sensor for Phase 5 acquisition
    logger.info(`Ready for data acquisition with sensor Serial=${sensor.Serial}`);
    logger.info('Phase 4 complete: authenticated and sensor discovered');

    // Phase 5 will add: subscribe to notifications, trigger reading, display data

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // DISC-05: No sensors connected - not an error, just nothing to do
    if (message.includes('No sensors currently connected')) {
      logger.warn('No sensors available - exiting gracefully');
      commandClient.cleanup();
      connection.close(1000, 'No sensors available');
      setTimeout(() => process.exit(0), 1000); // Exit 0 - valid state, nothing to do
      return;
    }

    // AUTH-04: Authentication failure or other error
    logger.error(`Startup failed: ${message}`);
    commandClient.cleanup();
    connection.close(1000, 'Startup failed');
    setTimeout(() => process.exit(1), 1000); // Exit 1 - actual failure
  }
}

// Register open handler and start connection
connection.onOpen(() => {
  onConnectionOpen().catch((error) => {
    // Catch any unhandled errors from the async flow
    logger.error(`Unhandled error in connection flow: ${error}`);
    process.exit(1);
  });
});

// Start the connection
logger.info(`Connecting to gateway at ${config.GATEWAY_URL}`);
connection.connect();
