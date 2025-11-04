/**
 * Unit tests for retry wrapper utility
 * Tests retry behavior, exponential backoff, and error handling
 */

import {
  withRetry,
  withRetryAbort,
  shouldAbortRetry,
} from "../../../src/utils/retry";

// Mock p-retry module
jest.mock("p-retry", () => {
  class AbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AbortError";
    }
  }

  const mockPRetry = jest.fn(async (operation, options) => {
    let lastError: Error | undefined;
    const maxAttempts = (options?.retries || 3) + 1; // +1 for initial attempt

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AbortError) {
          throw error;
        }

        // Call onFailedAttempt callback if provided
        if (options?.onFailedAttempt && attempt < maxAttempts) {
          options.onFailedAttempt({
            attemptNumber: attempt,
            retriesLeft: maxAttempts - attempt,
            name: (error as Error).name,
            message: (error as Error).message,
          });
        }

        if (attempt >= maxAttempts) {
          throw lastError;
        }
      }
    }

    throw lastError;
  });

  return {
    __esModule: true,
    default: mockPRetry,
    AbortError,
  };
});

describe("Retry Utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withRetry", () => {
    it("[T046] should succeed on retry attempt 2 after initial failure", async () => {
      // Setup: Operation that fails once then succeeds
      let attemptCount = 0;
      const mockOperation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("Transient error - network timeout");
        }
        return "success";
      });

      // Execute
      const result = await withRetry(mockOperation, {
        retries: 3,
        minTimeout: 10,
        maxTimeout: 50,
      });

      // Verify
      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(2); // Failed once, succeeded on attempt 2
      expect(attemptCount).toBe(2);
    });

    it("[T047] should throw error after all retries exhausted", async () => {
      // Setup: Operation that always fails
      const mockOperation = jest.fn(async () => {
        throw new Error("Persistent transient error");
      });

      // Execute & Verify
      await expect(
        withRetry(mockOperation, { retries: 3, minTimeout: 10, maxTimeout: 50 })
      ).rejects.toThrow("Persistent transient error");

      // Should have attempted initial try + 3 retries = 4 total
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });
  });

  describe("withRetryAbort", () => {
    it("[T048] should fail-fast on non-retryable errors without retry attempts", async () => {
      // Setup: Operation that throws non-retryable error
      const mockOperation = jest.fn(async () => {
        throw new Error("Permission denied");
      });

      // Execute & Verify
      await expect(
        withRetryAbort(mockOperation, {
          retries: 3,
          minTimeout: 10,
          maxTimeout: 50,
        })
      ).rejects.toThrow("Permission denied");

      // Should only attempt once (no retries for non-transient errors)
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('[T048] should abort on "not found" errors', async () => {
      const mockOperation = jest.fn(async () => {
        throw new Error("Document not found");
      });

      await expect(
        withRetryAbort(mockOperation, {
          retries: 3,
          minTimeout: 10,
          maxTimeout: 50,
        })
      ).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('[T048] should abort on "invalid argument" errors', async () => {
      const mockOperation = jest.fn(async () => {
        throw new Error("Invalid argument provided");
      });

      await expect(
        withRetryAbort(mockOperation, {
          retries: 3,
          minTimeout: 10,
          maxTimeout: 50,
        })
      ).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on transient errors even with abort logic", async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("Temporary network issue");
        }
        return "success";
      });

      const result = await withRetryAbort(mockOperation, {
        retries: 3,
        minTimeout: 10,
        maxTimeout: 50,
      });

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe("shouldAbortRetry", () => {
    it("should return true for permission denied errors", () => {
      const error = new Error("Permission denied");
      expect(shouldAbortRetry(error)).toBe(true);
    });

    it("should return true for not found errors", () => {
      const error = new Error("Resource not found");
      expect(shouldAbortRetry(error)).toBe(true);
    });

    it("should return true for invalid argument errors", () => {
      const error = new Error("Invalid argument: questionId");
      expect(shouldAbortRetry(error)).toBe(true);
    });

    it("should return true for unauthenticated errors", () => {
      const error = new Error("Unauthenticated user");
      expect(shouldAbortRetry(error)).toBe(true);
    });

    it("should return true for already exists errors", () => {
      const error = new Error("Document already exists");
      expect(shouldAbortRetry(error)).toBe(true);
    });

    it("should return false for transient errors", () => {
      const error = new Error("Network timeout");
      expect(shouldAbortRetry(error)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      expect(shouldAbortRetry("string error")).toBe(false);
      expect(shouldAbortRetry(null)).toBe(false);
      expect(shouldAbortRetry(undefined)).toBe(false);
    });
  });
});
