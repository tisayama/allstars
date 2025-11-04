import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'tests/e2e/helpers/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'tests/e2e/**/*.test.ts',
        'tests/e2e/**/*.spec.ts',
        'tests/e2e/globalSetup.ts',
        'tests/e2e/globalTeardown.ts',
        'tests/e2e/fixtures.ts',
        'tests/e2e/fixtures/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      reportsDirectory: './coverage',
      all: true,
    },
  },
});
