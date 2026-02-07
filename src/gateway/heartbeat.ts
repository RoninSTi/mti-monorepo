import { HeartbeatConfig } from '../types/connection';
import { logger } from '../utils/logger';

/**
 * HeartbeatManager implements application-level heartbeat monitoring
 * Preferred over protocol-level ping/pong for better control and debugging
 */
export class HeartbeatManager {
  private config: HeartbeatConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private onTimeoutCallback: (() => void) | null = null;

  constructor(config: HeartbeatConfig) {
    this.config = config;
  }

  /**
   * Register callback for when heartbeat times out (connection considered dead)
   * @param callback Function to call on timeout
   */
  onTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  /**
   * Start sending periodic heartbeats
   * @param sendFn Function to send message through WebSocket
   */
  start(sendFn: (message: string) => void): void {
    logger.info(
      `Starting heartbeat (interval: ${this.config.interval}ms, timeout: ${this.config.timeout}ms)`
    );

    // Send heartbeat immediately and then on interval
    this.sendHeartbeat(sendFn);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(sendFn);
    }, this.config.interval);
  }

  /**
   * Send a heartbeat ping message
   * @param sendFn Function to send message through WebSocket
   */
  private sendHeartbeat(sendFn: (message: string) => void): void {
    const message = {
      type: 'ping',
      timestamp: Date.now(),
    };

    sendFn(JSON.stringify(message));
    logger.debug('Sending heartbeat');

    // Start timeout timer
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeout);
  }

  /**
   * Handle received heartbeat response (call this when pong is received)
   */
  handleHeartbeatResponse(): void {
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    logger.debug('Heartbeat response received');
  }

  /**
   * Handle heartbeat timeout (no response received)
   */
  private handleTimeout(): void {
    logger.error('Heartbeat timeout - connection considered dead');

    this.stop();

    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  /**
   * Stop heartbeat and clear all timers
   */
  stop(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    logger.info('Heartbeat stopped');
  }

  /**
   * Check if heartbeat is currently running
   */
  isRunning(): boolean {
    return this.heartbeatTimer !== null;
  }
}
