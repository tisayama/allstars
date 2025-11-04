# Research: End-to-End Testing Infrastructure with Playwright

**Feature**: 008-e2e-playwright-tests
**Date**: 2025-01-04
**Purpose**: Research technical decisions for E2E testing infrastructure implementation

## Overview

This document consolidates research findings for implementing a comprehensive E2E testing infrastructure using Playwright. The research focuses on service orchestration patterns, Firebase Emulator integration, parallel test execution strategies, and Playwright best practices for multi-app testing.

## Research Areas

### 1. Playwright Test Framework Setup for Monorepos

**Decision**: Use Playwright Test (not Playwright Library) with TypeScript configuration at monorepo root

**Rationale**:
- Playwright Test provides built-in test runner, fixtures, and parallel execution
- TypeScript support enables type-safe test code and integration with `/packages/types/`
- Monorepo root configuration allows single command execution across all test scenarios
- Built-in retry mechanism (configurable to 2-3 retries) addresses flaky test requirements

**Alternatives Considered**:
- ✗ **Jest + Playwright Library**: Requires manual retry logic, less integrated test runner
- ✗ **Cypress**: Poor multi-window/multi-tab support (cannot test 6 apps simultaneously in separate contexts)
- ✗ **TestCafe**: Less mature ecosystem, weaker TypeScript support

**Best Practices**:
- Use `playwright.config.ts` at root with project-based organization (one project per test category)
- Configure global setup/teardown for emulator and app lifecycle
- Use Playwright Fixtures for shared test context (collection prefixes, browser contexts)
- Enable HTML reporter for CI/CD visualization

**References**:
- Playwright Test documentation: https://playwright.dev/docs/test-intro
- Monorepo configuration patterns: https://playwright.dev/docs/test-projects

---

### 2. Firebase Emulator Integration and Lifecycle Management

**Decision**: Use Firebase Emulators Suite with programmatic start/stop via Admin SDK

**Rationale**:
- Firebase Emulators provide full Firestore and Auth functionality without production access
- Programmatic control via `firebase-tools` npm package enables automated orchestration
- Emulator UI (optional) aids local debugging but disabled in CI for speed
- Data clearing via Admin SDK ensures clean state between test runs

**Alternatives Considered**:
- ✗ **Manual emulator startup**: Violates single-command execution requirement
- ✗ **Docker-based emulators**: Adds complexity, slower startup, port management overhead
- ✗ **Mock Firestore**: Insufficient - tests must validate real Firebase SDK behavior

**Best Practices**:
- Start emulators in Playwright's `globalSetup` with explicit timeout (30s)
- Use fixed ports (Firestore: 8080, Auth: 9099) to avoid port conflicts
- Clear all emulator data at start of `globalSetup` using Admin SDK
- Stop emulators in `globalTeardown` with cleanup verification

**Implementation Pattern**:
```typescript
// globalSetup.ts
import { spawn } from 'child_process';
import admin from 'firebase-admin';

export default async function globalSetup() {
  // Clear emulator data
  await admin.firestore().recursiveDelete(admin.firestore().collection('_root_'));

  // Start emulators with timeout
  const emulatorProcess = spawn('timeout', ['30', 'firebase', 'emulators:start', '--only', 'firestore,auth']);

  // Wait for ready signal or health check
  await waitForEmulatorReady('localhost:8080', 30000);
}
```

**References**:
- Firebase Emulators documentation: https://firebase.google.com/docs/emulator-suite
- Admin SDK clearing data: https://firebase.google.com/docs/firestore/manage-data/delete-data

---

### 3. Multi-App Orchestration and Health Checking

**Decision**: Launch apps via child processes in `globalSetup`, poll health endpoints until ready

**Rationale**:
- Child process management allows programmatic control of all 6 apps + socket-server
- Health check polling (GET /health or WebSocket connection test) ensures apps are ready before tests
- 30-second timeout prevents hung processes from blocking test suite
- Process cleanup in `globalTeardown` prevents resource leaks

**Alternatives Considered**:
- ✗ **Fixed delay (e.g., 15s wait)**: Either too slow or too flaky depending on machine speed
- ✗ **Log parsing for "Server listening"**: Fragile, different log formats across apps
- ✗ **No verification**: High flaky test rate from race conditions

**Best Practices**:
- Require all apps to expose `/health` endpoint returning HTTP 200 when ready
- Use polling with exponential backoff (100ms, 200ms, 400ms, 800ms...)
- Aggregate health checks in parallel (Promise.all) for speed
- Store process handles in global state for `globalTeardown` cleanup

**Implementation Pattern**:
```typescript
// helpers/healthChecker.ts
export async function waitForAppReady(url: string, timeoutMs: number = 30000): Promise<void> {
  const startTime = Date.now();
  let delay = 100;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${url}/health`, { timeout: 1000 });
      if (response.ok) return;
    } catch (e) {
      // Not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 2000); // Exponential backoff capped at 2s
  }

  throw new Error(`App at ${url} not ready within ${timeoutMs}ms`);
}
```

**References**:
- Health check patterns: https://microservices.io/patterns/observability/health-check-api.html
- Node.js child_process: https://nodejs.org/docs/latest-v18.x/api/child_process.html

---

### 4. Data Isolation for Parallel Test Execution

**Decision**: Use unique collection prefixes per test run (e.g., `test_${uuid}_guests`)

**Rationale**:
- Collection prefixes provide complete data isolation without separate emulator instances
- UUID-based prefixes prevent collisions between parallel CI jobs and local developers
- Firestore queries can filter by collection name prefix efficiently
- No port management complexity - all tests share same emulator on localhost:8080

**Alternatives Considered**:
- ✗ **Separate emulator instances per run**: High resource usage, port conflicts, complex orchestration
- ✗ **Document-level testRunId tagging**: Risk of filter bugs causing cross-contamination
- ✗ **Sequential execution only**: Too slow for CI/CD (10+ minute test suite)

**Best Practices**:
- Generate unique prefix in Playwright fixture: `test_${Date.now()}_${randomUUID()}_`
- Inject prefix into all test data creation helpers
- Document prefix format in quickstart.md for debugging
- Add cleanup logic to remove test collections after run (optional, emulator resets anyway)

**Implementation Pattern**:
```typescript
// fixtures/collectionPrefix.ts
import { randomUUID } from 'crypto';

export function generateCollectionPrefix(): string {
  return `test_${Date.now()}_${randomUUID().slice(0, 8)}_`;
}

// Usage in tests
test.use({
  collectionPrefix: generateCollectionPrefix(),
});

test('create guest', async ({ collectionPrefix }) => {
  const guestsCollection = `${collectionPrefix}guests`;
  await admin.firestore().collection(guestsCollection).add({ name: 'Guest A' });
});
```

**References**:
- Playwright fixtures: https://playwright.dev/docs/test-fixtures
- Firestore collection naming: https://firebase.google.com/docs/firestore/best-practices

---

### 5. Test Retry Strategy for Flaky Test Mitigation

**Decision**: Configure Playwright to automatically retry failed tests 2 times (3 total attempts)

**Rationale**:
- Playwright has built-in retry support with detailed reporting (shows which attempt passed)
- 2 retries (3 total attempts) industry standard for E2E tests, balances speed vs. reliability
- Reduces flaky test false positives from transient timing issues, network blips
- Meets SC-003 requirement of <5% flaky failure rate

**Alternatives Considered**:
- ✗ **No retries**: High flaky failure rate, frustrating for developers
- ✗ **Conditional retry (only on timeout errors)**: Complex to configure, misses other transient failures
- ✗ **Retry only in CI**: Different behavior between local and CI confusing

**Best Practices**:
- Configure retries in `playwright.config.ts`: `retries: process.env.CI ? 2 : 1`
- More retries in CI (slower machines, network variability) than local
- Use Playwright's `test.info().retry` to detect retry attempts in test code (for debugging)
- Report retry statistics in HTML reporter to identify consistently flaky tests

**Implementation Pattern**:
```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 1, // 3 attempts in CI, 2 locally
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    screenshot: 'only-on-failure', // Captures on final failure only
    video: 'retain-on-failure',
  },
});
```

**References**:
- Playwright retries documentation: https://playwright.dev/docs/test-retries
- Flaky test handling: https://playwright.dev/docs/test-best-practices#avoid-flaky-tests

---

### 6. Test Organization by User Story

**Decision**: Organize tests by feature spec user stories (5 files) not by app or technical layer

**Rationale**:
- User story organization maps directly to acceptance criteria in spec.md
- Each test file corresponds to one priority-labeled user story (P1/P2)
- Easier to verify feature completion - all US1 scenarios in one file
- Enables selective test execution (e.g., run only P1 tests for PRs)

**Alternatives Considered**:
- ✗ **Organize by app**: Fragments user journeys across multiple files
- ✗ **Organize by test type** (smoke/regression): Not aligned with feature requirements
- ✗ **Single mega-file**: Unmanageable, slow test discovery

**Best Practices**:
- File naming: `{category}.spec.ts` (e.g., `pre-event-setup.spec.ts`)
- Use `test.describe()` blocks for each acceptance scenario within file
- Tag tests with priority: `test.describe('@P1 Pre-Event Setup', ...)` for filtering
- Cross-reference spec.md user story numbers in test comments

**Implementation Pattern**:
```typescript
// scenarios/pre-event-setup.spec.ts
test.describe('@P1 Pre-Event Setup (User Story 1)', () => {
  test('AS1: Admin creates 4-choice and sorting questions', async ({ page }) => {
    // Test implementation
  });

  test('AS2: Admin creates guests with speech_guest attribute', async ({ page }) => {
    // Test implementation
  });

  // ... more scenarios
});
```

**References**:
- Playwright test organization: https://playwright.dev/docs/test-annotations
- BDD-style organization patterns: https://playwright.dev/docs/best-practices#organize-tests-with-describe-blocks

---

### 7. Browser Context Management for Multi-App Testing

**Decision**: Create separate browser contexts for each app instance, not separate browser instances

**Rationale**:
- Browser contexts provide full isolation (cookies, storage, auth state) with lower resource usage
- Playwright supports multiple contexts within single browser instance
- Enables testing 6 apps simultaneously: projector, host, 3 participants = 5 contexts (admin tested separately)
- Faster context creation (<1s) vs. browser instance creation (~5s)

**Alternatives Considered**:
- ✗ **Separate browser instances**: High resource usage (6 Chrome instances), slower startup
- ✗ **Single context with multiple pages**: Shared auth state causes test contamination
- ✗ **Frame/iframe approach**: Cannot test real deployed apps

**Best Practices**:
- Create contexts in test setup, close in teardown
- Use descriptive context names: `projectorContext`, `hostContext`, `guestAContext`
- Configure viewport sizes per context (mobile for participants, desktop for projector/host)
- Use Playwright fixtures for context lifecycle management

**Implementation Pattern**:
```typescript
// Test fixture
test.use({
  contexts: async ({ browser }, use) => {
    const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const guestAContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

    await use({ projectorContext, hostContext, guestAContext });

    await Promise.all([
      projectorContext.close(),
      hostContext.close(),
      guestAContext.close(),
    ]);
  },
});
```

**References**:
- Playwright browser contexts: https://playwright.dev/docs/browser-contexts
- Multi-context testing patterns: https://playwright.dev/docs/test-parallel#worker-index-and-parallel-index

---

## Implementation Priorities

Based on research findings, implementation should proceed in this order:

1. **Phase 1**: Test infrastructure foundation
   - Configure Playwright at monorepo root
   - Implement emulator lifecycle management
   - Implement health check utilities
   - Add unit tests for helpers (meta-testing per TDD)

2. **Phase 2**: App orchestration
   - Implement app launcher with process management
   - Implement global setup/teardown
   - Verify single-command execution end-to-end

3. **Phase 3**: Data isolation and fixtures
   - Implement collection prefix generator
   - Create test fixtures for questions, guests, game states
   - Add Playwright fixtures for shared context

4. **Phase 4**: Test scenarios implementation (TDD order)
   - US1: Pre-Event Setup (P1)
   - US2: Game Flow (P1)
   - US3: Period Finals (P1)
   - US4: Guest Lifecycle (P2)
   - US5: Test Automation validation (P2)

5. **Phase 5**: CI/CD integration
   - GitHub Actions workflow
   - Selective test execution for PRs
   - HTML report generation and artifact upload

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Flaky tests exceed 5% threshold | Implement automatic retry (2x), health check verification, explicit waits for state changes |
| Test suite exceeds 10min | Parallelize test execution, selective execution for PRs, optimize app startup time |
| Port conflicts in CI | Use fixed emulator ports, kill processes in teardown, add port availability check |
| Resource exhaustion (6 apps + emulators) | Use browser contexts not instances, implement graceful degradation, monitor CI resource usage |
| Debugging failures difficult | Capture screenshots on failure, enable video recording, detailed error messages with context |

---

## Conclusion

Research validates feasibility of all functional requirements. Playwright Test provides necessary capabilities for multi-app E2E testing with parallel execution, automatic retry, and comprehensive reporting. Firebase Emulators enable full local testing without production access. Collection prefix strategy ensures safe parallel execution. Implementation can proceed to Phase 1 (data model and contracts).
