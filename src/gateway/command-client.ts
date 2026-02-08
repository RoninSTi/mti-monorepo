import { randomUUID } from 'node:crypto';
import type { SendCommand, ResponseMessage } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * Pending request metadata
 */
interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
  commandType: string;
  sentAt: number;
}

/**
 * CommandClient handles request/response correlation over WebSocket
 *
 * Provides Promise-based command sending with:
 * - UUID-based correlation ID injection
 * - Configurable timeout
 * - RTN_ERR error handling
 * - Safe cleanup of pending requests
 */
export class CommandClient {
  private sendFn: (message: string) => boolean;
  private defaultTimeoutMs: number;
  private pending: Map<string, PendingRequest> = new Map();

  /**
   * @param sendFn - Callback to send message through WebSocket (returns true if sent, false if connection not open)
   * @param defaultTimeoutMs - Default command timeout in milliseconds (default: 30000)
   */
  constructor(sendFn: (message: string) => boolean, defaultTimeoutMs: number = 30000) {
    this.sendFn = sendFn;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Send command and wait for response
   *
   * @param command - Command to send (CorrelationId will be injected if not present)
   * @param timeoutMs - Optional timeout override (defaults to constructor defaultTimeoutMs)
   * @returns Promise that resolves with response Data or rejects on timeout/error
   */
  async sendCommand(command: SendCommand, timeoutMs?: number): Promise<any> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    // Generate and inject correlation ID
    const correlationId = randomUUID();
    const commandWithId = {
      ...command,
      CorrelationId: correlationId,
    };

    // Create promise with timeout
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        // Delete first (race condition protection)
        if (this.pending.delete(correlationId)) {
          const error = new Error(
            `Command timeout after ${timeout}ms: ${command.Type} (CorrelationId: ${correlationId})`
          );
          logger.debug(`Command timeout: ${command.Type}, CorrelationId: ${correlationId}`);
          reject(error);
        }
      }, timeout);

      // Store pending request
      this.pending.set(correlationId, {
        resolve,
        reject,
        timeoutId,
        commandType: command.Type,
        sentAt: Date.now(),
      });

      // Serialize and send
      const message = JSON.stringify(commandWithId);
      const sent = this.sendFn(message);

      if (!sent) {
        // Connection not available - clean up and reject immediately
        clearTimeout(timeoutId);
        this.pending.delete(correlationId);
        const error = new Error('Connection not available');
        logger.warn(`Cannot send command ${command.Type} - connection not available`);
        reject(error);
        return;
      }

      logger.debug(`Sent command: ${command.Type}, CorrelationId: ${correlationId}`);
    });
  }

  /**
   * Handle incoming response message
   *
   * Looks up pending request by CorrelationId and resolves/rejects accordingly.
   * If CorrelationId not found (stale/timed-out response), logs warning and returns.
   *
   * @param message - Response message from gateway
   */
  handleResponse(message: ResponseMessage): void {
    const { CorrelationId, Type, Data } = message;

    // Discovery: CTC gateway does not return CorrelationId - fallback to FIFO matching
    let correlationId: string;
    let pending: PendingRequest | undefined;

    if (CorrelationId) {
      // CorrelationId provided - use exact matching
      correlationId = CorrelationId;
      pending = this.pending.get(correlationId);
      if (!pending) {
        logger.warn(
          `Received response with unknown CorrelationId: ${correlationId} (likely timed out or stale)`
        );
        return;
      }
    } else {
      // No CorrelationId - match first pending request (FIFO, assumes ordered responses)
      const entries = Array.from(this.pending.entries());
      if (entries.length === 0) {
        logger.warn(`Received ${Type} with no CorrelationId and no pending requests`);
        return;
      }
      [correlationId, pending] = entries[0];
      logger.debug(
        `Response missing CorrelationId - matched to first pending: ${correlationId} (FIFO)`
      );
    }

    // Delete from map (whoever deletes first wins the race)
    this.pending.delete(correlationId);
    clearTimeout(pending.timeoutId);

    // Handle based on response type
    if (Type === 'RTN_ERR') {
      // Error response - reject with details
      const errorData = Data as { Attempt: string | null; Error: string };
      const error = new Error(
        `Command error: ${errorData.Error}${errorData.Attempt ? ` (Attempt: ${errorData.Attempt})` : ''}`
      );
      logger.debug(
        `Received RTN_ERR: ${errorData.Attempt || 'null'}, Error: "${errorData.Error}", CorrelationId: ${correlationId}`
      );
      pending.reject(error);
    } else {
      // Success response - resolve with data
      logger.debug(`Received ${Type}: CorrelationId: ${correlationId}`);
      pending.resolve(Data);
    }
  }

  /**
   * Clean up all pending requests (called on shutdown)
   *
   * Rejects all pending promises with shutdown error and clears timeouts.
   */
  cleanup(): void {
    logger.debug(`Cleaning up CommandClient (${this.pending.size} pending requests)`);

    const shutdownError = new Error('CommandClient shutting down');

    for (const [correlationId, pending] of this.pending.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(shutdownError);
    }

    this.pending.clear();
  }

  /**
   * Get number of pending requests (for debugging/monitoring)
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}
