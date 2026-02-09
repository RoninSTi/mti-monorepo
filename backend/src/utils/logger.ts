// Logger utility with timestamps and configurable log levels

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    const formattedMessage = `${timestamp} [${levelUpper}] ${message}`;

    if (level === 'error') {
      console.error(formattedMessage, ...args);
    } else if (level === 'warn') {
      console.warn(formattedMessage, ...args);
    } else {
      console.log(formattedMessage, ...args);
    }
  }

  public debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

// Mutable singleton logger instance
export let logger = new Logger('info');

// Initialize logger with specified level
export function initLogger(level: LogLevel): void {
  logger = new Logger(level);
}
