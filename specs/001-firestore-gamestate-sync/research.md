# Research: Fix Firestore Game State Synchronization

**Feature**: Fix Firestore Game State Synchronization
**Branch**: `001-firestore-gamestate-sync`
**Date**: 2025-11-05

## Overview

This document contains research findings from analyzing the existing codebase to inform the implementation plan for fixing Firestore game state synchronization issues.

## Problem Analysis

### Root Cause

The API server's `gameStateService.ts` uses Firestore transactions to update game state but does **not guarantee all required fields are written** to the `gameState/live` document:

**Location**: `apps/api-server/src/services/gameStateService.ts:108-116`

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

**Problem**: This uses `set()` without `{merge: true}`, meaning:
1. It **overwrites** the entire document (destroying any fields not explicitly listed)
2. Missing fields: `id`, `participantCount`, `timeRemaining`, `settings`
3. Fields are explicitly written, but `currentQuestion` and `results` can be `null`

### Impact on Projector App

**Location**: `apps/projector-app/src/hooks/useGameState.ts:36-46`

```typescript
const data = snapshot.data() as GameState;
setGameState(data);
```

The projector app reads Firestore data with **no validation** and assumes all fields exist. When the document is missing required fields or has `null` values, downstream components that access `gameState.currentPhase` receive `undefined`, causing "Unknown Phase" errors.

## Existing Infrastructure

### 1. Retry Logic (Already Implemented)

**Location**: `apps/api-server/src/utils/retry.ts`

- ✅ **Already exists** with `p-retry` library
- ✅ Supports exponential backoff (factor: 2, min: 1s, max: 5s)
- ✅ Configurable retry attempts (default: 3)
- ✅ Logging on failed attempts
- ✅ `shouldAbortRetry()` for non-transient errors
- **Decision**: Reuse existing `withRetry()` wrapper - DO NOT create new retry implementation

### 2. GameState Type Definition

**Location**: `packages/types/src/GameState.ts:64-94`

**Required fields**:
- `currentPhase`: GamePhase (7 possible values)
- `currentQuestion`: Question | null
- `isGongActive`: boolean
- `lastUpdate`: Timestamp

**Optional fields**:
- `id`: string
- `participantCount`: number
- `timeRemaining`: number | null
- `results`: GameResults | null
- `prizeCarryover`: number
- `settings`: GameSettings

**Decision**: All required fields MUST be written to Firestore on every update. Optional fields should use conditional spread operator (`...(field && { field })`) to include only when defined.

### 3. Validation Infrastructure

**Location**: `packages/types/src/validators/` (question, guest, settings)

- ✅ **Existing pattern** uses Zod for runtime validation
- ✅ Type-safe validation schemas exported from @allstars/types
- **Decision**: Create new `gameStateValidator.ts` in packages/types/src/validators/ following existing patterns

### 4. Current Firestore Write Pattern

**Current implementation** in `gameStateService.ts:77-122`:
1. ✅ Uses Firestore **transaction** (prevents race conditions with optimistic locking)
2. ✅ Reads current state, processes action, writes new state (atomic)
3. ❌ Uses `transaction.set()` **without merge** (overwrites document)
4. ❌ **No validation** before writing to Firestore
5. ❌ **No error logging** for Firestore write failures
6. ❌ **No retry logic** for Firestore write operations

### 5. Logging Pattern

**Current state**:
- `console.error()` used for ranking calculation errors (line 58-63)
- Logs include: timestamp, error message, stack trace
- Format: Structured object, but not JSON-formatted string

**Gap**: Need structured JSON logging utility for external monitoring tools

## Research Questions & Decisions

### Q1: How should we handle Firestore write failures in transactions?

**Analysis**:
- Firestore transactions retry automatically (up to 5 times) for transient conflicts
- Transaction failures throw errors that propagate to API response
- Current code has no wrapper retry logic for Firestore operations

**Decision**:
- **DO NOT wrap `db.runTransaction()` with retry** - Firestore SDK handles transaction retries internally
- **DO wrap Firestore writes outside transactions** with `withRetry()` if needed for non-transactional updates
- **DO log transaction failures** with structured JSON logging

**Rationale**: Firestore transactions have built-in retry for optimistic concurrency control. External retry wrappers would interfere with transaction semantics.

### Q2: Should we validate GameState structure before writing to Firestore?

**Analysis**:
- TypeScript provides compile-time type checking
- Runtime validation catches data corruption, serialization issues, and logic bugs
- Existing validators in packages/types use Zod schemas
- Performance cost: ~1-2ms for Zod validation

**Decision**:
- **YES** - Add Zod schema validation before Firestore write
- Create `GameStateSchema` in `packages/types/src/validators/gameState.ts`
- Validate in `advanceGame()` after `processAction()` but before `transaction.set()`
- Log validation failures with full context (field errors, current state, new state)

**Rationale**: The projector app crashes with "Unknown Phase" error indicate runtime data integrity issues. Validation prevents malformed documents from being persisted.

### Q3: Should we use `transaction.set()` with merge or `transaction.update()`?

**Analysis**:
- `set()` without merge: Overwrites entire document (current behavior - causes data loss)
- `set()` with `{merge: true}`: Merges fields (preserves fields not in update)
- `update()`: Updates specific fields only (fails if document doesn't exist)

**Decision**:
- **Use `transaction.set()` with `{merge: true}`**
- Initialize document with all required fields on first write
- Preserve optional fields (participantCount, timeRemaining, settings)

**Rationale**: Merge behavior prevents accidental field deletion while allowing full document initialization. Better UX than `update()` which fails on missing documents.

### Q4: How should projector-app handle missing/malformed Firestore data?

**Analysis**:
- Current implementation: No validation, assumes data is valid (line 37-38)
- Failure mode: `undefined` values propagate to components, causing crashes
- Need graceful degradation without technical error messages

**Decision**:
- **Add runtime validation** in `useGameState` hook using Zod schema
- **Set error state** with user-friendly message on validation failure
- **Log detailed errors** to console for debugging
- **Display loading/connecting state** instead of crashing
- **DO NOT auto-retry** on malformed data (prevents infinite loops)

**Rationale**: Defensive programming prevents UI crashes. Clear error messages help operators troubleshoot without exposing technical details to event attendees.

### Q5: Where should we implement structured JSON logging?

**Analysis**:
- Current pattern: `console.error()` with object (not JSON string)
- External monitoring tools (CloudWatch, Datadog) parse JSON logs
- Firebase Functions log format: Structured logging to stdout
- Need log correlation (request IDs, timestamps)

**Decision**:
- **Create `apps/api-server/src/utils/logger.ts`** with structured logging helpers
- **Use `JSON.stringify()`** for all log output
- **Include standard fields**: timestamp, level, component, errorMessage, context
- **Use `console.log()`** for all levels (Firebase Functions routes stderr/stdout correctly)
- **Add integration** in `gameStateService.ts` for sync failures

**Rationale**: Structured JSON logs enable automated monitoring, alerting, and debugging. Standard format across codebase improves observability.

### Q6: How should we handle continuous retry with exponential backoff for failed writes?

**Analysis**:
- Spec requirement: "Continuous retry forever until successful" (FR-007b)
- Firestore transactions retry automatically (max 5 attempts)
- Transaction failures propagate to API response (HTTP 500)
- Client (host-app) can retry failed requests

**Decision**:
- **DO NOT implement infinite retry** in gameStateService (blocks API responses)
- **DO log all transaction failures** with structured JSON (timestamp, attempt, error)
- **DO rely on client-side retry** for transient failures
- **DO use existing `withRetry()`** (3 attempts, exponential backoff) for non-transactional Firestore operations if needed in future

**Rationale**: Infinite retry within API server would block HTTP responses and prevent error surfacing to clients. Better to fail fast with rich logging and let clients retry. Firestore's automatic transaction retry (5 attempts) covers most transient issues.

**Note**: Spec requirement FR-007b ("continuous retry forever") will be implemented via **client-side retry logic** in host-app, not server-side.

### Q7: Do we need to modify the `getCurrentGameState()` function?

**Analysis**:
- Location: `apps/api-server/src/services/gameStateService.ts:455-483`
- Current behavior: Reads document, merges with defaults for missing fields (lines 477-482)
- Already handles missing documents gracefully with default state
- Used by API endpoints to fetch current state

**Decision**:
- **NO modification required** for `getCurrentGameState()`
- Function already provides defensive defaults for missing data
- Validation should happen on **write** (before persistence), not read

**Rationale**: Read operations are defensive by design. Write operations need validation to prevent bad data from being persisted.

## Technical Approach

### Component Changes

#### 1. API Server (`apps/api-server/`)

**New files**:
- `src/utils/logger.ts` - Structured JSON logging utility
- `src/utils/firestore.ts` - Firestore-specific helpers (if needed)

**Modified files**:
- `src/services/gameStateService.ts` - Add validation, update write logic, add logging
- `tests/unit/services/gameStateService.test.ts` - Add validation tests, sync failure tests
- `tests/integration/firestore-sync.test.ts` - New integration tests

**Changes in `gameStateService.ts`**:
1. Import GameState validator from packages/types
2. Add validation before `transaction.set()` (line 108)
3. Change `transaction.set()` to use `{merge: true}` option
4. Add structured JSON logging for validation failures
5. Add structured JSON logging for transaction failures (catch block)
6. Ensure all required GameState fields are included in update

#### 2. Projector App (`apps/projector-app/`)

**Modified files**:
- `src/hooks/useGameState.ts` - Add validation, error handling
- `tests/unit/hooks/useGameState.test.ts` - New unit tests
- `tests/integration/firestore-listener.test.ts` - New integration tests

**Changes in `useGameState.ts`**:
1. Import GameState validator from packages/types
2. Add runtime validation of Firestore data (line 37-38)
3. Set user-friendly error message on validation failure
4. Log detailed validation errors to console
5. Handle missing document case with loading state

#### 3. Shared Types (`packages/types/`)

**New files**:
- `src/validators/gameState.ts` - GameState Zod schema
- `tests/validators/gameState.test.ts` - Schema validation tests

**Modified files**:
- `src/index.ts` - Export GameState validator

**GameState validator structure**:
```typescript
// Required fields validation
const GameStateSchema = z.object({
  currentPhase: z.enum(['ready_for_next', 'accepting_answers', ...]),
  currentQuestion: QuestionSchema.nullable(),
  isGongActive: z.boolean(),
  lastUpdate: TimestampSchema,
  // Optional fields
  id: z.string().optional(),
  participantCount: z.number().optional(),
  timeRemaining: z.number().nullable().optional(),
  results: GameResultsSchema.nullable().optional(),
  prizeCarryover: z.number().optional(),
  settings: GameSettingsSchema.optional(),
});
```

### Data Flow

**Before (broken)**:
1. Host-app calls API endpoint → `/game/action`
2. API server processes action → `advanceGame()`
3. `transaction.set()` writes partial gameState ❌ (missing fields)
4. Projector-app Firestore listener receives incomplete data
5. `useGameState` sets gameState with undefined fields ❌
6. Component accesses `gameState.currentPhase` → `undefined` ❌
7. Display shows "Unknown Phase" error

**After (fixed)**:
1. Host-app calls API endpoint → `/game/action`
2. API server processes action → `advanceGame()`
3. **Validate newState with Zod schema** ✅
4. `transaction.set(..., {merge: true})` writes complete gameState ✅ (all required fields)
5. **Log transaction with structured JSON** (success/failure)
6. Projector-app Firestore listener receives complete data
7. **Validate data with Zod schema** ✅
8. `useGameState` sets validated gameState ✅
9. Component accesses `gameState.currentPhase` → correct value ✅
10. Display shows correct game phase

## Open Questions

None - all research questions resolved. Ready to proceed to Phase 1 (data model and contracts).

## References

- **Firestore Transactions**: https://firebase.google.com/docs/firestore/manage-data/transactions
- **Zod Validation**: https://zod.dev/
- **p-retry Library**: https://www.npmjs.com/package/p-retry (already in use)
- **Firebase Functions Logging**: https://firebase.google.com/docs/functions/writing-and-viewing-logs
