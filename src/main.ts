// Application entry point

import { config } from './config';
import { initLogger, logger } from './utils/logger';

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

// Gateway connection logic will be added in Phase 2
