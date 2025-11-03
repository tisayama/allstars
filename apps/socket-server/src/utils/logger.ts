/**
 * Simple logger utility for socket-server
 * In production, this would use Winston or similar structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  debug(message: string, ...meta: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, ...meta);
    }
  }

  info(message: string, ...meta: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, ...meta);
    }
  }

  warn(message: string, ...meta: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  }

  error(message: string, error?: Error, ...meta: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error, ...meta);
    }
  }
}

export const logger = new Logger();
