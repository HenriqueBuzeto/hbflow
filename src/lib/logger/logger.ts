import { headers } from 'next/headers';
import { getRequestIdFromHeaders, REQUEST_ID_CONTEXT } from '../request-id/requestId';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string | undefined;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private async getRequestId(): Promise<string | undefined> {
    try {
      const headersList = await headers();
      return getRequestIdFromHeaders(headersList);
    } catch {
      return undefined;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, requestId, timestamp, context, error } = entry;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` ${error.message}` : '';
    return `[${timestamp}] [${level}]${requestId ? ` [${requestId}]` : ''} ${message}${contextStr}${errorStr}`;
  }

  private async log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const requestId = await this.getRequestId();

    const entry: LogEntry = {
      level,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // TODO: Send to external logging service (e.g., ErrorLog table)
    // This would integrate with the ErrorLog model for persistence
  }

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context);
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.INFO, message, context);
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.WARN, message, context);
  }

  async error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, error);
  }

  // Audit logging - specifically for AuditLog table integration
  async audit(action: string, entity?: string, entityId?: string, metadata?: Record<string, any>): Promise<void> {
    const requestId = await this.getRequestId();
    await this.info(`AUDIT: ${action}${entity ? ` on ${entity}` : ''}${entityId ? ` (${entityId})` : ''}`, {
      audit: true,
      action,
      entity,
      entityId,
      requestId,
      ...metadata,
    });
  }
}

export const logger = Logger.getInstance();
