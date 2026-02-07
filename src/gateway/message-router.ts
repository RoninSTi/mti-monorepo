import type { CommandClient } from './command-client';
import type { NotificationHandler } from './notification-handler';
import { ResponseMessageSchema, NotificationMessageSchema } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * MessageRouter parses and routes incoming WebSocket messages
 *
 * Routes messages by Type prefix:
 * - RTN_ messages -> CommandClient.handleResponse (request/response correlation)
 * - NOT_ messages -> NotificationHandler.handle (async notifications)
 * - Unknown/invalid messages -> logged as warnings
 */
export class MessageRouter {
  constructor(
    private commandClient: CommandClient,
    private notificationHandler: NotificationHandler
  ) {}

  /**
   * Handle incoming WebSocket message
   *
   * Parses JSON, validates with Zod, and routes to appropriate handler based on Type prefix.
   * Invalid/unknown messages are logged without crashing.
   *
   * @param raw - Raw WebSocket message string
   */
  handleMessage(raw: string): void {
    // Log all received messages at debug level (truncated) - satisfies CMD-06
    logger.debug(`Received: ${raw.substring(0, 200)}`);

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      logger.warn('Received non-JSON message');
      return;
    }

    // Check for Type field
    if (typeof parsed.Type !== 'string') {
      logger.warn('Message missing Type field');
      return;
    }

    const messageType = parsed.Type;

    // Route by Type prefix
    if (messageType.startsWith('RTN_')) {
      // Command response
      const result = ResponseMessageSchema.safeParse(parsed);
      if (result.success) {
        this.commandClient.handleResponse(result.data);
      } else {
        logger.warn(`Invalid RTN_ message: ${JSON.stringify(result.error.issues)}`);
      }
    } else if (messageType.startsWith('NOT_')) {
      // Notification
      const result = NotificationMessageSchema.safeParse(parsed);
      if (result.success) {
        this.notificationHandler.handle(result.data);
      } else {
        logger.warn(`Invalid NOT_ message: ${JSON.stringify(result.error.issues)}`);
      }
    } else {
      logger.warn(`Unknown message type: ${messageType}`);
    }
  }
}
