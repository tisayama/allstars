# E2E Test Quick Start Guide

**Phase 1 Output** | **Date**: 2025-11-08 | **Feature**: [spec.md](./spec.md)

## Overview

This guide provides step-by-step instructions for running AllStars E2E tests. The entire test suite can be executed with a single command that handles all setup, test execution, and cleanup automatically.

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu/Debian preferred)
- **Node.js**: 18.0.0 or higher
- **pnpm**: Latest version
- **Firebase CLI**: Latest version
- **Disk Space**: Minimum 2GB free

### Verification

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check pnpm
pnpm --version  # Should be installed

# Check Firebase CLI
firebase --version  # Should be installed
```

---

## Initial Setup

### 1. Clone Repository and Install Dependencies

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd allstars

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

### 2. Configure Hostname

The E2E tests require the `work-ubuntu` hostname to resolve to `127.0.0.1`.

**Option A: Modify /etc/hosts (Recommended)**

```bash
# Add work-ubuntu hostname
echo "127.0.0.1 work-ubuntu" | sudo tee -a /etc/hosts

# Verify hostname resolves correctly
ping -c 1 work-ubuntu
# Should show: 64 bytes from work-ubuntu (127.0.0.1)
```

**Option B: Use Environment Variable Override**

```bash
# Set BASE_URL environment variable
export BASE_URL="http://localhost"
```

### 3. Verify Firebase Configuration

```bash
# Verify firebase.json exists
ls firebase.json

# Verify emulator ports are available
lsof -i :8080  # Should show no output (port available)
lsof -i :9099  # Should show no output (port available)
```

---

## Running E2E Tests

### Quick Start: Single Command Execution

```bash
# Run all E2E tests (starts emulators, runs tests, cleans up)
pnpm run e2e
```

**What This Command Does**:
1. Starts Firebase Emulator Suite (Firestore + Auth)
2. Waits for emulators to be ready
3. Starts all 4 applications (admin, host, participant, projector)
4. Waits for applications to be healthy
5. Runs all E2E test scenarios
6. Stops applications
7. Stops Firebase emulators
8. Generates test report

**Expected Output**:
```
Starting Firebase Emulators...
✓ Firestore emulator ready on port 8080
✓ Auth emulator ready on port 9099

Starting applications...
✓ participant-app ready on http://work-ubuntu:5173
✓ host-app ready on http://work-ubuntu:5174
✓ projector-app ready on http://work-ubuntu:5175
✓ admin-app ready on http://work-ubuntu:5176

Running E2E tests...
✓ Admin Setup Flow (5 scenarios, 30s)
✓ Participant Flow (7 scenarios, 45s)
✓ Projector Display (7 scenarios, 40s)
✓ Host Control (7 scenarios, 50s)
✓ Full Game Flow (1 scenario, 60s)

Total: 27 scenarios passed (225s)

Cleaning up...
✓ Applications stopped
✓ Emulators stopped

Test report: playwright-report/index.html
```

### Step-by-Step Execution (For Debugging)

If you need more control over the test execution process:

```bash
# Step 1: Start Firebase Emulators
pnpm run e2e:setup

# Step 2: Run tests (emulators must be running)
pnpm run test:e2e

# Step 3: Stop emulators and cleanup
pnpm run e2e:teardown
```

---

## Running Specific Test Scenarios

### Run Single Test File

```bash
# Run only admin setup tests
pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts

# Run only participant flow tests
pnpm exec playwright test tests/e2e/scenarios/participant-flow.spec.ts

# Run only projector display tests
pnpm exec playwright test tests/e2e/scenarios/projector-display.spec.ts

# Run only host control tests
pnpm exec playwright test tests/e2e/scenarios/host-control.spec.ts

# Run only full game flow test
pnpm exec playwright test tests/e2e/scenarios/full-game-flow.spec.ts
```

### Run Tests in Debug Mode

```bash
# Run with Playwright Inspector (step through tests)
pnpm exec playwright test --debug tests/e2e/scenarios/admin-setup.spec.ts

# Run in headed mode (see browser)
pnpm exec playwright test --headed tests/e2e/scenarios/admin-setup.spec.ts

# Run with UI mode (interactive test runner)
pnpm exec playwright test --ui
```

### Filter Tests by Name

```bash
# Run tests matching pattern
pnpm exec playwright test --grep "admin.*CRUD"

# Run tests NOT matching pattern
pnpm exec playwright test --grep-invert "slow"
```

---

## Viewing Test Results

### HTML Report (Interactive)

```bash
# Generate and open HTML report
pnpm exec playwright show-report
```

**Report Includes**:
- Test execution timeline
- Screenshots of failures
- Videos of failed tests
- Trace viewer for detailed debugging
- Test duration and status

### Console Output

Test results are displayed in the console during execution:

```
Running 27 tests using 2 workers

  ✓ admin-setup.spec.ts:10:1 › Admin adds question via UI (5.2s)
  ✓ admin-setup.spec.ts:25:1 › Admin edits question (3.8s)
  ✓ admin-setup.spec.ts:40:1 › Admin imports guests from CSV (6.1s)
  ...

  27 passed (2.5m)
```

### Trace Viewer (For Failures)

If a test fails and retries, a trace file is generated:

```bash
# Open trace viewer
pnpm exec playwright show-trace test-results/<test-name>/trace.zip
```

**Trace Viewer Features**:
- Step-by-step timeline
- Network requests
- Console logs
- DOM snapshots
- Action logs

---

## Troubleshooting

### Emulators Won't Start

**Problem**: Firebase emulators fail to start

**Solutions**:

```bash
# Check if ports are in use
lsof -i :8080
lsof -i :9099

# Kill processes using ports (if needed)
kill -9 <PID>

# Verify Firebase CLI is installed
firebase --version

# Check firebase.json exists
ls firebase.json

# Start emulators manually to see errors
firebase emulators:start --only firestore,auth --project stg-wedding-allstars
```

### Hostname Not Resolving

**Problem**: `work-ubuntu` hostname not found

**Solutions**:

```bash
# Verify /etc/hosts entry
cat /etc/hosts | grep work-ubuntu
# Should show: 127.0.0.1 work-ubuntu

# Add if missing
echo "127.0.0.1 work-ubuntu" | sudo tee -a /etc/hosts

# Test resolution
ping -c 1 work-ubuntu

# Alternative: Use environment variable
export BASE_URL="http://localhost"
pnpm run e2e
```

### Applications Won't Start

**Problem**: Applications fail to start on expected ports

**Solutions**:

```bash
# Check if ports are in use
lsof -i :5173  # participant-app
lsof -i :5174  # host-app
lsof -i :5175  # projector-app
lsof -i :5176  # admin-app

# Kill processes using ports
kill -9 <PID>

# Verify dependencies installed
pnpm install

# Try starting apps manually
cd apps/participant-app && pnpm run dev
cd apps/host-app && pnpm run dev
cd apps/projector-app && pnpm run dev
cd apps/admin-app && pnpm run dev
```

### Tests Timing Out

**Problem**: Tests hang or timeout

**Solutions**:

```bash
# Increase timeout in playwright.config.ts
# timeout: 30000 → timeout: 60000

# Run with debug to see where it hangs
pnpm exec playwright test --debug

# Check for infinite loops in globalSetup/globalTeardown
cat tests/e2e/globalSetup.ts
cat tests/e2e/globalTeardown.ts

# Verify timeout commands are used in scripts
grep -r "timeout" tests/e2e/
```

### Firestore Data Not Clearing

**Problem**: Test data persists between runs

**Solutions**:

```bash
# Manually clear emulator data
curl -X DELETE "http://localhost:8080/emulator/v1/projects/stg-wedding-allstars/databases/(default)/documents"

# Verify clear data script in globalSetup
grep "clearData" tests/e2e/globalSetup.ts

# Check collection prefix isolation
grep "collectionPrefix" tests/e2e/fixtures.ts
```

### Browser Not Installed

**Problem**: Playwright browser not found

**Solutions**:

```bash
# Install Chromium
pnpm exec playwright install chromium

# Install all browsers
pnpm exec playwright install

# Verify installation
pnpm exec playwright install --help
```

---

## Advanced Usage

### Running on CI/CD

```bash
# Set CI environment variable
export CI=true

# Run tests with CI-specific settings (2 workers, 2 retries)
pnpm run e2e

# Upload artifacts (add to CI configuration)
# - playwright-report/**
# - test-results/**
```

### Parallel Execution

Tests run in parallel by default. To control parallelism:

```bash
# Run with specific number of workers
pnpm exec playwright test --workers=4

# Run fully parallel (default)
pnpm exec playwright test --fully-parallel

# Run serially (one at a time)
pnpm exec playwright test --workers=1
```

### Custom Configuration

```bash
# Use custom config file
pnpm exec playwright test --config=playwright.e2e.config.ts

# Override base URL
pnpm exec playwright test --base-url=http://work-ubuntu

# Run specific browser
pnpm exec playwright test --project=chromium
```

### Debugging Failed Tests

```bash
# Run only last failed tests
pnpm exec playwright test --last-failed

# Repeat failed test multiple times to check for flakiness
pnpm exec playwright test --repeat-each=10 tests/e2e/scenarios/flaky-test.spec.ts

# Run with trace enabled
pnpm exec playwright test --trace=on
```

---

## Performance Optimization

### Reducing Test Execution Time

1. **Use Parallel Execution** (default)
   - Tests run in parallel workers
   - Adjust workers based on CPU cores

2. **Optimize Data Seeding**
   - Use batch operations for Firestore writes
   - Seed collections in parallel

3. **Minimize Waiting**
   - Use `waitForSelector` with specific timeouts
   - Avoid fixed `page.wait()` calls

4. **Reuse Browser Contexts**
   - Create contexts once, reuse across tests
   - Close contexts in test teardown

### Monitoring Performance

```bash
# Run with reporter that shows timing
pnpm exec playwright test --reporter=list

# Generate JSON report with timing data
pnpm exec playwright test --reporter=json

# Analyze slow tests
pnpm exec playwright test --reporter=html
# Open report and sort by duration
```

---

## Best Practices

### Test Writing

1. **Use Descriptive Test Names**
   ```typescript
   test('Admin adds question and verifies it appears in list', async ({ ... }) => {
     // Clear test intent from name
   });
   ```

2. **Follow AAA Pattern** (Arrange-Act-Assert)
   ```typescript
   test('example', async ({ seeder, collectionPrefix }) => {
     // Arrange: Setup test data
     await seeder.seedQuestions([question], collectionPrefix);

     // Act: Perform action
     await page.click('[data-testid="add-question"]');

     // Assert: Verify outcome
     await expect(page.locator('.question-list')).toContainText(question.text);
   });
   ```

3. **Use Test Data Factories**
   ```typescript
   // Good: Use factory functions
   const question = createTestQuestion({ text: 'My question' });

   // Avoid: Manual object creation
   const question = { id: 'q1', text: 'My question', ... };
   ```

4. **Isolate Test Data**
   ```typescript
   // Good: Use collection prefix
   await seeder.seedQuestions(questions, collectionPrefix);

   // Avoid: Hardcoded collection names
   await db.collection('questions').add(question);
   ```

### Debugging

1. **Use Console Logs Sparingly**
   - Prefer trace viewer over console.log
   - Remove debug logs before committing

2. **Take Screenshots on Key Steps**
   ```typescript
   await page.screenshot({ path: 'debug-step1.png' });
   ```

3. **Use Test Fixtures for Common Setup**
   ```typescript
   test.use({
     seeder: async ({}, use) => {
       const seeder = new TestDataSeeder();
       await use(seeder);
     }
   });
   ```

---

## Summary

**Quick Start**:
```bash
pnpm run e2e
```

**View Results**:
```bash
pnpm exec playwright show-report
```

**Debug Failed Test**:
```bash
pnpm exec playwright test --debug tests/e2e/scenarios/failing-test.spec.ts
```

---

## Additional Resources

- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Firebase Emulator Suite**: https://firebase.google.com/docs/emulator-suite
- **AllStars E2E Environment Contract**: [contracts/e2e-environment.yaml](./contracts/e2e-environment.yaml)
- **Test Data Model**: [data-model.md](./data-model.md)
- **Research & Best Practices**: [research.md](./research.md)

---

**Document Version**: 1.0
**Date**: 2025-11-08
**Phase**: Phase 1 - Complete
