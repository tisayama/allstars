/**
 * Firestore retry utility
 * Wraps Firestore operations with automatic retry logic using p-retry
 */

import pRetry, { AbortError } from 'p-retry';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Minimum timeout between attempts in ms (default: 1000) */
  minTimeout?: number;
  /** Maximum timeout between attempts in ms (default: 5000) */
  maxTimeout?: number;
  /** Factor to multiply timeout by for exponential backoff (default: 2) */
  factor?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
};

/**
 * Determines if a Firestore error is retryable
 * @param error - Error to check
 * @returns true if the error should trigger a retry
 */
function isRetryableError(error: any): boolean {
  // Firestore contention errors (transaction conflicts)
  if (error.code === 10) return true; // ABORTED
  if (error.code === 'ABORTED') return true;

  // Transient network/infrastructure errors
  if (error.code === 14) return true; // UNAVAILABLE
  if (error.code === 'UNAVAILABLE') return true;
  if (error.code === 4) return true; // DEADLINE_EXCEEDED
  if (error.code === 'DEADLINE_EXCEEDED') return true;

  // Resource exhaustion (rate limiting)
  if (error.code === 8) return true; // RESOURCE_EXHAUSTED
  if (error.code === 'RESOURCE_EXHAUSTED') return true;

  return false;
}

/**
 * Wraps a Firestore operation with automatic retry logic
 *
 * @param operation - Async function containing Firestore operation to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the operation result
 * @throws AbortError for non-retryable errors, or original error after exhausting retries
 *
 * @example
 * ```typescript
 * const result = await withRetry(async () => {
 *   return await db.runTransaction(async (transaction) => {
 *     // ... transaction logic
 *   });
 * });
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return pRetry(
    async () => {
      try {
        return await operation();
      } catch (error) {
        // If error is not retryable, abort immediately
        if (!isRetryableError(error)) {
          throw new AbortError(error);
        }
        // Otherwise, throw error to trigger retry
        throw error;
      }
    },
    {
      retries: config.retries,
      minTimeout: config.minTimeout,
      maxTimeout: config.maxTimeout,
      factor: config.factor,
      onFailedAttempt: (error) => {
        console.warn(
          `Firestore operation failed (attempt ${error.attemptNumber}/${config.retries + 1}):`,
          error.message
        );
      },
    }
  );
}
