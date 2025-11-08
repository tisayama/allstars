# Data Model: TV-Style Rankings Display

**Feature**: TV-Style Rankings Display for Projector App
**Date**: 2025-11-07
**Branch**: `001-tv-style-rankings`

This document defines the data structures, transformations, and state management for the TV-style ranking display feature.

---

## Input Data (Existing Types)

### GameResults (from @allstars/types)

```typescript
export interface RankedAnswer {
  guestId: string;        // Participant identifier
  guestName: string;      // Pre-formatted "Name(Nickname)" display string
  responseTimeMs: number; // Response time in milliseconds
}

export interface GameResults {
  top10: RankedAnswer[];        // Fastest correct (ascending order)
  worst10: RankedAnswer[];      // Slowest incorrect (descending order)
  periodChampions?: string[];   // Champion guest IDs (optional)
  period?: GamePeriod;          // 'first-half' | 'second-half' (optional)
  rankingError?: boolean;       // True if calculation failed
}
```

**Source**: `gameState.results` from Socket.io event
**Validation**: Use `isValidGameResults()` type guard before processing

---

## UI Data Structures (New Types)

### RankingEntry

Transformed data for individual ranking display.

```typescript
export interface RankingEntry {
  /** Rank position (1-10) */
  rank: number;

  /** Participant identifier */
  guestId: string;

  /** Pre-formatted display name (e.g., "土屋桂子(ウィッツ)") */
  displayName: string;

  /** Response time in seconds with 2 decimal precision */
  responseTime: number;

  /** True if this entry should be highlighted (special position) */
  isHighlighted: boolean;

  /** Highlight color: 'red' (worst), 'gold' (best), undefined (normal) */
  highlightColor?: 'red' | 'gold';

  /** True if this participant is a period champion */
  isPeriodChampion: boolean;
}
```

**Validation Rules**:
- `rank`: Must be integer 1-10
- `responseTime`: Must be non-negative, formatted to 2 decimals
- `displayName`: Must be non-empty string, max length 50 chars (truncate with "…")
- `highlightColor`: Only 'red' or 'gold' or undefined

**Transformation Logic**:
```typescript
function toRankingEntry(
  rankedAnswer: RankedAnswer,
  rank: number,
  isHighlighted: boolean,
  highlightColor: 'red' | 'gold' | undefined,
  periodChampions: string[] = []
): RankingEntry {
  return {
    rank,
    guestId: rankedAnswer.guestId,
    displayName: truncate(rankedAnswer.guestName, 50),
    responseTime: Number((rankedAnswer.responseTimeMs / 1000).toFixed(2)),
    isHighlighted,
    highlightColor,
    isPeriodChampion: periodChampions.includes(rankedAnswer.guestId),
  };
}
```

---

### RankingDisplayConfig

Configuration for rendering ranking lists.

```typescript
export interface RankingDisplayConfig {
  /** Ranking type title */
  title: string; // "早押しワースト10" | "早押しトップ10"

  /** Ranking entries (1-10) */
  entries: RankingEntry[];

  /** Period identifier for period-final questions */
  period?: 'first-half' | 'second-half';

  /** Whether to display period champion badges */
  showPeriodChampions: boolean;

  /** Period champion guest IDs (for badge display) */
  periodChampions: string[];

  /** Ranking type for styling */
  type: 'worst10' | 'top10';
}
```

**Transformation Logic**:
```typescript
function createWorst10Config(
  results: GameResults
): RankingDisplayConfig {
  const entries = results.worst10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      index === results.worst10.length - 1, // Highlight last (slowest)
      index === results.worst10.length - 1 ? 'red' : undefined,
      results.periodChampions || []
    )
  );

  return {
    title: '早押しワースト10',
    entries,
    period: results.period,
    showPeriodChampions: false, // Never show champions on worst10
    periodChampions: [],
    type: 'worst10',
  };
}

function createTop10Config(
  results: GameResults
): RankingDisplayConfig {
  const entries = results.top10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      index === 0, // Highlight first (fastest)
      index === 0 ? 'gold' : undefined,
      results.periodChampions || []
    )
  );

  return {
    title: '早押しトップ10',
    entries,
    period: results.period,
    showPeriodChampions: hasPeriodChampions(results),
    periodChampions: results.periodChampions || [],
    type: 'top10',
  };
}
```

---

### AnimationState

State for performance monitoring and animation control.

```typescript
export interface AnimationState {
  /** True if animations should be enabled (FPS >= 25) */
  animationsEnabled: boolean;

  /** Current measured FPS */
  currentFPS: number;

  /** True if stagger animation has already played for current question */
  hasPlayedStagger: boolean;

  /** Current question ID for tracking animation state */
  questionId: string | null;
}
```

**Initial State**:
```typescript
const initialAnimationState: AnimationState = {
  animationsEnabled: true,
  currentFPS: 60,
  hasPlayedStagger: false,
  questionId: null,
};
```

**State Transitions**:
1. **FPS drops below 25 for >2 seconds**: `animationsEnabled` → false
2. **FPS recovers above 35 for >2 seconds**: `animationsEnabled` → true
3. **Question ID changes**: `hasPlayedStagger` → false, `questionId` → new ID
4. **Stagger animation completes**: `hasPlayedStagger` → true

---

### ConnectionState

State for socket connection monitoring and indicator display.

```typescript
export interface ConnectionState {
  /** True if socket is currently connected */
  isConnected: boolean;

  /** True if disconnection indicator should be shown */
  showIndicator: boolean;

  /** Timestamp of last disconnect event (for debugging) */
  lastDisconnectTime: number | null;
}
```

**Initial State**:
```typescript
const initialConnectionState: ConnectionState = {
  isConnected: false, // Assume disconnected until first connect event
  showIndicator: false,
  lastDisconnectTime: null,
};
```

**State Transitions**:
1. **Socket disconnects**: `isConnected` → false, start 2s timer
2. **2 seconds elapsed while disconnected**: `showIndicator` → true, `lastDisconnectTime` → timestamp
3. **Socket reconnects**: `isConnected` → true, `showIndicator` → false immediately

---

## State Machines

### Animation Degradation State Machine

```
┌─────────────────────┐
│  High Performance   │
│  (FPS >= 30)        │
│  animations: ON     │
└──────────┬──────────┘
           │
           │ FPS < 25 for >2s
           ▼
┌─────────────────────┐
│  Degraded Mode      │
│  (FPS < 25)         │
│  animations: OFF    │
└──────────┬──────────┘
           │
           │ Session continues
           ▼
┌─────────────────────┐
│  Degraded Mode      │
│  (persistent)       │
│  animations: OFF    │
└──────────┬──────────┘
           │
           │ Page reload / new session
           ▼
┌─────────────────────┐
│  High Performance   │
│  (reset to default) │
│  animations: ON     │
└─────────────────────┘
```

**Design Decision**: Once animations degrade, they remain off for the current session to prevent flickering. Only page reload re-enables them.

---

### Stagger Animation State Machine

```
┌─────────────────────┐
│   Not Played        │
│   (new question)    │
│   hasPlayed: false  │
└──────────┬──────────┘
           │
           │ Initial display
           │ (component mounts)
           ▼
┌─────────────────────┐
│  Playing Stagger    │
│  (animating)        │
│  hasPlayed: false   │
└──────────┬──────────┘
           │
           │ Animation completes
           │ (~1-1.5 seconds)
           ▼
┌─────────────────────┐
│   Played            │
│   (completed)       │
│   hasPlayed: true   │
└──────────┬──────────┘
           │
           │ User navigates away
           │ and returns
           ▼
┌─────────────────────┐
│   Played            │
│   (no replay)       │
│   hasPlayed: true   │
└──────────┬──────────┘
           │
           │ Question ID changes
           ▼
┌─────────────────────┐
│   Not Played        │
│   (reset)           │
│   hasPlayed: false  │
└─────────────────────┘
```

**Design Decision**: Stagger plays once per question. Navigation back to same rankings shows static display (no replay).

---

### Connection State Machine

```
┌─────────────────────┐
│   Connected         │
│   indicator: hidden │
└──────────┬──────────┘
           │
           │ Disconnect event
           ▼
┌─────────────────────┐
│  Disconnected       │
│  (waiting)          │
│  indicator: hidden  │
│  timer: 2s started  │
└──────────┬──────────┘
           │
           ├─► Reconnect before 2s
           │   └─► Back to Connected
           │
           │ 2 seconds elapsed
           ▼
┌─────────────────────┐
│  Disconnected       │
│  (visible)          │
│  indicator: shown   │
└──────────┬──────────┘
           │
           │ Reconnect event
           ▼
┌─────────────────────┐
│   Connected         │
│   indicator: hidden │
│   (immediate)       │
└─────────────────────┘
```

**Design Decision**: 2-second delay prevents flicker during brief disconnections. Immediate hide on reconnect provides instant feedback.

---

## Data Transformation Utilities

### Helper Functions

```typescript
/**
 * Truncate display name to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Convert milliseconds to seconds with 2 decimal places
 */
export function msToSeconds(ms: number): number {
  return Number((ms / 1000).toFixed(2));
}

/**
 * Determine if ranking entry should be highlighted
 */
export function shouldHighlight(
  index: number,
  total: number,
  type: 'worst10' | 'top10'
): boolean {
  if (type === 'worst10') {
    return index === total - 1; // Last entry (slowest)
  } else {
    return index === 0; // First entry (fastest)
  }
}

/**
 * Get highlight color for ranking entry
 */
export function getHighlightColor(
  type: 'worst10' | 'top10',
  isHighlighted: boolean
): 'red' | 'gold' | undefined {
  if (!isHighlighted) return undefined;
  return type === 'worst10' ? 'red' : 'gold';
}
```

---

## Validation

### Input Validation

```typescript
/**
 * Validate GameResults before processing
 */
export function validateGameResults(results: unknown): results is GameResults {
  if (!isValidGameResults(results)) {
    console.error('Invalid GameResults structure');
    return false;
  }

  // Check for ranking error flag
  if (hasRankingError(results)) {
    console.error('Ranking calculation error detected');
    return false;
  }

  return true;
}
```

### Output Validation

```typescript
/**
 * Validate RankingEntry before rendering
 */
export function validateRankingEntry(entry: RankingEntry): boolean {
  if (entry.rank < 1 || entry.rank > 10) {
    console.error(`Invalid rank: ${entry.rank}`);
    return false;
  }

  if (!entry.displayName || entry.displayName.length === 0) {
    console.error('Empty display name');
    return false;
  }

  if (entry.responseTime < 0) {
    console.error(`Negative response time: ${entry.responseTime}`);
    return false;
  }

  return true;
}
```

---

## Component Data Flow

```
Socket.io Event (gameState)
        │
        ▼
ShowingResultsPhase Component
        │
        ├─► Extract: gameState.results (GameResults)
        ├─► Validate: validateGameResults()
        │
        ▼
TVRankingDisplay Component
        │
        ├─► Transform: createWorst10Config() / createTop10Config()
        ├─► Monitor: useFPSMonitor() → AnimationState
        ├─► Monitor: useConnectionStatus() → ConnectionState
        │
        ▼
RankingList Components (worst10 / top10)
        │
        ├─► Track: useRankingAnimation() → stagger state
        ├─► Render: RankingEntry[] with animations
        │
        ▼
RankingEntry Components
        │
        └─► Display: rank, name, time, highlighting
```

---

## Summary

This data model transforms existing `GameResults` from the game state into UI-optimized structures (`RankingEntry`, `RankingDisplayConfig`) while managing performance (`AnimationState`) and connection resilience (`ConnectionState`). All transformations are pure functions with explicit validation, enabling testable and maintainable code.

**Key Design Principles**:
1. **Immutable transformations**: Pure functions, no mutation of input data
2. **Explicit validation**: Type guards and validation functions at boundaries
3. **State machines**: Clear state transitions with documented triggers
4. **Type safety**: TypeScript interfaces for all data structures
5. **Performance-aware**: Optimized structures for rendering (no sorting/filtering in components)
