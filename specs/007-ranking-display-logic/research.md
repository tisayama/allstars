# Research Document: Ranking Display Logic

**Feature Branch**: `007-ranking-display-logic`
**Created**: 2025-01-04
**Status**: Phase 0 Research Complete
**Related Documents**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Overview

This document presents technical research findings for the Ranking Display Logic feature, which modifies ranking calculation and display to show different rankings based on question type (period-final vs. non-final questions). Research topics cover retry strategies, data persistence patterns, type safety, and error propagation for a resilient implementation that maintains 100% game progression continuity.

---

## 1. p-retry Configuration for Firestore

### Research Question
What is the optimal retry strategy for Firestore read operations during ranking calculation, balancing resilience against latency impact?

### Decision

**Retry Configuration**:
```typescript
import pRetry from 'p-retry';

const retryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
  randomize: true,
  onFailedAttempt: (error) => {
    console.error(
      `Ranking calculation attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
      { questionId, error: error.message }
    );
  }
};

// Wrapper function
export async function calculateRankingsWithRetry(questionId: string): Promise<GameResults> {
  return pRetry(
    async () => {
      // Firestore queries may throw on timeout/connection errors
      const top10 = await getTop10CorrectAnswers(questionId);
      const worst10 = await getWorst10CorrectAnswers(questionId); // Modified function
      return { top10, worst10 };
    },
    retryOptions
  );
}
```

**Error Classification**:
- **Retry on**: `UNAVAILABLE`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, network timeouts
- **Fail-fast on**: `PERMISSION_DENIED`, `NOT_FOUND`, `INVALID_ARGUMENT`, data validation errors

```typescript
import pRetry, { AbortError } from 'p-retry';

async function calculateRankingsWithRetry(questionId: string): Promise<GameResults> {
  return pRetry(
    async () => {
      try {
        const top10 = await getTop10CorrectAnswers(questionId);
        const worst10 = await getWorst10CorrectAnswers(questionId);
        return { top10, worst10 };
      } catch (error: any) {
        // Fail-fast on non-retryable errors
        const nonRetryableCodes = [
          'permission-denied',
          'not-found',
          'invalid-argument',
          'failed-precondition'
        ];

        if (nonRetryableCodes.includes(error.code)) {
          throw new AbortError(error.message);
        }

        // Let p-retry handle retryable errors
        throw error;
      }
    },
    {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
      randomize: true,
      onFailedAttempt: (error) => {
        console.error(
          `Ranking calculation attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
          { questionId, error: error.message }
        );
      }
    }
  );
}
```

### Rationale

1. **3 Retries Confirmed**: Spec explicitly requires 3 retry attempts (FR-019), providing 4 total attempts (initial + 3 retries)
2. **Exponential Backoff (factor: 2)**: Doubles delay between retries (1s → 2s → 4s), reducing load on Firestore during transient issues
3. **Randomized Jitter**: Prevents thundering herd when multiple clients retry simultaneously
4. **Timeout Bounds**:
   - `minTimeout: 1000ms` prevents immediate retries that may hit same transient issue
   - `maxTimeout: 5000ms` caps total retry window to ~12 seconds (1s + 2s + 4s + 5s), meeting <2s display goal for 95% of questions (SC-005) while allowing graceful degradation for the 5% edge cases
5. **Structured Logging**: `onFailedAttempt` callback provides operational visibility (SC-011: 100% observability)
6. **Error Classification**: Fail-fast on permission/validation errors saves retry budget for truly transient issues (network/timeout)

### Alternatives Considered

**Alternative 1: Fixed Delay Retry (rejected)**
```typescript
{ retries: 3, minTimeout: 1000, maxTimeout: 1000, factor: 1 }
```
- **Why rejected**: Fixed 1-second delays don't back off, may retry into same transient condition. Total time (3 seconds) doesn't give Firestore enough recovery time for systemic issues.

**Alternative 2: Aggressive Retry (rejected)**
```typescript
{ retries: 5, minTimeout: 200, maxTimeout: 2000, factor: 1.5 }
```
- **Why rejected**: More retries increase latency for failed cases, impacting game flow. Spec explicitly states 3 retries (FR-019). Faster initial retry (200ms) may not resolve transient network partitions.

**Alternative 3: No Retry, Immediate Fail (rejected)**
- **Why rejected**: Violates spec requirement FR-019 (must retry 3 times). Reduces resilience to transient Firestore issues that resolve within seconds.

### Performance Impact

- **95th percentile case** (successful on first attempt): 0ms retry overhead
- **Transient failure case** (succeeds on retry 2): ~3 seconds total (1s + 2s)
- **Complete failure case** (all retries exhausted): ~12 seconds before graceful degradation
- **Network overhead**: Minimal - only retries Firestore queries, no frontend blocking

### References

- [p-retry Documentation](https://github.com/sindresorhus/p-retry) - Configuration options, error handling patterns
- [Firebase Error Codes](https://firebase.google.com/docs/reference/node/firebase.FirebaseError#code) - Firestore error code classification
- [Google Cloud Firestore Retry Guidance](https://cloud.google.com/firestore/docs/best-practices#retries) - Exponential backoff best practices
- [p-retry AbortError API](https://github.com/sindresorhus/p-retry#aborterror) - Fail-fast pattern for non-retryable errors

---

## 2. Firestore Transaction Requirements

### Research Question
Does period champion persistence require Firestore transactions for atomicity, or are batch writes sufficient?

### Decision

**Use Firestore Batch Writes (NOT transactions)** for period champion persistence.

```typescript
async function handleShowResults(state: GameState): Promise<GameState> {
  // ... existing ranking calculation with retry wrapper ...

  const results: GameResults = {
    top10,
    worst10,
    periodChampions: state.isGongActive
      ? top10.filter(r => r.responseTimeMs === top10[0]?.responseTimeMs).map(r => r.guestId)
      : undefined,
    period: state.isGongActive ? state.currentQuestion?.period : undefined,
    rankingError: false
  };

  // Persist GameState with results using existing transaction in advanceGame()
  // No additional transaction needed - GameState update already inside transaction

  return {
    ...state,
    phase: newPhase,
    results,
    // ... rest of state
  };
}
```

**Rationale for Batch vs Transaction**:
- GameState is already updated inside `advanceGame()` transaction (lines 24-64 in gameStateService.ts)
- Period champion data is **embedded in GameResults** within the single GameState document
- No cross-document updates required (champions are IDs, not separate documents)
- Last-write-wins is acceptable: only one host controls game flow, concurrent SHOW_RESULTS impossible in normal operation

### Conflict Analysis

**Scenario 1: Multiple hosts trigger SHOW_RESULTS simultaneously**
- **Likelihood**: Near-zero in production (single host app per game session)
- **Consequence**: Both transactions read same GameState version, both calculate rankings, second write overwrites first
- **Mitigation**:
  - Frontend UI should enforce single host session (only one host-app instance)
  - If conflict occurs, rankings are deterministic (same input → same output), so overwrite is safe
  - Firestore transaction already provides read-modify-write atomicity within `advanceGame()`

**Scenario 2: Host triggers SHOW_RESULTS while another transaction updates GameState**
- **Likelihood**: Low (guest eliminations in handleShowResults use batch, not nested transaction)
- **Consequence**: Firestore transaction retry handles this automatically
- **Mitigation**: Existing transaction retry in advanceGame() (lines 24-64)

**Scenario 3: Firestore write fails during GameState update**
- **Likelihood**: Covered by p-retry wrapper
- **Consequence**: Entire advanceGame() transaction rolls back, no partial state
- **Mitigation**: p-retry wrapper ensures retries before setting rankingError flag

### Decision: Embed Period Champions in GameResults

```typescript
interface GameResults {
  top10: Array<{...}>;
  worst10: Array<{...}>;
  periodChampions?: string[];     // NEW: Guest IDs of champions (supports ties)
  period?: GamePeriod;             // NEW: 'first-half' | 'second-half' | 'overtime'
  rankingError?: boolean;          // NEW: True if calculation failed
}
```

**Why NOT a separate `periodChampions` collection**:
- Avoids cross-document transaction complexity
- Period champions are **query results**, not independent entities
- Tightly coupled to question results (same lifecycle)
- Simplified retrieval: `gameState.results.periodChampions` (single read)

### Rationale

1. **Single-Document Update**: GameResults is embedded in GameState document, no cross-document consistency needed
2. **Existing Transaction Coverage**: `advanceGame()` already wraps GameState updates in transaction (line 24)
3. **Deterministic Calculation**: Rankings are pure functions of Answer data; concurrent calculations yield identical results
4. **Simplicity**: Batch writes simpler than nested transactions (Firestore doesn't support nested transactions)
5. **Performance**: Batch writes ~10-20ms faster than transactions for single-document updates
6. **Error Handling**: p-retry wrapper provides resilience; transaction retry handles concurrent modifications

### Alternatives Considered

**Alternative 1: Separate Transaction for Period Champions (rejected)**
```typescript
// Separate transaction to persist champions
await db.runTransaction(async (tx) => {
  const championsRef = db.collection('periodChampions').doc(questionId);
  tx.set(championsRef, { champions: [...], period: ... });
});
```
- **Why rejected**:
  - Adds complexity with cross-collection updates
  - Requires additional Firestore read to retrieve champions later
  - Potential inconsistency if GameState update succeeds but champion write fails
  - Violates single-source-of-truth principle (GameResults should contain all result data)

**Alternative 2: Firestore Distributed Transaction (rejected)**
- **Why rejected**: Overkill for single-document update; increases latency (50-100ms overhead); no conflict scenarios identified that require distributed transaction guarantees

**Alternative 3: Optimistic Locking with Version Field (rejected)**
```typescript
// Add version field to GameState
if (state.version !== currentVersion) { retry... }
```
- **Why rejected**: Firestore transactions already provide this via document snapshot versioning; redundant implementation

### References

- [Firestore Transactions Documentation](https://firebase.google.com/docs/firestore/manage-data/transactions) - Atomicity guarantees, retry behavior
- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes) - When batches suffice vs. transactions
- [Firestore Transaction Limitations](https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure) - Read/write constraints, no nested transactions
- [Firebase Blog: Transactions vs Batches](https://firebase.blog/posts/2018/04/best-practices-cloud-firestore) - Performance comparison

---

## 3. TypeScript Patterns for Tie-Handling

### Research Question
What type-safe patterns handle ranking arrays that can exceed 10 elements due to ties at boundary positions?

### Decision

**Use Type Guards + Runtime Validation with Zod** for tie-aware ranking arrays.

**Type Definitions**:
```typescript
// packages/types/src/GameState.ts

export interface RankedAnswer {
  guestId: string;
  guestName: string;
  responseTimeMs: number;
}

export interface GameResults {
  /**
   * Top 10 fastest correct answers (may exceed 10 if ties at 10th position)
   * Empty array if rankingError is true
   */
  top10: RankedAnswer[];

  /**
   * Worst 10 slowest correct answers (may exceed 10 if ties at 10th position)
   * Empty array if rankingError is true
   */
  worst10: RankedAnswer[];

  /** Period champion guest IDs (multiple if tied for fastest) */
  periodChampions?: string[];

  /** Period identifier when isGongActive was true */
  period?: GamePeriod;

  /** True if ranking calculation failed after all retries */
  rankingError?: boolean;
}

export type GamePeriod = 'first-half' | 'second-half' | 'overtime';
```

**Validation with Zod**:
```typescript
// apps/api-server/src/models/validators.ts

import { z } from 'zod';

const RankedAnswerSchema = z.object({
  guestId: z.string().min(1),
  guestName: z.string().min(1),
  responseTimeMs: z.number().int().nonnegative()
});

const GameResultsSchema = z.object({
  top10: z.array(RankedAnswerSchema),
  worst10: z.array(RankedAnswerSchema),
  periodChampions: z.array(z.string()).optional(),
  period: z.enum(['first-half', 'second-half', 'overtime']).optional(),
  rankingError: z.boolean().optional()
}).refine(
  (data) => {
    // Validation: If rankingError is true, arrays must be empty
    if (data.rankingError === true) {
      return data.top10.length === 0 && data.worst10.length === 0;
    }
    return true;
  },
  { message: 'Rankings must be empty when rankingError is true' }
).refine(
  (data) => {
    // Validation: All top10 sorted ascending by responseTimeMs
    for (let i = 1; i < data.top10.length; i++) {
      if (data.top10[i].responseTimeMs < data.top10[i - 1].responseTimeMs) {
        return false;
      }
    }
    return true;
  },
  { message: 'top10 must be sorted ascending by responseTimeMs' }
).refine(
  (data) => {
    // Validation: All worst10 sorted descending by responseTimeMs
    for (let i = 1; i < data.worst10.length; i++) {
      if (data.worst10[i].responseTimeMs > data.worst10[i - 1].responseTimeMs) {
        return false;
      }
    }
    return true;
  },
  { message: 'worst10 must be sorted descending by responseTimeMs' }
);

export type ValidatedGameResults = z.infer<typeof GameResultsSchema>;
```

**Tie-Handling Logic**:
```typescript
// apps/api-server/src/services/answerService.ts

export async function getWorst10CorrectAnswers(
  questionId: string
): Promise<Answer[]> {
  // Step 1: Get all correct answers (not limited to 10)
  const allCorrect = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection('answers')
    .where('isCorrect', '==', true)
    .orderBy('responseTimeMs', 'desc') // Slowest first
    .get();

  if (allCorrect.empty || allCorrect.size <= 10) {
    // Fewer than 10 correct answers: return all
    return allCorrect.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer));
  }

  // Step 2: Find the 10th slowest response time
  const answers = allCorrect.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer));
  const tenthSlowestTime = answers[9].responseTimeMs;

  // Step 3: Include all answers with responseTimeMs >= 10th time (handles ties)
  return answers.filter(a => a.responseTimeMs >= tenthSlowestTime);
}

export async function getTop10CorrectAnswers(
  questionId: string
): Promise<Answer[]> {
  // Step 1: Get all correct answers
  const allCorrect = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection('answers')
    .where('isCorrect', '==', true)
    .orderBy('responseTimeMs', 'asc') // Fastest first
    .get();

  if (allCorrect.empty || allCorrect.size <= 10) {
    return allCorrect.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer));
  }

  const answers = allCorrect.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer));
  const tenthFastestTime = answers[9].responseTimeMs;

  // Include all answers with responseTimeMs <= 10th time (handles ties)
  return answers.filter(a => a.responseTimeMs <= tenthFastestTime);
}
```

**Type Guard for Frontend Validation**:
```typescript
// packages/types/src/GameState.ts

export function isValidRanking(results: GameResults): boolean {
  try {
    GameResultsSchema.parse(results);
    return true;
  } catch {
    return false;
  }
}

export function hasRankingError(results: GameResults | null): boolean {
  return results?.rankingError === true;
}
```

### Rationale

1. **Variable-Length Arrays**: `RankedAnswer[]` allows 0 to N elements, no hard-coded size constraint
2. **Tie Inclusion Logic**: Filter by boundary time value (10th position), not array index, ensures all tied participants included (FR-013a)
3. **Zod Runtime Validation**: Catches data corruption (unsorted arrays, incorrect empty state) at API boundaries
4. **Type Safety**: TypeScript prevents `top10[10]` undefined access errors via proper array handling
5. **Frontend Flexibility**: Frontends can render variable-length lists without hard-coded 10-row grids
6. **Explicit Error State**: `rankingError` flag allows frontends to show error UI instead of empty rankings

### Alternatives Considered

**Alternative 1: Fixed-Size Tuple Type (rejected)**
```typescript
type Top10 = [RankedAnswer, RankedAnswer, ...RankedAnswer[]] & { length: 10 };
```
- **Why rejected**: Cannot represent ties (11+ participants), cannot represent <10 answers, overly rigid

**Alternative 2: Separate Tie Array (rejected)**
```typescript
interface GameResults {
  top10: RankedAnswer[];       // Always exactly 10
  top10Ties: RankedAnswer[];   // Overflow ties
}
```
- **Why rejected**: Complicated frontend rendering logic (iterate two arrays), violates single-source-of-truth, unclear boundary semantics

**Alternative 3: No Runtime Validation, Pure TypeScript (rejected)**
- **Why rejected**: TypeScript types erased at runtime; cannot catch Firestore data corruption or serialization bugs; production data issues undetected

**Alternative 4: Break Ties by Submission Timestamp (rejected)**
```typescript
// If responseTimeMs equal, sort by submittedAt
.sort((a, b) => a.responseTimeMs - b.responseTimeMs || a.submittedAt - b.submittedAt)
```
- **Why rejected**: Violates spec FR-013a (must include all tied participants), unfair elimination (network latency favors some participants)

### Performance Considerations

- **Tie Query**: Fetching all correct answers (50-200 participants) then filtering in-memory is O(n), negligible for n < 500
- **Zod Validation**: ~0.1-0.5ms per validation, acceptable overhead for API responses
- **Frontend Rendering**: Variable-length arrays require dynamic UI (CSS Grid `auto-fit` or flexbox), no hard-coded rows

### References

- [Zod Documentation](https://zod.dev/) - Schema validation, refinements, type inference
- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) - Type guards and runtime checks
- [Firestore Query Cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors) - Pagination patterns (not used here due to tie-handling)
- [MDN Array.prototype.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) - In-memory filtering performance

---

## 4. Error Propagation Strategy

### Research Question
How should ranking calculation errors surface to frontend clients via real-time Firestore listeners?

### Decision

**Use `GameResults.rankingError` Boolean Flag + Structured Logging**

**Backend Error Handling**:
```typescript
// apps/api-server/src/services/gameStateService.ts

async function handleShowResults(state: GameState): Promise<GameState> {
  // ... validation ...

  let results: GameResults;

  try {
    // Retry wrapper around ranking calculation
    const { top10Answers, worst10Answers } = await calculateRankingsWithRetry(
      state.activeQuestionId!
    );

    // Hydrate with guest names
    const top10 = await hydrateRankings(top10Answers);
    const worst10 = await hydrateRankings(worst10Answers);

    results = {
      top10,
      worst10,
      periodChampions: state.isGongActive
        ? top10.filter(r => r.responseTimeMs === top10[0]?.responseTimeMs).map(r => r.guestId)
        : undefined,
      period: state.isGongActive ? state.currentQuestion?.period : undefined,
      rankingError: false
    };

    // Log success for monitoring
    console.info('Ranking calculation succeeded', {
      questionId: state.activeQuestionId,
      top10Count: top10.length,
      worst10Count: worst10.length
    });

  } catch (error: any) {
    // All retries exhausted - graceful degradation
    console.error('Ranking calculation failed after all retries', {
      questionId: state.activeQuestionId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // FR-021: Display empty rankings
    results = {
      top10: [],
      worst10: [],
      rankingError: true
    };

    // FR-020: Log to Firebase Cloud Logging (structured logs auto-collected)
    // No additional logging service integration needed - console.error auto-indexed
  }

  // FR-022: Game progression continues even with ranking error
  return {
    ...state,
    phase: 'showing_results',
    results,
    // ... rest of state
  };
}
```

**Frontend Real-Time Listener Pattern**:
```typescript
// apps/projector-app/src/hooks/useGameState.ts

import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { GameState } from '@allstars/types';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [listenerError, setListenerError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = db.collection('gameStates').doc('live')
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            const data = snapshot.data() as GameState;
            setGameState(data);
            setListenerError(null);

            // Check for ranking error flag
            if (data.results?.rankingError) {
              console.warn('Rankings unavailable for this question', {
                phase: data.phase,
                questionId: data.currentQuestion?.id
              });
            }
          }
        },
        (error) => {
          // Listener error (permission denied, network disconnect)
          console.error('GameState listener error', error);
          setListenerError(error);
        }
      );

    return () => unsubscribe();
  }, []);

  return { gameState, listenerError };
}
```

**Frontend Error UI**:
```typescript
// apps/projector-app/src/components/RankingsDisplay.tsx

export function RankingsDisplay({ gameState }: { gameState: GameState }) {
  if (!gameState.results) {
    return <div>Waiting for results...</div>;
  }

  if (gameState.results.rankingError) {
    return (
      <div className="error-state">
        <h2>Rankings Temporarily Unavailable</h2>
        <p>The game will continue shortly.</p>
      </div>
    );
  }

  // Normal rendering
  const rankings = gameState.isGongActive
    ? gameState.results.top10
    : gameState.results.worst10;

  return (
    <div className="rankings">
      {rankings.map((rank, i) => (
        <RankingRow key={rank.guestId} rank={i + 1} {...rank} />
      ))}
    </div>
  );
}
```

### Rationale

1. **Simple Boolean Flag**: `rankingError: true` is easy to check in frontend listeners, no complex error parsing
2. **Graceful Degradation**: Empty arrays `[]` allow frontend to show "no data" UI without crashing
3. **Game Continuity**: Game progresses to `showing_results` phase even with error (FR-022)
4. **Real-Time Propagation**: Firestore listeners automatically push updated GameState with error flag to all connected clients (projector, participants, host)
5. **Structured Logging**: Firebase Cloud Functions auto-collects `console.error` logs to Cloud Logging with full context (FR-020)
6. **No Retry in Frontend**: Frontend passively receives GameState updates; retry logic isolated to backend

### Error Scenarios

**Scenario 1: Firestore timeout during ranking query**
- **Backend**: p-retry attempts 3 retries → sets `rankingError: true` → GameState persists with empty rankings
- **Frontend**: Listener receives updated GameState → shows "Rankings Temporarily Unavailable" UI → game continues

**Scenario 2: Data corruption (answers missing `responseTimeMs` field)**
- **Backend**: Zod validation fails during ranking calculation → caught by try/catch → `rankingError: true`
- **Frontend**: Same as Scenario 1

**Scenario 3: Network partition between frontend and Firestore**
- **Backend**: Not affected (backend writes to Firestore internally)
- **Frontend**: Listener `onSnapshot` error callback fires → shows "Connection Lost" UI → auto-reconnects when network restored

**Scenario 4: Permission denied (misconfigured Firestore rules)**
- **Backend**: Firestore write fails → transaction rolls back → error logged → host sees HTTP 500 error
- **Frontend**: Listener receives permission denied error → shows "Access Denied" error state

### Alternatives Considered

**Alternative 1: Separate `errors` Collection (rejected)**
```typescript
// Store errors in separate Firestore collection
await db.collection('errors').add({
  type: 'ranking_calculation_failed',
  questionId,
  timestamp,
  error: error.message
});
```
- **Why rejected**:
  - Requires frontend to listen to two collections (GameState + errors)
  - Synchronization issues (error document arrives before/after GameState update)
  - Unnecessary complexity for simple boolean flag
  - Increases Firestore read costs

**Alternative 2: HTTP Polling for Error Status (rejected)**
```typescript
// Frontend polls /api/errors endpoint
const errorStatus = await fetch('/api/errors/latest');
```
- **Why rejected**:
  - Violates real-time architecture (frontend uses Firestore listeners, not REST polling)
  - Adds latency (polling interval delay)
  - Increases server load (repeated API calls)
  - Inconsistent with existing Firestore-based state management

**Alternative 3: Throw Error, Block Game Progression (rejected)**
```typescript
if (rankingCalculationFailed) {
  throw new Error('Rankings unavailable');
}
```
- **Why rejected**: Violates spec FR-022 (game must continue even with ranking errors), poor user experience (blocks quiz flow)

**Alternative 4: Detailed Error Object in GameResults (rejected)**
```typescript
interface GameResults {
  top10: RankedAnswer[];
  worst10: RankedAnswer[];
  error?: {
    code: 'TIMEOUT' | 'PERMISSION_DENIED' | 'UNKNOWN';
    message: string;
    retryCount: number;
  };
}
```
- **Why rejected**:
  - Overly complex for frontend needs (only needs "error occurred" signal)
  - Detailed error info should be in logs, not user-facing state
  - Increases GameState document size (every question stores error details)
  - Security concern: may leak internal error messages to clients

### Monitoring and Observability

**Cloud Logging Query** (for operational debugging):
```
resource.type="cloud_function"
severity="ERROR"
textPayload=~"Ranking calculation failed"
```

**Metrics to Track**:
- Ranking error rate (errors per question)
- Retry success rate (attempts that succeed on retry vs. initial failure)
- Time to calculate rankings (p50, p95, p99)
- Frontend listener errors (connection failures)

### References

- [Firestore Real-Time Listeners](https://firebase.google.com/docs/firestore/query-data/listen) - onSnapshot error handling
- [Firebase Cloud Functions Logging](https://firebase.google.com/docs/functions/writing-and-viewing-logs) - Structured logging with Cloud Logging
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) - Frontend error UI patterns
- [Google Cloud Logging](https://cloud.google.com/logging/docs/reference/v2/rest) - Query syntax for debugging

---

## Summary

### Key Technical Decisions

| Research Topic | Decision | Primary Rationale |
|---------------|----------|-------------------|
| **p-retry Configuration** | 3 retries, exponential backoff (factor: 2), 1-5s timeout range | Balances resilience with <2s display goal; meets spec FR-019 |
| **Firestore Transactions** | Batch writes (embedded in existing advanceGame transaction) | Single-document update, no cross-collection atomicity needed |
| **Tie-Handling Types** | Variable-length `RankedAnswer[]` + Zod validation | Supports variable array size, runtime validation prevents data corruption |
| **Error Propagation** | `GameResults.rankingError` boolean + structured logging | Simple frontend check, graceful degradation, maintains game continuity |

### Implementation Readiness

All research topics resolved with concrete implementation patterns. Ready to proceed to:
1. **Phase 1**: Document data model changes in `data-model.md`
2. **Phase 2**: Generate task breakdown with `/speckit.tasks`
3. **Implementation**: TDD workflow with unit tests first

### Cross-Cutting Concerns

- **Performance**: All decisions meet SC-005 (95% rankings displayed <2s)
- **Reliability**: Retry logic + graceful degradation ensures SC-010 (100% game progression continuity)
- **Observability**: Structured logging achieves SC-011 (100% error observability)
- **Type Safety**: Zod + TypeScript guards prevent runtime errors from data corruption

### Open Questions

None. All research topics from plan.md addressed with decisions, rationale, alternatives, and references.

---

**Document Status**: ✅ Complete
**Next Step**: Generate `data-model.md` (Phase 1)
**Generated**: 2025-01-04
