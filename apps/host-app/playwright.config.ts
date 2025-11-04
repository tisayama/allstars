import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Host Control App E2E tests
 * Optimized for tablet testing (768-1024px viewport)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 834, height: 1194 }, // Portrait
      },
    },
    {
      name: 'tablet-ipad-landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        viewport: { width: 1194, height: 834 }, // Landscape
      },
    },
    {
      name: 'tablet-android',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 768, height: 1024 }, // Standard tablet
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
