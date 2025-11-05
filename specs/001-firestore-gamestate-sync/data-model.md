# Data Model: Fix Firestore Game State Synchronization

**Feature**: Fix Firestore Game State Synchronization
**Branch**: `001-firestore-gamestate-sync`
**Date**: 2025-11-05

## Overview

This document defines the data model for the Firestore `gameState/live` document structure, validation schemas, and logging formats to ensure reliable game state synchronization.

## Firestore Document Structure

### gameState/live Document

**Collection**: `gameState`
**Document ID**: `live` (singleton)
**Purpose**: Real-time game state for quiz events

**Schema**:

```typescript
{
  // REQUIRED FIELDS (must always be present)
  currentPhase: 'ready_for_next'
              | 'accepting_answers'
              | 'showing_distribution'
              | 'showing_correct_answer'
              | 'showing_results'
              | 'all_incorrect'
              | 'all_revived',

  currentQuestion: Question | null,  // Full question object or null

  isGongActive: boolean,  // true for period-final questions

  lastUpdate: Timestamp,  // Firestore server timestamp

  // OPTIONAL FIELDS (may be absent or null)
  id?: 'live',  // Document ID (redundant but kept for compatibility)

  participantCount?: number,  // Number of active guests

  timeRemaining?: number | null,  // Seconds remaining in phase

  results?: {
    top10: Array<{
      guestId: string,
      guestName: string,
      responseTimeMs: number
    }>,
    worst10: Array<{
      guestId: string,
      guestName: string,
      responseTimeMs: number
    }>,
    periodChampions?: string[],  // Guest IDs of period champions (ties supported)
    period?: 'FIRST' | 'SECOND' | 'THIRD',  // Period identifier
    rankingError?: boolean  // true if ranking calculation failed
  } | null,

  prizeCarryover?: number,  // Accumulated prize from all-incorrect questions

  settings?: {
    defaultDropoutRule: 'worst_one' | 'worst_three',
    defaultRankingRule: 'time' | 'score'
  }
}
```

**Field Constraints**:

| Field | Type | Required | Nullable | Default | Notes |
|-------|------|----------|----------|---------|-------|
| `currentPhase` | GamePhase enum | ✅ Yes | ❌ No | 'ready_for_next' | Must be one of 7 valid phases |
| `currentQuestion` | Question \| null | ✅ Yes | ✅ Yes | null | Full Question object when active |
| `isGongActive` | boolean | ✅ Yes | ❌ No | false | Indicates period-final question |
| `lastUpdate` | Timestamp | ✅ Yes | ❌ No | FieldValue.serverTimestamp() | Firestore server timestamp |
| `id` | string | ❌ No | ❌ No | 'live' | Document ID (optional for compatibility) |
| `participantCount` | number | ❌ No | ❌ No | undefined | Count of active guests |
| `timeRemaining` | number \| null | ❌ No | ✅ Yes | null | Countdown timer value |
| `results` | GameResults \| null | ❌ No | ✅ Yes | null | Calculated rankings |
| `prizeCarryover` | number | ❌ No | ❌ No | 0 | Accumulated prize money |
| `settings` | GameSettings | ❌ No | ❌ No | undefined | Game configuration |

**Write Strategy**:
- Use `transaction.set(ref, data, {merge: true})` to preserve optional fields
- Always include all 4 required fields in every write operation
- Use `FieldValue.serverTimestamp()` for `lastUpdate` field
- Validate data structure before writing to Firestore

## Validation Schemas

### 1. GameState Validation Schema

**Location**: `packages/types/src/validators/gameState.ts`

```typescript
import { z } from 'zod';

// GamePhase enum validation
export const GamePhaseSchema = z.enum([
  'ready_for_next',
  'accepting_answers',
  'showing_distribution',
  'showing_correct_answer',
  'showing_results',
  'all_incorrect',
  'all_revived',
]);

// Timestamp schema (Firestore Timestamp structure)
export const TimestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

// RankedAnswer schema (for top10/worst10)
export const RankedAnswerSchema = z.object({
  guestId: z.string().min(1),
  guestName: z.string().min(1),
  responseTimeMs: z.number().int().nonnegative(),
});

// GameResults schema
export const GameResultsSchema = z.object({
  top10: z.array(RankedAnswerSchema),
  worst10: z.array(RankedAnswerSchema),
  periodChampions: z.array(z.string()).optional(),
  period: z.enum(['FIRST', 'SECOND', 'THIRD']).optional(),
  rankingError: z.boolean().optional(),
});

// GameSettings schema (reuse existing if available)
export const GameSettingsSchema = z.object({
  defaultDropoutRule: z.enum(['worst_one', 'worst_three']),
  defaultRankingRule: z.enum(['time', 'score']),
});

// Question schema (import from existing validators/question.ts)
// Import: QuestionSchema from './question'

// Full GameState validation schema
export const GameStateSchema = z.object({
  // Required fields
  currentPhase: GamePhaseSchema,
  currentQuestion: z.lazy(() => QuestionSchema).nullable(),  // Lazy for circular deps
  isGongActive: z.boolean(),
  lastUpdate: TimestampSchema,

  // Optional fields
  id: z.string().optional(),
  participantCount: z.number().int().nonnegative().optional(),
  timeRemaining: z.number().int().nullable().optional(),
  results: GameResultsSchema.nullable().optional(),
  prizeCarryover: z.number().nonnegative().optional(),
  settings: GameSettingsSchema.optional(),
});

// Type inference from schema
export type ValidatedGameState = z.infer<typeof GameStateSchema>;

// Validation helper function
export function validateGameState(data: unknown): ValidatedGameState {
  return GameStateSchema.parse(data);
}

// Safe validation (returns error instead of throwing)
export function validateGameStateSafe(data: unknown):
  | { success: true; data: ValidatedGameState }
  | { success: false; error: z.ZodError } {
  const result = GameStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

**Usage in API Server**:

```typescript
// In apps/api-server/src/services/gameStateService.ts

import { validateGameState, validateGameStateSafe } from '@allstars/types';
import { logStructured } from '../utils/logger';

export async function advanceGame(action: GameActionInput): Promise<GameState> {
  const result = await db.runTransaction(async (transaction) => {
    // ... existing transaction code ...

    // Process action
    const newState = await processAction(currentState, action, transaction);

    // VALIDATION BEFORE WRITE
    const validation = validateGameStateSafe(newState);
    if (!validation.success) {
      logStructured('error', 'GameState validation failed', {
        component: 'gameStateService.advanceGame',
        action: action.action,
        validationErrors: validation.error.flatten(),
        attemptedState: newState,
      });
      throw new ValidationError('Invalid game state structure',
        validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    // Update with validated state using merge
    transaction.set(gameStateRef, {
      currentPhase: newState.currentPhase,
      currentQuestion: newState.currentQuestion,
      isGongActive: newState.isGongActive,
      lastUpdate: FieldValue.serverTimestamp(),
      results: newState.results,
      prizeCarryover: newState.prizeCarryover,
      ...(newState.settings && { settings: newState.settings }),
      ...(newState.participantCount !== undefined && { participantCount: newState.participantCount }),
    }, { merge: true });  // CRITICAL: Use merge to preserve existing fields

    return validation.data;
  });

  return result;
}
```

**Usage in Projector App**:

```typescript
// In apps/projector-app/src/hooks/useGameState.ts

import { validateGameStateSafe, GameState } from '@allstars/types';

unsubscribe = onSnapshot(
  gameStateRef,
  (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();

      // VALIDATION ON READ
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
    } else {
      setError('Game has not started yet. Waiting for host...');
      setConnectionStatus((prev) => ({ ...prev, firestore: false }));
    }
  },
  (err) => {
    setError('Connection lost. Reconnecting...');
    setConnectionStatus((prev) => ({ ...prev, firestore: false }));
    console.error('Firestore listener error:', err);
  }
);
```

## Logging Data Model

### Structured JSON Log Format

**Location**: `apps/api-server/src/utils/logger.ts`

**Schema**:

```typescript
interface StructuredLog {
  timestamp: string;        // ISO 8601 timestamp
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;        // Source component (e.g., 'gameStateService.advanceGame')
  message: string;          // Human-readable message
  context?: Record<string, unknown>;  // Additional context data
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

**Example Logs**:

```json
{
  "timestamp": "2025-11-05T15:30:45.123Z",
  "level": "error",
  "component": "gameStateService.advanceGame",
  "message": "GameState validation failed before Firestore write",
  "context": {
    "action": "START_QUESTION",
    "attemptedPhase": "accepting_answers",
    "validationErrors": {
      "fieldErrors": {
        "currentQuestion": ["Required field is null"]
      }
    }
  }
}
```

```json
{
  "timestamp": "2025-11-05T15:30:46.789Z",
  "level": "error",
  "component": "gameStateService.advanceGame",
  "message": "Firestore transaction failed",
  "context": {
    "action": "SHOW_RESULTS",
    "attemptNumber": 1,
    "retryable": true
  },
  "error": {
    "message": "UNAVAILABLE: The service is currently unavailable",
    "code": "UNAVAILABLE",
    "stack": "Error: UNAVAILABLE\n    at ..."
  }
}
```

**Logger Implementation**:

```typescript
// apps/api-server/src/utils/logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export function logStructured(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    component: context?.component || 'unknown',
    message,
    ...(context && { context }),
  };

  // Firebase Functions routes both stdout and stderr to Cloud Logging
  // Use console.log for all levels - Cloud Logging handles severity
  console.log(JSON.stringify(logEntry));
}

export function logError(
  component: string,
  message: string,
  error: Error | unknown,
  context?: LogContext
): void {
  const errorDetails = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : {
    message: String(error),
  };

  logStructured('error', message, {
    component,
    ...context,
    error: errorDetails,
  });
}
```

## Data Flow Diagram

```
┌─────────────┐
│  Host App   │
└──────┬──────┘
       │ HTTP POST /game/action
       │ {action: "START_QUESTION"}
       ▼
┌─────────────────────────────────┐
│  API Server                     │
│  (/apps/api-server)             │
│                                 │
│  advanceGame(action)            │
│    ├─ Read current state        │
│    ├─ Process action            │
│    ├─ Validate new state ✅     │
│    ├─ transaction.set(          │
│    │    {...fields},            │
│    │    {merge: true}  ✅       │
│    │  )                         │
│    └─ Log success/failure ✅    │
└──────┬──────────────────────────┘
       │ Firestore Write
       │ gameState/live
       ▼
┌─────────────────────────────────┐
│  Firestore                      │
│  gameState/live document        │
│  {                              │
│    currentPhase: "accepting...", │
│    currentQuestion: {...},      │
│    isGongActive: false,         │
│    lastUpdate: Timestamp,       │
│    results: null,               │
│    prizeCarryover: 0            │
│  }                              │
└──────┬──────────────────────────┘
       │ onSnapshot listener
       │ Real-time update
       ▼
┌─────────────────────────────────┐
│  Projector App                  │
│  (/apps/projector-app)          │
│                                 │
│  useGameState()                 │
│    ├─ Receive snapshot          │
│    ├─ Validate data ✅          │
│    ├─ Set gameState             │
│    └─ Update UI                 │
│                                 │
│  Display: Current Question      │
└─────────────────────────────────┘
```

## Migration Strategy

**No database migration required** - this is a fix to existing write logic:

1. **Backward Compatible**: New write format with `{merge: true}` preserves existing fields
2. **Forward Compatible**: Validation schemas use optional fields for graceful degradation
3. **Deployment**: Can be deployed without data migration
4. **Rollback**: Remove validation and revert to direct writes (data intact)

**Testing Strategy**:
1. Unit tests with Firestore emulator
2. Integration tests with full game flow
3. Manual testing with projector-app connected to emulator
4. Verify no "Unknown Phase" errors after state transitions

## References

- **Firestore Data Types**: https://firebase.google.com/docs/firestore/manage-data/data-types
- **Firestore Merge Writes**: https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document
- **Zod Schema Validation**: https://zod.dev/
- **Existing GameState Type**: `/packages/types/src/GameState.ts`
