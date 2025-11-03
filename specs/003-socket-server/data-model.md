# Data Model: Socket Server

**Feature**: 003-socket-server | **Date**: 2025-11-03
**Purpose**: Define data structures, entities, and their relationships for the real-time synchronization server

## Overview

The socket-server is a **read-only observer** of Firestore data and a **broadcaster** of ephemeral Socket.io events. It does not persist any data beyond in-memory connection state. This document defines:
1. **Input Data** (Firestore documents read by the server)
2. **Output Events** (Socket.io events broadcast to clients)
3. **Internal State** (transient server state, not persisted)

---

## Input Data Models (Firestore - Read Only)

### GameState Document

**Location**: `firestore://gameState/live`

**Purpose**: Single source of truth for current game state. The socket-server watches this document and broadcasts changes as Socket.io events.

**Schema**:
```typescript
interface GameState {
  // Core state fields
  currentPhase: GamePhase;
  currentQuestionId?: string;        // Present when currentPhase = "accepting_answers"
  isGongActive: boolean;             // True when final question activated

  // Timestamps (included in events for client synchronization)
  serverTimestamp?: number;          // Millisecond epoch timestamp

  // Additional fields (observed but not broadcast by socket-server)
  results?: PlayerResult[];          // Used by clients, not socket-server
  eliminatedPlayers?: string[];      // Used by clients, not socket-server
}

type GamePhase =
  | 'waiting'                // Pre-game state
  | 'accepting_answers'      // Question active, accepting submissions
  | 'showing_distribution'   // Display answer distribution graph
  | 'showing_correct_answer' // Reveal correct answer
  | 'showing_results'        // Display player rankings
  | 'all_revived'            // All eliminated players revived
  | 'game_over';             // Final state

interface PlayerResult {
  userId: string;
  rank: number;
  score: number;
  isEliminated: boolean;
}
```

**Validation Rules** (FR-011c):
- `currentPhase` MUST be one of the defined GamePhase values
- If `currentPhase = 'accepting_answers'`, `currentQuestionId` MUST be present
- `isGongActive` MUST be boolean
- Document MUST NOT be null or undefined (send IDLE_STATE if missing)

**State Transitions** (observed by server, not enforced):
```
waiting → accepting_answers → showing_distribution → showing_correct_answer → showing_results → accepting_answers (next question)
                                                                                            → game_over

Any phase → all_revived → previous phase (resurrection event)
```

---

## Output Data Models (Socket.io Events)

### Event: START_QUESTION

**Trigger**: `currentPhase` changes to `"accepting_answers"` (FR-004)

**Purpose**: Notify all clients that a new question has started. Includes server timestamp for client-side countdown synchronization.

**Payload**:
```typescript
interface StartQuestionPayload {
  questionId: string;           // Identifier for the question (e.g., "q006")
  serverStartTime: number;      // Millisecond epoch timestamp when broadcast sent
}
```

**Example**:
```json
{
  "questionId": "q006",
  "serverStartTime": 1678886400123
}
```

**Client Responsibilities**:
- Calculate local clock offset: `clientOffset = Date.now() - serverStartTime`
- Fetch question details from Firestore using `questionId`
- Start countdown timer adjusted for network latency

---

### Event: GONG_ACTIVATED

**Trigger**: `isGongActive` changes from `false` to `true` (FR-005)

**Purpose**: Signal that the current question is the final question of the period. Clients should play dramatic sound effect and display visual indicator.

**Payload**:
```typescript
interface GongActivatedPayload {}  // Empty object (no data needed)
```

**Example**:
```json
{}
```

**Client Responsibilities**:
- Play GONG sound effect (projector-app only)
- Display "FINAL QUESTION" badge (all clients)
- Disable GONG sound on mobile devices (respect mobile sound policies)

---

### Event: GAME_PHASE_CHANGED

**Trigger**: `currentPhase` changes to any value OTHER than `"accepting_answers"` (FR-006)

**Purpose**: Generic phase transition event. Clients react based on `newPhase` value (e.g., show distribution graph, reveal answer, display rankings).

**Payload**:
```typescript
interface GamePhaseChangedPayload {
  newPhase: GamePhase;  // The phase the game has transitioned to
}
```

**Example**:
```json
{
  "newPhase": "showing_distribution"
}
```

**Client Responsibilities**:
- **showing_distribution**: Query Firestore `answers` sub-collection, display distribution graph
- **showing_correct_answer**: Highlight correct answer on screen
- **showing_results**: Fetch `gameState/live.results` from Firestore, display rankings
- **all_revived**: Play resurrection animation

---

### Event: IDLE_STATE

**Trigger**: Client connects but `gameState/live` document does not exist or has no `currentPhase` (FR-003a, Clarification 3)

**Purpose**: Inform clients that no active game session exists. Clients should display "Waiting for game to start" UI.

**Payload**:
```typescript
interface IdleStatePayload {}  // Empty object
```

**Example**:
```json
{}
```

**Client Responsibilities**:
- Display "Waiting for host to start game" message
- Show participant count if available from other Firestore listeners
- Poll for game start or wait for START_QUESTION event

---

### Event: AUTH_REQUIRED (Server→Client Control Event)

**Trigger**: Client establishes Socket.io connection (not a Firestore trigger)

**Purpose**: Instruct client to send authentication credentials immediately.

**Payload**:
```typescript
interface AuthRequiredPayload {
  timeout: number;  // Milliseconds before auto-disconnect (default 10000)
}
```

**Example**:
```json
{
  "timeout": 10000
}
```

**Client Responsibilities**:
- Immediately emit `authenticate` event with Firebase ID token
- If timeout expires before auth: connection will be forcibly closed

---

### Event: AUTH_SUCCESS (Server→Client Control Event)

**Trigger**: Client sends valid Firebase Auth token (FR-002)

**Purpose**: Confirm successful authentication and admission to game room.

**Payload**:
```typescript
interface AuthSuccessPayload {
  userId: string;   // Firebase UID extracted from verified token
}
```

**Example**:
```json
{
  "userId": "abc123xyz789"
}
```

**Client Responsibilities**:
- Store `userId` for logging/debugging
- Begin listening for game events (START_QUESTION, GONG_ACTIVATED, etc.)

---

### Event: AUTH_FAILED (Server→Client Control Event)

**Trigger**: Client sends invalid/expired Firebase Auth token (FR-008, OR-002)

**Purpose**: Notify client of authentication failure before disconnection.

**Payload**:
```typescript
interface AuthFailedPayload {
  reason: string;   // Human-readable error (e.g., "Invalid token", "Token expired")
}
```

**Example**:
```json
{
  "reason": "Token expired"
}
```

**Client Responsibilities**:
- Refresh Firebase Auth token
- Retry connection with new token
- Implement exponential backoff (per Assumption A-004)

---

## Input Events (Client→Server)

### Event: authenticate

**Purpose**: Client provides Firebase Auth ID token for verification (FR-002)

**Payload**:
```typescript
interface AuthenticatePayload {
  token: string;  // Firebase Auth ID token (JWT format)
}
```

**Example**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20..."
}
```

**Server Validation**:
1. Call `admin.auth().verifyIdToken(token)`
2. If valid: extract `uid`, join client to `gameRoom`, emit AUTH_SUCCESS
3. If invalid: emit AUTH_FAILED, disconnect after 1 second

---

## Internal State Models (Transient)

### ConnectionMetadata

**Purpose**: Track authenticated connections for metrics and room management (OR-001)

**Storage**: In-memory Map keyed by Socket.io connection ID

**Schema**:
```typescript
interface ConnectionMetadata {
  socketId: string;        // Socket.io socket.id (unique per connection)
  userId: string;          // Firebase UID (extracted from auth token)
  connectedAt: number;     // Millisecond timestamp when authenticated
  role?: 'participant' | 'host' | 'projector';  // Optional, inferred from token claims
}
```

**Lifecycle**:
- Created: When client successfully authenticates
- Updated: Never (stateless connections)
- Deleted: When client disconnects or is forcibly disconnected

**Usage**:
- Count active connections (OR-001 metric)
- Log disconnections with userId for debugging

---

### ListenerState

**Purpose**: Track Firestore listener connection status for health monitoring (OR-004)

**Storage**: Single in-memory object (singleton pattern)

**Schema**:
```typescript
interface ListenerState {
  status: 'connected' | 'disconnected' | 'error';
  lastUpdate: number;         // Millisecond timestamp of last state change
  errorMessage?: string;      // Error details if status = 'error'
  reconnectAttempts: number;  // Count of reconnection attempts (reset on success)
}
```

**State Transitions**:
```
disconnected → connected (initial listener setup)
connected → disconnected (network interruption)
disconnected → error (reconnection max retries exceeded)
error → connected (manual recovery or SDK retry success)
```

**Usage**:
- Expose as Prometheus gauge (OR-004)
- Control `isHealthy` flag for new connection acceptance (FR-011a)

---

### BroadcastMetrics

**Purpose**: Track broadcast latency for performance monitoring (OR-003)

**Storage**: Prometheus histogram (in-memory buckets)

**Schema**:
```typescript
interface BroadcastMetrics {
  histogram: Histogram;  // prom-client Histogram instance
  buckets: number[];     // [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0] (seconds)
}
```

**Measurement Points**:
1. **Start**: Firestore `onSnapshot` callback fires
2. **End**: `io.to('gameRoom').emit()` completes
3. **Duration**: End - Start (milliseconds)

**Usage**:
- Expose as Prometheus histogram (OR-003)
- Alert if p99 > 150ms

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                       Firestore                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ gameState/live (GameState document)                │    │
│  │  - currentPhase: "accepting_answers"               │    │
│  │  - currentQuestionId: "q006"                       │    │
│  │  - isGongActive: false                             │    │
│  └───────────────────┬────────────────────────────────┘    │
└────────────────────────│──────────────────────────────────── │
                         │ onSnapshot()
                         ▼
┌───────────────────────────────────────────────────────────┐
│               Socket Server (Node.js)                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Firestore Listener                               │    │
│  │  - Watches gameState/live                        │    │
│  │  - Validates document structure                  │    │
│  │  - Maps changes to Socket.io events              │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                          │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Event Broadcaster                                │    │
│  │  - io.to('gameRoom').emit(event)                 │    │
│  │  - Tracks broadcast latency (OR-003)             │    │
│  └──────────────┬───────────────────────────────────┘    │
└─────────────────┼────────────────────────────────────────┘
                  │ WebSocket (Socket.io)
                  ▼
┌───────────────────────────────────────────────────────────┐
│              Connected Clients (200+)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │ participant-app │  │  projector-app  │  │ host-app │ │
│  │  (smartphone)   │  │  (main screen)  │  │ (tablet) │ │
│  └─────────────────┘  └─────────────────┘  └──────────┘ │
│  All in "gameRoom" broadcast room                        │
└───────────────────────────────────────────────────────────┘
```

**Data Flow**:
1. `api-server` writes to `gameState/live` (e.g., sets `currentPhase = "accepting_answers"`)
2. Firestore triggers `onSnapshot()` callback in `socket-server` (~20ms latency)
3. `socket-server` validates document, maps to `START_QUESTION` event
4. `io.to('gameRoom').emit('START_QUESTION', payload)` broadcasts to all clients (~10ms)
5. Clients receive event via WebSocket (~50ms network latency)
6. **Total latency**: ~80ms (well within <100ms requirement)

---

## Data Constraints & Validation

### Firestore Document Validation (FR-011c)

**Validator**: Zod schema in `src/utils/validator.ts`

```typescript
import { z } from 'zod';

const GamePhaseEnum = z.enum([
  'waiting',
  'accepting_answers',
  'showing_distribution',
  'showing_correct_answer',
  'showing_results',
  'all_revived',
  'game_over',
]);

const GameStateSchema = z.object({
  currentPhase: GamePhaseEnum,
  currentQuestionId: z.string().optional(),
  isGongActive: z.boolean().default(false),
  serverTimestamp: z.number().optional(),
  // Additional fields allowed but not validated (clients handle)
}).strict({ message: 'Unknown fields in gameState document' });

export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);  // Throws ZodError if invalid
}
```

**Error Handling**:
- Invalid document: Log error, skip broadcast, maintain connections (Clarification 4)
- Missing document: Send IDLE_STATE event to new connections (Clarification 3)

---

### Socket.io Event Payload Validation

**Validator**: TypeScript type guards in `src/events/eventMapper.ts`

```typescript
export function isValidStartQuestionPayload(payload: unknown): payload is StartQuestionPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as any).questionId === 'string' &&
    typeof (payload as any).serverStartTime === 'number'
  );
}
```

**Usage**: Validate outgoing events before broadcast (defensive programming)

---

## Non-Functional Requirements

### Performance Constraints

- **Event Mapping**: <5ms per Firestore snapshot (in-process, no I/O)
- **Broadcast Latency**: <10ms from `emit()` call to network buffer write
- **Memory Usage**: <50MB per 200 connections (~250KB per connection for Socket.io overhead)

### Scalability Constraints

- **Max Connections**: 200 per instance (assumption A-007)
- **Firestore Listener**: 1 per instance (singleton, shared across all connections)
- **No Horizontal State**: Instances are independent; no shared state between instances

### Reliability Constraints

- **Firestore Reconnection**: Automatic with exponential backoff (Firebase SDK)
- **Client Reconnection**: Client responsibility (assumption A-004)
- **No Message Persistence**: Events are broadcast once; disconnected clients miss updates

---

## Migration & Compatibility

**No Backward Compatibility Required**: This is a new service (no existing clients)

**Future Extensibility**:
- Additional event types can be added without breaking existing clients (clients ignore unknown events)
- New fields in existing event payloads require client updates (use semver for event schemas)
- Multiple game rooms can be supported by changing broadcast target from `'gameRoom'` to per-game room IDs

---

## References

- Existing GameState type: `/packages/types/src/GameState.ts`
- Existing Question type: `/packages/types/src/Question.ts`
- Socket.io event protocol: [Socket.io Emit Cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/)

---

**Document Version**: 1.0 | **Last Updated**: 2025-11-03
