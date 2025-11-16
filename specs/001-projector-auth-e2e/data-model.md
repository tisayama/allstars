# Phase 1: Data Model - Projector Authentication E2E Tests

**Feature**: 001-projector-auth-e2e
**Date**: 2025-11-16
**Status**: Complete

## Overview

This document defines the test data structures, fixtures, and state management patterns for E2E tests. Since this is a testing feature, the "data model" refers to test fixtures, mock data, and test state management rather than application data structures.

## Test Fixture Structure

### 1. ProjectorAuthFixture

Playwright fixture providing Firebase Emulator setup, test data seeding, and cleanup.

```typescript
// tests/e2e/fixtures/projector-auth.fixture.ts

import { test as base, Page } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Firestore } from 'firebase-admin/firestore';
import { FirestoreSeeder } from '../helpers/firestore-seeder';

export interface ProjectorAuthFixture {
  /** Firebase test environment with emulator connection */
  testEnv: RulesTestEnvironment;

  /** Firestore instance connected to emulator */
  firestore: Firestore;

  /** Helper for seeding test data */
  seeder: FirestoreSeeder;

  /** Playwright page with projector app loaded */
  projectorPage: Page;
}

export const test = base.extend<ProjectorAuthFixture>({
  testEnv: async ({}, use) => {
    const env = await initializeTestEnvironment({
      projectId: 'demo-test-project',
      firestore: {
        host: 'localhost',
        port: 8080,
        rules: '/* Allow all */'
      }
    });

    await use(env);
    await env.cleanup();
  },

  firestore: async ({ testEnv }, use) => {
    const db = testEnv.context().firestore();
    await use(db as Firestore);
  },

  seeder: async ({ firestore }, use) => {
    const seeder = new FirestoreSeeder(firestore);
    await seeder.clearAll(); // Clean before test
    await use(seeder);
    await seeder.clearAll(); // Clean after test
  },

  projectorPage: async ({ page, seeder }, use) => {
    // Seed minimum required data
    await seeder.seedGameState({
      currentPhase: 'waiting',
      isActive: false
    });

    // Navigate to projector app
    await page.goto('http://localhost:5175');

    await use(page);
  }
});
```

**Key Properties**:
- **Automatic Cleanup**: Clears Firestore before/after each test
- **Emulator Connection**: Validates emulator is running before tests start
- **Default State**: Seeds minimal gameState for app initialization
- **Type Safety**: Fully typed with TypeScript

---

### 2. Test Data Templates

Reusable test data templates for common scenarios.

```typescript
// tests/e2e/helpers/test-data.ts

import type { GameState, Question, Guest } from '@allstars/types';

export const TEST_DATA = {
  /**
   * Minimal game state for app initialization
   */
  INITIAL_GAME_STATE: {
    currentPhase: 'waiting' as const,
    isActive: false,
    currentQuestionId: null,
    currentPeriod: 1,
    currentRound: null,
    timeRemaining: null,
    gongActivatedAt: null,
    activeGuests: [],
    roundHistory: []
  } as GameState,

  /**
   * Active question state for testing question display
   */
  ACTIVE_QUESTION_STATE: {
    currentPhase: 'showing_question' as const,
    isActive: true,
    currentQuestionId: 'q001',
    currentPeriod: 1,
    currentRound: 1,
    timeRemaining: 10,
    gongActivatedAt: null,
    activeGuests: ['guest-001', 'guest-002'],
    roundHistory: []
  } as GameState,

  /**
   * Sample question for testing
   */
  SAMPLE_QUESTION: {
    id: 'q001',
    text: '日本の首都はどこですか？',
    choices: {
      A: '東京',
      B: '大阪',
      C: '京都',
      D: '名古屋'
    },
    correctAnswer: 'A',
    category: 'geography',
    difficulty: 'easy',
    points: 10,
    period: 1
  } as Question,

  /**
   * Sample guest for testing
   */
  SAMPLE_GUEST: {
    id: 'guest-001',
    name: 'テストゲスト',
    status: 'active' as const,
    currentScore: 0,
    answers: [],
    joinedAt: Date.now()
  } as Guest
};
```

**Usage in Tests**:
```typescript
test('displays question when phase changes', async ({ seeder, projectorPage }) => {
  await seeder.seedQuestions([TEST_DATA.SAMPLE_QUESTION]);
  await seeder.seedGameState(TEST_DATA.ACTIVE_QUESTION_STATE);

  await expect(projectorPage.locator('[data-testid="question-text"]'))
    .toHaveText('日本の首都はどこですか？');
});
```

---

### 3. Network Simulation State

State machine for simulating network conditions during tests.

```typescript
// tests/e2e/helpers/network-simulation.ts

export enum NetworkState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  WEBSOCKET_ONLY = 'websocket-only',
  FIRESTORE_ONLY = 'firestore-only'
}

export class NetworkSimulator {
  constructor(
    private page: Page,
    private socketServerUrl: string = 'http://localhost:3001'
  ) {}

  /**
   * Set network state for testing different connectivity scenarios
   */
  async setState(state: NetworkState): Promise<void> {
    switch (state) {
      case NetworkState.OFFLINE:
        await this.page.context().setOffline(true);
        break;

      case NetworkState.ONLINE:
        await this.page.context().setOffline(false);
        break;

      case NetworkState.WEBSOCKET_ONLY:
        // Block Firestore HTTP requests
        await this.page.route('**/firestore.googleapis.com/**', route => route.abort());
        await this.page.route('**/localhost:8080/**', route => route.abort());
        break;

      case NetworkState.FIRESTORE_ONLY:
        // Disconnect WebSocket via server endpoint
        const clientId = await this.getWebSocketClientId();
        await fetch(`${this.socketServerUrl}/test/disconnect/${clientId}`, {
          method: 'POST'
        });
        break;
    }
  }

  /**
   * Get current WebSocket client ID from page
   */
  private async getWebSocketClientId(): Promise<string> {
    return await this.page.evaluate(() => {
      // Access socket instance from window (exposed for testing)
      return (window as any).__SOCKET_ID__;
    });
  }

  /**
   * Measure time until WebSocket reconnects
   */
  async measureReconnectionTime(): Promise<number> {
    const startTime = Date.now();

    await this.page.waitForFunction(() => {
      return (window as any).__WEBSOCKET_CONNECTED__ === true;
    }, { timeout: 15000 });

    return Date.now() - startTime;
  }

  /**
   * Record reconnection attempt timestamps
   */
  async recordReconnectionAttempts(): Promise<number[]> {
    const attempts: number[] = [];

    this.page.on('console', msg => {
      if (msg.text().includes('WebSocket reconnection attempt')) {
        attempts.push(Date.now());
      }
    });

    return attempts;
  }
}
```

**State Transitions**:
```
ONLINE
  ↓ setOffline(true)
OFFLINE
  ↓ setOffline(false)
ONLINE
  ↓ block Firestore requests
WEBSOCKET_ONLY
  ↓ disconnect WebSocket
FIRESTORE_ONLY
  ↓ restore all connections
ONLINE
```

---

### 4. Test Metrics Collection

Data structures for collecting and validating performance metrics.

```typescript
// tests/e2e/helpers/metrics-collector.ts

export interface AuthMetrics {
  /** Time from page load to auth complete (ms) */
  authTime: number;

  /** Whether auth succeeded */
  authSuccess: boolean;

  /** Error message if auth failed */
  authError: string | null;
}

export interface ReconnectionMetrics {
  /** Number of reconnection attempts before success */
  attemptCount: number;

  /** Delay between each attempt (ms) */
  attemptDelays: number[];

  /** Total time from disconnect to reconnect (ms) */
  totalTime: number;

  /** Whether reconnection succeeded */
  reconnectSuccess: boolean;
}

export interface FallbackMetrics {
  /** Time from WebSocket disconnect to Firestore update (ms) */
  fallbackLatency: number;

  /** Number of duplicate updates detected */
  duplicateCount: number;

  /** Total updates received */
  totalUpdates: number;

  /** Deduplication rate (0-1) */
  deduplicationRate: number;
}

export class MetricsCollector {
  private consoleLogs: string[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor(private page: Page) {
    this.setupConsoleListener();
    this.setupPerformanceTracking();
  }

  private setupConsoleListener(): void {
    this.page.on('console', msg => {
      this.consoleLogs.push(`[${Date.now()}] ${msg.text()}`);
    });
  }

  private setupPerformanceTracking(): void {
    this.page.evaluate(() => {
      // Expose performance API to test context
      (window as any).__PERFORMANCE__ = {
        mark: (name: string) => performance.mark(name),
        measure: (name: string, start: string, end: string) =>
          performance.measure(name, start, end)
      };
    });
  }

  async collectAuthMetrics(): Promise<AuthMetrics> {
    const startTime = this.performanceMarks.get('page-load') || Date.now();

    const authCompleteTime = await this.page.evaluate(() => {
      return (window as any).__AUTH_COMPLETE_TIME__;
    });

    const authError = await this.page.evaluate(() => {
      return (window as any).__AUTH_ERROR__;
    });

    return {
      authTime: authCompleteTime - startTime,
      authSuccess: authError === null,
      authError
    };
  }

  async collectReconnectionMetrics(): Promise<ReconnectionMetrics> {
    const reconnectLogs = this.consoleLogs.filter(log =>
      log.includes('reconnection attempt')
    );

    const attemptTimes = reconnectLogs.map(log => {
      const match = log.match(/\[(\d+)\]/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const attemptDelays = attemptTimes.slice(1).map((time, i) =>
      time - attemptTimes[i]
    );

    return {
      attemptCount: attemptTimes.length,
      attemptDelays,
      totalTime: attemptTimes[attemptTimes.length - 1] - attemptTimes[0],
      reconnectSuccess: this.consoleLogs.some(log =>
        log.includes('WebSocket reconnected')
      )
    };
  }

  async collectFallbackMetrics(): Promise<FallbackMetrics> {
    const duplicateLogs = this.consoleLogs.filter(log =>
      log.includes('Deduplicating')
    );

    const totalUpdates = await this.page.evaluate(() => {
      return (window as any).__TOTAL_UPDATES__ || 0;
    });

    return {
      fallbackLatency: 0, // Measured separately
      duplicateCount: duplicateLogs.length,
      totalUpdates,
      deduplicationRate: totalUpdates > 0 ? duplicateLogs.length / totalUpdates : 0
    };
  }
}
```

---

## Page Object Model

### ProjectorPage

Encapsulates all interactions with the projector app.

```typescript
// tests/e2e/page-objects/ProjectorPage.ts

import { Page, Locator } from '@playwright/test';

export class ProjectorPage {
  private readonly baseUrl = 'http://localhost:5175';

  // Locators
  private readonly authStatus: Locator;
  private readonly connectionStatus: Locator;
  private readonly questionText: Locator;
  private readonly phaseIndicator: Locator;

  constructor(private readonly page: Page) {
    this.authStatus = page.locator('[data-testid="auth-status"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.questionText = page.locator('[data-testid="question-text"]');
    this.phaseIndicator = page.locator('[data-testid="phase-indicator"]');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.baseUrl);
  }

  async waitForAuthentication(timeout: number = 3000): Promise<void> {
    await this.authStatus.waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(() => {
      return (window as any).__AUTH_COMPLETE__ === true;
    }, { timeout });
  }

  async isAuthenticated(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return (window as any).__AUTH_COMPLETE__ === true;
    });
  }

  async isWebSocketConnected(): Promise<boolean> {
    const status = await this.connectionStatus.textContent();
    return status?.includes('connected') ?? false;
  }

  async getCurrentPhase(): Promise<string> {
    return await this.phaseIndicator.textContent() || '';
  }

  async getQuestionText(): Promise<string> {
    return await this.questionText.textContent() || '';
  }
}
```

---

## Test Data Lifecycle

### Data Flow

```
┌─────────────────────┐
│  Test Starts        │
│  (beforeEach)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Clear Firestore    │
│  (seeder.clearAll)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Seed Initial State │
│  (TEST_DATA)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Test Execution     │
│  (assertions)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cleanup            │
│  (afterEach)        │
└─────────────────────┘
```

### Isolation Strategy

**Problem**: Parallel tests may interfere with shared Firestore Emulator state.

**Solution**: Collection prefix isolation

```typescript
// Each test gets unique prefix
const collectionPrefix = `test_${Date.now()}_${Math.random()}`;

// Seeder uses prefixed collections
await seeder.seedGameState(data, { prefix: collectionPrefix });

// App configured to use prefixed collections in test mode
// VITE_TEST_COLLECTION_PREFIX=test_12345_
```

**Benefits**:
- No interference between parallel tests
- No need to wait for cleanup before next test
- Faster test execution

---

## Summary

**Test Fixtures**:
- `ProjectorAuthFixture` - Main fixture with emulator setup and cleanup
- `TEST_DATA` - Reusable test data templates
- `NetworkSimulator` - Network state control for reconnection tests
- `MetricsCollector` - Performance metrics collection and validation

**Page Objects**:
- `ProjectorPage` - Encapsulates projector app interactions

**Data Lifecycle**:
- Clear → Seed → Execute → Cleanup
- Collection prefix isolation for parallel execution

All data structures designed for type safety, reusability, and test isolation.
