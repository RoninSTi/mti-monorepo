import { ReconnectConfig } from '../types/connection';
import { logger } from '../utils/logger';

/**
 * ExponentialBackoff implements decorrelated jitter backoff algorithm
 * (AWS-recommended pattern for optimal retry distribution)
 */
export class ExponentialBackoff {
  private attempts: number = 0;
  private config: ReconnectConfig;

  constructor(config: ReconnectConfig) {
    this.config = config;
  }

  /**
   * Calculate next delay with exponential backoff and decorrelated jitter
   * @returns delay in milliseconds
   */
  getDelay(): number {
    const { initialDelay, maxDelay, multiplier } = this.config;

    // Base exponential calculation
    const base = initialDelay * Math.pow(multiplier, this.attempts);
    const cappedDelay = Math.min(base, maxDelay);

    // Apply decorrelated jitter (AWS pattern)
    const jitter = Math.random() * (cappedDelay * 3 - initialDelay) + initialDelay;
    const finalDelay = Math.min(jitter, maxDelay);

    // Increment for next call
    this.attempts++;

    return Math.floor(finalDelay);
  }

  /**
   * Reset attempts counter to 0
   */
  reset(): void {
    this.attempts = 0;
  }

  /**
   * Get current attempt count
   */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * Check if max attempts limit has been reached
   */
  hasExceededMaxAttempts(): boolean {
    if (this.config.maxAttempts === undefined) {
      return false;
    }
    return this.attempts >= this.config.maxAttempts;
  }
}

/**
 * ReconnectionManager handles scheduled reconnection attempts with backoff
 */
export class ReconnectionManager {
  private backoff: ExponentialBackoff;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Default config from research: start at 1s, max 30s, double each attempt
    this.backoff = new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
    });
  }

  /**
   * Schedule a reconnection attempt after backoff delay
   * @param callback Function to call when reconnection should be attempted
   */
  scheduleReconnect(callback: () => void): void {
    const delay = this.backoff.getDelay();
    const attempt = this.backoff.getAttempts();

    logger.info(`Scheduling reconnect attempt ${attempt} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      callback();
    }, delay);
  }

  /**
   * Cancel any scheduled reconnection
   */
  cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Reset backoff counter to initial state
   */
  resetBackoff(): void {
    this.backoff.reset();
  }

  /**
   * Clean up all timers and reset state
   */
  cleanup(): void {
    this.cancelReconnect();
    this.resetBackoff();
  }

  /**
   * Check if a reconnection is currently scheduled
   */
  isScheduled(): boolean {
    return this.reconnectTimer !== null;
  }
}
