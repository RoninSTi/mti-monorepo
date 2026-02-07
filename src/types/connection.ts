// Connection lifecycle state machine
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  AUTHENTICATED = 'AUTHENTICATED',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

// Configuration for exponential backoff reconnection strategy
export interface ReconnectConfig {
  initialDelay: number; // Starting delay in ms
  maxDelay: number; // Maximum delay cap in ms
  multiplier: number; // Delay multiplier, typically 2
  maxAttempts?: number; // Optional limit on reconnection attempts
}

// Configuration for heartbeat health monitoring
export interface HeartbeatConfig {
  interval: number; // How often to send heartbeat in ms
  timeout: number; // How long to wait for response in ms
}

// Complete connection configuration
export interface ConnectionConfig {
  url: string; // WebSocket URL
  reconnect: ReconnectConfig;
  heartbeat: HeartbeatConfig;
}
