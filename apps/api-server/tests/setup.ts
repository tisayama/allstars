/**
 * Jest test environment setup
 * Configures environment variables for Firebase Emulator
 */

// Mock p-retry module globally (ES module compatibility)
jest.mock("p-retry", () => {
  class AbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AbortError";
    }
  }

  const mockPRetry = jest.fn(async (operation, options) => {
    let lastError: Error | undefined;
    const maxAttempts = (options?.retries || 3) + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AbortError) {
          throw error;
        }

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

// Configure Firebase Emulator environment variables
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.NODE_ENV = "test";

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
