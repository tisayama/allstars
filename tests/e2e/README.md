# E2E Testing Infrastructure

**Feature**: 008-e2e-playwright-tests
**Status**: Production-ready
**Test Framework**: Playwright Test + TypeScript

Comprehensive end-to-end testing infrastructure for the AllStars quiz game platform. Tests validate multi-app coordination, WebSocket real-time synchronization, and complete game flow mechanics.

---

## Table of Contents

- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Running Tests](#running-tests)
  - [Running Helper Unit Tests](#running-helper-unit-tests)
- [What Gets Started Automatically](#what-gets-started-automatically)
- [Directory Structure](#directory-structure)
- [Test Coverage](#test-coverage)
- [Writing Your First Test](#writing-your-first-test)
- [Available Test Fixtures](#available-test-fixtures)
- [Helper Utilities](#helper-utilities)
- [Best Practices](#best-practices)
- [Debugging Tests](#debugging-tests)
  - [Advanced Debugging Techniques](#advanced-debugging-techniques)
- [Performance Tips](#performance-tips)
  - [Performance Benchmarking](#performance-benchmarking)
- [CI/CD Integration](#cicd-integration)
- [Architecture](#architecture)
- [Further Reading](#further-reading)
- [Support](#support)

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8.0+
- Firebase CLI: `npm install -g firebase-tools`

### Running Tests

```bash
# Run all E2E tests (single command - starts everything automatically)
pnpm test:e2e

# Run specific test file
pnpm test:e2e pre-event-setup.spec.ts

# Run only P1 priority tests (faster feedback)
pnpm test:e2e --grep "@P1"

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run in debug mode (step through tests)
pnpm test:e2e --debug

# Run specific test by name
pnpm test:e2e -g "Host triggers gong"
```

### Running Helper Unit Tests

```bash
# Run unit tests for helper utilities
pnpm test:helpers

# Run with watch mode (auto-rerun on file changes)
pnpm test:helpers:watch

# Run with code coverage
pnpm test:helpers:coverage
```

**Code Coverage:**
- Coverage thresholds: 80% lines/functions/statements, 75% branches
- Reports generated in `./coverage/` directory
- Open `coverage/index.html` in browser for detailed report
- Coverage focuses on helper utilities only (not test files)

---

## What Gets Started Automatically

When you run `pnpm test:e2e`, the test suite automatically:

1. ✅ Starts Firebase Emulators (Firestore:8080, Auth:9099)
2. ✅ Clears all emulator data for clean state
3. ✅ Launches all 6 applications:
   - API server (port 3000)
   - Socket server (port 3001)
   - Admin app (port 5176)
   - Host app (port 5174)
   - Projector app (port 5175)
   - Participant app (port 5173)
4. ✅ Waits for health checks (30s timeout)
5. ✅ Runs tests in parallel
6. ✅ Shuts down everything after tests complete

**No manual setup required!**

---

## Directory Structure

```
tests/e2e/
├── scenarios/              # E2E test files (organized by user story)
│   ├── infrastructure.spec.ts    # Infrastructure validation (US5)
│   ├── pre-event-setup.spec.ts   # Admin setup (US1)
│   ├── game-flow.spec.ts         # Multi-app coordination (US2)
│   ├── period-finals.spec.ts     # Gong mechanics (US3)
│   └── guest-lifecycle.spec.ts   # Drop/revive/reconnect (US4)
│
├── fixtures/               # Test data fixtures
│   └── index.ts           # Pre-defined questions, guests, game states
│
├── helpers/               # Test helper utilities
│   ├── collectionPrefix.ts      # Unique prefix generation
│   ├── healthChecker.ts          # Health check polling
│   ├── emulatorManager.ts        # Firebase Emulator lifecycle
│   ├── appLauncher.ts            # App process management
│   └── testDataSeeder.ts         # Firestore test data seeding
│
├── fixtures.ts            # Playwright custom fixtures
├── globalSetup.ts         # Start emulators + apps before all tests
├── globalTeardown.ts      # Stop everything after all tests
├── helpers.test.ts        # Unit tests for helper utilities (TDD)
└── README.md             # This file
```

---

## Test Coverage

| User Story | File | Scenarios | Priority | Status |
|------------|------|-----------|----------|--------|
| US1: Pre-Event Setup | `pre-event-setup.spec.ts` | 6 | P1 | ✅ |
| US2: Game Flow | `game-flow.spec.ts` | 6 | P1 | ✅ |
| US3: Period Finals | `period-finals.spec.ts` | 6 | P1 | ✅ |
| US4: Guest Lifecycle | `guest-lifecycle.spec.ts` | 6 | P2 | ✅ |
| US5: Infrastructure | `infrastructure.spec.ts` | 2 | P2 | ✅ |
| **Projector Auth** | `projector-auth.spec.ts` | 5 | P1 | ⏳ |
| **Projector Reconnection** | `projector-reconnection.spec.ts` | 5 | P1 | ⏳ |
| **Projector Fallback** | `projector-fallback.spec.ts` | 6 | P2 | ⏳ |
| **TOTAL** | **8 files** | **42** | - | **✅** |

### Projector Authentication E2E Tests (Feature: 001-projector-auth-e2e)

**Test Suites:**
- **projector-auth.spec.ts**: Browser-based Firebase authentication flow (5 scenarios)
  - TC-AUTH-001: Initial authentication completes within 3 seconds
  - TC-AUTH-002: Authentication persists across page reload
  - TC-AUTH-003: Invalid API key shows user-friendly error
  - TC-AUTH-004: Network failure during authentication shows retry behavior
  - TC-AUTH-005: Token automatically refreshes before expiration

- **projector-reconnection.spec.ts**: WebSocket reconnection with exponential backoff (5 scenarios)
  - TC-RECON-001: WebSocket reconnection follows exponential backoff timing
  - TC-RECON-002: WebSocket reconnects within 10 seconds after network restoration
  - TC-RECON-003: UI shows reconnection status and attempt count
  - TC-RECON-004: Reconnection stops after 10 failed attempts
  - TC-RECON-005: Network simulator accurately isolates WebSocket and Firestore

- **projector-fallback.spec.ts**: Dual-channel fallback and deduplication (6 scenarios)
  - TC-FALLBACK-001: Firestore fallback delivers updates within 500ms
  - TC-FALLBACK-002: No duplicate events when both channels active
  - TC-FALLBACK-003: Deduplication logic uses correct criteria
  - TC-FALLBACK-004: Seamless transition between channel modes
  - TC-FALLBACK-005: Firestore listener remains resilient across reconnections
  - TC-FALLBACK-006: Performance remains acceptable under dual-channel load

**Prerequisites for Running Projector Auth Tests:**
1. Firebase Emulators running (Auth: 9099, Firestore: 8080)
2. Projector app must expose test globals (see `/tests/e2e/TEST_IMPLEMENTATION_REQUIREMENTS.md`)
3. Socket server must have test disconnect endpoint enabled (non-production only)

**Running Projector Auth Tests:**
```bash
# Run all projector authentication tests
pnpm test:e2e projector-auth.spec.ts projector-reconnection.spec.ts projector-fallback.spec.ts

# Run only authentication flow tests (P1 priority)
pnpm test:e2e projector-auth.spec.ts --grep "@P1"

# Run reconnection tests
pnpm test:e2e projector-reconnection.spec.ts

# Run fallback tests
pnpm test:e2e projector-fallback.spec.ts
```

**Test Implementation Requirements:**
- See `/tests/e2e/TEST_IMPLEMENTATION_REQUIREMENTS.md` for required global variables
- Projector app must expose authentication state, WebSocket connection status, and error tracking
- All test globals should only be enabled in non-production environments

---

## Writing Your First Test

### 1. Choose the Appropriate Test File

Tests are organized by user story. Add your test to the relevant file:
- Admin/setup tasks → `pre-event-setup.spec.ts`
- Real-time coordination → `game-flow.spec.ts`
- Gong/period mechanics → `period-finals.spec.ts`
- Guest management → `guest-lifecycle.spec.ts`

### 2. Use Test Fixtures

Import pre-defined test data:

```typescript
import { test, expect } from '../fixtures';
import { QUESTION_4CHOICE_EASY, GUEST_A, GUEST_B } from '../fixtures/index';

test('My test scenario', async ({ seeder, collectionPrefix }) => {
  // Seed test data
  await seeder.seedQuestions([QUESTION_4CHOICE_EASY], collectionPrefix);
  const guests = await seeder.seedGuests([GUEST_A, GUEST_B], collectionPrefix);

  // Test assertions...
});
```

### 3. Use Custom Fixtures

Every test automatically receives:
- `collectionPrefix` - Unique data isolation prefix
- `seeder` - TestDataSeeder instance
- `prefixGenerator` - CollectionPrefixGenerator instance
- `page` - Playwright Page (standard)
- `browser` - Playwright Browser (standard)

### 4. Multi-App Testing Pattern

```typescript
test('Multi-app coordination', async ({ browser, seeder, collectionPrefix }) => {
  // Create contexts for each app
  const projectorContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });

  // Navigate apps
  const projectorPage = await projectorContext.newPage();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await projectorPage.goto('http://localhost:5175');
  await hostPage.goto('http://localhost:5174');
  await guestPage.goto(guests[0].joinUrl);

  // Test multi-app interactions...

  // Cleanup
  await projectorContext.close();
  await hostContext.close();
  await guestContext.close();
});
```

---

## Available Test Fixtures

### Pre-defined Questions

```typescript
import { QUESTION_4CHOICE_EASY } from '../fixtures/index';

// 4-choice question about capital of France
// Correct answer: B. Paris
```

### Pre-defined Guests

```typescript
import { GUEST_A, GUEST_B, GUEST_C } from '../fixtures/index';

// GUEST_A: Normal guest with no attributes
// GUEST_B: Guest with age-under-20 attribute
// GUEST_C: Guest with gender-male attribute
```

### Pre-defined Game States

```typescript
import { STATE_READY_FOR_NEXT } from '../fixtures/index';

// Initial state before any questions started
// currentPhase: 'ready_for_next'
```

### Creating Custom Test Data

```typescript
const customQuestion: TestQuestion = {
  testId: 'Q_CUSTOM',
  questionText: 'Your question text?',
  choices: [
    { index: 0, text: 'A. Choice 1' },
    { index: 1, text: 'B. Choice 2' },
  ],
  correctAnswer: 'A. Choice 1',
  period: 'first-half',
  questionNumber: 1,
  skipAttributes: [],
};

await seeder.seedQuestions([customQuestion], collectionPrefix);
```

---

## Helper Utilities

### CollectionPrefixGenerator

Generates unique collection prefixes for data isolation:

```typescript
import { CollectionPrefixGenerator } from './helpers/collectionPrefix';

const generator = new CollectionPrefixGenerator();
const prefix = generator.generate(); // "test_1704369600000_a1b2c3d4_"
const guestsCollection = generator.apply(prefix, 'guests');
// "test_1704369600000_a1b2c3d4_guests"
```

### TestDataSeeder

Seeds Firestore with test data:

```typescript
const seeder = new TestDataSeeder();

// Seed questions
await seeder.seedQuestions([question1, question2], collectionPrefix);

// Seed guests (returns join URLs)
const guests = await seeder.seedGuests([guest1, guest2], collectionPrefix);
console.log(guests[0].joinUrl); // http://localhost:5173/join?token=...

// Seed game state
await seeder.seedGameState(STATE_READY_FOR_NEXT, collectionPrefix);

// Clear test data
await seeder.clearTestData(collectionPrefix);
```

### HealthChecker

Poll health endpoints with exponential backoff:

```typescript
const healthChecker = new HealthChecker();

// Wait for single app
await healthChecker.waitForReady({
  url: 'http://localhost:3000/health',
  timeoutMs: 30000
});

// Wait for multiple apps in parallel
await healthChecker.waitForMany([
  { url: 'http://localhost:3000/health' },
  { url: 'http://localhost:3001/health' },
]);
```

---

## Best Practices

### DO ✅

1. **Use fixtures**: Import pre-defined test data instead of creating from scratch
2. **Use collection prefixes**: Always use `collectionPrefix` for data isolation
3. **Wait explicitly**: Use Playwright's `expect().toBeVisible()` instead of `setTimeout()`
4. **Tag priorities**: Use `@P1` and `@P2` tags for selective execution
5. **Test real flows**: Test against real Firebase Emulators, not mocks
6. **Clean up contexts**: Always close browser contexts in test cleanup

### DON'T ❌

1. **Don't hardcode collection names**: Use `${collectionPrefix}guests` not just `'guests'`
2. **Don't use `sleep()`**: Use Playwright's wait mechanisms
3. **Don't test implementation details**: Test user-visible behavior
4. **Don't skip cleanup**: Always close contexts and stop processes
5. **Don't ignore flaky tests**: Investigate and fix root cause

---

## Debugging Tests

### View Test Report

After tests run:

```bash
pnpm playwright show-report
```

This shows:
- Pass/fail status for each test
- Screenshots on failure
- Video recordings (if enabled)
- Trace files for time-travel debugging

### Run Single Test in Debug Mode

```bash
pnpm test:e2e failing-test.spec.ts --debug
```

### Inspect Emulator Data

While tests are running (in debug mode), open:
```
http://localhost:4000
```

Navigate to Firestore tab and look for collections starting with `test_` prefix.

### Common Issues

**Issue**: "Timeout waiting for app health check"
- **Solution**: Check that app exposes `/health` endpoint
- **Debug**: Run app manually: `cd apps/api-server && pnpm dev`
- **Test**: `curl http://localhost:3000/health`

**Issue**: "Collection prefix collision"
- **Solution**: Use `collectionPrefix` fixture, not hardcoded names
- **Debug**: Check for `admin.firestore().collection('guests')` usage

**Issue**: "WebSocket connection refused"
- **Solution**: Ensure socket-server is running
- **Debug**: Check browser console for WebSocket errors

### Advanced Debugging Techniques

**1. Enable Playwright Trace Recording**

Generate detailed trace files for post-mortem debugging:

```typescript
// In your test file
test.use({ trace: 'on' }); // Always record
test.use({ trace: 'on-first-retry' }); // Record on retry only
test.use({ trace: 'retain-on-failure' }); // Keep trace only on failure
```

Or via CLI:
```bash
pnpm test:e2e --trace on
```

View trace:
```bash
pnpm playwright show-trace test-results/.../trace.zip
```

**2. Pause Test Execution**

Insert breakpoints in your test code:

```typescript
test('my test', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await page.pause(); // Opens Playwright Inspector
  // ... rest of test
});
```

**3. Debug Specific Browser Context**

```typescript
const hostContext = await browser.newContext();
await hostContext.tracing.start({ screenshots: true, snapshots: true });

// ... perform actions

await hostContext.tracing.stop({ path: 'host-trace.zip' });
```

**4. Inspect Network Traffic**

```typescript
page.on('request', request =>
  console.log('>>', request.method(), request.url())
);
page.on('response', response =>
  console.log('<<', response.status(), response.url())
);
```

**5. Debug Helper Functions in Isolation**

Run helper unit tests with debugger:
```bash
# Use Node.js debugger
node --inspect-brk node_modules/.bin/vitest tests/e2e/helpers.test.ts

# Or use Vitest UI (visual debugger)
pnpm test:helpers:watch --ui
```

**6. Examine Firestore Data Mid-Test**

```typescript
test('debug firestore', async ({ seeder, collectionPrefix }) => {
  // Seed data
  await seeder.seedGuests([GUEST_A], collectionPrefix);

  // Pause here and visit http://localhost:4000
  await page.pause();

  // In Emulator UI: Firestore → Look for `test_*` collections
});
```

**7. Capture Console Logs from Browser**

```typescript
page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', error => {
  console.error('Page error:', error.message);
});
```

**8. Debug Flaky Tests**

Run same test multiple times to reproduce flakiness:
```bash
# Run test 10 times
pnpm test:e2e failing-test.spec.ts --repeat-each=10

# Run until failure (max 100 times)
for i in {1..100}; do pnpm test:e2e failing-test.spec.ts || break; done
```

**9. Environment Variables for Debug Logging**

```bash
# Enable Playwright debug logs
DEBUG=pw:api pnpm test:e2e

# Enable Firebase Admin debug logs
FIREBASE_DATABASE_EMULATOR_HOST_DEBUG=1 pnpm test:e2e

# Verbose logging
NODE_ENV=development VERBOSE=true pnpm test:e2e
```

**10. Inspect Test Artifacts**

After test failure, check artifacts in `test-results/`:
```bash
# View screenshots
open test-results/**/test-failed-1.png

# View video recordings (if enabled)
open test-results/**/video.webm

# View trace files
pnpm playwright show-trace test-results/**/trace.zip
```

---

## Performance Tips

### Selective Test Execution

```bash
# Run only P1 priority tests (faster feedback in PRs)
pnpm test:e2e --grep "@P1"

# Skip P2 tests
pnpm test:e2e --grep-invert "@P2"

# Run specific test file
pnpm test:e2e game-flow.spec.ts
```

### Parallel Execution

Playwright automatically runs tests in parallel (default: 50% of CPU cores).

Configure in `playwright.config.ts`:
```typescript
workers: process.env.CI ? 2 : undefined, // 2 workers in CI, auto-detect locally
```

### Disable Emulator UI in CI

Speeds up startup:
```bash
FIREBASE_EMULATOR_UI=false pnpm test:e2e
```

### Performance Benchmarking

Measure test execution times and identify bottlenecks:

```bash
# Generate detailed timing report with --reporter=list
pnpm test:e2e --reporter=list

# Generate JSON report for programmatic analysis
pnpm test:e2e --reporter=json --output=test-results.json

# Run with time limits to identify slow tests
pnpm test:e2e --timeout=15000  # Fail tests taking >15s
```

**Analyzing Test Performance:**

1. **View Playwright trace with timing data:**
   ```bash
   pnpm playwright show-report
   ```
   Click any test to see detailed timeline with network, DOM, and action timings.

2. **Identify slow tests in HTML report:**
   - Tests sorted by duration
   - Shows setup/teardown overhead
   - Highlights tests exceeding timeout

3. **Common performance bottlenecks:**
   - Health check polling too aggressive → Increase initial delay
   - Too many concurrent browsers → Reduce worker count
   - Large Firestore seed data → Use smaller datasets for speed tests
   - Synchronous app launches → Already parallelized in globalSetup
   - Heavy browser contexts → Reuse contexts when isolation not needed

4. **Benchmark baseline (clean environment):**
   - Infrastructure startup: ~10-15s (emulators + 6 apps)
   - Single E2E test: ~2-5s
   - Full P1 suite (18 tests): ~30-45s with 2 workers
   - Full suite (26 tests): ~60-90s with 2 workers

**Optimization Tips:**
- Use `@P1` tags for critical path tests (run in PRs)
- Keep P2 tests for comprehensive validation (run on main)
- Avoid unnecessary `page.waitForTimeout()` → Use explicit waits
- Minimize test data → Only seed what's needed for scenario
- Profile helper functions → Use `pnpm test:helpers:coverage` to find unused code

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
        run: pnpm test:e2e --grep "@P1"

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Architecture

### Test-Driven Development (TDD)

Helper utilities follow strict TDD:
1. **Red**: Write failing unit tests first
2. **Green**: Implement to make tests pass
3. **Refactor**: Improve code while keeping tests green

See `helpers.test.ts` for helper unit tests.

### Data Isolation

Collection prefix strategy enables safe parallel execution:
- Format: `test_${timestamp}_${uuid}_`
- Each test gets unique prefix
- No data collision between tests
- Automatic cleanup via Playwright fixtures

### Multi-App Coordination

Tests validate real-time synchronization:
- WebSocket events propagate correctly
- Firestore state updates sync across apps
- No race conditions or dropped updates

### Flaky Test Mitigation

- Automatic retry: 2-3 attempts (Playwright built-in)
- Exponential backoff for health checks
- Explicit wait mechanisms (no hardcoded delays)
- WebSocket reconnection testing

---

## Further Reading

- **Spec**: [specs/008-e2e-playwright-tests/spec.md](../../specs/008-e2e-playwright-tests/spec.md)
- **Quickstart**: [specs/008-e2e-playwright-tests/quickstart.md](../../specs/008-e2e-playwright-tests/quickstart.md)
- **Contracts**: [specs/008-e2e-playwright-tests/contracts/test-helper-api.md](../../specs/008-e2e-playwright-tests/contracts/test-helper-api.md)
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Firebase Emulators**: https://firebase.google.com/docs/emulator-suite

---

## Support

For questions or issues:
1. Check this README first
2. Review test examples in `scenarios/` directory
3. Check specification docs in `specs/008-e2e-playwright-tests/`
4. Open an issue with test failure details

---

**Happy Testing!** 🎉
