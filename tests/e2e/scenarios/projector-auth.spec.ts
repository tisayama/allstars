/**
 * E2E Test Suite: Projector Authentication Flow
 *
 * Tests browser-based Firebase Anonymous Authentication for projector-app.
 * Validates authentication success, error handling, and performance requirements.
 *
 * Test Priority: P1 (Critical path)
 * User Story: US1 - Browser-based authentication with custom token flow
 *
 * Success Criteria Validated:
 * - SC-001: Authentication completes within 3 seconds
 * - SC-002: Authenticated projector connects to WebSocket within 5 seconds
 * - SC-003: Valid auth token presented to WebSocket server
 * - SC-004: Graceful error handling for invalid API keys
 * - SC-005: Graceful error handling for network failures during auth
 */

import { test, expect } from '../fixtures/projector-auth.fixture';
import { TEST_DATA } from '../helpers/test-data';
import { NetworkState } from '../helpers/network-simulation';

/**
 * TC-AUTH-001: Initial Authentication Success
 *
 * Validates that projector-app successfully authenticates with Firebase
 * using custom token flow within performance requirements.
 *
 * Test Flow:
 * 1. Load projector-app page
 * 2. Measure authentication completion time
 * 3. Verify authenticated state
 * 4. Verify WebSocket connection established
 * 5. Validate performance metrics
 *
 * Expected Results:
 * - Authentication completes within 3 seconds (SC-001)
 * - WebSocket connection established within 5 seconds (SC-002)
 * - Valid auth token used for WebSocket authentication (SC-003)
 * - No console errors during authentication
 */
test('TC-AUTH-001: Initial authentication completes successfully within 3 seconds @P1', async ({
  projectorPage,
  metricsCollector,
  seeder
}) => {
  // ARRANGE: Seed initial game state
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);

  // ACT: Load projector page and measure authentication time
  const startTime = Date.now();
  await projectorPage.goto();

  // Wait for authentication to complete
  await projectorPage.waitForAuthentication(3000);

  // Collect authentication metrics
  const authMetrics = await metricsCollector.collectAuthMetrics();
  const authTime = Date.now() - startTime;

  // ASSERT: Verify authentication success
  expect(authMetrics.authSuccess).toBe(true);
  expect(authMetrics.authError).toBeNull();

  // ASSERT: Verify authentication completes within 3 seconds (SC-001)
  expect(authTime).toBeLessThan(3000);
  expect(authMetrics.authTime).toBeLessThan(3000);

  // ASSERT: Verify authenticated state
  const isAuthenticated = await projectorPage.isAuthenticated();
  expect(isAuthenticated).toBe(true);

  // ASSERT: Verify WebSocket connection established within 5 seconds (SC-002)
  await projectorPage.waitForWebSocketConnection(5000);
  const isConnected = await projectorPage.isWebSocketConnected();
  expect(isConnected).toBe(true);

  // ASSERT: Verify total connection time (auth + WebSocket) within 5 seconds
  const totalConnectionTime = Date.now() - startTime;
  expect(totalConnectionTime).toBeLessThan(5000);

  // ASSERT: Verify no console errors during authentication
  const consoleLogs = await projectorPage.getConsoleErrors();
  const authErrors = consoleLogs.filter(log =>
    log.includes('auth') || log.includes('token')
  );
  expect(authErrors).toHaveLength(0);
});

/**
 * TC-AUTH-002: Authentication Persists Across Page Reload
 *
 * Validates that authenticated session persists after page reload,
 * preventing unnecessary re-authentication.
 *
 * Test Flow:
 * 1. Complete initial authentication
 * 2. Reload page
 * 3. Verify authentication state persists
 * 4. Verify no new token request made
 *
 * Expected Results:
 * - Authentication state persists after reload
 * - No new API calls to /api/projector/auth/token
 * - WebSocket reconnection uses existing token
 * - Page reload completes faster than initial load
 */
test('TC-AUTH-002: Authentication persists across page reload @P1', async ({
  projectorPage,
  metricsCollector
}) => {
  // ARRANGE: Complete initial authentication
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);

  const initialAuthToken = await projectorPage.getAuthToken();
  expect(initialAuthToken).toBeTruthy();

  // ACT: Reload page
  const reloadStartTime = Date.now();
  await projectorPage.reload();

  // Wait for page to be ready
  await projectorPage.waitForAuthentication(3000);
  const reloadTime = Date.now() - reloadStartTime;

  // ASSERT: Verify authentication state persists
  const isAuthenticated = await projectorPage.isAuthenticated();
  expect(isAuthenticated).toBe(true);

  // ASSERT: Verify same auth token used (no re-authentication)
  const currentAuthToken = await projectorPage.getAuthToken();
  expect(currentAuthToken).toBe(initialAuthToken);

  // ASSERT: Verify no new token generation API call
  const apiCalls = await projectorPage.getNetworkCalls('/api/projector/auth/token');
  const callsAfterReload = apiCalls.filter(call => call.timestamp > reloadStartTime);
  expect(callsAfterReload).toHaveLength(0);

  // ASSERT: Verify WebSocket reconnection successful
  const isConnected = await projectorPage.isWebSocketConnected();
  expect(isConnected).toBe(true);

  // ASSERT: Verify reload faster than initial auth (using cached token)
  expect(reloadTime).toBeLessThan(2000);
});

/**
 * TC-AUTH-003: Invalid API Key Handling
 *
 * Validates graceful error handling when invalid API key is provided.
 * Tests FR-009 (API key validation) and SC-004 (error handling).
 *
 * Test Flow:
 * 1. Configure invalid API key
 * 2. Load projector page
 * 3. Verify authentication fails gracefully
 * 4. Verify user-friendly error message displayed
 *
 * Expected Results:
 * - Authentication fails with clear error message (SC-004)
 * - Error message indicates invalid API key
 * - No WebSocket connection attempted
 * - No application crash or uncaught exceptions
 */
test('TC-AUTH-003: Invalid API key shows user-friendly error @P1', async ({
  page,
  seeder
}) => {
  // ARRANGE: Seed game state
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);

  // ACT: Navigate to projector with invalid API key
  // Override API key via query parameter (for testing purposes)
  await page.goto('http://localhost:5175?apiKey=INVALID_KEY_FOR_TEST');

  // Wait for authentication error to appear
  await page.waitForSelector('[data-testid="auth-error"]', { timeout: 5000 });

  // ASSERT: Verify error message displayed
  const errorMessage = await page.locator('[data-testid="auth-error"]').textContent();
  expect(errorMessage).toContain('Authentication failed');
  expect(errorMessage).toContain('API key');

  // ASSERT: Verify authentication status shows failure
  const authStatus = await page.locator('[data-testid="auth-status"]').textContent();
  expect(authStatus).toContain('Not authenticated');

  // ASSERT: Verify no WebSocket connection attempted
  const wsStatus = await page.locator('[data-testid="connection-status"]').textContent();
  expect(wsStatus).toContain('Disconnected');

  // ASSERT: Verify no uncaught exceptions
  const consoleErrors = await page.evaluate(() => {
    return (window as any).__UNCAUGHT_ERRORS__ || [];
  });
  expect(consoleErrors).toHaveLength(0);

  // ASSERT: Verify error logged to console (for debugging)
  const consoleLogs = await page.evaluate(() => {
    return (window as any).__CONSOLE_LOGS__ || [];
  });
  const authErrorLogs = consoleLogs.filter((log: string) =>
    log.includes('401') || log.includes('Unauthorized')
  );
  expect(authErrorLogs.length).toBeGreaterThan(0);
});

/**
 * TC-AUTH-004: Network Failure During Authentication
 *
 * Validates graceful error handling when network fails during authentication.
 * Tests SC-005 (network failure handling).
 *
 * Test Flow:
 * 1. Start page load with network online
 * 2. Simulate network offline during auth
 * 3. Verify retry logic executes
 * 4. Restore network and verify recovery
 *
 * Expected Results:
 * - Authentication retry attempted (exponential backoff)
 * - User-friendly error message during offline state
 * - Automatic recovery when network restored
 * - WebSocket connection established after recovery
 */
test('TC-AUTH-004: Network failure during authentication shows retry behavior @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);

  // Start page load
  await projectorPage.goto();

  // ACT: Simulate network offline during authentication
  await networkSimulator.setState(NetworkState.OFFLINE);

  // Wait for offline error message
  await projectorPage.page.waitForSelector('[data-testid="network-error"]', {
    timeout: 5000
  });

  // ASSERT: Verify offline error message displayed
  const offlineMessage = await projectorPage.page
    .locator('[data-testid="network-error"]')
    .textContent();
  expect(offlineMessage).toContain('Network error');
  expect(offlineMessage).toContain('Retrying');

  // ASSERT: Verify authentication not completed
  const isAuthenticated = await projectorPage.isAuthenticated();
  expect(isAuthenticated).toBe(false);

  // ACT: Restore network
  await networkSimulator.setState(NetworkState.ONLINE);

  // Wait for authentication to complete
  await projectorPage.waitForAuthentication(10000); // Allow extra time for retry

  // ASSERT: Verify authentication success after network restoration
  const authAfterRestore = await projectorPage.isAuthenticated();
  expect(authAfterRestore).toBe(true);

  // ASSERT: Verify WebSocket connection established
  const isConnected = await projectorPage.isWebSocketConnected();
  expect(isConnected).toBe(true);

  // ASSERT: Verify error message cleared
  const errorVisible = await projectorPage.page
    .locator('[data-testid="network-error"]')
    .isVisible();
  expect(errorVisible).toBe(false);
});

/**
 * TC-AUTH-005: Automatic Token Refresh
 *
 * Validates that authentication tokens are automatically refreshed
 * before expiration to maintain long-running sessions.
 *
 * Test Flow:
 * 1. Complete initial authentication
 * 2. Wait for token refresh interval (mock time advancement)
 * 3. Verify token refresh request made
 * 4. Verify WebSocket connection maintained
 *
 * Expected Results:
 * - Token refresh triggered before expiration
 * - WebSocket connection maintained during refresh
 * - No visible disruption to user
 * - Refresh completes within 2 seconds
 */
test('TC-AUTH-005: Token automatically refreshes before expiration @P1', async ({
  projectorPage,
  metricsCollector,
  page
}) => {
  // ARRANGE: Complete initial authentication
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);

  const initialToken = await projectorPage.getAuthToken();
  expect(initialToken).toBeTruthy();

  // ACT: Advance time to trigger token refresh (mock 55 minutes for 1-hour token)
  // Use page.evaluate to manipulate Date object
  await page.evaluate(() => {
    const now = Date.now();
    const originalDate = Date;
    (window as any).Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(now + 55 * 60 * 1000); // 55 minutes later
        } else {
          super(...args);
        }
      }
      static now() {
        return now + 55 * 60 * 1000;
      }
    };
  });

  // Trigger token refresh check (implementation-specific event)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('visibilitychange'));
  });

  // Wait for token refresh to complete
  await page.waitForTimeout(2000);

  // ASSERT: Verify new token generated
  const refreshedToken = await projectorPage.getAuthToken();
  expect(refreshedToken).toBeTruthy();
  expect(refreshedToken).not.toBe(initialToken);

  // ASSERT: Verify token refresh API call made
  const apiCalls = await projectorPage.getNetworkCalls('/api/projector/auth/token');
  expect(apiCalls.length).toBeGreaterThanOrEqual(2); // Initial + refresh

  // ASSERT: Verify WebSocket connection maintained
  const isConnected = await projectorPage.isWebSocketConnected();
  expect(isConnected).toBe(true);

  // ASSERT: Verify no visible disruption
  const currentPhase = await projectorPage.getCurrentPhase();
  expect(currentPhase).toBe('waiting'); // Still displaying correct state
});
