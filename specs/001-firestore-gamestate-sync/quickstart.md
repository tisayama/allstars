# Developer Quickstart: Fix Firestore Game State Synchronization

**Feature**: Fix Firestore Game State Synchronization
**Branch**: `001-firestore-gamestate-sync`
**Date**: 2025-11-05

## Quick Overview

**Problem**: Projector app shows "Unknown Phase" errors because the API server doesn't write all required fields to the `gameState/live` Firestore document.

**Solution**: Add validation before Firestore writes, use `{merge: true}` to preserve fields, and add defensive validation in projector app's Firestore listener.

**Estimated Time**: 4-6 hours of implementation + 2-3 hours of testing

## Prerequisites

Before starting implementation:

1. ✅ Feature branch created: `001-firestore-gamestate-sync`
2. ✅ Spec reviewed and approved: `specs/001-firestore-gamestate-sync/spec.md`
3. ✅ Research completed: `specs/001-firestore-gamestate-sync/research.md`
4. ✅ Data model defined: `specs/001-firestore-gamestate-sync/data-model.md`
5. ✅ Development environment running with Firebase emulators

## Implementation Order

Follow TDD principles - **write tests first**, then implementation:

### Phase 1: Shared Validation (packages/types)

**Estimated time**: 1 hour

#### 1.1 Write Tests First

```bash
# Create test file
touch packages/types/tests/validators/gameState.test.ts
```

**Test cases to write**:
- ✅ Valid gameState with all required fields passes validation
- ✅ Valid gameState with optional fields passes validation
- ✅ Invalid gameState missing currentPhase fails validation
- ✅ Invalid gameState with wrong phase value fails validation
- ✅ Invalid gameState missing lastUpdate fails validation
- ✅ Valid gameState with null currentQuestion passes
- ✅ Validation error messages are descriptive

**Run tests** (should fail):
```bash
cd packages/types
pnpm test -- tests/validators/gameState.test.ts
```

#### 1.2 Implement Validation Schema

```bash
# Create validator file
touch packages/types/src/validators/gameState.ts
```

**Implementation checklist**:
- ✅ Export `GameStateSchema` Zod schema
- ✅ Export `GamePhaseSchema` enum validator
- ✅ Export `GameResultsSchema` for results validation
- ✅ Export `validateGameState()` function
- ✅ Export `validateGameStateSafe()` function

**Update barrel export**:
```typescript
// packages/types/src/index.ts
export * from './validators/gameState';
```

**Run tests** (should pass):
```bash
pnpm test -- tests/validators/gameState.test.ts
```

---

### Phase 2: Structured Logging Utility (api-server)

**Estimated time**: 1 hour

#### 2.1 Write Tests First

```bash
# Create test file
touch apps/api-server/tests/unit/utils/logger.test.ts
```

**Test cases to write**:
- ✅ logStructured() outputs valid JSON string
- ✅ JSON contains timestamp, level, component, message fields
- ✅ logError() includes error message and stack trace
- ✅ Log entries are parseable by JSON.parse()

**Run tests** (should fail):
```bash
cd apps/api-server
pnpm test -- tests/unit/utils/logger.test.ts
```

#### 2.2 Implement Logger

```bash
# Create logger file
touch apps/api-server/src/utils/logger.ts
```

**Implementation checklist**:
- ✅ Export `LogLevel` type
- ✅ Export `logStructured()` function
- ✅ Export `logError()` function
- ✅ Use `JSON.stringify()` for all output
- ✅ Include timestamp in ISO 8601 format

**Run tests** (should pass):
```bash
pnpm test -- tests/unit/utils/logger.test.ts
```

---

### Phase 3: API Server Firestore Sync (api-server)

**Estimated time**: 2-3 hours

#### 3.1 Write Tests First

```bash
# Update existing test file
# apps/api-server/tests/unit/services/gameStateService.test.ts
```

**New test cases to add**:
- ✅ advanceGame() validates gameState before Firestore write
- ✅ advanceGame() throws ValidationError for invalid gameState
- ✅ advanceGame() uses {merge: true} for Firestore writes
- ✅ advanceGame() logs validation failures with structured JSON
- ✅ advanceGame() writes all 4 required fields to Firestore
- ✅ Firestore document contains currentPhase, currentQuestion, isGongActive, lastUpdate

**Create integration test**:
```bash
touch apps/api-server/tests/integration/firestore-sync.test.ts
```

**Integration test cases**:
- ✅ advanceGame() persists complete gameState to Firestore emulator
- ✅ Projector app can read synchronized gameState without errors
- ✅ {merge: true} preserves existing optional fields (participantCount, settings)

**Run tests** (should fail):
```bash
pnpm test -- tests/unit/services/gameStateService.test.ts
pnpm test -- tests/integration/firestore-sync.test.ts
```

#### 3.2 Implement Firestore Sync Fix

**Modify**: `apps/api-server/src/services/gameStateService.ts`

**Changes checklist**:
- ✅ Import `validateGameStateSafe` from `@allstars/types`
- ✅ Import `logStructured`, `logError` from `../utils/logger`
- ✅ Add validation before `transaction.set()` (line ~108)
- ✅ Change `transaction.set()` to use `{merge: true}` option
- ✅ Log validation failures with structured JSON
- ✅ Ensure all 4 required fields are written
- ✅ Use conditional spread for optional fields

**Before**:
```typescript
transaction.set(gameStateRef, {
  currentPhase: newState.currentPhase,
  currentQuestion: newState.currentQuestion,
  isGongActive: newState.isGongActive,
  lastUpdate: FieldValue.serverTimestamp(),
  results: newState.results,
  prizeCarryover: newState.prizeCarryover,
});
```

**After**:
```typescript
// Validate before write
const validation = validateGameStateSafe(newState);
if (!validation.success) {
  logError('gameStateService.advanceGame', 'GameState validation failed', validation.error, {
    action: action.action,
    validationErrors: validation.error.flatten(),
  });
  throw new ValidationError('Invalid game state structure',
    validation.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  );
}

// Write with merge to preserve optional fields
transaction.set(gameStateRef, {
  currentPhase: newState.currentPhase,
  currentQuestion: newState.currentQuestion,
  isGongActive: newState.isGongActive,
  lastUpdate: FieldValue.serverTimestamp(),
  results: newState.results,
  prizeCarryover: newState.prizeCarryover,
  ...(newState.settings && { settings: newState.settings }),
  ...(newState.participantCount !== undefined && { participantCount: newState.participantCount }),
}, { merge: true });  // CRITICAL: Use merge
```

**Run tests** (should pass):
```bash
pnpm test -- tests/unit/services/gameStateService.test.ts
pnpm test -- tests/integration/firestore-sync.test.ts
```

---

### Phase 4: Projector App Error Handling (projector-app)

**Estimated time**: 1-2 hours

#### 4.1 Write Tests First

```bash
# Create test file
touch apps/projector-app/tests/unit/hooks/useGameState.test.ts
```

**Test cases to write**:
- ✅ useGameState() validates Firestore snapshot data
- ✅ useGameState() sets error state for invalid data
- ✅ useGameState() logs validation errors to console
- ✅ useGameState() sets valid gameState for correct data
- ✅ useGameState() shows user-friendly error message (not technical details)

**Create integration test**:
```bash
touch apps/projector-app/tests/integration/firestore-listener.test.ts
```

**Integration test cases**:
- ✅ Listener receives valid gameState from Firestore emulator
- ✅ Listener handles malformed gameState gracefully
- ✅ Listener updates connectionStatus correctly

**Run tests** (should fail):
```bash
cd apps/projector-app
pnpm test -- tests/unit/hooks/useGameState.test.ts
pnpm test -- tests/integration/firestore-listener.test.ts
```

#### 4.2 Implement Defensive Validation

**Modify**: `apps/projector-app/src/hooks/useGameState.ts`

**Changes checklist**:
- ✅ Import `validateGameStateSafe` from `@allstars/types`
- ✅ Add validation in `onSnapshot` callback (after `snapshot.exists()`)
- ✅ Set user-friendly error message on validation failure
- ✅ Log detailed validation errors to console
- ✅ Set connectionStatus to false on malformed data

**Before**:
```typescript
if (snapshot.exists()) {
  const data = snapshot.data() as GameState;
  setGameState(data);
  setConnectionStatus((prev) => ({ ...prev, firestore: true }));
  setError(null);
  console.log('GameState updated:', data.currentPhase);
}
```

**After**:
```typescript
if (snapshot.exists()) {
  const data = snapshot.data();

  // Validate data structure
  const validation = validateGameStateSafe(data);

  if (!validation.success) {
    const errorDetails = validation.error.flatten();
    console.error('GameState validation failed:', {
      fieldErrors: errorDetails.fieldErrors,
      formErrors: errorDetails.formErrors,
      rawData: data,
    });
    setError('Game data is malformed. Please contact support.');
    setConnectionStatus((prev) => ({ ...prev, firestore: false }));
    return;
  }

  // Data is valid
  setGameState(validation.data as GameState);
  setConnectionStatus((prev) => ({ ...prev, firestore: true }));
  setError(null);
  console.log('GameState updated:', validation.data.currentPhase);
}
```

**Run tests** (should pass):
```bash
pnpm test -- tests/unit/hooks/useGameState.test.ts
pnpm test -- tests/integration/firestore-listener.test.ts
```

---

## Testing Checklist

### Unit Tests

**All packages**:
```bash
# From repo root
pnpm test:unit
```

**Expected results**:
- ✅ All new tests pass
- ✅ No regressions in existing tests
- ✅ Code coverage > 80% for modified files

### Integration Tests

**API Server + Firestore**:
```bash
cd apps/api-server
pnpm test:integration
```

**Expected results**:
- ✅ gameState/live document written with all required fields
- ✅ {merge: true} preserves existing optional fields
- ✅ Validation prevents malformed writes

**Projector App + Firestore**:
```bash
cd apps/projector-app
pnpm test:integration
```

**Expected results**:
- ✅ Listener receives validated gameState
- ✅ Malformed data triggers error state
- ✅ User-friendly error messages displayed

### Manual Testing (E2E)

**Setup**:
1. Start Firebase emulators: `pnpm run dev:emulators`
2. Start API server: `pnpm run dev:api`
3. Start projector app: `pnpm run dev:projector`
4. Start host app: `pnpm run dev:host`

**Test scenario 1: Normal game flow**:
1. ✅ Open host app, start new question
2. ✅ Projector app displays "Accepting Answers" phase
3. ✅ Host app shows distribution
4. ✅ Projector app updates to "Showing Distribution" phase
5. ✅ Host app shows correct answer
6. ✅ Projector app updates to "Showing Correct Answer" phase
7. ✅ Host app shows results
8. ✅ Projector app displays top 10 rankings
9. ✅ **No "Unknown Phase" errors**

**Test scenario 2: Projector app restart**:
1. ✅ Start game, advance to "showing_results" phase
2. ✅ Refresh projector app (F5)
3. ✅ Projector app loads current phase immediately
4. ✅ No errors in browser console
5. ✅ Display shows correct rankings

**Test scenario 3: Malformed data (negative test)**:
1. ✅ Manually write invalid data to Firestore emulator (missing currentPhase)
2. ✅ Projector app shows user-friendly error message
3. ✅ Detailed validation errors logged to console
4. ✅ App doesn't crash or show technical stack traces

---

## Build & Lint

**Type checking**:
```bash
# From repo root
pnpm run typecheck
```

**Linting**:
```bash
pnpm run lint
```

**Fix lint errors**:
```bash
pnpm run lint:fix
```

**Build**:
```bash
pnpm run build
```

**Expected**: No TypeScript errors, no lint errors, successful build

---

## Commit Strategy

**Follow conventional commits** and **commit tests with implementation**:

```bash
# Commit 1: Shared validation
git add packages/types/
git commit -m "feat(types): add GameState validation schema

- Add GameStateSchema Zod validator
- Add validateGameState() and validateGameStateSafe() functions
- Add comprehensive unit tests for all validation cases
- Export validators from packages/types barrel

Ref: FR-004 (validate game state structure before write)"

# Commit 2: Structured logging
git add apps/api-server/src/utils/logger.ts apps/api-server/tests/unit/utils/logger.test.ts
git commit -m "feat(api-server): add structured JSON logging utility

- Add logStructured() and logError() functions
- Output JSON-formatted logs for external monitoring
- Include timestamp, level, component, message, context
- Add unit tests for log format validation

Ref: FR-007, SC-005 (structured logging for observability)"

# Commit 3: Firestore sync fix
git add apps/api-server/src/services/gameStateService.ts apps/api-server/tests/
git commit -m "fix(api-server): fix Firestore game state synchronization

- Add validation before Firestore transaction.set()
- Use {merge: true} to preserve optional fields
- Write all 4 required fields (currentPhase, currentQuestion, isGongActive, lastUpdate)
- Log validation failures with structured JSON
- Add unit and integration tests for sync behavior

Fixes: FR-001, FR-002, FR-004, FR-006, FR-007
Closes: #XXX (replace with issue number)"

# Commit 4: Projector app error handling
git add apps/projector-app/src/hooks/useGameState.ts apps/projector-app/tests/
git commit -m "feat(projector-app): add defensive validation for gameState listener

- Validate Firestore snapshot data before setting state
- Show user-friendly error messages for malformed data
- Log detailed validation errors to console
- Add unit and integration tests for error handling

Fixes: FR-003, FR-008
Ref: SC-001, SC-003 (eliminate 'Unknown Phase' errors)"
```

---

## Verification

Before creating PR, verify:

1. ✅ All tests pass: `pnpm test`
2. ✅ No type errors: `pnpm run typecheck`
3. ✅ No lint errors: `pnpm run lint`
4. ✅ Build succeeds: `pnpm run build`
5. ✅ Manual E2E test passes (no "Unknown Phase" errors)
6. ✅ Projector app loads game state within 2 seconds
7. ✅ Console logs show structured JSON format
8. ✅ All commits follow conventional commit format

---

## Troubleshooting

### Issue: Tests fail with "Cannot find module '@allstars/types'"

**Solution**: Build packages/types first
```bash
cd packages/types
pnpm run build
```

### Issue: Firestore emulator not starting

**Solution**: Check if port 8080 is available
```bash
lsof -i :8080
# Kill process if needed
kill -9 <PID>
# Restart emulators
pnpm run dev:emulators
```

### Issue: Projector app still shows "Unknown Phase"

**Debug steps**:
1. Check browser console for validation errors
2. Inspect Firestore emulator data: http://localhost:4000/firestore
3. Verify gameState/live document has all required fields
4. Check API server logs for validation failures
5. Verify {merge: true} is being used in transaction.set()

### Issue: Validation tests fail with "Expected error but got success"

**Solution**: Verify test data is actually invalid
```typescript
// Ensure missing required fields
const invalidData = {
  currentQuestion: null,
  isGongActive: false,
  // Missing currentPhase and lastUpdate
};
```

---

## Next Steps

After implementation:

1. **Create PR**: Use `/speckit.tasks` to generate task breakdown
2. **Code review**: Request review from team
3. **Merge**: Squash and merge to main
4. **Deploy**: Deploy to staging environment
5. **Monitor**: Watch structured logs for validation errors
6. **Celebrate**: Fix eliminates "Unknown Phase" errors! 🎉

---

## References

- **Spec**: `/specs/001-firestore-gamestate-sync/spec.md`
- **Research**: `/specs/001-firestore-gamestate-sync/research.md`
- **Data Model**: `/specs/001-firestore-gamestate-sync/data-model.md`
- **Constitution**: `/.specify/memory/constitution.md`
