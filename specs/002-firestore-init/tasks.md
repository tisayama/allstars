# Implementation Tasks: Firestore Development Environment Initialization Script

**Feature**: 002-firestore-init | **Branch**: `002-firestore-init` | **Generated**: 2025-11-06

## Task Overview

This document provides a dependency-ordered task breakdown for implementing the Firestore development environment initialization script. Tasks are organized by user story and follow Test-Driven Development (TDD) principles.

**Total Estimated Tasks**: 18 tasks across 6 phases
**Critical Path**: Phase 1 → Phase 2 → Phase 3 (US1-P1) → Phase 4 (US2-P2) → Phase 5 (US3-P3) → Phase 6

## Task List

### Phase 1: Project Setup (Foundation)

- [X] [SETUP-001] [--] [--] Create `/scripts/` directory at repository root if it doesn't exist (`/home/tisayama/allstars/scripts/`)
- [X] [SETUP-002] [--] [--] Create `/tests/unit/scripts/` directory for test files (`/home/tisayama/allstars/tests/unit/scripts/`)
- [X] [SETUP-003] [--] [--] Verify Firebase Admin SDK 13.5.0 is available in devDependencies (`/home/tisayama/allstars/package.json`)
- [X] [SETUP-004] [--] [--] Verify tsx is available for TypeScript execution (check if Vitest provides it or add explicitly)
- [X] [SETUP-005] [--] [--] Verify @allstars/types workspace package is accessible and exports GameState type (`/home/tisayama/allstars/packages/types/src/GameState.ts`)

**Dependencies**: None (foundational setup)
**Validation**: All directories exist, all dependencies confirmed in package.json or devDependencies

---

### Phase 2: Foundational Components (TDD - Test First)

#### Test Files Creation

- [X] [FOUND-001] [--] [--] Create test file skeleton for initialization script (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [FOUND-002] [--] [--] Write test: "should refuse to run without FIRESTORE_EMULATOR_HOST set" (production detection test) (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [FOUND-003] [--] [--] Write test: "should provide error message when emulator is not running" (connection error test) (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)

**Dependencies**: SETUP-002 (test directory must exist)
**Validation**: Test file exists with failing tests (RED phase of TDD)

---

### Phase 3: User Story 1 - First-Time Development Environment Setup (P1)

**Story Goal**: Enable new developers to initialize Firestore emulator with required gameState/live document

#### Tests (Write First - RED)

- [X] [US1-001] [P1] [US1] Write test: "should create gameState/live document with all required fields when emulator is empty" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US1-002] [P1] [US1] Write test: "should initialize currentPhase to 'ready_for_next'" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US1-003] [P1] [US1] Write test: "should initialize numeric fields to zero (participantCount: 0, prizeCarryover: 0)" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US1-004] [P1] [US1] Write test: "should initialize nullable fields to null (currentQuestion, timeRemaining, results, settings)" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US1-005] [P1] [US1] Write test: "should use Firestore server timestamp for lastUpdate field" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)

**Dependencies**: FOUND-001 (test file skeleton must exist)

#### Implementation (Make Tests Pass - GREEN)

- [X] [US1-006] [P1] [US1] Create initialization script file skeleton with imports (Firebase Admin SDK, @allstars/types) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-007] [P1] [US1] Implement production detection check (refuse to run without FIRESTORE_EMULATOR_HOST) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-008] [P1] [US1] Implement Firebase Admin SDK initialization with emulator settings (host: localhost:8080, ssl: false) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-009] [P1] [US1] Implement initial GameState object creation with all required fields (see data-model.md schema) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-010] [P1] [US1] Implement document creation logic: `db.collection('gameState').doc('live').set(initialGameState)` (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-011] [P1] [US1] Implement error handling for connection failures with clear error messages (ECONNREFUSED detection) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US1-012] [P1] [US1] Implement console output with status indicators (✓, ✗) and success messages (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)

**Dependencies**:
- US1-001 through US1-005 (tests must be written first per TDD)
- SETUP-003, SETUP-005 (dependencies must be available)

#### Integration

- [X] [US1-013] [P1] [US1] Add "init:dev" script to root package.json: `"init:dev": "timeout 10 tsx scripts/init-firestore-dev.ts"` (`/home/tisayama/allstars/package.json`)
- [X] [US1-014] [P1] [US1] Run all US1 tests and verify they pass (GREEN phase complete)

**Dependencies**: US1-006 through US1-012 (implementation must be complete)
**Validation**: `pnpm test tests/unit/scripts/init-firestore-dev.test.ts` passes all US1 tests

---

### Phase 4: User Story 2 - Idempotent Re-Initialization (P2)

**Story Goal**: Allow safe re-execution of initialization script without data corruption

#### Tests (Write First - RED)

- [X] [US2-001] [P2] [US2] Write test: "should skip creation when gameState/live document already exists" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US2-002] [P2] [US2] Write test: "should not overwrite existing document timestamp on second run" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US2-003] [P2] [US2] Write test: "should exit with code 0 when skipping existing document" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)

**Dependencies**: US1-014 (User Story 1 must be complete and tested)

#### Implementation (Make Tests Pass - GREEN)

- [X] [US2-004] [P2] [US2] Implement idempotency check: call `.get()` on gameState/live before `.set()` (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US2-005] [P2] [US2] Implement skip logic: if `doc.exists`, log "✓ gameState/live already exists, skipping initialization" and return early (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US2-006] [P2] [US2] Update success console output to differentiate between "created" and "skipped" scenarios (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)

**Dependencies**: US2-001 through US2-003 (tests must be written first)

#### Validation

- [X] [US2-007] [P2] [US2] Run all US2 tests and verify they pass
- [X] [US2-008] [P2] [US2] Manual test: Run script twice against actual Firestore emulator and verify second run skips creation

**Validation**: `pnpm test tests/unit/scripts/init-firestore-dev.test.ts` passes all US2 tests

---

### Phase 5: User Story 3 - Clear Error Reporting (P3)

**Story Goal**: Provide actionable error messages for common failure scenarios

#### Tests (Write First - RED)

- [X] [US3-001] [P3] [US3] Write test: "should provide specific error message for ECONNREFUSED (emulator not running)" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US3-002] [P3] [US3] Write test: "should provide specific error message for timeout errors" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)
- [X] [US3-003] [P3] [US3] Write test: "should include actionable guidance in error messages (e.g., 'Start with: firebase emulators:start')" (`/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`)

**Dependencies**: US2-008 (User Story 2 must be complete and tested)

#### Implementation (Make Tests Pass - GREEN)

- [X] [US3-004] [P3] [US3] Enhance error handling to detect specific error types (ECONNREFUSED, ETIMEDOUT, etc.) (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US3-005] [P3] [US3] Implement error message templates with actionable guidance for each error type (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US3-006] [P3] [US3] Add hint messages: "Hint: Ensure Firestore emulator is running on localhost:8080" (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)
- [X] [US3-007] [P3] [US3] Add suggestion: "Start with: firebase emulators:start --only firestore --project stg-wedding-allstars" (`/home/tisayama/allstars/scripts/init-firestore-dev.ts`)

**Dependencies**: US3-001 through US3-003 (tests must be written first)

#### Validation

- [X] [US3-008] [P3] [US3] Run all US3 tests and verify they pass
- [X] [US3-009] [P3] [US3] Manual test: Intentionally stop emulator and verify error message quality

**Validation**: `pnpm test tests/unit/scripts/init-firestore-dev.test.ts` passes all US3 tests

---

### Phase 6: Polish & Documentation

- [X] [POLISH-001] [--] [--] Run full test suite: `pnpm test tests/unit/scripts/init-firestore-dev.test.ts`
- [X] [POLISH-002] [--] [--] Run lint: `pnpm run lint` and fix any issues in script or tests
- [X] [POLISH-003] [--] [--] Verify script completes in <3 seconds (SC-002) with manual timing test
- [X] [POLISH-004] [--] [--] Verify error detection occurs within 2 seconds (SC-004) with manual test (stop emulator)
- [X] [POLISH-005] [--] [--] Manual verification: Start clean emulator, run `pnpm run init:dev`, start projector-app, verify no errors
- [X] [POLISH-006] [--] [--] Manual verification: Run `pnpm run init:dev` twice, verify second run skips gracefully
- [X] [POLISH-007] [--] [--] Update CLAUDE.md with any new patterns or learnings (if applicable)

**Dependencies**: All US1, US2, US3 tasks complete
**Validation**: All success criteria (SC-001 through SC-006) verified

---

## Dependency Graph

```
SETUP (Phase 1)
  ↓
FOUND (Phase 2) - Foundational tests
  ↓
US1 (Phase 3) - P1: First-Time Setup
  ├─ Tests (US1-001 to US1-005) → Implementation (US1-006 to US1-012) → Integration (US1-013, US1-014)
  ↓
US2 (Phase 4) - P2: Idempotency
  ├─ Tests (US2-001 to US2-003) → Implementation (US2-004 to US2-006) → Validation (US2-007, US2-008)
  ↓
US3 (Phase 5) - P3: Error Reporting
  ├─ Tests (US3-001 to US3-003) → Implementation (US3-004 to US3-007) → Validation (US3-008, US3-009)
  ↓
POLISH (Phase 6) - Final verification & documentation
```

**Critical Path**: SETUP → FOUND → US1 → US2 → US3 → POLISH (sequential phases)

**Within-Phase Parallelization**:
- Phase 1 (SETUP): All 5 tasks can run in parallel (directory/dependency checks)
- Phase 2 (FOUND): Tasks FOUND-002 and FOUND-003 can run in parallel after FOUND-001
- Phase 3 (US1): Tasks US1-001 through US1-005 (tests) can run in parallel; tasks US1-009, US1-011, US1-012 can run in parallel after US1-008
- Phase 4 (US2): Tests US2-001, US2-002, US2-003 can run in parallel
- Phase 5 (US3): Tests US3-001, US3-002, US3-003 can run in parallel

---

## Parallel Execution Examples

### Example 1: Phase 1 Setup (All Parallel)
```bash
# All setup tasks are independent - verify everything in parallel
ls -d /home/tisayama/allstars/scripts/ 2>/dev/null || mkdir -p /home/tisayama/allstars/scripts/
ls -d /home/tisayama/allstars/tests/unit/scripts/ 2>/dev/null || mkdir -p /home/tisayama/allstars/tests/unit/scripts/
grep "firebase-admin" /home/tisayama/allstars/package.json
grep "@allstars/types" /home/tisayama/allstars/package.json
```

### Example 2: Phase 3 Test Writing (Parallel After Skeleton)
```bash
# After FOUND-001 (test skeleton), write all US1 tests in parallel
# Each test is an independent describe/it block in the same file
# Write tests US1-001 through US1-005 simultaneously (5 test cases)
```

### Example 3: Phase 4 Full Idempotency (Sequential Across Test-Impl)
```bash
# MUST follow TDD: tests first, then implementation
# 1. Write all US2 tests (US2-001, US2-002, US2-003) - can be parallel within this group
# 2. Run tests - expect RED (failures)
# 3. Implement idempotency logic (US2-004, US2-005, US2-006) - sequential with conditional logic
# 4. Run tests - expect GREEN (passing)
```

---

## Implementation Strategy

### Test-Driven Development (TDD) Workflow

This feature strictly follows the Red-Green-Refactor cycle mandated by constitution principle II:

1. **RED Phase**: Write failing tests first
   - Phase 2: FOUND-002, FOUND-003
   - Phase 3: US1-001 through US1-005
   - Phase 4: US2-001 through US2-003
   - Phase 5: US3-001 through US3-003

2. **GREEN Phase**: Implement minimal code to make tests pass
   - Phase 3: US1-006 through US1-012
   - Phase 4: US2-004 through US2-006
   - Phase 5: US3-004 through US3-007

3. **REFACTOR Phase**: Clean up code while keeping tests green
   - Happens within each user story's implementation tasks
   - No separate refactor phase needed (script is small, ~150 lines)

### Key Implementation Patterns (from research.md)

1. **Firebase Admin SDK Emulator Configuration**:
   ```typescript
   import * as admin from 'firebase-admin';

   admin.initializeApp({ projectId: 'stg-wedding-allstars' });
   const db = admin.firestore();
   db.settings({ host: 'localhost:8080', ssl: false });
   ```

2. **Production Detection** (FR-011):
   ```typescript
   if (!process.env.FIRESTORE_EMULATOR_HOST) {
     console.error('✗ FIRESTORE_EMULATOR_HOST not set - refusing to run against production');
     process.exit(1);
   }
   ```

3. **Idempotency Pattern** (FR-002):
   ```typescript
   const gameStateRef = db.collection('gameState').doc('live');
   const doc = await gameStateRef.get();

   if (doc.exists) {
     console.log('✓ gameState/live already exists, skipping initialization');
     return;
   }

   await gameStateRef.set(initialGameState);
   console.log('✓ gameState/live created successfully');
   ```

4. **Initial GameState Object** (from data-model.md):
   ```typescript
   import type { GameState } from '@allstars/types';
   import * as admin from 'firebase-admin';

   const initialGameState: Partial<GameState> = {
     currentPhase: 'ready_for_next',
     currentQuestion: null,
     isGongActive: false,
     participantCount: 0,
     timeRemaining: null,
     lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
     results: null,
     prizeCarryover: 0,
     settings: null,
   };
   ```

5. **Error Message Formatting** (FR-014):
   ```typescript
   // Success
   console.log('Initializing Firestore development environment...');
   console.log('✓ gameState/live created successfully');
   console.log('✓ Initialization complete');

   // Error
   console.error('✗ Initialization failed:', error);
   console.error('  Hint: Ensure Firestore emulator is running on localhost:8080');
   console.error('  Start with: firebase emulators:start --only firestore');
   ```

### File Size Estimate

- **Script**: ~150 lines (simple, single-purpose utility)
- **Tests**: ~300-400 lines (comprehensive test coverage for all scenarios)
- **Total**: ~500 lines across 2 files

### Performance Expectations

- **First Run** (document creation): 1-2 seconds (SC-002: <3 seconds)
- **Subsequent Runs** (existence check): <1 second
- **Error Detection**: <2 seconds (SC-004)
- **Timeout Threshold**: 10 seconds (NPM script timeout)

---

## Testing Strategy

### Unit Test Coverage

Tests will be written using Vitest 4.0.6 with Firebase Admin SDK mocked appropriately:

1. **Production Detection Tests** (FOUND-002):
   - Verify script refuses to run without FIRESTORE_EMULATOR_HOST
   - Verify error message clarity

2. **Connection Error Tests** (FOUND-003):
   - Mock ECONNREFUSED error and verify error message
   - Mock ETIMEDOUT error and verify error message

3. **Document Creation Tests** (US1 tests):
   - Verify all 9 fields are present in created document
   - Verify field types match GameState type definition
   - Verify initial values match specification
   - Verify lastUpdate uses server timestamp (not client timestamp)

4. **Idempotency Tests** (US2 tests):
   - Verify `.get()` is called before `.set()`
   - Verify existing document is not overwritten
   - Verify success exit code (0) on both runs

5. **Error Reporting Tests** (US3 tests):
   - Verify error messages include actionable guidance
   - Verify error messages distinguish between error types
   - Verify error messages include command examples

### Manual Verification Tests

Per quickstart.md and success criteria:

1. **SC-001**: New developer workflow timing (<5 minutes total)
2. **SC-002**: Script execution timing (<3 seconds)
3. **SC-003**: Run script twice, verify idempotency
4. **SC-004**: Stop emulator, run script, verify error within 2 seconds
5. **SC-005**: Run script, start projector-app, verify no errors
6. **SC-006**: Verify no manual curl commands needed

---

## Success Criteria Mapping

| Success Criterion | Validated By | Phase |
|-------------------|--------------|-------|
| SC-001: Setup in <5 minutes | POLISH-005 (manual test) | Phase 6 |
| SC-002: Script completes <3 seconds | POLISH-003 (manual timing) | Phase 6 |
| SC-003: Idempotent behavior | US2-007, US2-008, POLISH-006 | Phase 4, 6 |
| SC-004: Error detection <2 seconds | POLISH-004 (manual test) | Phase 6 |
| SC-005: Apps start successfully | POLISH-005 (projector-app test) | Phase 6 |
| SC-006: Zero manual operations | All phases (automation goal) | All |

---

## Risk Mitigation

### Risk 1: Firebase Admin SDK Version Mismatch
- **Mitigation**: SETUP-003 verifies version 13.5.0 in devDependencies
- **Fallback**: Document required version in quickstart.md

### Risk 2: tsx Not Available
- **Mitigation**: SETUP-004 verifies tsx availability
- **Fallback**: Add explicit tsx dependency to root package.json devDependencies

### Risk 3: Firestore Emulator Port Conflicts
- **Mitigation**: Out of scope per OOS-007, script assumes default port 8080
- **Fallback**: Document port assumption in quickstart.md troubleshooting

### Risk 4: Production Firestore Accidental Connection
- **Mitigation**: US1-007 implements production detection (fails fast)
- **Validation**: FOUND-002 tests this safety mechanism

---

## Notes

- **Constitution Compliance**: All 6 principles verified in plan.md (no violations)
- **TDD Mandatory**: Every implementation task has corresponding test tasks written first
- **Idempotency First**: US2 (idempotency) is P2, must be implemented before feature is complete
- **No API Contracts**: Feature does not expose REST APIs (confirmed in contracts/README.md)
- **Manual Tests Required**: Some success criteria require human timing/observation (SC-001, SC-002, SC-004)

---

## Ready to Implement

✅ All design artifacts complete (research.md, data-model.md, quickstart.md, contracts/)
✅ Constitution check passed (all 6 principles)
✅ Task dependencies clearly defined
✅ TDD workflow mapped to tasks
✅ Success criteria mapped to validation tasks

**Next Step**: Begin Phase 1 (SETUP-001) by creating the `/scripts/` directory.
