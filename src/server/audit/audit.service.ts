import { prisma } from '@/server/db/prisma';
import { sanitizeMetadata } from './audit-sanitizer';

export interface AuditLogData {
  action: string;
  tenantId: string;
  userId?: string;
  entity?: string;
  entityId?: string;
  requestId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Log an audit event to the database
   * Never throws - if logging fails, it logs to console and continues
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      // Sanitize metadata to remove sensitive information
      const sanitizedMetadata = data.metadata ? sanitizeMetadata(data.metadata) : null;

      await prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          requestId: data.requestId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: sanitizedMetadata,
        },
      });
    } catch (error) {
      // Never break the request if audit logging fails
      console.error('[AUDIT] Failed to log to database:', error);
      console.error('[AUDIT] Failed log data:', {
        action: data.action,
        tenantId: data.tenantId,
        userId: data.userId,
        entity: data.entity,
        entityId: data.entityId,
        requestId: data.requestId,
      });
    }
  }

  /**
   * Safe log - wraps log with try-catch, never throws
   */
  static async safeLog(data: AuditLogData): Promise<void> {
    try {
      await this.log(data);
    } catch (error) {
      // Already handled in log(), but double-safe
      console.error('[AUDIT] Safe log failed:', error);
    }
  }

  /**
   * Log an error to ErrorLog table
   */
  static async logError(data: {
    tenantId?: string;
    userId?: string;
    requestId?: string;
    path?: string;
    method?: string;
    message: string;
    stack?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const sanitized = data.metadata ? sanitizeMetadata(data.metadata) : null;
      const sanitizedMetadata = sanitized
        ? (typeof sanitized === 'object' ? JSON.stringify(sanitized) : String(sanitized))
        : '{}';

      await prisma.errorLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          path: data.path,
          method: data.method,
          message: data.message,
          stack: process.env.NODE_ENV === 'development' ? data.stack : undefined,
          metadata: sanitizedMetadata,
        },
      });
    } catch (error) {
      console.error('[AUDIT] Failed to log error:', error);
    }
  }

  /**
   * Log a request to SystemEvent (for system-level events)
   */
  static async logSystemEvent(data: {
    tenantId?: string;
    eventType: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const sanitized = data.metadata ? sanitizeMetadata(data.metadata) : null;
      const sanitizedMetadata = sanitized
        ? (typeof sanitized === 'object' ? JSON.stringify(sanitized) : String(sanitized))
        : '{}';

      await prisma.systemEvent.create({
        data: {
          tenantId: data.tenantId,
          eventType: data.eventType,
          severity: data.severity || 'info',
          message: data.message,
          metadata: sanitizedMetadata,
        },
      });
    } catch (error) {
      console.error('[AUDIT] Failed to log system event:', error);
    }
  }
}
