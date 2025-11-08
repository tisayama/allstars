# Data Model: Firestore Development Environment Initialization

**Feature**: 002-firestore-init
**Date**: 2025-11-06

## Overview

This document defines the data model for the gameState/live Firestore document that the initialization script creates. The model is derived from the existing `GameState` type in `/home/tisayama/allstars/packages/types/src/GameState.ts`.

## Entity: GameState Document

### Firestore Path
```
gameState/live
```

**Cardinality**: Singleton (exactly one document)
**Lifecycle**: Created once by initialization script, updated by game logic during gameplay
**Ownership**: Shared across all applications (projector-app, host-app, participant-app, socket-server)

### Schema Definition

| Field Name | Type | Required | Nullable | Initial Value | Description |
|------------|------|----------|----------|---------------|-------------|
| `currentPhase` | GamePhase (union type) | Yes | No | `"ready_for_next"` | Current phase of the game. One of: `ready_for_next`, `accepting_answers`, `showing_distribution`, `showing_correct_answer`, `showing_results`, `all_incorrect`, `all_revived` |
| `currentQuestion` | Question \| null | Yes | Yes | `null` | Currently active question object. Null when no question is active. |
| `isGongActive` | boolean | Yes | No | `false` | Whether the gong sound effect is currently active. |
| `participantCount` | number | No | No | `0` | Number of active participants (for display purposes). |
| `timeRemaining` | number \| null | No | Yes | `null` | Seconds remaining in current phase. Null when timer is not active. |
| `lastUpdate` | Timestamp | Yes | No | `FieldValue.serverTimestamp()` | Firestore server timestamp of last state change. |
| `results` | GameResults \| null | No | Yes | `null` | Denormalized results for current question (calculated during showing_results phase). Null when no results available. |
| `prizeCarryover` | number | No | No | `0` | Accumulated prize money from questions where all guests answered incorrectly. |
| `settings` | GameSettings \| null | No | Yes | `null` | Game configuration settings. Null uses default values. |

### Type Definitions

#### GamePhase
```typescript
type GamePhase =
  | 'ready_for_next'      // Initial state, ready to start next question
  | 'accepting_answers'    // Accepting participant answers
  | 'showing_distribution' // Displaying answer distribution
  | 'showing_correct_answer' // Revealing correct answer
  | 'showing_results'      // Showing rankings/results
  | 'all_incorrect'        // Special state: all participants answered incorrectly
  | 'all_revived';         // Special state: all participants revived
```

#### Question
```typescript
interface Question {
  id: string;
  text: string;
  choices: string[];
  correctAnswer: number; // Index of correct choice
  period: GamePeriod;
  // Additional fields defined in @allstars/types
}
```

#### GameResults
```typescript
interface GameResults {
  top10: RankedAnswer[];        // Top 10 fastest correct answers
  worst10: RankedAnswer[];      // Worst 10 slowest correct answers
  periodChampions?: string[];   // Period champion participant IDs
  period?: GamePeriod;          // Period identifier
  rankingError?: boolean;       // True if ranking calculation failed
}
```

#### Timestamp
```typescript
type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
};
```

### Validation Rules

1. **currentPhase**: Must be one of the 7 valid GamePhase values
2. **participantCount**: Must be >= 0
3. **prizeCarryover**: Must be >= 0
4. **lastUpdate**: Must be a Firestore server timestamp (not client-generated)

### Field Dependencies

- `results` is only populated when `currentPhase` is `"showing_results"`
- `currentQuestion` is null when `currentPhase` is `"ready_for_next"`
- `timeRemaining` is only set during timed phases (`"accepting_answers"`)
- `isGongActive` is typically true during period-final questions

### Idempotency Behavior

The initialization script checks for document existence before creation:

1. **Document exists**: Skip creation, log success message, exit 0
2. **Document does not exist**: Create with initial values, log success message, exit 0

This ensures the script can be run multiple times safely without overwriting existing game state.

## State Transitions

While not directly relevant to initialization, understanding state transitions helps validate the initial state choice:

```
[Initial State: ready_for_next]
       ↓
[accepting_answers] ← Question starts
       ↓
[showing_distribution] ← Time expires or all answered
       ↓
[showing_correct_answer] ← Display correct choice
       ↓
[showing_results] ← Calculate rankings
       ↓
[ready_for_next] ← Return to initial state for next question

Special transitions:
- [showing_correct_answer] → [all_incorrect] → [ready_for_next] (if all wrong)
- [showing_results] → [all_revived] → [ready_for_next] (if revival occurs)
```

**Initial State Justification**: `"ready_for_next"` is the correct starting point because:
- No question is active yet (currentQuestion is null)
- System is waiting for host to start first question
- All other phases require an active question or previous game context

## Integration Points

### Applications Reading GameState

All applications read this document via real-time listeners:

- **projector-app**: Displays current phase UI (e.g., "Get ready for the next question...")
- **host-app**: Shows current phase and controls transitions
- **participant-app**: Enables/disables answer submission based on phase
- **socket-server**: Broadcasts phase changes to all connected clients

### Document Creation Ownership

| Operation | Owner | Frequency |
|-----------|-------|-----------|
| Initial creation | **initialization script** | Once per environment setup |
| Phase transitions | host-app (via API server) | Multiple times per game |
| Results updates | API server | Once per question |
| Participant count | socket-server | Real-time during gameplay |

## Error Scenarios

### Document Missing
- **Symptom**: Applications show "GameState document does not exist" errors
- **Cause**: Initialization script not run after emulator restart
- **Resolution**: Run `pnpm run init:dev`

### Invalid Phase Value
- **Symptom**: Applications show "Unknown Phase: undefined" or "Unrecognized game phase"
- **Cause**: Document created with invalid currentPhase value
- **Resolution**: Delete document, run `pnpm run init:dev` to recreate with valid phase

### Document Corrupted
- **Symptom**: Applications crash or show unexpected behavior
- **Cause**: Manual document edits or partial writes
- **Resolution**: Delete document, run `pnpm run init:dev` to recreate clean state

## Testing Considerations

### Test Data Requirements

Tests for the initialization script should verify:

1. **Document structure**: All 9 required fields present
2. **Field types**: Correct TypeScript types (string, number, boolean, null, Timestamp)
3. **Initial values**: Match specification (currentPhase: "ready_for_next", participantCount: 0, etc.)
4. **Timestamp**: lastUpdate is a Firestore server timestamp, not client timestamp
5. **Idempotency**: Running twice produces identical document (same timestamp on second run indicates no overwrite)

### Mock Data

For unit tests, mock gameState document:

```typescript
const mockGameState: GameState = {
  currentPhase: 'ready_for_next',
  currentQuestion: null,
  isGongActive: false,
  participantCount: 0,
  timeRemaining: null,
  lastUpdate: { seconds: 1699200000, nanoseconds: 0 } as Timestamp,
  results: null,
  prizeCarryover: 0,
  settings: null,
};
```

## References

- **Type Definition Source**: `/home/tisayama/allstars/packages/types/src/GameState.ts`
- **Related Entities**: Question (packages/types/src/Question.ts), GameSettings (packages/types/src/GameSettings.ts)
- **Consuming Applications**: projector-app, host-app, participant-app, socket-server
