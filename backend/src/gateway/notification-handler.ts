import { EventEmitter } from 'node:events';
import type { NotificationMessage } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * NotificationHandler manages callbacks for notification message types
 *
 * Extends EventEmitter to support both callback registration (backward compatible)
 * and events.once() Promise-based awaiting (for acquisition flow).
 *
 * Provides callback registration for NOT_ messages (async push notifications from gateway).
 * Phase 5 will register handlers for NOT_DYN_READING and other notification types.
 */
export class NotificationHandler extends EventEmitter {
  private handlers: Map<string, (data: unknown) => void> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a handler for a specific notification Type
   *
   * @param type - Notification type (e.g., "NOT_DYN_READING")
   * @param callback - Handler function that receives the notification Data
   */
  register(type: string, callback: (data: unknown) => void): void {
    this.handlers.set(type, callback);
    logger.debug(`Registered notification handler for: ${type}`);
  }

  /**
   * Handle incoming notification message
   *
   * Dual-dispatches to both registered callbacks (backward compatible) and
   * EventEmitter events (for events.once() Promise-based awaiting).
   *
   * @param message - Notification message from gateway
   */
  handle(message: NotificationMessage): void {
    logger.debug(`Notification received: ${message.Type}`);

    // Call registered callback handler (backward compat)
    const handler = this.handlers.get(message.Type);
    if (handler) {
      handler(message.Data);
    }

    // Emit event for events.once() consumers (Phase 5 acquisition)
    this.emit(message.Type, message.Data);
  }
}
