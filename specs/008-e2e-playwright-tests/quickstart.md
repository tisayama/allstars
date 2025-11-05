# Quickstart Guide: E2E Testing with Playwright

**Feature**: 008-e2e-playwright-tests
**Date**: 2025-01-04
**Audience**: Developers adding new E2E tests or running existing tests

## Prerequisites

Before running E2E tests, ensure you have:

1. **Node.js 18+** and **pnpm** installed
2. **Firebase CLI** installed globally: `npm install -g firebase-tools`
3. **All 6 applications** buildable and runnable locally
4. **Firefox Emulators** configured in `firebase.json`

## Quick Start

### Running E2E Tests (Single Command)

From monorepo root:

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test category
pnpm test:e2e --grep "@P1"  # Only P1 priority tests
pnpm test:e2e scenarios/pre-event-setup.spec.ts  # Specific file

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run with debug mode
pnpm test:e2e --debug
```

**What happens automatically**:
1. ✅ Firebase Emulators start (Firestore on :8080, Auth on :9099)
2. ✅ All emulator data cleared for clean state
3. ✅ All 6 apps launched with health checks
4. ✅ Tests execute in parallel with unique collection prefixes
5. ✅ Apps and emulators shut down after tests complete

---

## Writing Your First E2E Test

### Step 1: Choose Test Category

Tests are organized by user story from `spec.md`:

| Category File | User Story | Priority |
|---------------|------------|----------|
| `pre-event-setup.spec.ts` | US1: Admin setup | P1 |
| `game-flow.spec.ts` | US2: Multi-app coordination | P1 |
| `period-finals.spec.ts` | US3: Gong mechanics | P1 |
| `guest-lifecycle.spec.ts` | US4: Drop/revive/reconnect | P2 |
| `test-automation.spec.ts` | US5: Infrastructure validation | P2 |

Add your test to the appropriate category file.

### Step 2: Use Test Fixtures

Import pre-defined test data from fixtures:

```typescript
// tests/e2e/scenarios/your-test.spec.ts
import { test, expect } from '@playwright/test';
import { QUESTION_4CHOICE_EASY, QUESTION_SORTING } from '../fixtures/questions';
import { GUEST_A, GUEST_B, GUEST_C } from '../fixtures/guests';
import { STATE_READY_FOR_NEXT } from '../fixtures/gameState';
```

### Step 3: Write Test with TDD

**Red**: Write failing test first

```typescript
test.describe('@P1 My New Feature', () => {
  test('AS1: User can perform action X', async ({ page, collectionPrefix }) => {
    // 1. Setup: Seed test data
    const seeder = new TestDataSeeder();
    await seeder.seedQuestions([QUESTION_4CHOICE_EASY], collectionPrefix);
    const guests = await seeder.seedGuests([GUEST_A, GUEST_B], collectionPrefix);

    // 2. Action: Navigate and perform user action
    await page.goto('http://localhost:5173'); // participant-app
    await page.click('[data-testid="answer-button-A"]');

    // 3. Assert: Verify expected outcome
    await expect(page.locator('[data-testid="answer-locked"]')).toBeVisible();
  });
});
```

**Green**: Implement feature to make test pass

**Refactor**: Improve code while keeping tests green

### Step 4: Run Your Test

```bash
# Run just your new test
pnpm test:e2e your-test.spec.ts

# Run in debug mode to inspect
pnpm test:e2e your-test.spec.ts --debug
```

---

## Common Patterns

### Pattern 1: Multi-Context Testing (Multiple Apps)

```typescript
test('verify synchronization across all apps', async ({ browser }) => {
  // Create contexts for each app
  const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const projectorPage = await projectorContext.newPage();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  // Navigate apps
  await projectorPage.goto('http://localhost:5174'); // projector-app
  await hostPage.goto('http://localhost:5175'); // host-app
  await guestPage.goto('http://localhost:5173'); // participant-app

  // Host starts question
  await hostPage.click('[data-testid="start-question-btn"]');

  // Verify projector shows question
  await expect(projectorPage.locator('[data-testid="question-text"]')).toBeVisible();

  // Verify guest can answer
  await expect(guestPage.locator('[data-testid="answer-buttons"]')).toBeVisible();

  // Cleanup
  await projectorContext.close();
  await hostContext.close();
  await guestContext.close();
});
```

### Pattern 2: Waiting for Real-Time Updates

```typescript
test('wait for WebSocket state update', async ({ page }) => {
  // Trigger state change on backend
  await api.startQuestion('question-1');

  // Wait for frontend to receive WebSocket event and update UI
  await expect(page.locator('[data-testid="current-phase"]')).toHaveText('accepting_answers', {
    timeout: 5000, // Allow time for WebSocket propagation
  });
});
```

### Pattern 3: Testing Firebase Auth Flow

```typescript
test('guest authenticates via join URL', async ({ page, collectionPrefix }) => {
  const seeder = new TestDataSeeder();
  const guests = await seeder.seedGuests([GUEST_A], collectionPrefix);
  const joinUrl = guests[0].joinUrl; // e.g., http://localhost:5173/join?token=abc123

  // Navigate to join URL
  await page.goto(joinUrl);

  // Firebase Anonymous Auth should auto-trigger
  await expect(page.locator('[data-testid="guest-name"]')).toHaveText('Guest A');

  // Verify Firebase auth state
  const uid = await page.evaluate(() => {
    return firebase.auth().currentUser?.uid;
  });
  expect(uid).toBeTruthy();
});
```

### Pattern 4: Using Collection Prefixes

Every test automatically gets a unique `collectionPrefix` via Playwright fixture:

```typescript
test('create and retrieve data with prefix', async ({ collectionPrefix }) => {
  // collectionPrefix is like "test_1704369600000_a1b2c3d4_"

  const guestsCollection = `${collectionPrefix}guests`;

  // Create data
  await admin.firestore().collection(guestsCollection).add({
    name: 'Test Guest',
    status: 'active',
  });

  // Retrieve data
  const snapshot = await admin.firestore().collection(guestsCollection).get();
  expect(snapshot.size).toBe(1);
});
```

---

## Debugging Tests

### View Test Report

After tests run, open the HTML report:

```bash
pnpm playwright show-report
```

This shows:
- Pass/fail status for each test
- Screenshots on failure
- Video recordings (if enabled)
- Trace files for time-travel debugging

### Inspect Failed Test

```bash
# Run single failing test in debug mode
pnpm test:e2e failing-test.spec.ts --debug

# Generate trace for debugging
pnpm test:e2e --trace on
```

### Check Emulator Data

While tests are running (in debug mode), you can inspect Firestore emulator data:

1. Open browser to `http://localhost:4000` (Emulator UI)
2. Navigate to Firestore tab
3. Look for collections starting with `test_` prefix
4. Inspect test data structure

### Common Issues

**Issue**: "Timeout waiting for app health check"
- **Solution**: Check that app is exposing `/health` endpoint
- **Debug**: Run app manually (`cd apps/api-server && pnpm dev`) and test `curl http://localhost:3000/health`

**Issue**: "Collection prefix collision"
- **Solution**: Tests should use `collectionPrefix` fixture, not hardcoded collection names
- **Debug**: Check test code for direct `admin.firestore().collection('guests')` usage

**Issue**: "WebSocket connection refused"
- **Solution**: Ensure socket-server is running and apps configured to use localhost socket URL
- **Debug**: Check browser console for WebSocket errors

---

## Performance Tips

### Selective Test Execution

Run only tests matching pattern:

```bash
# Run only P1 priority tests (faster feedback in PRs)
pnpm test:e2e --grep "@P1"

# Skip P2 tests
pnpm test:e2e --grep-invert "@P2"

# Run only game-flow tests
pnpm test:e2e scenarios/game-flow.spec.ts
```

### Parallel Execution

Playwright automatically runs tests in parallel (default: 50% of CPU cores). Configure in `playwright.config.ts`:

```typescript
export default defineConfig({
  workers: process.env.CI ? 2 : undefined, // 2 workers in CI, auto-detect locally
});
```

### Disable UI in CI

Emulator UI slows down startup. Disable in CI:

```bash
FIREBASE_EMULATOR_UI=false pnpm test:e2e
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e --grep "@P1"  # Only P1 in PRs for speed

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Best Practices

### DO ✅

- **Use fixtures**: Import pre-defined test data from `fixtures/`
- **Use collection prefixes**: Always use `collectionPrefix` fixture for data isolation
- **Wait explicitly**: Use Playwright's `expect().toBeVisible()` instead of hardcoded delays
- **Test real flows**: Avoid mocking - test against real Firebase Emulators and apps
- **Write small tests**: One test should verify one acceptance scenario
- **Tag priorities**: Use `@P1` and `@P2` tags for selective execution

### DON'T ❌

- **Don't hardcode collection names**: Use `${collectionPrefix}guests` not just `'guests'`
- **Don't use `sleep()`**: Use Playwright's wait mechanisms (`waitForSelector`, `expect()`)
- **Don't test implementation details**: Test user-visible behavior, not internal state
- **Don't skip cleanup**: Always close browser contexts and stop processes
- **Don't ignore flaky tests**: Investigate and fix - don't just retry blindly

---

## Next Steps

1. **Read the spec**: Familiarize yourself with `spec.md` user stories and acceptance scenarios
2. **Review existing tests**: Look at `scenarios/*.spec.ts` for patterns
3. **Write your test**: Follow TDD (red-green-refactor)
4. **Run and verify**: Ensure test passes locally before PR
5. **Update this guide**: If you discover new patterns, document them here

---

## Reference

- **Spec**: [spec.md](spec.md) - Feature requirements and user stories
- **Plan**: [plan.md](plan.md) - Technical architecture and design decisions
- **Research**: [research.md](research.md) - Technology choices and best practices
- **Data Model**: [data-model.md](data-model.md) - Test data structures and fixtures
- **Contracts**: [contracts/test-helper-api.md](contracts/test-helper-api.md) - Helper module APIs

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Firebase Emulators**: https://firebase.google.com/docs/emulator-suite
- **Monorepo Testing**: https://turbo.build/repo/docs/handbook/testing
