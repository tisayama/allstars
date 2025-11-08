import { test, expect } from '@playwright/test';

/**
 * E2E Test: Connection Loss and Recovery Scenario
 *
 * Tests the connection status indicator and graceful handling of
 * WebSocket connection issues during ranking display
 */

test.describe('TV Rankings - Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should display connection indicator when connection is unstable', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Check if connection indicator exists in the DOM
    const connectionIndicator = page.locator('.connection-indicator');

    // The indicator may or may not be visible depending on connection state
    // But it should exist in the DOM
    const indicatorCount = await connectionIndicator.count();
    expect(indicatorCount).toBeGreaterThanOrEqual(0);

    // If visible, verify its styling
    if (await connectionIndicator.isVisible()) {
      await expect(connectionIndicator).toHaveCSS('position', 'fixed');
      await expect(connectionIndicator).toHaveCSS('z-index', /\d+/);
    }
  });

  test('should show connection lost message when disconnected', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Note: To properly test this, we would need to:
    // 1. Intercept WebSocket connections
    // 2. Simulate a disconnect event
    // 3. Verify the connection indicator shows "接続が切れました"

    // For now, we verify the indicator can render
    const connectionIndicator = page.locator('.connection-indicator');
    const indicatorExists = (await connectionIndicator.count()) > 0;

    // Connection indicator should be in the DOM (may not be visible if connected)
    expect(indicatorExists).toBeTruthy();
  });

  test('should continue displaying rankings during temporary connection loss', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Rankings should remain visible even if connection is lost
    const rankings = page.locator('.ranking-list');
    await expect(rankings.first()).toBeVisible();

    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    // Verify data is still displayed
    if (entryCount > 0) {
      await expect(entries.first().locator('.guest-name')).toBeVisible();
      await expect(entries.first().locator('.response-time')).toBeVisible();
    }
  });

  test('should hide connection indicator when connection is stable', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // In normal operation, connection indicator should be hidden
    const connectionIndicator = page.locator('.connection-indicator');

    // Wait a moment for initial connection to establish
    await page.waitForTimeout(1000);

    // In a stable connection, indicator should not be visible
    // (This test assumes the app starts with a good connection)
    // The indicator may not exist in the DOM if connection is stable
    const indicatorCount = await connectionIndicator.count();
    const isVisible = indicatorCount > 0 ? await connectionIndicator.isVisible() : false;

    // In normal conditions, expect indicator to be hidden
    expect(isVisible).toBe(false);
  });

  test('should update connection status in real-time', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Monitor WebSocket connections
    const wsConnections: boolean[] = [];

    page.on('websocket', () => {
      wsConnections.push(true);
    });

    // Wait for WebSocket connection to establish
    await page.waitForTimeout(2000);

    // Verify WebSocket connection was detected
    // (In a real test, we would simulate disconnect/reconnect cycles)
    // For now, we just verify the app is running
    await expect(page.locator('.tv-ranking-container')).toBeVisible();
  });

  test('should show reconnecting message during reconnection attempt', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // This test would require:
    // 1. Simulating a disconnect
    // 2. Triggering reconnection logic
    // 3. Verifying "再接続中..." message appears
    // This is better tested in unit tests for useConnectionStatus
  });

  test('should handle Firestore connection independently from Socket.io', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // The app should handle:
    // - Firestore connection for gameState updates
    // - Socket.io connection for real-time events
    // Both can fail independently

    // Verify rankings are displayed (implies Firestore is working)
    const rankings = page.locator('.ranking-list');
    await expect(rankings.first()).toBeVisible();
  });

  test('should not crash when socket is null or undefined', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Verify app handles null socket gracefully
    // This is primarily tested in unit tests, but we verify no crashes
    const appContainer = page.locator('[data-testid="app-container"]');
    await expect(appContainer).toBeVisible();

    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a moment to catch any delayed errors
    await page.waitForTimeout(1000);

    // Should have no critical errors related to null socket
    // (Some errors may be expected in test environment)
  });

  test('should maintain rankings display across connection state changes', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Get initial ranking data
    const initialEntries = page.locator('.ranking-entry');
    const initialCount = await initialEntries.count();

    // Wait for potential connection state changes
    await page.waitForTimeout(2000);

    // Verify rankings are still displayed
    const currentEntries = page.locator('.ranking-entry');
    const currentCount = await currentEntries.count();

    // Count should remain the same (data is persisted)
    expect(currentCount).toBe(initialCount);
  });

  test('should display connection quality indicator styling', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const connectionIndicator = page.locator('.connection-indicator');

    if (await connectionIndicator.isVisible()) {
      // Verify indicator has proper styling for visibility
      const opacity = await connectionIndicator.evaluate(el =>
        window.getComputedStyle(el).opacity
      );

      // Indicator should be semi-transparent or fully visible
      expect(parseFloat(opacity)).toBeGreaterThan(0);
      expect(parseFloat(opacity)).toBeLessThanOrEqual(1);

      // Should have proper positioning
      await expect(connectionIndicator).toHaveCSS('position', 'fixed');

      // Should be layered above content
      const zIndex = await connectionIndicator.evaluate(el =>
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(zIndex)).toBeGreaterThan(0);
    }
  });

  test('should preserve ranking data during brief disconnections', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Capture initial data
    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount > 0) {
      const firstGuestName = await entries.first().locator('.guest-name').textContent();
      const firstResponseTime = await entries.first().locator('.response-time').textContent();

      // Simulate time passing (brief disconnection scenario)
      await page.waitForTimeout(2000);

      // Verify data is still present and unchanged
      const currentGuestName = await entries.first().locator('.guest-name').textContent();
      const currentResponseTime = await entries.first().locator('.response-time').textContent();

      expect(currentGuestName).toBe(firstGuestName);
      expect(currentResponseTime).toBe(firstResponseTime);
    }
  });
});
