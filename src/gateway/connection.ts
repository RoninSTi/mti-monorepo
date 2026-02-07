import WebSocket from 'ws';
import { ConnectionState, ConnectionConfig } from '../types/connection';
import { ReconnectionManager } from './reconnect';
import { HeartbeatManager } from './heartbeat';
import { logger } from '../utils/logger';

/**
 * WebSocketConnection manages the full lifecycle of a gateway WebSocket connection
 * Composes ReconnectionManager and HeartbeatManager for reliability
 */
export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private config: ConnectionConfig;
  private reconnectManager: ReconnectionManager;
  private heartbeatManager: HeartbeatManager;
  private isShuttingDown: boolean = false;
  private onMessageCallback: ((data: string) => void) | null = null;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.reconnectManager = new ReconnectionManager();
    this.heartbeatManager = new HeartbeatManager(config.heartbeat);
    this.heartbeatManager.onTimeout(() => this.handleHeartbeatTimeout());
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (data: string) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Initiate connection to gateway
   */
  connect(): void {
    if (this.isShuttingDown) {
      logger.warn('Connection attempt ignored - shutting down');
      return;
    }

    if (this.state !== ConnectionState.DISCONNECTED && this.state !== ConnectionState.CLOSED) {
      logger.warn(`Connection attempt ignored - state: ${this.state}`);
      return;
    }

    this.setState(ConnectionState.CONNECTING);
    this.ws = new WebSocket(this.config.url);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('close', (code, reason) => this.handleClose(code, reason));
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('message', (data) => this.handleMessage(data));
  }

  /**
   * Send message through WebSocket
   * @returns true if sent successfully, false if connection not open
   */
  send(message: string): boolean {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send - connection not open (state: ${this.state})`);
      return false;
    }

    this.ws.send(message);
    return true;
  }

  /**
   * Gracefully close the connection
   */
  close(code: number = 1000, reason: string = 'Normal closure'): void {
    if (this.ws === null) {
      return;
    }

    this.isShuttingDown = true;
    this.reconnectManager.cleanup();
    this.heartbeatManager.stop();
    this.setState(ConnectionState.CLOSING);
    this.ws.close(code, reason);
  }

  /**
   * Immediately terminate the connection (forceful)
   */
  terminate(): void {
    if (this.ws === null) {
      return;
    }

    logger.warn('Terminating WebSocket connection (immediate)');
    this.heartbeatManager.stop();
    this.reconnectManager.cleanup();
    this.ws.terminate();
    this.setState(ConnectionState.CLOSED);
  }

  /**
   * Update connection state with logging
   */
  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    logger.info(`Connection state: ${oldState} -> ${newState}`);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    logger.info('WebSocket connection established');
    this.setState(ConnectionState.CONNECTED);
    this.reconnectManager.resetBackoff();
    this.heartbeatManager.start((msg) => this.send(msg));
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(code: number, reason: Buffer): void {
    logger.info(`WebSocket closed: code=${code}, reason="${reason.toString()}"`);
    this.heartbeatManager.stop();
    this.setState(ConnectionState.CLOSED);

    if (this.isShuttingDown) {
      logger.info('Shutdown complete - not reconnecting');
      return;
    }

    if (this.shouldReconnect(code)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Error): void {
    logger.error(`WebSocket error: ${error.message}`);
    // Note: error event is always followed by close event in ws library
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: WebSocket.RawData): void {
    const message = data.toString();

    // Check for heartbeat response
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'pong') {
        this.heartbeatManager.handleHeartbeatResponse();
        return;
      }
    } catch {
      // Not JSON or not a heartbeat response, continue processing
    }

    logger.debug(`Received: ${message.substring(0, 200)}`);

    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }

  /**
   * Determine if a close code should trigger reconnection
   */
  private shouldReconnect(closeCode: number): boolean {
    let shouldReconnect = true;

    if (closeCode === 1000) {
      // Normal Closure - intentional disconnect
      shouldReconnect = false;
    } else if (closeCode === 1008) {
      // Policy Violation - application-level rejection
      shouldReconnect = false;
    }

    logger.debug(`Close code ${closeCode}: reconnect=${shouldReconnect}`);
    return shouldReconnect;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    this.setState(ConnectionState.DISCONNECTED);
    this.reconnectManager.scheduleReconnect(() => this.connect());
  }

  /**
   * Handle heartbeat timeout (connection considered dead)
   */
  private handleHeartbeatTimeout(): void {
    logger.warn('Heartbeat timeout - connection dead, reconnecting');

    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.AUTHENTICATED) {
      if (this.ws) {
        this.ws.terminate();
      }
      this.heartbeatManager.stop();
      this.setState(ConnectionState.CLOSED);
      this.scheduleReconnect();
    }
  }
}
