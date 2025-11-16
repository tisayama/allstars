/**
 * Audit Logger Service
 * Feature: 001-projector-auth [US2]
 *
 * Provides structured audit logging for authentication events (SC-003)
 * Ensures 100% audit logging for security-critical operations
 */

/**
 * Types of audit events to log
 */
export enum AuditEventType {
  TOKEN_GENERATED = "TOKEN_GENERATED",
  AUTH_FAILED = "AUTH_FAILED",
  SOCKET_AUTH_SUCCESS = "SOCKET_AUTH_SUCCESS",
  SOCKET_AUTH_FAILED = "SOCKET_AUTH_FAILED",
  SOCKET_DISCONNECTED = "SOCKET_DISCONNECTED",
}

/**
 * Metadata for audit events
 */
export interface AuditEventMetadata {
  [key: string]: any;
  uid?: string;
  socketId?: string;
  reason?: string;
  role?: string;
  ipAddress?: string;
  apiKeyPrefix?: string;
  expiresAt?: number;
  duration?: number;
  providedRole?: string;
}

/**
 * Structured audit log entry
 */
interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  [key: string]: any;
}

/**
 * AuditLogger class for structured authentication event logging
 */
export class AuditLogger {
  /**
   * Sanitize sensitive data before logging
   * Removes full tokens and truncates API keys
   */
  private sanitizeMetadata(metadata: AuditEventMetadata): AuditEventMetadata {
    const sanitized = { ...metadata };

    // Remove sensitive fields
    delete sanitized.token;
    delete sanitized.apiKey;

    // Truncate API key if provided as full key
    if (metadata.apiKey && typeof metadata.apiKey === "string") {
      sanitized.apiKeyPrefix = `${metadata.apiKey.substring(0, 6)}...`;
    }

    return sanitized;
  }

  /**
   * Log an audit event with structured data
   *
   * @param eventType - Type of audit event
   * @param metadata - Event-specific metadata
   */
  public logEvent(
    eventType: AuditEventType,
    metadata: AuditEventMetadata
  ): void {
    try {
      // Sanitize sensitive data
      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      // Create structured log entry
      const logEntry: AuditLogEntry = {
        timestamp: Date.now(),
        eventType,
        ...sanitizedMetadata,
      };

      // Log to console with structured format
      // In production, this would go to a logging service (Cloud Logging, etc.)
      console.log("[AUDIT]", eventType, logEntry);
    } catch (error) {
      // Never throw from logging - log the error but continue
      console.error("[AUDIT ERROR] Failed to log audit event:", error);
    }
  }

  /**
   * Log successful token generation
   */
  public logTokenGenerated(uid: string, expiresAt: number): void {
    this.logEvent(AuditEventType.TOKEN_GENERATED, {
      uid,
      expiresAt,
    });
  }

  /**
   * Log authentication failure
   */
  public logAuthFailed(
    reason: string,
    metadata: AuditEventMetadata = {}
  ): void {
    this.logEvent(AuditEventType.AUTH_FAILED, {
      reason,
      ...metadata,
    });
  }

  /**
   * Log successful socket authentication
   */
  public logSocketAuthSuccess(
    socketId: string,
    uid: string,
    role: string
  ): void {
    this.logEvent(AuditEventType.SOCKET_AUTH_SUCCESS, {
      socketId,
      uid,
      role,
    });
  }

  /**
   * Log socket authentication failure
   */
  public logSocketAuthFailed(
    socketId: string,
    reason: string,
    metadata: AuditEventMetadata = {}
  ): void {
    this.logEvent(AuditEventType.SOCKET_AUTH_FAILED, {
      socketId,
      reason,
      ...metadata,
    });
  }

  /**
   * Log socket disconnection
   */
  public logSocketDisconnected(
    socketId: string,
    uid: string,
    reason: string,
    duration?: number
  ): void {
    this.logEvent(AuditEventType.SOCKET_DISCONNECTED, {
      socketId,
      uid,
      reason,
      ...(duration !== undefined && { duration }),
    });
  }
}

/**
 * Singleton instance for shared usage
 */
export const auditLogger = new AuditLogger();
