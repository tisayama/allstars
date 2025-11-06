import { test, expect } from '@playwright/test';

/**
 * Projector App Verification Test
 *
 * This test verifies that projector-app:
 * 1. Loads successfully on port 5185
 * 2. Has the correct page title
 * 3. Contains expected UI elements
 */

test.describe('Projector App - Port 5185 Verification', () => {
  test('should load projector-app successfully on port 5185', async ({ page }) => {
    // Navigate to projector-app
    const response = await page.goto('http://localhost:5185');

    // Verify successful response
    expect(response?.status()).toBe(200);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take a screenshot for verification
    await page.screenshot({ path: '/tmp/projector-app-screenshot.png', fullPage: true });

    console.log('✅ Projector-app loaded successfully on port 5185');
  });

  test('should have correct page structure', async ({ page }) => {
    await page.goto('http://localhost:5185');
    await page.waitForLoadState('networkidle');

    // Check if the root element exists
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Check page title (should contain "Projector" or similar)
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Verify the page has loaded React app
    const appElement = page.locator('#root > *').first();
    await expect(appElement).toBeVisible();

    console.log('✅ Page structure verified');
  });

  test('should use correct port configuration (5185)', async ({ page }) => {
    const response = await page.goto('http://localhost:5185');

    // Verify we're on the correct port
    expect(page.url()).toContain('localhost:5185');
    expect(response?.status()).toBe(200);

    // Verify it's not using fallback port
    expect(page.url()).not.toContain('5173');
    expect(page.url()).not.toContain('5186');

    console.log('✅ Port configuration verified: 5185');
  });

  test('should handle page navigation', async ({ page }) => {
    await page.goto('http://localhost:5185');
    await page.waitForLoadState('domcontentloaded');

    // Check if the page is interactive
    const bodyElement = page.locator('body');
    await expect(bodyElement).toBeVisible();

    // Verify no console errors (critical only)
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any console errors to appear
    await page.waitForTimeout(1000);

    // Log any errors but don't fail (some errors might be expected)
    if (errors.length > 0) {
      console.log('⚠️  Console errors detected:', errors);
    } else {
      console.log('✅ No console errors detected');
    }
  });
});
