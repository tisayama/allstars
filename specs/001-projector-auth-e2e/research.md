# Phase 0: Research - Projector Authentication E2E Tests

**Feature**: 001-projector-auth-e2e
**Date**: 2025-11-16
**Status**: Complete

## Overview

This document captures technical research for implementing browser-based E2E tests for projector app authentication. Research focuses on Playwright best practices with Firebase Emulators, network simulation approaches, vitest configuration patterns, and test data seeding strategies.

## Research Questions

### 1. Playwright Best Practices with Firebase Emulators

**Question**: How should Playwright E2E tests interact with Firebase Auth and Firestore Emulators to ensure deterministic, isolated test execution?

**Findings**:

- **Emulator Connection**: Set environment variables before starting Playwright tests:
  ```typescript
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  ```

- **Test Isolation**: Each test should:
  1. Clear emulator state before test execution
  2. Seed required test data (gameState, questions)
  3. Clean up after test completes
  4. Use unique identifiers to prevent parallel test interference

- **Page Object Pattern**: Encapsulate Firebase interactions in page objects:
  ```typescript
  export class ProjectorPage {
    async waitForAuthentication(): Promise<void> {
      await this.page.waitForSelector('[data-testid="auth-complete"]', {
        timeout: 3000
      });
    }
  }
  ```

- **Emulator Management**: Use `@firebase/rules-unit-testing` for programmatic emulator control:
  ```typescript
  import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-project',
    firestore: { host: 'localhost', port: 8080 }
  });

  await testEnv.clearFirestore(); // Clear between tests
  ```

**Decision**: Use Playwright fixtures to manage emulator lifecycle and test data seeding. Create `tests/e2e/fixtures/projector-auth.fixture.ts` with automatic setup/teardown.

**Source**:
- Playwright docs: https://playwright.dev/docs/test-fixtures
- Firebase Emulator docs: https://firebase.google.com/docs/emulator-suite/connect_and_prototype
- Existing pattern in `tests/e2e/helpers/emulator.ts`

---

### 2. Network Simulation for WebSocket Reconnection Testing

**Question**: What's the best approach to simulate network disconnections and reconnections in Playwright to test WebSocket exponential backoff?

**Findings**:

- **Option A: Playwright Route Interception**
  - Intercept WebSocket upgrade requests: `page.route('ws://localhost:3001/socket.io/', route => route.abort())`
  - Pros: No external dependencies, deterministic timing
  - Cons: Cannot simulate mid-connection disruption (only initial connection blocking)
  - Not suitable for testing reconnection after successful connection

- **Option B: Browser Context Offline Mode**
  - Use `context.setOffline(true)` to simulate network loss
  - Pros: Built-in Playwright feature, simulates real network conditions
  - Cons: Affects all network requests (HTTP + WebSocket), may be too coarse-grained
  - Good for testing overall offline behavior

- **Option C: Socket Server Control**
  - Expose test endpoint on socket-server to forcibly disconnect clients: `POST /test/disconnect/:clientId`
  - Pros: Precise control, can disconnect specific clients, tests real reconnection logic
  - Cons: Requires server-side test endpoints (only enabled in test environment)
  - Most realistic approach for testing exponential backoff

**Decision**: Implement **Option C** for precise control. Add test-only endpoint to socket-server that forcibly disconnects clients. This allows testing:
1. Initial connection establishment
2. Forced disconnection during active session
3. Reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 60s max)
4. Eventual reconnection success or failure after 10 attempts

**Implementation**:
```typescript
// tests/e2e/helpers/network-simulation.ts
export class NetworkSimulator {
  async disconnectWebSocket(clientId: string): Promise<void> {
    await fetch('http://localhost:3001/test/disconnect/' + clientId, {
      method: 'POST'
    });
  }

  async verifyReconnectionBackoff(page: Page): Promise<void> {
    const reconnectAttempts = [];
    page.on('console', msg => {
      if (msg.text().includes('reconnection attempt')) {
        reconnectAttempts.push(Date.now());
      }
    });

    // Verify exponential backoff timing
    expect(reconnectAttempts[1] - reconnectAttempts[0]).toBeGreaterThanOrEqual(1000);
    expect(reconnectAttempts[2] - reconnectAttempts[1]).toBeGreaterThanOrEqual(2000);
  }
}
```

**Source**:
- Playwright network emulation: https://playwright.dev/docs/network
- Socket.IO reconnection docs: https://socket.io/docs/v4/client-options/#reconnection

---

### 3. Vitest Configuration for Integration Tests

**Question**: How should `apps/projector-app/vitest.config.ts` be updated to enable integration tests while maintaining separation from unit tests?

**Findings**:

- **Current Issue**:
  ```typescript
  include: ['tests/unit/**/*.test.{ts,tsx}']
  ```
  This excludes `tests/integration/auth-startup.test.ts`

- **Option A: Single Test Command with Multiple Patterns**
  ```typescript
  include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}']
  ```
  - Pros: Simple, runs all tests with `pnpm test`
  - Cons: No separation, integration tests always run (slower)

- **Option B: Separate Test Scripts with Vitest Workspaces**
  ```typescript
  // vitest.workspace.ts
  export default defineWorkspace([
    {
      test: {
        name: 'unit',
        include: ['tests/unit/**/*.test.{ts,tsx}']
      }
    },
    {
      test: {
        name: 'integration',
        include: ['tests/integration/**/*.test.{ts,tsx}'],
        setupFiles: ['./tests/integration-setup.ts'] // Firebase Emulator setup
      }
    }
  ])
  ```
  - Pros: Clear separation, can run independently (`pnpm test:unit`, `pnpm test:integration`)
  - Cons: Requires vitest 1.0+ (currently have 1.3.1 ✅)

- **Option C: Environment Variable Filter**
  ```typescript
  include: process.env.TEST_TYPE === 'integration'
    ? ['tests/integration/**/*.test.{ts,tsx}']
    : ['tests/unit/**/*.test.{ts,tsx}']
  ```
  - Pros: Conditional execution based on env var
  - Cons: Awkward developer experience, doesn't scale well

**Decision**: Use **Option B - Vitest Workspaces**. This provides clear separation and follows best practices. Update package.json scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --project unit",
    "test:integration": "vitest --project integration",
    "test:e2e": "playwright test"
  }
}
```

**Integration Test Setup Requirements**:
- Firebase Emulator connection check (fail fast if emulator not running)
- Auth Emulator configuration: `process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'`
- Firestore Emulator configuration: `process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'`

**Source**:
- Vitest workspace docs: https://vitest.dev/guide/workspace.html
- Existing pattern in `tests/e2e/` (separate E2E test configuration)

---

### 4. Test Data Seeding for Firestore Emulator

**Question**: What's the most efficient way to seed test data (gameState, questions, guests) into Firestore Emulator for E2E tests?

**Findings**:

- **Option A: Admin SDK Direct Writes**
  ```typescript
  import { initializeApp } from 'firebase-admin/app';
  import { getFirestore } from 'firebase-admin/firestore';

  const db = getFirestore();
  await db.doc('gameState/live').set({
    currentPhase: 'waiting',
    isActive: true,
    // ...
  });
  ```
  - Pros: Fast, direct access, no HTTP overhead
  - Cons: Requires Firebase Admin SDK initialization in test fixtures

- **Option B: REST API via Emulator**
  ```typescript
  await fetch('http://localhost:8080/v1/projects/demo-test/databases/(default)/documents/gameState/live', {
    method: 'PATCH',
    body: JSON.stringify({ fields: { /* ... */ } })
  });
  ```
  - Pros: No SDK dependency, language-agnostic
  - Cons: Verbose field format, harder to maintain

- **Option C: Reuse Existing Init Script**
  Leverage `scripts/init-firestore-dev.ts` pattern:
  ```typescript
  import { seedGameState } from '@/test-helpers/firestore-seeder';

  await seedGameState({
    currentPhase: 'waiting',
    isActive: true,
    // ...
  });
  ```
  - Pros: Reusable helper functions, type-safe, matches existing patterns
  - Cons: Need to create helper module

**Decision**: Use **Option C** - create reusable seeder helpers in `tests/e2e/helpers/firestore-seeder.ts`. This matches the existing pattern in `scripts/init-firestore-dev.ts` and provides type-safe, maintainable test data setup.

**Implementation**:
```typescript
// tests/e2e/helpers/firestore-seeder.ts
export class FirestoreSeeder {
  constructor(private db: Firestore) {}

  async seedGameState(state: Partial<GameState>): Promise<void> {
    await this.db.doc('gameState/live').set({
      currentPhase: 'waiting',
      isActive: true,
      currentQuestionId: null,
      currentPeriod: 1,
      ...state
    });
  }

  async seedQuestions(questions: Question[]): Promise<void> {
    const batch = this.db.batch();
    questions.forEach(q => {
      batch.set(this.db.collection('questions').doc(q.id), q);
    });
    await batch.commit();
  }

  async clearAll(): Promise<void> {
    await this.db.recursiveDelete(this.db.collection('gameState'));
    await this.db.recursiveDelete(this.db.collection('questions'));
    await this.db.recursiveDelete(this.db.collection('guests'));
  }
}
```

**Source**:
- Existing pattern: `scripts/init-firestore-dev.ts:37-89`
- Firebase Admin SDK docs: https://firebase.google.com/docs/firestore/manage-data/add-data

---

### 5. Test Execution Performance Optimization

**Question**: How can we ensure E2E tests complete within 5 minutes (SC-005) while maintaining comprehensive coverage?

**Findings**:

- **Bottleneck Analysis**:
  1. Firebase Emulator startup: ~3-5 seconds (one-time)
  2. Playwright browser launch: ~2-3 seconds per worker (parallel)
  3. Page navigation: ~500ms per test
  4. Authentication flow: <3 seconds per test (FR-001)
  5. Test execution: ~10-15 seconds per scenario

- **Optimization Strategies**:

  **A. Parallel Test Execution**
  ```typescript
  // playwright.config.ts
  export default defineConfig({
    workers: process.env.CI ? 2 : 4, // Parallel workers
    fullyParallel: true
  });
  ```
  - Expected speedup: 4x for independent tests
  - Risk: Firestore Emulator state conflicts (need isolation)

  **B. Shared Browser Context**
  ```typescript
  // Reuse browser instance across tests in same worker
  export const test = base.extend({
    context: async ({ browser }, use) => {
      const context = await browser.newContext();
      await use(context);
      await context.close();
    }
  });
  ```
  - Saves ~2 seconds per test (no browser restart)
  - Risk: Cookie/storage pollution between tests (need cleanup)

  **C. Selective Emulator Cleanup**
  ```typescript
  // Only clear collections modified by test, not entire emulator
  async afterEach() {
    await seeder.clearGameState(); // Fast
    // Don't clear questions if not modified
  }
  ```
  - Saves ~1 second per test
  - Risk: Stale data if test modifications are missed

**Decision**: Implement **all three optimizations**:
1. Enable parallel execution with 4 workers locally, 2 in CI
2. Use shared browser contexts with explicit cleanup
3. Implement selective cleanup based on test scope

**Performance Budget** (for ~20 test scenarios):
- Emulator startup: 5s (one-time)
- 20 tests × 15s average / 4 workers = 75s
- Overhead (teardown, reporting): 20s
- **Total: ~100s (1m 40s) - well under 5min target** ✅

**Source**:
- Playwright parallel execution: https://playwright.dev/docs/test-parallel
- Existing E2E tests: `tests/e2e/scenarios/*.spec.ts`

---

### 6. Dual-Channel Deduplication Testing

**Question**: How can E2E tests verify that WebSocket and Firestore updates are correctly deduplicated when both channels are active?

**Findings**:

- **Deduplication Mechanism** (from existing code):
  ```typescript
  // apps/projector-app/src/hooks/useDualChannelUpdates.ts:78-99
  const deduplicateUpdate = useCallback((update: GameStateUpdate, source: 'ws' | 'firestore') => {
    const key = `${update.type}_${update.timestamp}`;

    if (recentUpdates.current.has(key)) {
      console.log(`Deduplicating ${update.type} from ${source}`);
      return false; // Skip duplicate
    }

    recentUpdates.current.add(key);
    setTimeout(() => recentUpdates.current.delete(key), 1000);
    return true; // Process update
  }, []);
  ```

- **Test Strategy**:
  1. Monitor console logs for deduplication messages
  2. Verify UI only updates once (not twice) when both channels deliver same update
  3. Check deduplication rate = 100% (SC-006)

- **Implementation Approach**:
  ```typescript
  // tests/e2e/scenarios/projector-fallback.spec.ts
  test('deduplicates updates from both channels', async ({ page, seeder }) => {
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    // Trigger update that will arrive via both WebSocket and Firestore
    await seeder.seedGameState({ currentPhase: 'showing_question' });

    // Wait for both channels to process
    await page.waitForTimeout(500);

    // Verify deduplication occurred
    const dedupeMessages = consoleLogs.filter(log =>
      log.includes('Deduplicating')
    );
    expect(dedupeMessages.length).toBeGreaterThan(0);

    // Verify UI rendered only once
    const renderCount = await page.evaluate(() =>
      window.__RENDER_COUNT__ // Injected counter
    );
    expect(renderCount).toBe(1); // Not 2
  });
  ```

**Decision**: Use console log monitoring combined with render counting to verify deduplication. Add `window.__RENDER_COUNT__` tracking in development mode for testability.

**Source**:
- Existing implementation: `apps/projector-app/src/hooks/useDualChannelUpdates.ts:78-99`
- Playwright console API: https://playwright.dev/docs/api/class-page#page-event-console

---

## Summary of Technical Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Emulator Management | Playwright fixtures with `@firebase/rules-unit-testing` | Automatic setup/teardown, test isolation |
| Network Simulation | Socket server test endpoint for disconnect | Precise control, tests real reconnection logic |
| Vitest Configuration | Workspace pattern with separate unit/integration projects | Clear separation, independent execution |
| Test Data Seeding | Reusable helper class (`FirestoreSeeder`) | Type-safe, maintainable, matches existing patterns |
| Performance Optimization | Parallel execution (4 workers) + shared contexts + selective cleanup | Achieves <5min target with safety margins |
| Deduplication Testing | Console log monitoring + render counting | Verifies 100% deduplication rate (SC-006) |

## Next Steps

Proceed to **Phase 1: Design** to create:
1. `data-model.md` - Test data structures and fixtures
2. `contracts/` - Test scenario contracts and expected behaviors
3. `quickstart.md` - Developer guide for running E2E tests locally

All research questions resolved with concrete technical approaches. No `NEEDS CLARIFICATION` items remain.
