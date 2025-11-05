# Data Model: Projector App

**Feature**: 001-projector-app
**Date**: 2025-11-04
**Purpose**: Document all data structures consumed and managed by the projector-app broadcast client

---

## Shared Types (from `/packages/types/`)

These types are consumed from the monorepo's shared types package and represent the canonical data contracts between all apps.

### GameState

**Source**: `/packages/types/src/GameState.ts`
**Purpose**: Primary state document broadcasted to all clients via Firestore `gameState/live`

```typescript
interface GameState {
  id: string;                    // Always "live"
  currentPhase: GamePhase;       // Current game phase enum
  currentQuestion: Question | null;  // Active question or null
  isGongActive: boolean;         // Whether gong sound is available
  results: GameResults | null;   // Ranking data after question
  prizeCarryover: number;        // Accumulated prize from all-incorrect rounds
  lastUpdate: Timestamp;         // Firestore server timestamp
}

type GamePhase =
  | "ready_for_next"
  | "accepting_answers"
  | "showing_distribution"
  | "showing_correct_answer"
  | "showing_results"
  | "all_revived"
  | "all_incorrect";
```

**Validation Rules**:
- `id` MUST always be "live" (singleton document pattern)
- `currentPhase` MUST be one of the 7 valid GamePhase values
- `currentQuestion` MUST be present when `currentPhase` is "accepting_answers", "showing_distribution", "showing_correct_answer"
- `results` MUST be present when `currentPhase` is "showing_results"
- `prizeCarryover` MUST be >= 0

**State Transitions**:
```
ready_for_next → accepting_answers (when question starts)
accepting_answers → showing_distribution (when time expires)
showing_distribution → showing_correct_answer (host action)
showing_correct_answer → showing_results | all_incorrect (based on answer correctness)
showing_results → ready_for_next | all_revived (host action)
all_incorrect → ready_for_next (host action)
all_revived → ready_for_next (host action)
```

---

### Question

**Source**: `/packages/types/src/Question.ts`
**Purpose**: Represents a quiz question with metadata

```typescript
interface Question {
  questionId: string;            // Unique question identifier
  questionText: string;          // Question prompt text
  choices: string[];             // Array of answer choices
  correctAnswer: string;         // The correct answer (must be in choices)
  period: GamePeriod;            // Which game period this belongs to
  questionNumber: number;        // Question order within period (1-10)
  deadline: Timestamp;           // When answers close (Firestore timestamp)
  type: "multiple_choice";       // Always multiple choice for this version
  skipAttributes: string[];      // Guest attributes to skip (e.g., ["celebrity"])
}

type GamePeriod = "first" | "second" | "third";
```

**Validation Rules**:
- `choices` MUST have at least 2 elements
- `correctAnswer` MUST be present in `choices` array
- `questionNumber` MUST be between 1-10
- `deadline` MUST be a future timestamp when question is active
- `type` MUST be "multiple_choice"

---

### GameResults

**Source**: `/packages/types/src/GameResults.ts`
**Purpose**: Ranking data displayed after a question

```typescript
interface GameResults {
  top10: RankingEntry[];         // Top 10 correct answers (fastest)
  worst10: RankingEntry[];       // Worst 10 (slowest correct or incorrect)
  periodChampions?: string[];    // GuestIds of period winners (optional)
  period?: GamePeriod;           // Period identifier (optional)
  rankingError?: boolean;        // Flag if ranking calculation failed
}

interface RankingEntry {
  guestId: string;               // Unique guest identifier
  guestName: string;             // Display name
  responseTimeMs: number;        // Response time in milliseconds
}
```

**Validation Rules**:
- `top10` MUST be sorted by `responseTimeMs` ascending (fastest first)
- `worst10` MUST be sorted by `responseTimeMs` descending (slowest first)
- `top10` and `worst10` MAY be empty arrays (e.g., if all answered incorrectly)
- `periodChampions` MUST be present when `isGongActive` was true for the question
- `rankingError` flag indicates partial/failed ranking calculation (display gracefully)

---

### Answer

**Source**: `/packages/types/src/Answer.ts`
**Purpose**: Submitted answer from a guest (used for real-time count listener)

```typescript
interface Answer {
  answerId: string;              // Unique answer identifier
  guestId: string;               // Guest who submitted
  questionId: string;            // Question this answers
  selectedAnswer: string;        // The choice selected
  responseTimeMs: number;        // Time taken to answer (ms)
  isCorrect: boolean;            // Whether answer matches correctAnswer
  submittedAt: Timestamp;        // Submission timestamp
}
```

**Validation Rules**:
- `selectedAnswer` SHOULD match one of the question's choices
- `responseTimeMs` MUST be >= 0
- `submittedAt` MUST be <= question's deadline

**Usage Pattern**:
- Projector app listens to `questions/{questionId}/answers` collection
- Counts total documents (not individual fields)
- Listener is attached only during "accepting_answers" phase

---

## Local Application State

These types are defined within projector-app and not shared across the monorepo.

### ConnectionStatus

**File**: `apps/projector-app/src/types/index.ts`
**Purpose**: Track health of real-time connections

```typescript
interface ConnectionStatus {
  firestore: boolean;            // Firestore listener connected
  websocket: boolean;            // Socket.io connection established
}
```

**Usage**:
- Updated by `useGameState` and `useWebSocket` hooks
- Displayed in `<ConnectionStatus />` component
- Triggers warning UI when either connection is false

---

### AudioAsset

**File**: `apps/projector-app/src/types/index.ts`
**Purpose**: Track audio file loading state

```typescript
interface AudioAsset {
  id: string;                    // Unique asset identifier (e.g., "bgm-question")
  url: string;                   // Firebase Storage public URL
  type: 'bgm' | 'sfx';          // Background music or sound effect
  buffer: AudioBuffer | null;    // Decoded audio data (null if not loaded)
  loaded: boolean;               // Loading complete flag
}
```

**Usage**:
- Managed by `audioManager.ts`
- Pre-loaded on app initialization
- `buffer` is decoded using Web Audio API's `decodeAudioData()`

---

### PhaseConfig

**File**: `apps/projector-app/src/types/index.ts`
**Purpose**: Map game phases to their audio requirements

```typescript
interface PhaseConfig {
  phase: GamePhase;              // The game phase
  bgm: string[];                 // Background music asset IDs
  sfx: string[];                 // Sound effect asset IDs to trigger
}
```

**Example Configuration**:
```typescript
const phaseConfigs: PhaseConfig[] = [
  {
    phase: "ready_for_next",
    bgm: ["bgm-idle"],
    sfx: []
  },
  {
    phase: "accepting_answers",
    bgm: ["bgm-question"],
    sfx: ["sfx-question-start"]
  },
  {
    phase: "showing_correct_answer",
    bgm: ["bgm-reveal"],
    sfx: ["sfx-reveal"]
  },
  {
    phase: "showing_results",
    bgm: ["bgm-results"],
    sfx: ["sfx-ranking-reveal"]
  }
];
```

---

### WebSocketEvent

**File**: `apps/projector-app/src/types/index.ts`
**Purpose**: Type-safe WebSocket event payloads

```typescript
interface ServerToClientEvents {
  TRIGGER_GONG: (data: TriggerGongPayload) => void;
  SYNC_TIMER: (data: SyncTimerPayload) => void;
}

interface TriggerGongPayload {
  timestamp: string;             // ISO 8601 timestamp of event
}

interface SyncTimerPayload {
  deadline: string;              // ISO 8601 deadline timestamp
  serverTime: string;            // ISO 8601 current server time
}
```

**Usage**:
- Typed events for Socket.io client
- `TRIGGER_GONG`: Plays gong sound effect immediately
- `SYNC_TIMER`: Synchronizes countdown timer with server clock

---

## Firestore Collections

### `gameState/live` (Document)

**Path**: `gameState/live`
**Type**: Singleton document
**Access**: Read-only (via `onSnapshot` listener)

**Purpose**: Primary source of truth for current game state

**Listener Pattern**:
```typescript
const unsubscribe = onSnapshot(
  doc(firestore, 'gameState', 'live'),
  (snapshot) => {
    if (snapshot.exists()) {
      const gameState = snapshot.data() as GameState;
      // Update React state
    }
  }
);
```

---

### `questions/{questionId}/answers` (Collection)

**Path**: `questions/{questionId}/answers`
**Type**: Subcollection
**Access**: Read-only (via `onSnapshot` listener on collection)

**Purpose**: Real-time answer count during "accepting_answers" phase

**Listener Pattern**:
```typescript
const unsubscribe = onSnapshot(
  collection(firestore, 'questions', questionId, 'answers'),
  (snapshot) => {
    const count = snapshot.size;  // Total document count
    // Update React state with count
  }
);
```

**Lifecycle**:
- Attached when `currentPhase` changes to "accepting_answers"
- Detached when phase transitions away
- Cleanup via `unsubscribe()` in `useEffect` return

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Projector App (Read-Only)                │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │                   │
          ┌─────────▼─────────┐  ┌──────▼──────┐
          │  Firestore        │  │  Socket.io  │
          │  gameState/live   │  │  Events     │
          │  (onSnapshot)     │  │  (GONG)     │
          └─────────┬─────────┘  └──────┬──────┘
                    │                   │
                    │                   │
          ┌─────────▼─────────┐         │
          │  Firestore        │         │
          │  questions/{id}/  │         │
          │  answers (count)  │         │
          └───────────────────┘         │
                                        │
                              ┌─────────▼─────────┐
                              │  Firebase Storage │
                              │  (Audio Assets)   │
                              └───────────────────┘
```

**Data Sources Priority**:
1. **Primary**: Firestore `gameState/live` (drives phase transitions)
2. **Secondary**: Dynamic Firestore listeners (answer counts)
3. **Tertiary**: WebSocket events (time-sensitive triggers)
4. **Static**: Firebase Storage (audio assets, loaded once)

---

## Memory Management

### Listener Cleanup Checklist

✅ **useGameState hook**:
- Returns `unsubscribe()` function in `useEffect` cleanup
- Single persistent listener (no dynamic attach/detach)

✅ **useAnswerCount hook**:
- Attaches listener when `questionId` changes
- Detaches previous listener before attaching new one
- Cleans up on unmount

✅ **useWebSocket hook**:
- Disconnects socket on unmount
- Removes all event handlers before disconnect

✅ **useAudioEngine hook**:
- Stops all audio sources on unmount
- Closes AudioContext if needed
- Releases audio buffers

---

## Type Safety Guarantees

### Import Pattern

```typescript
// apps/projector-app/src/types/index.ts
export type {
  GameState,
  Question,
  GameResults,
  Answer,
  GamePhase,
  GamePeriod,
} from '@allstars/types';

// Local-only types
export interface ConnectionStatus { /* ... */ }
export interface AudioAsset { /* ... */ }
export interface PhaseConfig { /* ... */ }
```

### Validation Strategy

- **Runtime validation**: Use Zod or similar for Firestore data
- **Type guards**: Check for required fields before state updates
- **Error boundaries**: Catch malformed data and display error screen
- **Logging**: Console.error all validation failures with context

---

## Performance Considerations

### Firestore Queries

- **Single document listener**: `gameState/live` (minimal overhead)
- **Collection count listener**: `questions/{id}/answers` (uses snapshot.size, not individual doc reads)
- **No pagination needed**: All data fits in single documents

### Memory Footprint

- GameState: ~1-2 KB per update
- Question: ~0.5-1 KB
- GameResults: ~2-5 KB (with 20 ranking entries)
- Audio buffers: ~500 KB - 2 MB per asset (10-15 assets = 10-20 MB total)

### Optimization Strategies

- Pre-load all audio assets during initialization (avoid mid-game fetches)
- Use `React.memo` for phase components that don't change frequently
- Debounce answer count updates if > 100 answers/second (unlikely but defensive)

---

**End of Data Model Document**
