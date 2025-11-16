# Test Contract: Integration Test Configuration

**Test Scenario**: Enable existing integration tests to run in CI/CD pipeline

**Priority**: P1

**Related Requirements**: FR-006, FR-007, FR-012

## Configuration Changes

### Vitest Workspace Configuration

**File**: `apps/projector-app/vitest.workspace.ts` (NEW)

**Content**:
```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: './tests/setup.ts'
    }
  },
  {
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: './tests/integration-setup.ts'
    }
  }
]);
```

**Rationale**:
- Separates unit and integration tests for independent execution
- Allows different setup files (integration needs Firebase Emulator check)
- Enables selective test running: `pnpm test:unit`, `pnpm test:integration`

---

### Integration Setup File

**File**: `apps/projector-app/tests/integration-setup.ts` (NEW)

**Content**:
```typescript
import { beforeAll } from 'vitest';

/**
 * Integration test setup - validates Firebase Emulators are running
 */
beforeAll(async () => {
  // Check Auth Emulator
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  console.log(`Checking Firebase Auth Emulator at ${authEmulatorHost}...`);

  try {
    const authResponse = await fetch(`http://${authEmulatorHost}/`);
    if (!authResponse.ok) {
      throw new Error('Auth Emulator not responding');
    }
  } catch (error) {
    console.error('✗ Firebase Auth Emulator is not running');
    console.error('  Hint: Start with `firebase emulators:start --only auth`');
    throw new Error('Integration tests require Firebase Auth Emulator on localhost:9099');
  }

  // Check Firestore Emulator
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  console.log(`Checking Firestore Emulator at ${firestoreEmulatorHost}...`);

  try {
    const firestoreResponse = await fetch(`http://${firestoreEmulatorHost}/`);
    if (!firestoreResponse.ok) {
      throw new Error('Firestore Emulator not responding');
    }
  } catch (error) {
    console.error('✗ Firestore Emulator is not running');
    console.error('  Hint: Start with `firebase emulators:start --only firestore`');
    throw new Error('Integration tests require Firestore Emulator on localhost:8080');
  }

  console.log('✓ All Firebase Emulators are running');
});
```

**Features**:
- Fails fast if emulators not running (FR-012)
- Provides actionable error messages with start commands (FR-012)
- Validates both Auth and Firestore emulators
- Runs once before all integration tests

---

### Package.json Script Updates

**File**: `apps/projector-app/package.json`

**Changes**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --project unit",
    "test:integration": "vitest --project integration",
    "test:e2e": "playwright test",
    "test:all": "pnpm test:unit && pnpm test:integration && pnpm test:e2e"
  }
}
```

**Rationale**:
- `test` - runs all tests (both unit and integration via workspace)
- `test:unit` - runs only unit tests (fast, no emulator needed)
- `test:integration` - runs only integration tests (requires emulators)
- `test:e2e` - runs Playwright E2E tests (requires emulators + dev servers)
- `test:all` - sequential execution for CI/CD (FR-007)

---

## Test Cases

### TC-CONFIG-001: Integration Tests Run Successfully

**Given**: Vitest workspace configuration is updated

**When**: `pnpm test:integration` is executed

**Then**:
- [ ] All tests in `tests/integration/auth-startup.test.ts` execute (FR-006)
- [ ] Tests pass with 100% success rate (FR-007)
- [ ] Test output is readable and actionable
- [ ] Execution time is <30 seconds

**Validation**:
```bash
cd apps/projector-app
pnpm test:integration

# Expected output:
# ✓ tests/integration/auth-startup.test.ts (5 tests) 3042ms
#   ✓ should complete full authentication flow within 3 seconds
#   ✓ should restore session across app restarts
#   ✓ should retrieve ID token for API authentication
#   ✓ should mark user as anonymous
#   ✓ should handle authentication errors gracefully
#
# Test Files  1 passed (1)
# Tests  5 passed (5)
```

---

### TC-CONFIG-002: Emulator Validation Works

**Given**: Firebase Emulators are not running

**When**: `pnpm test:integration` is executed

**Then**:
- [ ] Tests fail immediately with clear error message (FR-012)
- [ ] Error message includes emulator start command
- [ ] No timeout waiting for unavailable service
- [ ] Exit code is non-zero (fails CI/CD build)

**Validation**:
```bash
# Stop emulators
pkill -f "firebase emulators"

# Run integration tests
pnpm test:integration

# Expected output:
# ✗ Firebase Auth Emulator is not running
#   Hint: Start with `firebase emulators:start --only auth`
# Error: Integration tests require Firebase Auth Emulator on localhost:9099
# FAIL  tests/integration-setup.ts
```

---

### TC-CONFIG-003: CI/CD Pipeline Integration

**Given**: GitHub Actions workflow is updated

**When**: Pull request is created

**Then**:
- [ ] Integration tests run in CI/CD pipeline (FR-007)
- [ ] Firebase Emulators start automatically in CI
- [ ] Tests complete within 5 minutes timeout
- [ ] Test failures block PR merge

**GitHub Actions Workflow**:
```yaml
# .github/workflows/test.yml
name: Tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Start Firebase Emulators
        run: firebase emulators:start --only auth,firestore &
        env:
          FIREBASE_EMULATOR_HOST: localhost

      - name: Wait for Emulators
        run: sleep 5

      - name: Run unit tests
        run: pnpm --filter projector-app test:unit

      - name: Run integration tests
        run: pnpm --filter projector-app test:integration
        env:
          FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
          FIRESTORE_EMULATOR_HOST: localhost:8080

      - name: Run E2E tests
        run: pnpm test:e2e
```

---

### TC-CONFIG-004: Selective Test Execution

**Given**: Multiple test types exist (unit, integration, E2E)

**When**: Developer runs specific test command

**Then**:
- [ ] Only targeted tests execute
- [ ] Other test types are skipped
- [ ] Faster feedback for developers

**Validation**:
```bash
# Unit tests only (no emulator needed, <5s)
pnpm test:unit
# ✓ 278 tests passed

# Integration tests only (requires emulator, <30s)
pnpm test:integration
# ✓ 5 tests passed

# E2E tests only (requires emulator + dev server, <2min)
pnpm test:e2e
# ✓ 20 tests passed
```

---

### TC-CONFIG-005: Backward Compatibility

**Given**: Existing `pnpm test` command is used

**When**: Developer runs `pnpm test`

**Then**:
- [ ] Both unit and integration tests run (via workspace)
- [ ] No breaking changes to existing workflow
- [ ] All 278 unit tests + 5 integration tests pass

**Validation**:
```bash
pnpm test

# Expected output:
# ✓ tests/unit/**/*.test.ts (278 tests)
# ✓ tests/integration/**/*.test.ts (5 tests)
#
# Test Files  28 passed (28)
# Tests  283 passed (283)
```

---

## Configuration Checklist

- [ ] Create `apps/projector-app/vitest.workspace.ts` with unit + integration projects
- [ ] Create `apps/projector-app/tests/integration-setup.ts` with emulator validation
- [ ] Update `apps/projector-app/package.json` scripts (test:unit, test:integration)
- [ ] Update `.github/workflows/test.yml` to run integration tests in CI
- [ ] Verify existing integration tests pass (5 tests in auth-startup.test.ts)
- [ ] Document setup requirements in README

## Success Criteria Mapping

- **SC-002**: Integration tests run successfully via `pnpm test:integration` ✅ (TC-CONFIG-001)
- **SC-007**: Actionable error messages when emulators not running ✅ (TC-CONFIG-002)
