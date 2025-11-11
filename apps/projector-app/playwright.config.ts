import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Projector App E2E tests
 * Optimized for large display testing (1920x1080 Full HD)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5185',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'full-hd-display',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // Full HD TV display
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5185',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
