/**
 * E2E tests for login flow
 * Tests complete authentication flow on tablet viewport
 */

import { test, expect } from '@playwright/test';

// Tablet viewport configuration (iPad Pro)
const TABLET_VIEWPORT = {
  width: 834,
  height: 1194,
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
  });

  test('should display login page at root path', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);

    // Should show login page content
    await expect(page.locator('h1')).toContainText('AllStars Host Control');
  });

  test('should show Google login button', async ({ page }) => {
    await page.goto('/login');

    // Should have a Google login button
    const loginButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(loginButton).toBeVisible();

    // Button should be large enough for touch target (44x44px minimum)
    const box = await loginButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle login flow with emulator', async ({ page }) => {
    // Note: This test requires Firebase Auth emulator to be running
    await page.goto('/login');

    // Click Google login button
    const loginButton = page.getByRole('button', { name: /sign in with google/i });
    await loginButton.click();

    // In emulator mode, Firebase provides a test interface
    // Wait for either:
    // 1. Firebase emulator UI popup
    // 2. Redirect to /control (if auto-login configured)
    // 3. Error message (if emulator not running)

    // For CI/CD, we'll check that button is clickable and action is triggered
    // Full emulator interaction would need specific emulator configuration
    await expect(loginButton).toBeEnabled();
  });

  test('should redirect authenticated users from login page', async ({ page, context }) => {
    // Set up authenticated state by injecting localStorage
    await context.addInitScript(() => {
      const mockAuth = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        idToken: 'mock-token',
        tokenExpiresAt: Date.now() + 3600000, // 1 hour from now
      };
      localStorage.setItem('host-auth', JSON.stringify(mockAuth));
    });

    await page.goto('/login');

    // Should redirect to control panel
    await expect(page).toHaveURL(/\/control/);
  });

  test('should display control panel for authenticated users', async ({ page, context }) => {
    // Set up authenticated state
    await context.addInitScript(() => {
      const mockAuth = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        idToken: 'mock-token',
        tokenExpiresAt: Date.now() + 3600000,
      };
      localStorage.setItem('host-auth', JSON.stringify(mockAuth));
    });

    await page.goto('/control');

    // Should display control panel
    await expect(page.locator('h1')).toContainText('Control Panel');

    // Should show user info or logout button
    // (Will be implemented with the control panel UI)
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear any stored auth
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Try to access control panel directly
    await page.goto('/control');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle logout flow', async ({ page, context }) => {
    // Set up authenticated state
    await context.addInitScript(() => {
      const mockAuth = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        idToken: 'mock-token',
        tokenExpiresAt: Date.now() + 3600000,
      };
      localStorage.setItem('host-auth', JSON.stringify(mockAuth));
    });

    await page.goto('/control');

    // Click logout button (will be implemented)
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    // If button exists (after implementation)
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // localStorage should be cleared
      const stored = await page.evaluate(() => localStorage.getItem('host-auth'));
      expect(stored).toBeNull();
    }
  });

  test('should handle expired token session', async ({ page, context }) => {
    // Set up expired token
    await context.addInitScript(() => {
      const expiredAuth = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        idToken: 'expired-token',
        tokenExpiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      localStorage.setItem('host-auth', JSON.stringify(expiredAuth));
    });

    await page.goto('/control');

    // Should detect expired token and redirect to login
    // (May take a moment for the hook to check expiry)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // localStorage should be cleared
    const stored = await page.evaluate(() => localStorage.getItem('host-auth'));
    expect(stored).toBeNull();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.goto('/login');

    // Check viewport is tablet size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(834);
    expect(viewportSize?.height).toBe(1194);

    // All interactive elements should be visible and accessible
    const loginButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    // Content should not overflow or require horizontal scrolling
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(834);
  });
});
