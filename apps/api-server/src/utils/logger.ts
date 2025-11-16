/**
 * Structured JSON logging utility for Firebase Cloud Functions
 * Outputs JSON-formatted logs compatible with Cloud Logging and external monitoring tools
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Log structured message in JSON format
 *
 * @param level - Log severity level
 * @param message - Human-readable log message
 * @param context - Additional context data (optional)
 *
 * @example
 * ```typescript
 * logStructured('info', 'Game state updated', {
 *   component: 'gameStateService',
 *   action: 'START_QUESTION',
 *   questionId: 'q123'
 * });
 * ```
 */
export function logStructured(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    component: context?.component || "unknown",
    message,
    ...(context && { context }),
  };

  // Firebase Functions routes both stdout and stderr to Cloud Logging
  // Use console.log for all levels - Cloud Logging handles severity
  console.log(JSON.stringify(logEntry));
}

/**
 * Log error with structured format including stack trace
 *
 * @param component - Component name where error occurred
 * @param message - Human-readable error description
 * @param error - Error object or error message
 * @param context - Additional context data (optional)
 *
 * @example
 * ```typescript
 * try {
 *   await transaction.commit();
 * } catch (error) {
 *   logError('gameStateService', 'Firestore transaction failed', error, {
 *     action: 'SHOW_RESULTS',
 *     attemptNumber: 3
 *   });
 * }
 * ```
 */
export function logError(
  component: string,
  message: string,
  error: Error | unknown,
  context?: LogContext
): void {
  const errorDetails =
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : {
          message: String(error),
        };

  logStructured("error", message, {
    component,
    ...context,
    error: errorDetails,
  });
}
