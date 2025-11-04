# Data Model: Host Control App

**Feature**: 006-host-app | **Last Updated**: 2025-11-03

## Overview

The host-app operates on a read-only data model for game state (consumed from Firestore) and a write-only command model for game actions (sent to api-server). This document defines all entities, their attributes, relationships, validation rules, and state transitions.

---

## Entities

### 1. GameState (Read from Firestore)

**Source**: Firestore document at path `gameState/live`
**Access**: Read-only via real-time listener (`onSnapshot()`)
**Purpose**: Central source of truth for current game status, synchronized across all clients

#### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPhase` | `GamePhase` (enum) | Yes | Current game phase determining UI state and available actions |
| `currentQuestion` | `Question` \| `null` | No | Active question details (null when no question active) |
| `isGongActive` | `boolean` | Yes | Flag indicating final question gong has been triggered |
| `participantCount` | `number` | No | Number of active participants (for display only) |
| `timeRemaining` | `number` \| `null` | No | Seconds remaining in current phase (optional display) |
| `lastUpdate` | `Timestamp` | Yes | Firestore server timestamp of last state change |

#### GamePhase Enum Values

```typescript
type GamePhase =
  | 'ready_for_next'           // Ready to start next question
  | 'accepting_answers'        // Question active, collecting participant answers
  | 'showing_distribution'     // Answer distribution displayed (before reveal)
  | 'showing_correct_answer'   // Correct answer revealed
  | 'showing_results'          // Rankings and elimination results shown
  | 'all_revived'              // All dropped participants restored (special state)
  | 'all_incorrect'            // All participants answered incorrectly (special state)
```

#### State Transition Diagram

```
ready_for_next
    ↓ (START_QUESTION)
accepting_answers
    ↓ (SHOW_DISTRIBUTION)
showing_distribution
    ↓ (SHOW_CORRECT_ANSWER)
showing_correct_answer
    ↓ (SHOW_RESULTS)
showing_results
    ↓ (ready_for_next)
ready_for_next → ... (cycle repeats)

Special Transitions:
- accepting_answers → (TRIGGER_GONG) → accepting_answers (isGongActive=true)
- any phase → (REVIVE_ALL) → all_revived → (ready_for_next) → ready_for_next
- showing_results → all_incorrect → (ready_for_next) → ready_for_next
```

#### Validation Rules

- `currentPhase` MUST be one of the defined GamePhase values
- `currentQuestion` MUST NOT be null when phase is `accepting_answers`, `showing_distribution`, or `showing_correct_answer`
- `currentQuestion` MAY be null when phase is `ready_for_next`, `showing_results`, `all_revived`, or `all_incorrect`
- `isGongActive` defaults to `false` and can only transition from `false` to `true` (never resets during game)
- `participantCount` MUST be ≥ 0 if present
- `timeRemaining` MUST be ≥ 0 if present

#### TypeScript Definition

```typescript
interface GameState {
  currentPhase: GamePhase;
  currentQuestion: Question | null;
  isGongActive: boolean;
  participantCount?: number;
  timeRemaining?: number | null;
  lastUpdate: Timestamp;
}
```

---

### 2. Question (Embedded in GameState)

**Source**: Embedded within `GameState.currentQuestion`
**Purpose**: Contains all information needed to display the active question

#### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questionId` | `string` | Yes | Unique identifier (e.g., "q-first-half-001") |
| `questionText` | `string` | Yes | The question prompt displayed to participants |
| `choices` | `QuestionChoice[]` | Yes | Array of answer choices (2-4 choices) |
| `period` | `GamePeriod` (enum) | Yes | Game period classification |
| `questionNumber` | `number` | Yes | Sequential question number (1-based) |

#### QuestionChoice Structure

```typescript
interface QuestionChoice {
  index: number;    // 0-based choice index
  text: string;     // Choice label (e.g., "A. Paris", "B. London")
}
```

#### GamePeriod Enum Values

```typescript
type GamePeriod =
  | 'first-half'   // Regular questions before gong
  | 'second-half'  // Questions after some eliminations
  | 'overtime'     // Final tiebreaker questions
```

#### Validation Rules

- `questionId` MUST be unique across all questions in the game
- `questionText` MUST NOT be empty
- `choices` MUST have 2-4 elements
- Each `choice.index` MUST be unique within the choices array and start from 0
- Each `choice.text` MUST NOT be empty
- `questionNumber` MUST be > 0

#### TypeScript Definition

```typescript
interface Question {
  questionId: string;
  questionText: string;
  choices: QuestionChoice[];
  period: GamePeriod;
  questionNumber: number;
}
```

---

### 3. HostUser (Local Auth State)

**Source**: Firebase Authentication + local state
**Access**: Managed by `useAuth()` hook
**Purpose**: Represents the authenticated Google user controlling the game

#### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Firebase user ID (unique across all users) |
| `email` | `string` | Yes | Google account email |
| `displayName` | `string` \| `null` | No | User's display name from Google profile |
| `idToken` | `string` | Yes | Firebase ID token for API Authorization header |
| `tokenExpiresAt` | `number` | Yes | Unix timestamp when idToken expires (for refresh logic) |

#### Lifecycle

1. **Initialization**: User arrives at host-app URL
2. **Authentication**: User clicks "Sign in with Google" → Firebase Auth flow
3. **Token Acquisition**: Firebase returns user object with initial ID token
4. **Token Refresh**: ID token refreshed automatically by Firebase SDK (1 hour expiry)
5. **Session Persistence**: User state saved to localStorage for page reload recovery
6. **Logout**: User explicitly logs out → clear localStorage, sign out from Firebase

#### Validation Rules

- `uid` MUST match Firebase Auth UID format (alphanumeric string)
- `email` MUST be a valid email address from Google OAuth
- `idToken` MUST be a valid JWT token issued by Firebase
- `tokenExpiresAt` MUST be in the future (current time + ~1 hour)

#### TypeScript Definition

```typescript
interface HostUser {
  uid: string;
  email: string;
  displayName: string | null;
  idToken: string;
  tokenExpiresAt: number;
}
```

---

### 4. HostActionRequest (Write to API Server)

**Source**: Generated by host-app when user taps action button
**Destination**: POST /host/game/advance request body
**Purpose**: Command to advance game state to next phase

#### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `HostAction` (enum) | Yes | The game action to execute |
| `payload` | `object` \| `undefined` | No | Action-specific data (required for some actions) |

#### HostAction Enum Values

```typescript
type HostAction =
  | 'START_QUESTION'          // Begin new question (requires payload.questionId)
  | 'SHOW_DISTRIBUTION'       // Show answer distribution
  | 'SHOW_CORRECT_ANSWER'     // Reveal correct answer
  | 'SHOW_RESULTS'            // Display rankings and eliminations
  | 'TRIGGER_GONG'            // Activate final question gong
  | 'REVIVE_ALL'              // Restore all eliminated participants
  | 'ready_for_next'          // Return to ready state
```

#### Payload Requirements

| Action | Payload Required | Payload Structure |
|--------|------------------|-------------------|
| `START_QUESTION` | **Yes** | `{ questionId: string }` |
| `SHOW_DISTRIBUTION` | No | - |
| `SHOW_CORRECT_ANSWER` | No | - |
| `SHOW_RESULTS` | No | - |
| `TRIGGER_GONG` | No | - |
| `REVIVE_ALL` | No | - |
| `ready_for_next` | No | - |

#### Validation Rules

- `action` MUST be one of the defined HostAction values
- `payload.questionId` MUST be provided and non-empty when action is `START_QUESTION`
- `payload` MUST be undefined or omitted for actions that don't require it
- Host-app MUST include Firebase ID token in `Authorization: Bearer <token>` header

#### TypeScript Definition

```typescript
interface HostActionRequest {
  action: HostAction;
  payload?: {
    questionId?: string;
    [key: string]: unknown;  // Future extensibility
  };
}
```

---

### 5. HostActionResponse (Read from API Server)

**Source**: POST /host/game/advance response body
**Purpose**: Confirms action processing success or reports error

#### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | `true` if action processed, `false` if error |
| `message` | `string` \| `undefined` | No | Error message when success=false, omitted when success=true |

#### Success Response (HTTP 200)

```json
{
  "success": true
}
```

#### Error Response (HTTP 4xx/5xx)

```json
{
  "success": false,
  "message": "Invalid action for current phase: cannot SHOW_DISTRIBUTION when phase is ready_for_next"
}
```

#### Validation Rules

- HTTP 200 status MUST have `success: true`
- HTTP 4xx/5xx status MUST have `success: false` and non-empty `message`
- `message` SHOULD be human-readable and actionable

#### TypeScript Definition

```typescript
interface HostActionResponse {
  success: boolean;
  message?: string;
}
```

---

## Relationships

### GameState ↔ Question

- **Relationship**: Composition (GameState owns Question)
- **Cardinality**: GameState has 0 or 1 Question
- **Lifecycle**: Question exists only while embedded in GameState.currentQuestion
- **Shared**: Question is also used by other apps (participant-app, projector-app) via /packages/types/

### HostUser ↔ GameState

- **Relationship**: Observer (HostUser listens to GameState)
- **Cardinality**: Multiple HostUsers can observe the same GameState
- **Synchronization**: All HostUsers see the same GameState via Firestore real-time listener
- **No Direct Link**: No database relation between HostUser and GameState (users are identified by Firebase Auth, not stored in GameState)

### HostActionRequest ↔ GameState

- **Relationship**: Command pattern (action triggers state transition)
- **Flow**: HostUser → HostActionRequest → API Server → GameState update → Firestore → HostUser sees new state
- **Validation**: API Server validates action is appropriate for current GameState.currentPhase
- **Async**: Host-app sends request but does NOT immediately update local UI; waits for Firestore listener to receive new state

---

## Data Flow Architecture

```
┌─────────────┐
│  HostUser   │ (Firebase Auth)
│  Browser    │
└──────┬──────┘
       │
       │ 1. Tap "Start Question"
       ↓
┌─────────────────────┐
│  BigButton.tsx      │
│  (UI Component)     │
└──────┬──────────────┘
       │
       │ 2. Call useApiClient()
       ↓
┌─────────────────────┐
│  api-client.ts      │
│  (HTTP Client)      │
└──────┬──────────────┘
       │
       │ 3. POST /host/game/advance
       │    Authorization: Bearer <idToken>
       │    Body: {"action": "START_QUESTION", "payload": {"questionId": "q-001"}}
       ↓
┌─────────────────────┐
│  API Server         │
│  /host/game/advance │
└──────┬──────────────┘
       │
       │ 4. Validate, update Firestore gameState/live
       ↓
┌─────────────────────┐
│  Firestore          │
│  gameState/live     │
└──────┬──────────────┘
       │
       │ 5. onSnapshot() fires (real-time update)
       ↓
┌─────────────────────┐
│  useGameState()     │
│  (React Hook)       │
└──────┬──────────────┘
       │
       │ 6. Update local state
       ↓
┌─────────────────────┐
│  BigButton.tsx      │
│  Re-renders with    │
│  "Close Answers"    │
└─────────────────────┘
```

---

## Storage Locations

| Entity | Storage | Access Pattern | Persistence |
|--------|---------|----------------|-------------|
| GameState | Firestore `gameState/live` | Read-only listener | Server-managed |
| Question | Embedded in GameState | Read via GameState | Transient (per question) |
| HostUser | Browser localStorage + Firebase Auth | Read/write local | 1-hour token expiry |
| HostActionRequest | API request body | Write-only (not stored) | N/A (ephemeral) |
| HostActionResponse | API response body | Read-only (not stored) | N/A (ephemeral) |

---

## Concurrency Handling

### Multiple Hosts Scenario

When 2+ hosts are logged in simultaneously:

1. **State Synchronization**: All hosts listen to the same Firestore `gameState/live` document
2. **Firestore Guarantee**: Last-write-wins conflict resolution (atomic updates)
3. **UI Synchronization**: All hosts see state change within 1 second (per SC-011)
4. **Race Condition Mitigation**:
   - API server validates action against current phase (rejects stale requests)
   - Firestore listener ensures all hosts converge to same state
   - UI buttons disabled during API request to prevent spam
5. **No Locking Required**: Firestore's atomic updates handle concurrent writes safely

### Example Concurrent Scenario

**Timeline**:
- T0: Host A and Host B both see `phase: "ready_for_next"`
- T1: Host A taps "Start Question" → POST /host/game/advance sent
- T2: Host B taps "Start Question" → POST /host/game/advance sent
- T3: API server processes Host A's request → updates Firestore to `phase: "accepting_answers"`
- T4: API server processes Host B's request → validates current phase is NOT "ready_for_next" → **rejects with 400 error**
- T5: Host A and Host B both receive Firestore update → both UIs show "Close Answers"
- T6: Host B sees error toast: "Action already in progress"

**Outcome**: Only one action succeeds, both hosts converge to same state, no data corruption.

---

## Validation Summary

### Firestore Read Validation

- Host-app MUST NOT write directly to Firestore (read-only access)
- All Firestore updates MUST originate from api-server
- Host-app MUST handle Firestore permission errors gracefully

### API Write Validation

- All POST /host/game/advance requests MUST include valid Firebase ID token
- API server MUST validate action is appropriate for current GameState.currentPhase
- API server MUST validate payload structure when required (e.g., questionId for START_QUESTION)
- Host-app MUST handle 401 Unauthorized by prompting re-authentication
- Host-app MUST display 400/500 error messages to user with retry option

### Type Safety

- All entities MUST be defined in `/packages/types/` for sharing across apps
- Host-app MUST use TypeScript strict mode (no `any` types)
- OpenAPI contract MUST generate matching TypeScript types for API requests/responses

---

**Document Status**: ✅ Complete
**Next Steps**: Implement entities in `/packages/types/src/HostApi.ts`, update `/packages/types/src/GameState.ts` if needed
