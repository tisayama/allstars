/**
 * E2E Test Suite: Projector WebSocket Reconnection
 *
 * Tests WebSocket reconnection logic with exponential backoff after network disruptions.
 * Validates reconnection timing, retry behavior, and UI status updates.
 *
 * Test Priority: P1 (Critical for 8+ hour events)
 * User Story: US3 - Automatic WebSocket reconnection with exponential backoff
 *
 * Success Criteria Validated:
 * - SC-003: WebSocket reconnects within 10 seconds after disconnect
 * - FR-003: Exponential backoff implemented (1s, 2s, 4s, 8s, 16s, 32s, max 60s)
 * - FR-003: Maximum 10 reconnection attempts before giving up
 */

import { test, expect } from '../fixtures/projector-auth.fixture';
import { TEST_DATA } from '../helpers/test-data';
import { NetworkState } from '../helpers/network-simulation';

/**
 * TC-RECON-001: Exponential Backoff Timing Verification
 *
 * Validates that WebSocket reconnection follows exponential backoff pattern
 * with correct timing between attempts.
 *
 * Test Flow:
 * 1. Establish initial connection
 * 2. Force disconnect via test endpoint
 * 3. Record reconnection attempt timestamps
 * 4. Verify timing matches exponential backoff (1s, 2s, 4s, 8s, etc.)
 * 5. Verify max backoff is 60 seconds
 *
 * Expected Results:
 * - First retry after ~1 second
 * - Second retry after ~2 seconds from first
 * - Third retry after ~4 seconds from second
 * - Backoff caps at 60 seconds
 * - Timing tolerance: ±500ms per attempt
 */
test('TC-RECON-001: WebSocket reconnection follows exponential backoff timing @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish connection
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // ASSERT: Initial connection established
  expect(await projectorPage.isWebSocketConnected()).toBe(true);

  // Start recording reconnection attempts
  const reconnectionAttempts: number[] = [];
  projectorPage.page.on('console', msg => {
    if (msg.text().includes('WebSocket reconnection attempt')) {
      reconnectionAttempts.push(Date.now());
    }
  });

  // ACT: Force WebSocket disconnect
  const disconnectTime = Date.now();
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

  // Wait for at least 5 reconnection attempts
  await projectorPage.page.waitForTimeout(20000); // ~1s + 2s + 4s + 8s + margin

  // ASSERT: Verify exponential backoff timing
  expect(reconnectionAttempts.length).toBeGreaterThanOrEqual(5);

  // Calculate delays between attempts
  const delays: number[] = [];
  for (let i = 0; i < reconnectionAttempts.length - 1; i++) {
    delays.push(reconnectionAttempts[i + 1] - reconnectionAttempts[i]);
  }

  // Expected delays with ±500ms tolerance
  const expectedDelays = [1000, 2000, 4000, 8000, 16000, 32000, 60000];
  const tolerance = 500;

  for (let i = 0; i < Math.min(delays.length, expectedDelays.length); i++) {
    const expected = expectedDelays[i];
    const actual = delays[i];
    const diff = Math.abs(actual - expected);

    expect(diff).toBeLessThan(tolerance);
  }

  // ASSERT: Max backoff is 60 seconds
  const maxDelay = Math.max(...delays.slice(6)); // After 6th attempt
  expect(maxDelay).toBeLessThanOrEqual(60000 + tolerance);
});

/**
 * TC-RECON-002: Successful Reconnection Within 10 Seconds
 *
 * Validates that WebSocket successfully reconnects after network restoration
 * within the 10-second performance requirement.
 *
 * Test Flow:
 * 1. Establish initial connection
 * 2. Disconnect WebSocket
 * 3. Wait 2 seconds (simulating brief outage)
 * 4. Restore network
 * 5. Measure time until reconnection
 *
 * Expected Results:
 * - Reconnection completes within 10 seconds (SC-003)
 * - Connection status UI updates to "connected"
 * - Game state updates resume after reconnection
 * - No data loss during disconnection period
 */
test('TC-RECON-002: WebSocket reconnects within 10 seconds after network restoration @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish connection
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // ACT: Disconnect WebSocket
  const disconnectTime = Date.now();
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

  // Wait 2 seconds to simulate brief network outage
  await projectorPage.page.waitForTimeout(2000);

  // Restore network
  await networkSimulator.setState(NetworkState.ONLINE);

  // ASSERT: Reconnection completes within 10 seconds
  const reconnectStartTime = Date.now();
  await projectorPage.waitForWebSocketConnection(10000);
  const reconnectionTime = Date.now() - reconnectStartTime;

  expect(reconnectionTime).toBeLessThan(10000);

  // ASSERT: Connection status updated
  const isConnected = await projectorPage.isWebSocketConnected();
  expect(isConnected).toBe(true);

  // ASSERT: Game state updates resume
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question'
  });

  // Wait for phase update via WebSocket or Firestore
  await projectorPage.waitForPhase('showing_question', 2000);

  const currentPhase = await projectorPage.getCurrentPhase();
  expect(currentPhase).toContain('showing_question');
});

/**
 * TC-RECON-003: Reconnection Status UI Updates
 *
 * Validates that the UI displays reconnection status and attempt count
 * during network disruptions.
 *
 * Test Flow:
 * 1. Establish initial connection
 * 2. Disconnect WebSocket
 * 3. Verify "reconnecting" status displayed
 * 4. Verify attempt count increments
 * 5. Restore network and verify "connected" status
 *
 * Expected Results:
 * - Status shows "Reconnecting..." during attempts
 * - Attempt count displayed (e.g., "Attempt 1 of 10")
 * - Status returns to "Connected" after successful reconnection
 * - No error messages after successful reconnection
 */
test('TC-RECON-003: UI shows reconnection status and attempt count @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish connection
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // ACT: Disconnect WebSocket
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

  // ASSERT: Reconnecting status displayed
  await projectorPage.page.waitForSelector('[data-testid="reconnection-status"]', {
    timeout: 2000
  });

  const reconnectionStatus = await projectorPage.page
    .locator('[data-testid="reconnection-status"]')
    .textContent();

  expect(reconnectionStatus).toContain('Reconnecting');

  // ASSERT: Attempt count displayed
  await projectorPage.page.waitForTimeout(3000); // Wait for at least 2 attempts

  const attemptCount = await projectorPage.page
    .locator('[data-testid="reconnection-attempts"]')
    .textContent();

  expect(attemptCount).toMatch(/Attempt \d+ of 10/);

  // Extract attempt number
  const attemptMatch = attemptCount?.match(/Attempt (\d+)/);
  const attemptNumber = attemptMatch ? parseInt(attemptMatch[1]) : 0;
  expect(attemptNumber).toBeGreaterThanOrEqual(1);
  expect(attemptNumber).toBeLessThanOrEqual(10);

  // ACT: Restore network
  await networkSimulator.setState(NetworkState.ONLINE);
  await projectorPage.waitForWebSocketConnection(10000);

  // ASSERT: Status returns to "Connected"
  const connectionStatus = await projectorPage.getConnectionStatus();
  expect(connectionStatus).toContain('connected');

  // ASSERT: Reconnection status cleared
  const isReconnectionVisible = await projectorPage.page
    .locator('[data-testid="reconnection-status"]')
    .isVisible();
  expect(isReconnectionVisible).toBe(false);

  // ASSERT: No error messages
  const errorMessage = await projectorPage.getErrorMessage();
  expect(errorMessage).toBeNull();
});

/**
 * TC-RECON-004: Reconnection Failure After Max Attempts
 *
 * Validates that reconnection stops after maximum attempts (10)
 * and displays appropriate error message.
 *
 * Test Flow:
 * 1. Establish initial connection
 * 2. Disconnect WebSocket permanently (no restoration)
 * 3. Wait for all 10 reconnection attempts
 * 4. Verify reconnection stops
 * 5. Verify error message displayed
 *
 * Expected Results:
 * - Exactly 10 reconnection attempts made
 * - No further attempts after 10th failure
 * - Error message: "Connection lost. Please refresh the page."
 * - Fallback to Firestore still active
 */
test('TC-RECON-004: Reconnection stops after 10 failed attempts @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish connection
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Track reconnection attempts
  let attemptCount = 0;
  projectorPage.page.on('console', msg => {
    if (msg.text().includes('WebSocket reconnection attempt')) {
      attemptCount++;
    }
  });

  // ACT: Disconnect WebSocket permanently
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

  // Wait for all attempts to complete
  // Max time: 1+2+4+8+16+32+60+60+60+60 = ~303 seconds
  // Use shorter timeout and check periodically
  let lastAttemptCount = 0;
  let stableCount = 0;

  for (let i = 0; i < 60; i++) { // Check for 60 seconds
    await projectorPage.page.waitForTimeout(1000);

    if (attemptCount === lastAttemptCount) {
      stableCount++;
      if (stableCount >= 5 && attemptCount >= 10) {
        // No new attempts for 5 seconds, and we've reached max attempts
        break;
      }
    } else {
      stableCount = 0;
      lastAttemptCount = attemptCount;
    }
  }

  // ASSERT: Exactly 10 attempts made
  expect(attemptCount).toBe(10);

  // ASSERT: Error message displayed
  await projectorPage.page.waitForSelector('[data-testid="connection-error"]', {
    timeout: 5000
  });

  const errorMessage = await projectorPage.page
    .locator('[data-testid="connection-error"]')
    .textContent();

  expect(errorMessage).toContain('Connection lost');
  expect(errorMessage).toContain('refresh');

  // ASSERT: Firestore fallback still active (can receive updates)
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question'
  });

  // Should receive update via Firestore even with WebSocket failed
  await projectorPage.waitForPhase('showing_question', 3000);
  const currentPhase = await projectorPage.getCurrentPhase();
  expect(currentPhase).toContain('showing_question');
});

/**
 * TC-RECON-005: Network Simulation Accuracy
 *
 * Validates that the NetworkSimulator correctly isolates WebSocket
 * disconnections without affecting Firestore connectivity.
 *
 * Test Flow:
 * 1. Establish both WebSocket and Firestore connections
 * 2. Set network state to FIRESTORE_ONLY
 * 3. Verify WebSocket disconnected but Firestore active
 * 4. Verify game state updates via Firestore
 * 5. Set network state to WEBSOCKET_ONLY
 * 6. Verify Firestore blocked but WebSocket active
 *
 * Expected Results:
 * - FIRESTORE_ONLY: WebSocket disconnected, Firestore receives updates
 * - WEBSOCKET_ONLY: Firestore blocked, WebSocket active
 * - ONLINE: Both connections active
 * - OFFLINE: Both connections inactive
 * - No cross-channel interference
 */
test('TC-RECON-005: Network simulator accurately isolates WebSocket and Firestore @P1', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish both connections
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // ASSERT: Both connections initially active
  expect(await projectorPage.isWebSocketConnected()).toBe(true);

  const isFirestoreActive = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_ACTIVE__ === true;
  });
  expect(isFirestoreActive).toBe(true);

  // TEST 1: FIRESTORE_ONLY mode
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);
  await projectorPage.page.waitForTimeout(2000);

  // ASSERT: WebSocket disconnected
  const wsConnectedDuringFirestoreOnly = await projectorPage.isWebSocketConnected();
  expect(wsConnectedDuringFirestoreOnly).toBe(false);

  // ASSERT: Firestore still active
  const firestoreActiveDuringFirestoreOnly = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_ACTIVE__ === true;
  });
  expect(firestoreActiveDuringFirestoreOnly).toBe(true);

  // ASSERT: Game state updates via Firestore
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question'
  });

  await projectorPage.waitForPhase('showing_question', 2000);
  const phaseAfterFirestoreUpdate = await projectorPage.getCurrentPhase();
  expect(phaseAfterFirestoreUpdate).toContain('showing_question');

  // TEST 2: ONLINE mode (restore both)
  await networkSimulator.setState(NetworkState.ONLINE);
  await projectorPage.waitForWebSocketConnection(10000);

  // ASSERT: Both connections restored
  expect(await projectorPage.isWebSocketConnected()).toBe(true);

  const firestoreActiveAfterRestore = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_ACTIVE__ === true;
  });
  expect(firestoreActiveAfterRestore).toBe(true);

  // TEST 3: WEBSOCKET_ONLY mode
  await networkSimulator.setState(NetworkState.WEBSOCKET_ONLY);
  await projectorPage.page.waitForTimeout(2000);

  // ASSERT: WebSocket still connected
  const wsConnectedDuringWebSocketOnly = await projectorPage.isWebSocketConnected();
  expect(wsConnectedDuringWebSocketOnly).toBe(true);

  // ASSERT: Firestore blocked
  const firestoreActiveDuringWebSocketOnly = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_ACTIVE__ === true;
  });
  expect(firestoreActiveDuringWebSocketOnly).toBe(false);

  // TEST 4: OFFLINE mode
  await networkSimulator.setState(NetworkState.OFFLINE);
  await projectorPage.page.waitForTimeout(2000);

  // ASSERT: Both connections offline
  const wsConnectedDuringOffline = await projectorPage.isWebSocketConnected();
  expect(wsConnectedDuringOffline).toBe(false);

  const firestoreActiveDuringOffline = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_ACTIVE__ === true;
  });
  expect(firestoreActiveDuringOffline).toBe(false);

  // Restore for cleanup
  await networkSimulator.setState(NetworkState.ONLINE);
});
