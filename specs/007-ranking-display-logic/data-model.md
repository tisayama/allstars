# Data Model: Ranking Display Logic

**Feature Branch**: `007-ranking-display-logic`
**Created**: 2025-01-04
**Status**: Phase 1 Complete
**Related Documents**: [spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md)

## 1. Overview

This document defines the data model changes for the Ranking Display Logic feature, which modifies how rankings are calculated and displayed based on question type:

- **Non-final questions**: Display only Worst 10 ranking (slowest correct answers), eliminate slowest participant(s)
- **Period-final questions** (identified by `isGongActive: true`): Display only Top 10 ranking (fastest correct answers), designate period champion(s)

The primary change is extending the `GameResults` interface to support:
- Filtering correct answers (instead of incorrect answers) for Worst 10 rankings
- Tracking period champions with support for ties
- Storing period identifiers for results
- Handling ranking calculation errors gracefully

### Key Design Decisions

Per [research.md](./research.md):
- Period champions stored as array of guest IDs embedded in GameResults (supports ties)
- Rankings use variable-length arrays to handle tie scenarios (can exceed 10 participants)
- Error handling via `rankingError` boolean flag + graceful degradation
- No separate transactions required (embedded in existing GameState update transaction)

## 2. Entity Definitions

### 2.1 GameResults (Extended)

The `GameResults` interface is embedded within the `GameState` document and represents the calculated rankings after showing the correct answer for a question.

**Location**: `/packages/types/src/GameState.ts`

```typescript
export interface GameResults {
  /**
   * Top 10 fastest correct answers
   * - Sorted ascending by responseTimeMs (fastest first)
   * - May exceed 10 elements if ties occur at 10th position
   * - Empty array if rankingError is true
   * - Only displayed for period-final questions (isGongActive: true)
   */
  top10: Array<{
    guestId: string;
    guestName: string;
    responseTimeMs: number;
  }>;

  /**
   * Worst 10 slowest correct answers (CHANGED: previously incorrect answers)
   * - Sorted descending by responseTimeMs (slowest first)
   * - May exceed 10 elements if ties occur at 10th position
   * - Empty array if rankingError is true
   * - Only displayed for non-final questions (isGongActive: false)
   */
  worst10: Array<{
    guestId: string;
    guestName: string;
    responseTimeMs: number;
  }>;

  /**
   * Period champion guest IDs (NEW)
   * - Populated only when isGongActive: true during results calculation
   * - Multiple IDs if tied for fastest response time
   * - All IDs must exist in top10 array
   * - Undefined for non-final questions
   */
  periodChampions?: string[];

  /**
   * Period identifier for this question (NEW)
   * - Copied from currentQuestion.period
   * - Populated only when isGongActive: true
   * - Values: 'first-half' | 'second-half' | 'overtime'
   * - Undefined for non-final questions
   */
  period?: GamePeriod;

  /**
   * Ranking error flag (NEW)
   * - True if ranking calculation failed after all retry attempts
   * - When true, top10 and worst10 MUST be empty arrays
   * - Game progression continues normally even when true
   * - Undefined or false indicates successful ranking calculation
   */
  rankingError?: boolean;
}
```

**Current vs. Extended Comparison**:

| Field | Current Behavior | New Behavior |
|-------|------------------|--------------|
| `top10` | Fastest correct answers | **No change** - Fastest correct answers |
| `worst10` | Slowest **incorrect** answers | **CHANGED** - Slowest **correct** answers |
| `periodChampions` | **Does not exist** | **NEW** - Array of champion guest IDs (supports ties) |
| `period` | **Does not exist** | **NEW** - Period identifier ('first-half' \| 'second-half' \| 'overtime') |
| `rankingError` | **Does not exist** | **NEW** - Boolean flag for calculation failures |

### 2.2 Answer (Reference Only)

The `Answer` entity is the source data for all ranking calculations. **No changes** are required to this entity.

**Location**: `/packages/types/src/Answer.ts`

```typescript
export interface Answer {
  /** Firestore document ID */
  id: string;

  /** Guest ID who submitted the answer (from Firebase Auth) */
  guestId: string;

  /** Question ID being answered */
  questionId: string;

  /** Submitted answer choice (e.g., 'A', 'B', 'C', 'D') */
  answer: string;

  /** Response time in milliseconds from question start */
  responseTimeMs: number;

  /** Whether the answer is correct */
  isCorrect: boolean;

  /** Server timestamp when answer was submitted */
  submittedAt: Date;
}
```

**Firestore Storage**: `questions/{questionId}/answers/{answerId}` (subcollection)

**Usage in Ranking Calculation**:
- Filter by `isCorrect === true` for both Top 10 and Worst 10 rankings
- Sort by `responseTimeMs` (ascending for Top 10, descending for Worst 10)
- Include all tied participants at boundary positions

### 2.3 GamePeriod (Reference Only)

The `GamePeriod` type identifies which period a question belongs to. **No changes** are required to this type.

**Location**: `/packages/types/src/Question.ts`

```typescript
export type GamePeriod =
  | 'first-half'   // Regular questions before first gong
  | 'second-half'  // Questions after first-half eliminations
  | 'overtime';     // Final tiebreaker questions
```

**Usage Context**:
- Copied from `currentQuestion.period` to `GameResults.period` when `isGongActive: true`
- Used to associate period champions with their respective game periods

## 3. Validation Rules

### 3.1 GameResults Validation

**Correctness Constraints**:
1. **Correct Answers Only** (FR-007):
   - Both `top10` and `worst10` MUST contain only participants who submitted correct answers
   - Implementation: Filter by `Answer.isCorrect === true` before ranking calculation

2. **Sorting Requirements**:
   - `top10`: MUST be sorted ascending by `responseTimeMs` (fastest first) - FR-006
   - `worst10`: MUST be sorted descending by `responseTimeMs` (slowest first) - FR-005

3. **Array Size Constraints**:
   - Base limit: 10 participants maximum (FR-008, FR-009)
   - **Exception**: Arrays MAY exceed 10 when ties occur at the 10th position boundary (FR-013a)
   - Example: If 3 participants tie for 10th place, array length = 12
   - Fewer than 10: Display all available correct answers (FR-010)

4. **Period Champions Population** (FR-014):
   - `periodChampions` populated ONLY when `isGongActive: true` during results calculation
   - MUST include all participants with `responseTimeMs === top10[0].responseTimeMs` (handles ties)
   - MUST be undefined for non-final questions

5. **Period Matching**:
   - `period` MUST match `currentQuestion.period` from GameState
   - MUST be undefined for non-final questions

6. **Ranking Error State** (FR-021, FR-023):
   - When `rankingError: true`, both `top10` and `worst10` MUST be empty arrays (`[]`)
   - Game progression MUST continue normally (FR-022)

### 3.2 Zod Validation Schema

**Location**: `/apps/api-server/src/models/validators.ts` (to be created)

```typescript
import { z } from 'zod';

const RankedAnswerSchema = z.object({
  guestId: z.string().min(1),
  guestName: z.string().min(1),
  responseTimeMs: z.number().int().nonnegative()
});

export const GameResultsSchema = z.object({
  top10: z.array(RankedAnswerSchema),
  worst10: z.array(RankedAnswerSchema),
  periodChampions: z.array(z.string()).optional(),
  period: z.enum(['first-half', 'second-half', 'overtime']).optional(),
  rankingError: z.boolean().optional()
})
  .refine(
    (data) => {
      // Rule 1: If rankingError is true, arrays must be empty
      if (data.rankingError === true) {
        return data.top10.length === 0 && data.worst10.length === 0;
      }
      return true;
    },
    { message: 'Rankings must be empty when rankingError is true' }
  )
  .refine(
    (data) => {
      // Rule 2: top10 sorted ascending by responseTimeMs
      for (let i = 1; i < data.top10.length; i++) {
        if (data.top10[i].responseTimeMs < data.top10[i - 1].responseTimeMs) {
          return false;
        }
      }
      return true;
    },
    { message: 'top10 must be sorted ascending by responseTimeMs' }
  )
  .refine(
    (data) => {
      // Rule 3: worst10 sorted descending by responseTimeMs
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

## 4. State Transitions

### 4.1 Game Phase Flow

```
ready_for_next
    ↓ (Host triggers START_QUESTION)
accepting_answers
    ↓ (Deadline expires or host skips)
showing_correct_answer
    ↓ (Host triggers SHOW_RESULTS)
showing_results  ← Rankings calculated HERE
    ↓ (Host triggers ADVANCE)
ready_for_next (next question)
```

### 4.2 GameResults Population Timeline

**Phase: `showing_results`**

1. **Trigger**: Host advances game from `showing_correct_answer` to `showing_results`
2. **Action**: `handleShowResults()` calculates rankings:
   ```typescript
   // Retry wrapper with 3 attempts (research.md Decision 1)
   const { top10Answers, worst10Answers } = await calculateRankingsWithRetry(questionId);

   // Hydrate with guest names
   const top10 = await hydrateRankings(top10Answers);
   const worst10 = await hydrateRankings(worst10Answers);

   // Build GameResults
   const results: GameResults = {
     top10,
     worst10,
     periodChampions: state.isGongActive
       ? top10.filter(r => r.responseTimeMs === top10[0]?.responseTimeMs).map(r => r.guestId)
       : undefined,
     period: state.isGongActive ? state.currentQuestion?.period : undefined,
     rankingError: false
   };
   ```

3. **Persistence**: GameResults embedded in GameState document update (single transaction)
4. **Real-time Sync**: Firestore listeners push updated GameState to all connected clients

### 4.3 Error State Handling

**Ranking Calculation Failure** (after 3 retries):

```typescript
catch (error: any) {
  console.error('Ranking calculation failed after all retries', {
    questionId: state.activeQuestionId,
    error: error.message
  });

  // Graceful degradation (research.md Decision 4)
  results = {
    top10: [],
    worst10: [],
    rankingError: true
  };
}

// Game continues to showing_results phase regardless
```

**Frontend Response**:
- Displays "Rankings Temporarily Unavailable" message
- Game progression continues normally (next question can start)

## 5. Lifecycle

### 5.1 Creation

**When**: During `SHOW_RESULTS` action in `handleShowResults()`

**Trigger**: Host advances from `showing_correct_answer` to `showing_results` phase

**Process**:
1. Query all correct answers for the current question from Firestore
2. Sort and filter to build Top 10 and Worst 10 arrays (with tie handling)
3. If `isGongActive: true`, determine period champions
4. Create GameResults object
5. Embed in GameState.results field
6. Persist GameState document to Firestore

### 5.2 Persistence

**Firestore Document Path**: `gameStates/live`

**Structure**:
```json
{
  "id": "live",
  "currentPhase": "showing_results",
  "currentQuestion": { ... },
  "isGongActive": false,
  "results": {
    "top10": [
      { "guestId": "guest123", "guestName": "Alice", "responseTimeMs": 1234 },
      ...
    ],
    "worst10": [
      { "guestId": "guest456", "guestName": "Bob", "responseTimeMs": 9876 },
      ...
    ],
    "periodChampions": undefined,  // Only set when isGongActive: true
    "period": undefined,            // Only set when isGongActive: true
    "rankingError": false
  },
  "lastUpdate": { "_seconds": 1704355200, "_nanoseconds": 0 }
}
```

**Period-Final Question Example** (`isGongActive: true`):
```json
{
  "id": "live",
  "currentPhase": "showing_results",
  "currentQuestion": { "period": "first-half", ... },
  "isGongActive": true,
  "results": {
    "top10": [ ... ],
    "worst10": [ ... ],
    "periodChampions": ["guest123", "guest456"],  // Two tied for fastest
    "period": "first-half",
    "rankingError": false
  }
}
```

### 5.3 Cleanup / Reset

**When**: When advancing to `ready_for_next` phase for a new question

**Action**: `results` field set to `null`

```typescript
return {
  ...state,
  currentPhase: 'ready_for_next',
  results: null,  // Clear previous question results
  currentQuestion: nextQuestion
};
```

## 6. Storage Schema

### 6.1 Firestore Document Structure

**Collection**: `gameStates`
**Document ID**: `live` (singleton)

**GameResults Embedding**:
```typescript
// GameResults is NOT a separate collection
// It is embedded within the GameState document
interface GameState {
  // ... other fields ...
  results?: GameResults | null;  // Embedded here
}
```

### 6.2 Data Type Mapping

| TypeScript Type | Firestore Type | Notes |
|----------------|----------------|-------|
| `top10: Array<{...}>` | `array` of `map` | Each map contains `guestId`, `guestName`, `responseTimeMs` |
| `worst10: Array<{...}>` | `array` of `map` | Same structure as top10 |
| `periodChampions?: string[]` | `array` of `string` | Omitted when undefined |
| `period?: GamePeriod` | `string` | Omitted when undefined, constrained to enum values |
| `rankingError?: boolean` | `boolean` | Omitted when undefined or false |
| `responseTimeMs` | `number` (integer) | Always non-negative integer |

### 6.3 Indexing Considerations

**No additional indexes required**:
- GameResults is embedded in the singleton `live` document (no queries)
- Answer queries (for ranking calculation) already indexed by `isCorrect` and `responseTimeMs` from existing functionality
- Frontend reads entire GameState document via document listener (no field-specific queries)

## 7. TypeScript Definitions

### 7.1 Complete Interface Definition

**Location**: `/packages/types/src/GameState.ts`

```typescript
/**
 * Game period classification
 */
export type GamePeriod =
  | 'first-half'
  | 'second-half'
  | 'overtime';

/**
 * Ranked answer entry for Top 10 and Worst 10 rankings
 */
export interface RankedAnswer {
  /** Guest unique identifier */
  guestId: string;

  /** Guest display name */
  guestName: string;

  /** Response time in milliseconds from question start */
  responseTimeMs: number;
}

/**
 * Rankings and champions calculated after showing correct answer
 * Embedded in GameState.results field
 */
export interface GameResults {
  /**
   * Top 10 fastest correct answers
   * - Sorted ascending by responseTimeMs (fastest first)
   * - May exceed 10 elements if ties occur at 10th position
   * - Empty array if rankingError is true
   * - Only displayed for period-final questions (isGongActive: true)
   */
  top10: RankedAnswer[];

  /**
   * Worst 10 slowest correct answers
   * - Sorted descending by responseTimeMs (slowest first)
   * - May exceed 10 elements if ties occur at 10th position
   * - Empty array if rankingError is true
   * - Only displayed for non-final questions (isGongActive: false)
   */
  worst10: RankedAnswer[];

  /**
   * Period champion guest IDs (supports ties)
   * - Populated only when isGongActive: true during results calculation
   * - All IDs must exist in top10 array
   * - Contains all guests with responseTimeMs === top10[0].responseTimeMs
   */
  periodChampions?: string[];

  /**
   * Period identifier for this question
   * - Populated only when isGongActive: true
   * - Copied from currentQuestion.period
   */
  period?: GamePeriod;

  /**
   * Ranking error flag
   * - True if ranking calculation failed after all retry attempts
   * - When true, top10 and worst10 will be empty arrays
   * - Game progression continues normally even when true
   */
  rankingError?: boolean;
}

export type GamePhase =
  | 'ready_for_next'
  | 'accepting_answers'
  | 'showing_distribution'
  | 'showing_correct_answer'
  | 'showing_results'
  | 'all_incorrect'
  | 'all_revived';

export interface GameState {
  id?: string;
  currentPhase: GamePhase;
  currentQuestion: Question | null;
  isGongActive: boolean;
  participantCount?: number;
  timeRemaining?: number | null;
  lastUpdate: Timestamp;
  results?: GameResults | null;
  prizeCarryover?: number;
}
```

### 7.2 Type Guards

**Location**: `/packages/types/src/GameState.ts`

```typescript
/**
 * Type guard: Validates GameResults structure at runtime
 * Uses Zod schema for validation
 */
export function isValidGameResults(results: unknown): results is GameResults {
  try {
    GameResultsSchema.parse(results);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard: Checks if ranking calculation failed
 */
export function hasRankingError(results: GameResults | null | undefined): boolean {
  return results?.rankingError === true;
}

/**
 * Type guard: Checks if results contain period champions
 */
export function hasPeriodChampions(results: GameResults | null | undefined): boolean {
  return results?.periodChampions !== undefined && results.periodChampions.length > 0;
}

/**
 * Helper: Gets the ranking to display based on isGongActive flag
 * @param results - GameResults from GameState
 * @param isGongActive - Whether gong is active (period-final question)
 * @returns The appropriate ranking array (top10 for final, worst10 for non-final)
 */
export function getDisplayRanking(
  results: GameResults | null | undefined,
  isGongActive: boolean
): RankedAnswer[] {
  if (!results || results.rankingError) {
    return [];
  }
  return isGongActive ? results.top10 : results.worst10;
}
```

## 8. Integration Points

### 8.1 Backend Services

**answerService.ts** (Ranking Calculation)

**Location**: `/apps/api-server/src/services/answerService.ts`

**Modified Functions**:
- `getWorst10CorrectAnswers(questionId: string): Promise<Answer[]>` - **NEW**: Replaces `getWorst10IncorrectAnswers`, filters correct answers instead of incorrect
- `getTop10CorrectAnswers(questionId: string): Promise<Answer[]>` - **UNCHANGED**: Already filters correct answers

**New Functions**:
- `calculateRankingsWithRetry(questionId: string): Promise<{ top10Answers: Answer[], worst10Answers: Answer[] }>` - Wrapper with p-retry logic (3 attempts)

**Read Operations**:
- Firestore query: `questions/{questionId}/answers` where `isCorrect === true`
- Sorting: `orderBy('responseTimeMs', 'asc')` for Top 10, `orderBy('responseTimeMs', 'desc')` for Worst 10
- Tie handling: Filter by boundary time value to include all tied participants

---

**gameStateService.ts** (Persistence)

**Location**: `/apps/api-server/src/services/gameStateService.ts`

**Modified Functions**:
- `handleShowResults(state: GameState): Promise<GameState>` - Calculate rankings, populate `periodChampions` and `period` fields, handle errors

**Write Operations**:
- Firestore update: `gameStates/live` document (embedded within existing transaction)
- Transaction: Existing `advanceGame()` transaction wrapper (no new transaction needed)

---

### 8.2 Frontend Applications

**projector-app, participant-app, host-app**

**Read Pattern**: Real-time Firestore listener on `gameStates/live`

```typescript
// Example: useGameState.ts hook
const unsubscribe = db.collection('gameStates').doc('live')
  .onSnapshot((snapshot) => {
    if (snapshot.exists) {
      const gameState = snapshot.data() as GameState;
      setGameState(gameState);

      // Check for ranking errors
      if (gameState.results?.rankingError) {
        // Display error UI
      }
    }
  });
```

**Display Logic**:
- **Non-final questions** (`isGongActive: false`): Display `results.worst10`, hide `results.top10`
- **Period-final questions** (`isGongActive: true`): Display `results.top10`, hide `results.worst10`, show period champions

**Error Handling**:
- Listen for `results.rankingError === true`
- Display "Rankings Temporarily Unavailable" message
- Game continues normally (no blocking)

### 8.3 Real-Time Synchronization

**Pattern**: Firestore real-time listeners (push-based)

**Flow**:
1. Backend: `handleShowResults()` updates GameState.results in Firestore
2. Firestore: Broadcasts document change to all connected clients
3. Frontend: `onSnapshot` callback fires with updated GameState
4. Frontend: Re-renders UI with new rankings

**Latency**: Typically <100ms from backend write to frontend update (95th percentile)

**Concurrency**: Single host controls game flow (no concurrent SHOW_RESULTS calls expected)

**Resilience**:
- Frontend listeners auto-reconnect on network disruption
- Backend retries (3 attempts) handle transient Firestore errors
- Graceful degradation (empty rankings) if all retries fail

## 9. Migration Notes

### 9.1 Backward Compatibility

**New Fields Are Optional**:
- `periodChampions?: string[]` - Undefined for non-final questions and legacy data
- `period?: GamePeriod` - Undefined for non-final questions and legacy data
- `rankingError?: boolean` - Undefined or false indicates successful calculation

**Legacy GameResults**:
- Old GameResults documents (without new fields) remain valid
- Frontend code checks for undefined values before accessing
- No data migration required for existing game sessions

### 9.2 Breaking Changes

**Worst 10 Calculation Change**:
- **OLD**: Slowest **incorrect** answers
- **NEW**: Slowest **correct** answers

**Impact**:
- Existing games in progress may show incorrect Worst 10 rankings until backend deployed
- Mitigation: Deploy during low-traffic window or reset active game sessions

**Function Signature Change**:
- `getWorst10IncorrectAnswers()` → `getWorst10CorrectAnswers()`
- All callers must be updated (searched via IDE)

### 9.3 Database Schema

**No Firestore schema changes required**:
- New fields added to existing GameResults interface (additive change)
- Firestore is schemaless (no ALTER TABLE needed)
- Validation enforced at application layer (Zod schemas)

### 9.4 Deployment Considerations

**Deployment Order**:
1. Deploy backend changes first (`api-server`)
2. Deploy frontend changes atomically (`projector-app`, `participant-app`, `host-app`)

**Rollback Plan**:
- Backend rollback: Revert to previous `getWorst10IncorrectAnswers` logic
- Frontend rollback: Revert conditional display logic
- Data: No cleanup needed (optional fields ignored by old code)

**Testing Before Deployment**:
- Run full integration test suite with Firebase emulators
- Verify ranking calculation correctness (correct answers only)
- Verify period champion designation (ties handled correctly)
- Verify error handling (retry logic, graceful degradation)

---

## Summary

This data model extends the existing `GameResults` interface to support the new ranking display logic without breaking changes to the core data structure. Key design decisions:

1. **Embedded Storage**: Period champions and metadata stored within GameResults (no separate collections)
2. **Backward Compatibility**: New fields are optional, existing sessions unaffected
3. **Tie Handling**: Variable-length arrays support ties beyond 10 participants
4. **Error Resilience**: Retry logic + graceful degradation ensures game continuity
5. **Type Safety**: Zod validation + TypeScript guards prevent runtime errors

All changes align with the monorepo architecture, maintaining shared types in `/packages/types/` and service logic in `/apps/api-server/`.

**Next Step**: Generate task breakdown with `/speckit.tasks` command (Phase 2)

---

**Document Status**: ✅ Complete
**Generated**: 2025-01-04
