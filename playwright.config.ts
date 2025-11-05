import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing infrastructure
 * Feature: 008-e2e-playwright-tests
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e/scenarios',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (2 retries = 3 total attempts)
  retries: process.env.CI ? 2 : 1,

  // Opt out of parallel tests on CI (resource constraints)
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/junit.xml' }]] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigating to apps
    baseURL: process.env.BASE_URL || 'http://localhost',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Global setup/teardown
  globalSetup: require.resolve('./tests/e2e/globalSetup.ts'),
  globalTeardown: require.resolve('./tests/e2e/globalTeardown.ts'),

  // Web server configuration (if needed for health checks)
  webServer: [
    // Note: Apps are launched in globalSetup, not via webServer config
    // This allows for more control over startup order and health checks
  ],
});
