/**
 * E2E Test Suite: Projector Dual-Channel Fallback
 *
 * Tests seamless fallback to Firestore when WebSocket connection fails,
 * and verifies deduplication logic prevents duplicate updates.
 *
 * Test Priority: P2 (Important for stability, but transparent to users)
 * User Story: US4 - Firestore fallback with deduplication
 *
 * Success Criteria Validated:
 * - SC-006: Zero duplicate events when both channels active
 * - FR-011: Firestore fallback latency <500ms
 * - FR-010: Deduplication logic prevents duplicate state updates
 */

import { test, expect } from '../fixtures/projector-auth.fixture';
import { TEST_DATA } from '../helpers/test-data';
import { NetworkState } from '../helpers/network-simulation';

/**
 * TC-FALLBACK-001: Firestore Fallback Latency
 *
 * Validates that when WebSocket disconnects, Firestore listener
 * continues delivering game state updates with <500ms latency.
 *
 * Test Flow:
 * 1. Establish both WebSocket and Firestore connections
 * 2. Disconnect WebSocket
 * 3. Update game state in Firestore
 * 4. Measure time until UI reflects update
 * 5. Verify latency <500ms
 *
 * Expected Results:
 * - Firestore update received within 500ms (FR-011)
 * - UI displays updated game state
 * - No error messages displayed
 * - Seamless transition (no user-visible disruption)
 */
test('TC-FALLBACK-001: Firestore fallback delivers updates within 500ms @P2', async ({
  projectorPage,
  networkSimulator,
  seeder,
  metricsCollector
}) => {
  // ARRANGE: Seed game state and establish both connections
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // ASSERT: Both connections initially active
  expect(await projectorPage.isWebSocketConnected()).toBe(true);

  // ACT: Disconnect WebSocket (Firestore remains active)
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);
  await projectorPage.page.waitForTimeout(1000);

  // ASSERT: WebSocket disconnected, Firestore active
  expect(await projectorPage.isWebSocketConnected()).toBe(false);

  // ACT: Update game state and measure latency
  const updateStartTime = Date.now();

  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question',
    currentQuestionId: 'question_1'
  });

  // Wait for UI to reflect update
  await projectorPage.waitForPhase('showing_question', 1000);

  const latency = Date.now() - updateStartTime;

  // ASSERT: Firestore fallback latency <500ms (FR-011)
  expect(latency).toBeLessThan(500);

  // ASSERT: UI displays updated state
  const currentPhase = await projectorPage.getCurrentPhase();
  expect(currentPhase).toContain('showing_question');

  // ASSERT: No error messages
  const errorMessage = await projectorPage.getErrorMessage();
  expect(errorMessage).toBeNull();

  // Collect and validate fallback metrics
  const fallbackMetrics = await metricsCollector.collectFallbackMetrics();
  expect(fallbackMetrics.firestoreLatency).toBeLessThan(500);
  expect(fallbackMetrics.fallbackActive).toBe(true);
});

/**
 * TC-FALLBACK-002: Zero Duplicate Events with Dual Channels
 *
 * Validates that when both WebSocket and Firestore are active,
 * deduplication logic prevents duplicate state updates.
 *
 * Test Flow:
 * 1. Establish both WebSocket and Firestore connections
 * 2. Update game state (triggers both channels)
 * 3. Monitor state update events
 * 4. Verify only one update applied
 * 5. Repeat with multiple rapid updates
 *
 * Expected Results:
 * - Zero duplicate events (SC-006)
 * - Exactly one UI update per game state change
 * - Deduplication works for rapid successive updates
 * - No race conditions between channels
 */
test('TC-FALLBACK-002: No duplicate events when both channels active @P2', async ({
  projectorPage,
  seeder
}) => {
  // ARRANGE: Seed game state and establish both connections
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Track state update events
  const stateUpdates: Array<{ phase: string; timestamp: number }> = [];

  await projectorPage.page.evaluate(() => {
    (window as any).__STATE_UPDATES__ = [];
    const originalHandler = (window as any).__onStateUpdate__;
    (window as any).__onStateUpdate__ = (state: any) => {
      (window as any).__STATE_UPDATES__.push({
        phase: state.currentPhase,
        timestamp: Date.now()
      });
      if (originalHandler) originalHandler(state);
    };
  });

  // ACT: Update game state (triggers both WebSocket and Firestore)
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question'
  });

  // Wait for update to propagate
  await projectorPage.waitForPhase('showing_question', 2000);

  // Give time for any duplicate updates (should not occur)
  await projectorPage.page.waitForTimeout(1000);

  // ASSERT: Retrieve tracked updates
  const trackedUpdates = await projectorPage.page.evaluate(() => {
    return (window as any).__STATE_UPDATES__ || [];
  });

  // Filter to showing_question updates
  const questionPhaseUpdates = trackedUpdates.filter(
    (u: any) => u.phase === 'showing_question'
  );

  // ASSERT: Exactly one update for showing_question phase (SC-006)
  expect(questionPhaseUpdates.length).toBe(1);

  // ACT: Perform rapid successive updates
  await projectorPage.page.evaluate(() => {
    (window as any).__STATE_UPDATES__ = [];
  });

  for (let i = 0; i < 5; i++) {
    await seeder.seedGameState({
      ...TEST_DATA.INITIAL_GAME_STATE,
      currentPhase: 'waiting',
      currentRound: i + 1
    });
    await projectorPage.page.waitForTimeout(100);
  }

  await projectorPage.page.waitForTimeout(1000);

  // ASSERT: Verify deduplication for rapid updates
  const rapidUpdates = await projectorPage.page.evaluate(() => {
    return (window as any).__STATE_UPDATES__ || [];
  });

  // Should have 5 updates (one per round change), not 10 (which would indicate duplicates)
  expect(rapidUpdates.length).toBeLessThanOrEqual(5);

  // ASSERT: Each round number appears at most once
  const roundCounts = new Map<number, number>();
  rapidUpdates.forEach((update: any) => {
    const count = roundCounts.get(update.round) || 0;
    roundCounts.set(update.round, count + 1);
  });

  roundCounts.forEach((count, round) => {
    expect(count).toBe(1); // Each round exactly once
  });
});

/**
 * TC-FALLBACK-003: Deduplication Logic Correctness
 *
 * Validates that deduplication logic correctly identifies and filters
 * duplicate state updates based on document snapshot metadata.
 *
 * Test Flow:
 * 1. Establish both connections
 * 2. Send same state via both channels
 * 3. Verify deduplication based on timestamp/metadata
 * 4. Send different states sequentially
 * 5. Verify all distinct states applied
 *
 * Expected Results:
 * - Duplicate states filtered (same timestamp/metadata)
 * - Distinct states all applied
 * - Deduplication uses reliable criteria (not content comparison)
 * - No false positives (legitimate updates not blocked)
 */
test('TC-FALLBACK-003: Deduplication logic uses correct criteria @P2', async ({
  projectorPage,
  seeder
}) => {
  // ARRANGE: Seed game state and establish both connections
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Track deduplication decisions
  await projectorPage.page.evaluate(() => {
    (window as any).__DEDUP_LOG__ = [];
  });

  // ACT: Send update via Firestore
  const state1 = {
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question' as const,
    currentQuestionId: 'q1'
  };

  await seeder.seedGameState(state1);
  await projectorPage.waitForPhase('showing_question', 2000);
  await projectorPage.page.waitForTimeout(500);

  // ACT: Send different state (should not be deduplicated)
  const state2 = {
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'accepting_answers' as const,
    currentQuestionId: 'q1'
  };

  await seeder.seedGameState(state2);
  await projectorPage.waitForPhase('accepting_answers', 2000);

  // ASSERT: Both states applied (not deduplicated)
  const currentPhase = await projectorPage.getCurrentPhase();
  expect(currentPhase).toContain('accepting_answers');

  // ACT: Verify deduplication metadata criteria
  const dedupLog = await projectorPage.page.evaluate(() => {
    return (window as any).__DEDUP_LOG__ || [];
  });

  // ASSERT: Deduplication uses updateTime or similar metadata
  const hasMetadataCheck = dedupLog.some((entry: any) =>
    entry.criteria?.includes('updateTime') ||
    entry.criteria?.includes('timestamp') ||
    entry.criteria?.includes('metadata')
  );

  expect(hasMetadataCheck).toBe(true);

  // ASSERT: Content-only changes not deduplicated
  // (e.g., same phase but different question should update)
  const state3 = {
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'accepting_answers' as const,
    currentQuestionId: 'q2' // Different question, same phase
  };

  await seeder.seedGameState(state3);
  await projectorPage.page.waitForTimeout(1000);

  // Should receive update even though phase unchanged
  const questionId = await projectorPage.page.evaluate(() => {
    return (window as any).__CURRENT_QUESTION_ID__;
  });

  expect(questionId).toBe('q2');
});

/**
 * TC-FALLBACK-004: Seamless Channel Transition
 *
 * Validates that transitions between WebSocket-only, Firestore-only,
 * and dual-channel modes are seamless with no data loss.
 *
 * Test Flow:
 * 1. Start with dual-channel mode
 * 2. Disconnect WebSocket (transition to Firestore-only)
 * 3. Verify smooth transition, no data loss
 * 4. Reconnect WebSocket (transition back to dual-channel)
 * 5. Verify deduplication resumes
 *
 * Expected Results:
 * - No data loss during transitions
 * - No duplicate events during reconnection
 * - UI shows correct state throughout
 * - Transition time <500ms
 */
test('TC-FALLBACK-004: Seamless transition between channel modes @P2', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish dual-channel mode
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Track all state changes
  const stateChanges: Array<{ phase: string; source: string; timestamp: number }> = [];

  await projectorPage.page.evaluate(() => {
    (window as any).__STATE_CHANGES__ = [];
  });

  // PHASE 1: Dual-channel mode
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_question',
    currentRound: 1
  });

  await projectorPage.waitForPhase('showing_question', 2000);

  // PHASE 2: Transition to Firestore-only
  const transitionStartTime = Date.now();
  await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

  const transitionTime1 = Date.now() - transitionStartTime;

  // ASSERT: Transition time <500ms
  expect(transitionTime1).toBeLessThan(500);

  // ACT: Update during Firestore-only mode
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'accepting_answers',
    currentRound: 1
  });

  await projectorPage.waitForPhase('accepting_answers', 2000);

  // ASSERT: Update received via Firestore
  const phaseAfterWsDisconnect = await projectorPage.getCurrentPhase();
  expect(phaseAfterWsDisconnect).toContain('accepting_answers');

  // PHASE 3: Transition back to dual-channel
  const reconnectStartTime = Date.now();
  await networkSimulator.setState(NetworkState.ONLINE);
  await projectorPage.waitForWebSocketConnection(10000);

  const reconnectTime = Date.now() - reconnectStartTime;

  // ASSERT: Reconnection time <10s
  expect(reconnectTime).toBeLessThan(10000);

  // ACT: Update in dual-channel mode after reconnection
  await seeder.seedGameState({
    ...TEST_DATA.INITIAL_GAME_STATE,
    currentPhase: 'showing_results',
    currentRound: 1
  });

  await projectorPage.waitForPhase('showing_results', 2000);

  // ASSERT: Deduplication working after reconnection
  const allStateChanges = await projectorPage.page.evaluate(() => {
    return (window as any).__STATE_CHANGES__ || [];
  });

  const showingResultsUpdates = allStateChanges.filter(
    (change: any) => change.phase === 'showing_results'
  );

  // Should have exactly 1 update, not 2 (which would indicate duplication)
  expect(showingResultsUpdates.length).toBe(1);

  // ASSERT: No data loss across transitions
  const finalPhase = await projectorPage.getCurrentPhase();
  expect(finalPhase).toContain('showing_results');
});

/**
 * TC-FALLBACK-005: Firestore Listener Resilience
 *
 * Validates that Firestore listener remains active and functional
 * even when WebSocket repeatedly disconnects and reconnects.
 *
 * Test Flow:
 * 1. Establish dual-channel mode
 * 2. Perform 5 WebSocket disconnect/reconnect cycles
 * 3. Verify Firestore listener remains active throughout
 * 4. Verify updates received during each cycle
 *
 * Expected Results:
 * - Firestore listener never disconnects
 * - Updates received during all cycles
 * - No memory leaks from repeated transitions
 * - Listener performance consistent across cycles
 */
test('TC-FALLBACK-005: Firestore listener remains resilient across reconnections @P2', async ({
  projectorPage,
  networkSimulator,
  seeder
}) => {
  // ARRANGE: Seed game state and establish dual-channel mode
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Track Firestore listener status
  const listenerStatuses: Array<{ cycle: number; active: boolean; timestamp: number }> = [];

  // ACT: Perform 5 disconnect/reconnect cycles
  for (let cycle = 1; cycle <= 5; cycle++) {
    // Disconnect WebSocket
    await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);
    await projectorPage.page.waitForTimeout(500);

    // ASSERT: Firestore listener still active
    const firestoreActive = await projectorPage.page.evaluate(() => {
      return (window as any).__FIRESTORE_ACTIVE__ === true;
    });

    expect(firestoreActive).toBe(true);

    listenerStatuses.push({
      cycle,
      active: firestoreActive,
      timestamp: Date.now()
    });

    // Update game state during Firestore-only mode
    await seeder.seedGameState({
      ...TEST_DATA.INITIAL_GAME_STATE,
      currentPhase: 'waiting',
      currentRound: cycle
    });

    // Wait for update
    await projectorPage.page.waitForTimeout(500);

    // Verify update received
    const currentRound = await projectorPage.page.evaluate(() => {
      return (window as any).__CURRENT_ROUND__;
    });

    expect(currentRound).toBe(cycle);

    // Reconnect WebSocket
    await networkSimulator.setState(NetworkState.ONLINE);
    await projectorPage.waitForWebSocketConnection(10000);
    await projectorPage.page.waitForTimeout(500);

    // ASSERT: Firestore listener still active after reconnection
    const firestoreActiveAfterReconnect = await projectorPage.page.evaluate(() => {
      return (window as any).__FIRESTORE_ACTIVE__ === true;
    });

    expect(firestoreActiveAfterReconnect).toBe(true);
  }

  // ASSERT: Firestore listener was active during all cycles
  const allActive = listenerStatuses.every(status => status.active);
  expect(allActive).toBe(true);

  // ASSERT: No memory leaks (listener count should be 1)
  const listenerCount = await projectorPage.page.evaluate(() => {
    return (window as any).__FIRESTORE_LISTENER_COUNT__ || 0;
  });

  expect(listenerCount).toBe(1); // Should have exactly one listener

  // ASSERT: Final state is correct
  const finalRound = await projectorPage.page.evaluate(() => {
    return (window as any).__CURRENT_ROUND__;
  });

  expect(finalRound).toBe(5);
});

/**
 * TC-FALLBACK-006: Performance Under Dual-Channel Load
 *
 * Validates that system performance remains acceptable when processing
 * updates from both WebSocket and Firestore simultaneously.
 *
 * Test Flow:
 * 1. Establish dual-channel mode
 * 2. Send rapid successive updates (10 updates in 5 seconds)
 * 3. Measure deduplication overhead
 * 4. Verify UI remains responsive
 * 5. Check memory usage stability
 *
 * Expected Results:
 * - Deduplication overhead <10ms per update
 * - UI remains responsive (no frame drops)
 * - Memory usage stable (no leaks)
 * - All updates processed correctly
 */
test('TC-FALLBACK-006: Performance remains acceptable under dual-channel load @P2', async ({
  projectorPage,
  seeder,
  metricsCollector
}) => {
  // ARRANGE: Seed game state and establish dual-channel mode
  await seeder.seedGameState(TEST_DATA.INITIAL_GAME_STATE);
  await projectorPage.goto();
  await projectorPage.waitForAuthentication(3000);
  await projectorPage.waitForWebSocketConnection(5000);

  // Measure initial memory
  const initialMemory = await projectorPage.page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  });

  // Track deduplication performance
  const dedupTimes: number[] = [];

  await projectorPage.page.evaluate(() => {
    (window as any).__DEDUP_TIMES__ = [];
  });

  // ACT: Send 10 rapid updates
  const updateStartTime = Date.now();

  for (let i = 0; i < 10; i++) {
    await seeder.seedGameState({
      ...TEST_DATA.INITIAL_GAME_STATE,
      currentPhase: 'waiting',
      currentRound: i + 1,
      timeRemaining: 60 - i
    });

    await projectorPage.page.waitForTimeout(500);
  }

  const totalUpdateTime = Date.now() - updateStartTime;

  // Wait for all updates to process
  await projectorPage.page.waitForTimeout(1000);

  // ASSERT: Retrieve deduplication times
  const trackedDedupTimes = await projectorPage.page.evaluate(() => {
    return (window as any).__DEDUP_TIMES__ || [];
  });

  // ASSERT: Deduplication overhead <10ms per update
  const avgDedupTime = trackedDedupTimes.reduce((sum: number, time: number) => sum + time, 0) /
    trackedDedupTimes.length;

  expect(avgDedupTime).toBeLessThan(10);

  // ASSERT: All deduplication times <50ms (max acceptable)
  trackedDedupTimes.forEach((time: number) => {
    expect(time).toBeLessThan(50);
  });

  // ASSERT: UI remains responsive (check FPS)
  const fpsData = await projectorPage.page.evaluate(() => {
    return (window as any).__FPS_DATA__ || [];
  });

  if (fpsData.length > 0) {
    const avgFps = fpsData.reduce((sum: number, fps: number) => sum + fps, 0) / fpsData.length;
    expect(avgFps).toBeGreaterThan(30); // Maintain at least 30 FPS
  }

  // ASSERT: Memory usage stable (no leaks)
  const finalMemory = await projectorPage.page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  });

  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

  // Memory increase should be <20% after 10 updates
  expect(memoryIncreasePercent).toBeLessThan(20);

  // ASSERT: Final state is correct
  const finalRound = await projectorPage.page.evaluate(() => {
    return (window as any).__CURRENT_ROUND__;
  });

  expect(finalRound).toBe(10);
});
