import type { CommandClient } from './command-client';
import type { Config } from '../config';
import { logger } from '../utils/logger';

const AUTH_TIMEOUT_MS = 10_000; // 10 second auth timeout (industry best practice)

/**
 * Authenticate with gateway using POST_LOGIN command.
 *
 * Sends credentials from config immediately after connection opens.
 * Uses a shorter timeout (10s) than default command timeout because
 * authentication should be fast.
 *
 * @param commandClient - Command client for sending POST_LOGIN
 * @param config - Application config with GATEWAY_EMAIL and GATEWAY_PASSWORD
 * @returns Response data from POST_LOGIN (structure unknown, logged for discovery)
 * @throws Error if authentication fails (RTN_ERR) or times out
 */
export async function authenticate(
  commandClient: CommandClient,
  config: Config
): Promise<unknown> {
  logger.info(`Authenticating with gateway as ${config.GATEWAY_EMAIL}`);

  try {
    const responseData = await commandClient.sendCommand(
      {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: config.GATEWAY_EMAIL,
          Password: config.GATEWAY_PASSWORD,
        },
      },
      AUTH_TIMEOUT_MS
    );

    logger.info('Authentication successful');
    // Log response data at debug level to discover POST_LOGIN response structure
    // (Open question from research: exact RTN_DYN structure for POST_LOGIN unknown)
    logger.debug('POST_LOGIN response data:', responseData);

    return responseData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Authentication failed: ${message}`);

    // Provide actionable guidance for credential errors
    if (message.includes('Invalid') || message.includes('credential')) {
      logger.error('Check GATEWAY_EMAIL and GATEWAY_PASSWORD in .env file');
    }

    throw error; // Re-throw for caller to handle (close connection, exit)
  }
}
