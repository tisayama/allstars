import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace configuration for projector-app
 *
 * Separates unit and integration tests for independent execution:
 * - Unit tests: Fast, no external dependencies, can run anytime
 * - Integration tests: Require Firebase Emulators, slower
 */
export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      globals: true
    }
  },
  {
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: './tests/integration-setup.ts',
      globals: true
    }
  }
]);
