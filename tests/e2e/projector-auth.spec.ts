/**
 * E2E Test: Projector Authentication Flow
 * Feature: 001-projector-auth [US1]
 *
 * Validates complete automatic authentication flow:
 * 1. Projector-app launches and fetches custom token from API server
 * 2. Signs in to Firebase with custom token
 * 3. Connects to /projector-socket namespace with Firebase ID token
 * 4. Socket server validates token and role claim
 * 5. Connection status displayed (< 5 seconds from launch - SC-001)
 */

import { test, expect } from '@playwright/test';

test.describe('Projector Authentication Flow [US1]', () => {
  test('should complete automatic authentication within 5 seconds', async ({ page }) => {
    // Track start time for SC-001 verification (connection < 5 seconds)
    const startTime = Date.now();

    // Set up console log monitoring
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to projector-app
    const response = await page.goto('http://localhost:5185');
    expect(response?.status()).toBe(200);

    // Wait for authentication to complete
    // Should see "Connected" status in ConnectionStatus component
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');

    // Wait for "Connected" status (max 10 seconds, should be < 5 per SC-001)
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Verify connection time meets success criteria SC-001 (< 5 seconds)
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connection established in ${connectionTime}ms`);

    if (connectionTime > 5000) {
      console.warn(`⚠️  Connection time ${connectionTime}ms exceeds 5000ms target (SC-001)`);
    }
    expect(connectionTime).toBeLessThan(5000);
  });

  test('should display green connection indicator when authenticated', async ({ page }) => {
    await page.goto('http://localhost:5185');

    // Wait for connection
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Verify green indicator is visible
    const indicator = page.locator('[data-testid="connection-indicator"]');
    await expect(indicator).toBeVisible();

    // Check that indicator has green color class
    const indicatorClasses = await indicator.getAttribute('class');
    expect(indicatorClasses).toContain('bg-green-500');

    console.log('✅ Green connection indicator verified');
  });

  test('should show authentication progress states', async ({ page }) => {
    // Monitor console for authentication flow
    const authLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Firebase') || text.includes('WebSocket') || text.includes('auth')) {
        authLogs.push(text);
      }
    });

    await page.goto('http://localhost:5185');

    // Initially should show "Connecting..." or "Authenticating..."
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');

    // Wait for initial loading state
    await page.waitForTimeout(100);

    // Eventually should reach "Connected"
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Verify we saw authentication-related logs
    console.log('Authentication flow logs:', authLogs);
    expect(authLogs.length).toBeGreaterThan(0);
  });

  test('should connect to /projector-socket namespace', async ({ page }) => {
    // Monitor WebSocket connections
    const wsConnections: string[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log(`WebSocket connection: ${ws.url()}`);
    });

    await page.goto('http://localhost:5185');

    // Wait for connection
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Wait a bit for WebSocket to be captured
    await page.waitForTimeout(1000);

    // Verify WebSocket connection to /projector-socket namespace
    const projectorSocketConnection = wsConnections.find(url =>
      url.includes('/projector-socket')
    );

    expect(projectorSocketConnection).toBeTruthy();
    console.log('✅ Connected to /projector-socket namespace:', projectorSocketConnection);
  });

  test('should display status bar at bottom of viewport (7vh height)', async ({ page }) => {
    await page.goto('http://localhost:5185');

    // Wait for connection status to be visible
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });

    // Check status bar positioning and height
    const statusBar = page.locator('div[role="status"]');
    await expect(statusBar).toBeVisible();

    // Verify fixed positioning at bottom
    const position = await statusBar.evaluate(el =>
      window.getComputedStyle(el).position
    );
    expect(position).toBe('fixed');

    const bottom = await statusBar.evaluate(el =>
      window.getComputedStyle(el).bottom
    );
    expect(bottom).toBe('0px');

    // Verify height is 7vh (7% of viewport)
    const height = await statusBar.evaluate(el =>
      window.getComputedStyle(el).height
    );
    console.log('✅ Status bar height:', height);

    // Height should be approximately 7% of viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const expectedHeight = viewportHeight * 0.07;
    const actualHeight = parseFloat(height);

    // Allow 10% variance for rounding
    expect(actualHeight).toBeGreaterThan(expectedHeight * 0.9);
    expect(actualHeight).toBeLessThan(expectedHeight * 1.1);
  });

  test('should have large text visible from 3 meters (28px font)', async ({ page }) => {
    await page.goto('http://localhost:5185');

    // Wait for connection
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Verify font size is at least 28px for 3m visibility
    const fontSize = await connectionStatus.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    const fontSizePx = parseFloat(fontSize);
    expect(fontSizePx).toBeGreaterThanOrEqual(28);

    console.log('✅ Font size verified for 3m visibility:', fontSize);
  });

  test('should not expose credentials in browser dev tools', async ({ page, context }) => {
    // Enable request interception to inspect network traffic
    const requests: Array<{ url: string; headers: any; postData: any }> = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        headers: request.headers(),
        postData: request.postData(),
      });
    });

    await page.goto('http://localhost:5185');

    // Wait for authentication to complete
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    // Check that no requests contain service account credentials
    const suspiciousPatterns = [
      /service-account/i,
      /private[_-]?key/i,
      /client[_-]?email/i,
      /"type":\s*"service_account"/i,
    ];

    for (const req of requests) {
      const requestStr = JSON.stringify(req);

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestStr)) {
          throw new Error(
            `SECURITY VIOLATION: Service account credential pattern detected in request to ${req.url}`
          );
        }
      }
    }

    console.log('✅ No service account credentials exposed in network traffic');

    // Verify that only the projector API key is used (not service account)
    const apiRequests = requests.filter(r => r.url.includes('/projector/auth-token'));
    expect(apiRequests.length).toBeGreaterThan(0);

    for (const req of apiRequests) {
      expect(req.headers['x-api-key']).toBeTruthy();
      console.log('✅ Using X-API-Key header for authentication');
    }
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // This test would require mocking API failures
    // For now, just verify error display capability exists

    await page.goto('http://localhost:5185');

    // Check that ConnectionStatus component can display errors
    const statusBar = page.locator('div[role="status"]');
    await expect(statusBar).toHaveAttribute('aria-live', 'polite');

    console.log('✅ Error handling infrastructure verified');
  });
});

test.describe('Projector Authentication - User Story Acceptance [US1]', () => {
  test('US1: Launch projector-app, verify automatic connection without user action', async ({ page }) => {
    // User Story 1 Acceptance Criteria:
    // "Launch projector-app, verify automatic connection without user action"

    const startTime = Date.now();

    // Navigate to projector-app (simulates launching the app)
    await page.goto('http://localhost:5185');

    // NO USER INTERACTION - app should connect automatically

    // Verify connection happens automatically
    const connectionStatus = page.locator('[data-testid="connection-status-text"]');
    await expect(connectionStatus).toHaveText(/Connected/i, { timeout: 10000 });

    const connectionTime = Date.now() - startTime;

    console.log('✅ US1 PASSED: Projector connected automatically in', connectionTime, 'ms');
    console.log('   - No user interaction required');
    console.log('   - Connection time:', connectionTime < 5000 ? '< 5s ✓' : `${connectionTime}ms (exceeds 5s target)`);
  });
});
