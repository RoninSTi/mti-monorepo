import type { NotificationMessage } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * NotificationHandler manages callbacks for notification message types
 *
 * Provides callback registration for NOT_ messages (async push notifications from gateway).
 * Phase 5 will register handlers for NOT_DYN_READING and other notification types.
 */
export class NotificationHandler {
  private handlers: Map<string, (data: unknown) => void> = new Map();

  /**
   * Register a handler for a specific notification Type
   *
   * @param type - Notification type (e.g., "NOT_DYN_READING")
   * @param callback - Handler function that receives the notification Data
   */
  on(type: string, callback: (data: unknown) => void): void {
    this.handlers.set(type, callback);
    logger.debug(`Registered notification handler for: ${type}`);
  }

  /**
   * Handle incoming notification message
   *
   * Looks up handler by message.Type and calls it with message.Data.
   * If no handler registered, logs debug message.
   *
   * @param message - Notification message from gateway
   */
  handle(message: NotificationMessage): void {
    logger.debug(`Notification received: ${message.Type}`);

    const handler = this.handlers.get(message.Type);
    if (handler) {
      handler(message.Data);
    } else {
      logger.debug(`No handler for notification: ${message.Type}`);
    }
  }
}
