# Quickstart Guide: E2E Testing for Projector Authentication

**Audience**: Developers implementing E2E tests for projector app authentication

**Prerequisites**: Node.js 18+, pnpm 9+, Firebase CLI, Playwright installed

## Setup (5 minutes)

### 1. Install Dependencies

```bash
# From repository root
cd /home/tisayama/allstars

# Install all dependencies (if not already done)
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

### 2. Start Firebase Emulators

```bash
# Terminal 1: Start Firebase Emulators
firebase emulators:start --only auth,firestore

# Wait for output:
# ✔ All emulators ready! It is now safe to connect.
# ┌─────────────┬────────────────┬─────────────────────────────────┐
# │ Emulator    │ Host:Port      │ View in Emulator UI             │
# ├─────────────┼────────────────┼─────────────────────────────────┤
# │ Auth        │ localhost:9099 │ http://localhost:4000/auth      │
# │ Firestore   │ localhost:8080 │ http://localhost:4000/firestore │
# └─────────────┴────────────────┴─────────────────────────────────┘
```

### 3. Start Projector App Dev Server

```bash
# Terminal 2: Start projector app
cd apps/projector-app
pnpm run dev

# Wait for output:
# VITE v5.0.0  ready in 432 ms
# ➜  Local:   http://localhost:5175/
```

### 4. Verify Setup

```bash
# Terminal 3: Quick health check
curl http://localhost:9099   # Auth Emulator (should return 200)
curl http://localhost:8080   # Firestore Emulator (should return 200)
curl http://localhost:5175   # Projector app (should return HTML)
```

## Running Tests

### Unit Tests (Fast - No Emulators Required)

```bash
cd apps/projector-app
pnpm test:unit

# Expected: 278 tests passed in ~5s
```

### Integration Tests (Requires Emulators)

```bash
# Ensure Firebase Emulators are running!
cd apps/projector-app
pnpm test:integration

# Expected: 5 tests passed in ~30s
```

### E2E Tests (Requires Emulators + Dev Server)

```bash
# Ensure Firebase Emulators AND dev server are running!
pnpm test:e2e

# Expected: 20 tests passed in ~2min
```

### All Tests (Sequential Execution)

```bash
# From repository root
pnpm test:all

# Runs: unit → integration → e2e
# Expected: 303 tests passed in ~3min
```

## Developing New E2E Tests

### Directory Structure

```
tests/e2e/
├── fixtures/
│   └── projector-auth.fixture.ts   # Shared test fixtures
├── page-objects/
│   └── ProjectorPage.ts             # Page object for projector app
├── scenarios/
│   ├── projector-auth.spec.ts       # Authentication flow tests
│   ├── projector-reconnection.spec.ts # WebSocket reconnection tests
│   └── projector-fallback.spec.ts   # Dual-channel fallback tests
└── helpers/
    ├── firestore-seeder.ts           # Test data seeding
    ├── network-simulation.ts         # Network simulation utilities
    └── metrics-collector.ts          # Performance metrics collection
```

### Example: Writing a New E2E Test

```typescript
// tests/e2e/scenarios/projector-auth.spec.ts

import { test, expect } from '../fixtures/projector-auth.fixture';

test.describe('Projector Authentication Flow', () => {
  test('should authenticate within 3 seconds', async ({ projectorPage, seeder }) => {
    // Arrange: Seed minimal game state
    await seeder.seedGameState({
      currentPhase: 'waiting',
      isActive: false
    });

    // Act: Navigate to projector app and wait for auth
    const startTime = Date.now();
    await projectorPage.goto();
    await projectorPage.waitForAuthentication(3000);
    const authTime = Date.now() - startTime;

    // Assert: Authentication completed within 3s
    expect(authTime).toBeLessThan(3000);
    expect(await projectorPage.isAuthenticated()).toBe(true);
  });
});
```

### Using Test Fixtures

Test fixtures provide automatic setup and cleanup:

```typescript
test('example test', async ({ testEnv, firestore, seeder, projectorPage }) => {
  // testEnv: Firebase test environment (auto-cleanup)
  // firestore: Firestore instance connected to emulator
  // seeder: Helper for seeding test data
  // projectorPage: Playwright page with projector app loaded

  // Fixture automatically:
  // 1. Clears Firestore before test
  // 2. Seeds minimal game state
  // 3. Navigates to projector app
  // 4. Cleans up after test
});
```

### Seeding Test Data

```typescript
import { TEST_DATA } from '../helpers/test-data';

// Seed game state
await seeder.seedGameState({
  currentPhase: 'showing_question',
  currentQuestionId: 'q001'
});

// Seed questions
await seeder.seedQuestions([TEST_DATA.SAMPLE_QUESTION]);

// Seed guests
await seeder.seedGuests([TEST_DATA.SAMPLE_GUEST]);

// Clear all data
await seeder.clearAll();
```

### Simulating Network Conditions

```typescript
import { NetworkSimulator, NetworkState } from '../helpers/network-simulation';

const networkSim = new NetworkSimulator(page);

// Go offline
await networkSim.setState(NetworkState.OFFLINE);

// Disconnect WebSocket only (Firestore still works)
await networkSim.setState(NetworkState.FIRESTORE_ONLY);

// Disconnect Firestore only (WebSocket still works)
await networkSim.setState(NetworkState.WEBSOCKET_ONLY);

// Restore full connectivity
await networkSim.setState(NetworkState.ONLINE);

// Measure reconnection time
const reconnectTime = await networkSim.measureReconnectionTime();
expect(reconnectTime).toBeLessThan(10000); // <10s
```

### Collecting Performance Metrics

```typescript
import { MetricsCollector } from '../helpers/metrics-collector';

const metrics = new MetricsCollector(page);

// Collect auth metrics
const authMetrics = await metrics.collectAuthMetrics();
expect(authMetrics.authTime).toBeLessThan(3000);
expect(authMetrics.authSuccess).toBe(true);

// Collect reconnection metrics
const reconnectMetrics = await metrics.collectReconnectionMetrics();
expect(reconnectMetrics.attemptCount).toBeLessThan(10);
expect(reconnectMetrics.reconnectSuccess).toBe(true);

// Collect fallback metrics
const fallbackMetrics = await metrics.collectFallbackMetrics();
expect(fallbackMetrics.deduplicationRate).toBe(1.0); // 100%
```

## Debugging Tests

### Running Tests in Headed Mode

```bash
# See browser UI during test execution
pnpm test:e2e --headed
```

### Running Specific Test File

```bash
# Run only authentication tests
pnpm test:e2e tests/e2e/scenarios/projector-auth.spec.ts
```

### Running Single Test

```bash
# Run test matching pattern
pnpm test:e2e -g "should authenticate within 3 seconds"
```

### Playwright Inspector

```bash
# Debug tests with Playwright Inspector
PWDEBUG=1 pnpm test:e2e
```

### Console Logs

E2E tests capture console logs automatically:

```typescript
const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push(msg.text());
});

// Later: inspect logs
console.log(consoleLogs.filter(log => log.includes('error')));
```

## Common Issues

### Issue: Integration tests fail with "ECONNREFUSED localhost:9099"

**Cause**: Firebase Emulators not running

**Solution**:
```bash
# Start emulators in separate terminal
firebase emulators:start --only auth,firestore
```

### Issue: E2E tests timeout waiting for page load

**Cause**: Projector app dev server not running

**Solution**:
```bash
# Start dev server in separate terminal
cd apps/projector-app
pnpm run dev
```

### Issue: Tests fail with "No Firebase user available"

**Cause**: Auth Emulator not connected properly

**Solution**:
```bash
# Verify environment variables in test
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 pnpm test:integration
```

### Issue: Flaky tests (pass sometimes, fail others)

**Cause**: Race conditions, timing issues

**Solution**:
```typescript
// Use explicit waits instead of timeouts
await page.waitForSelector('[data-testid="auth-complete"]');

// NOT: await page.waitForTimeout(1000);
```

### Issue: Tests pass locally but fail in CI

**Cause**: Missing emulator startup in CI workflow

**Solution**:
```yaml
# .github/workflows/test.yml
- name: Start Firebase Emulators
  run: firebase emulators:start --only auth,firestore &

- name: Wait for Emulators
  run: sleep 5
```

## Performance Benchmarks

| Test Suite | Expected Time | Max Time | Test Count |
|------------|---------------|----------|------------|
| Unit Tests | ~5s | 10s | 278 |
| Integration Tests | ~30s | 60s | 5 |
| E2E Tests | ~2min | 5min | 20 |
| **Total** | **~3min** | **6min** | **303** |

## Next Steps

1. **Read Contracts**: Review test contracts in `contracts/` directory
2. **Implement Tests**: Follow test cases in contracts to implement E2E tests
3. **Run Tests**: Ensure all tests pass before creating PR
4. **Update Documentation**: Add test coverage report to README

## Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Vitest Docs**: https://vitest.dev/guide/
- **Firebase Emulator Suite**: https://firebase.google.com/docs/emulator-suite
- **Existing Tests**: `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts` (reference)

## Support

- **Issues**: Create issue in GitHub with `E2E test` label
- **Questions**: Ask in #engineering Slack channel
- **Documentation**: See `specs/001-projector-auth-e2e/` for full specification
