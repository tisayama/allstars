/**
 * Retry wrapper utility using p-retry for Firestore operations
 * Implements exponential backoff strategy for transient failures
 */

import pRetry, { AbortError } from "p-retry";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Exponential backoff factor (default: 2) */
  factor?: number;
  /** Minimum timeout in milliseconds (default: 1000) */
  minTimeout?: number;
  /** Maximum timeout in milliseconds (default: 5000) */
  maxTimeout?: number;
}

/**
 * Default retry configuration based on research.md decisions
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
};

/**
 * Retry wrapper for async operations with exponential backoff
 *
 * @template T - Return type of the operation
 * @param operation - Async function to retry on failure
 * @param config - Optional retry configuration
 * @returns Promise resolving to operation result
 * @throws AbortError if operation should not be retried
 * @throws Error from operation after all retries exhausted
 *
 * @example
 * ```typescript
 * const answers = await withRetry(
 *   async () => await answersCollection.where('questionId', '==', id).get(),
 *   { retries: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return pRetry(operation, {
    retries: mergedConfig.retries,
    factor: mergedConfig.factor,
    minTimeout: mergedConfig.minTimeout,
    maxTimeout: mergedConfig.maxTimeout,
    onFailedAttempt: (error) => {
      console.warn(
        `Retry attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
        {
          errorName: error.name,
          errorMessage: error.message,
        }
      );
    },
  });
}

/**
 * Determine if an error should abort retries (non-transient errors)
 *
 * @param error - Error to evaluate
 * @returns true if error is non-transient and retries should abort
 *
 * Non-transient errors include:
 * - Permission denied (PERMISSION_DENIED)
 * - Not found (NOT_FOUND)
 * - Invalid argument (INVALID_ARGUMENT)
 * - Data corruption/validation errors
 */
export function shouldAbortRetry(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const nonTransientPatterns = [
    "permission denied",
    "not found",
    "invalid argument",
    "unauthenticated",
    "already exists",
  ];

  return nonTransientPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Wrap operation with retry logic and abort on non-transient errors
 *
 * @template T - Return type of the operation
 * @param operation - Async function to retry on failure
 * @param config - Optional retry configuration
 * @returns Promise resolving to operation result
 * @throws AbortError for non-transient errors (no retries)
 * @throws Error from operation after all retries exhausted
 *
 * @example
 * ```typescript
 * const results = await withRetryAbort(async () => {
 *   const snapshot = await db.collection('answers').get();
 *   if (!snapshot.exists) {
 *     throw new Error('Not found'); // Will abort immediately
 *   }
 *   return snapshot.docs.map(doc => doc.data());
 * });
 * ```
 */
export async function withRetryAbort<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  return withRetry(async () => {
    try {
      return await operation();
    } catch (error) {
      if (shouldAbortRetry(error)) {
        // Abort retry for non-transient errors
        throw new AbortError(
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }, config);
}
