# Data Model: Participant App

**Feature**: 005-participant-app
**Date**: 2025-11-03
**Status**: Complete

## Overview

This document defines the client-side data model for the Participant App. The app maintains local state for guest sessions, answer submissions, and game state, while synchronizing with server-side data sources (Firestore, API endpoints, WebSocket events).

## Entities

### 1. Guest Session (Client-Side)

**Description**: Represents the authenticated guest's current game session stored in localStorage.

**Storage**: Browser localStorage (key: `allstars_guest_session`)

**Lifecycle**: Created on QR code authentication, expires after 24 hours

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `guestId` | `string` | Yes | Unique guest identifier from server | UUID format |
| `firebaseUid` | `string` | Yes | Firebase Anonymous Auth UID | Non-empty string |
| `name` | `string` | Yes | Guest's display name | Max 100 chars |
| `tableNumber` | `number` | Yes | Table assignment | Positive integer |
| `token` | `string` | Yes | Original QR code token | Non-empty string |
| `clockOffset` | `number` | Yes | Calculated clock offset in ms | Number (can be negative) |
| `createdAt` | `number` | Yes | Session creation timestamp (Unix ms) | Positive integer |
| `lastSyncAt` | `number` | Yes | Last clock sync timestamp (Unix ms) | Positive integer |

**State Transitions**:
```
[No Session] --> [Authenticated] --> [Expired/Deleted]
                       ↓
                  [Re-syncing] (every 30-60s during gameplay)
```

**Example**:
```typescript
interface GuestSession {
  guestId: string;
  firebaseUid: string;
  name: string;
  tableNumber: number;
  token: string;
  clockOffset: number;
  createdAt: number;
  lastSyncAt: number;
}

// Example instance
{
  guestId: "550e8400-e29b-41d4-a716-446655440000",
  firebaseUid: "abc123xyz789",
  name: "田中太郎",
  tableNumber: 5,
  token: "qr_token_abc123",
  clockOffset: -42, // Server is 42ms behind client
  createdAt: 1699000000000,
  lastSyncAt: 1699000030000
}
```

---

### 2. Answer Record (Client-Side Queue)

**Description**: Represents a submitted answer for a specific question, potentially queued for retry.

**Storage**: Browser memory (in-memory queue), not persisted to localStorage

**Lifecycle**: Created on answer tap, submitted to server, deleted after successful submission

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `questionId` | `string` | Yes | Question identifier | Non-empty string |
| `choiceIndex` | `number` | Yes | Selected answer choice (0-based) | 0-5 (max 6 choices) |
| `responseTimeMs` | `number` | Yes | Time from question start to tap (ms) | Non-negative integer |
| `clientTapTime` | `number` | Yes | Client timestamp when answer tapped (Unix ms) | Positive integer |
| `submittedAt` | `number \| null` | No | Timestamp of successful submission (Unix ms) | Positive integer or null |
| `retryCount` | `number` | Yes | Number of submission attempts | 0-3 |
| `status` | `'pending' \| 'submitted' \| 'failed'` | Yes | Submission status | Enum value |

**State Transitions**:
```
[Pending] --> [Submitted] (success)
    ↓
[Pending] --> [Pending] (retry with exponential backoff: 200ms, 400ms, 800ms)
    ↓
[Pending] --> [Failed] (after 3 retries)
```

**Example**:
```typescript
interface AnswerRecord {
  questionId: string;
  choiceIndex: number;
  responseTimeMs: number;
  clientTapTime: number;
  submittedAt: number | null;
  retryCount: number;
  status: 'pending' | 'submitted' | 'failed';
}

// Example instance
{
  questionId: "q-first-half-001",
  choiceIndex: 2,
  responseTimeMs: 3250, // 3.25 seconds from question start
  clientTapTime: 1699000045000,
  submittedAt: 1699000045123,
  retryCount: 0,
  status: 'submitted'
}
```

---

### 3. Game State (Client-Side)

**Description**: Represents the current phase and active question in the quiz game.

**Storage**: React state (in-memory), synchronized from WebSocket events

**Lifecycle**: Updated on every WebSocket event, reset on reconnection

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `phase` | `'waiting' \| 'answering' \| 'reveal' \| 'ended'` | Yes | Current game phase | Enum value |
| `activeQuestion` | `Question \| null` | No | Currently displayed question | Valid Question object or null |
| `correctChoice` | `number \| null` | No | Correct answer index (revealed phase) | 0-5 or null |
| `serverStartTime` | `number \| null` | No | Server timestamp when question started (Unix ms) | Positive integer or null |

**State Transitions**:
```
[waiting] --> [answering] (START_QUESTION event)
              ↓
         [reveal] (GAME_PHASE_CHANGED with phase='reveal')
              ↓
         [ended] (GAME_PHASE_CHANGED with phase='ended')
```

**Example**:
```typescript
interface GameState {
  phase: 'waiting' | 'answering' | 'reveal' | 'ended';
  activeQuestion: Question | null;
  correctChoice: number | null;
  serverStartTime: number | null;
}

// Example instance during 'answering' phase
{
  phase: 'answering',
  activeQuestion: {
    id: "q-first-half-001",
    text: "新郎新婦が初めて出会った場所は？",
    choices: [
      { index: 0, text: "大学のサークル" },
      { index: 1, text: "友人の紹介" },
      { index: 2, text: "職場" },
      { index: 3, text: "オンラインアプリ" }
    ],
    period: 'first-half',
    questionNumber: 1
  },
  correctChoice: null, // Not revealed yet
  serverStartTime: 1699000050000
}
```

---

### 4. Guest Status (Firestore Real-Time)

**Description**: Server-side guest document monitored via Firestore listener to detect drop-out.

**Storage**: Firestore collection `guests/{guestId}` (read-only from client)

**Lifecycle**: Created by api-server when guest registers, updated by game logic

**Fields Monitored**:

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'active' \| 'dropped'` | Guest's participation status |
| `rank` | `number \| null` | Final rank if dropped out |
| `totalPoints` | `number` | Total points earned |
| `correctAnswers` | `number` | Number of correct answers |

**Client Behavior**:
- Listen to `guests/{guestId}` document
- When `status` changes to `'dropped'`, display full-screen drop-out overlay
- Show `rank`, `totalPoints`, `correctAnswers` on overlay
- Prevent further answer submissions

**Example Firestore Document**:
```json
{
  "guestId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "田中太郎",
  "tableNumber": 5,
  "status": "dropped",
  "rank": 15,
  "totalPoints": 850,
  "correctAnswers": 7,
  "updatedAt": 1699000100000
}
```

---

### 5. Question (Shared Type)

**Description**: Question entity from `@allstars/types` package.

**Source**: Pre-fetched from api-server, received via WebSocket events

**Fields** (from shared types):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique question identifier |
| `text` | `string` | Yes | Question text |
| `choices` | `Choice[]` | Yes | Answer choices (2-6 items) |
| `period` | `'first-half' \| 'second-half' \| 'overtime'` | Yes | Game period |
| `questionNumber` | `number` | Yes | Sequential number within period |
| `correctChoice` | `number` | Yes | Correct answer index (server-side only, not sent to client) |

**Choice Type**:
```typescript
interface Choice {
  index: number;
  text: string;
}
```

---

## Relationships

```
GuestSession (localStorage)
    ↓ guestId
GuestStatus (Firestore listener) → monitors drop-out
    ↓
GameState (React state)
    ↓ activeQuestion
Question (pre-fetched/WebSocket)
    ↓ answered by
AnswerRecord (in-memory queue) → submits to api-server
```

---

## Data Flow Diagrams

### Authentication Flow

```
QR Code Scan
    ↓
Extract token → POST /participant/register
    ↓
Firebase Anonymous Login → firebaseUid
    ↓
Store GuestSession in localStorage
    ↓
Clock Sync (5 pings) → calculate clockOffset
    ↓
Update GuestSession with clockOffset
```

### Answer Submission Flow

```
Question appears (WebSocket START_QUESTION)
    ↓
Display Question with serverStartTime
    ↓
User taps answer → record clientTapTime
    ↓
Calculate responseTimeMs = (clientTapTime + clockOffset) - serverStartTime
    ↓
Create AnswerRecord (status='pending')
    ↓
POST /participant/answer
    ↓
Success? → status='submitted', delete from queue
    ↓
Failure? → Retry with exponential backoff (200ms, 400ms, 800ms)
    ↓
After 3 failures → status='failed', log to Crashlytics, show error UI
```

### Drop-Out Detection Flow

```
Firestore listener on guests/{guestId}
    ↓
Document updated: status='dropped'
    ↓
Update local GameState
    ↓
Show DroppedOutPage with rank, points, correctAnswers
    ↓
Disable answer submission
    ↓
Allow spectator mode (view questions, no submission)
```

---

## Validation Rules

### Guest Session
- `guestId` must be UUID v4 format
- `name` max length 100 characters
- `tableNumber` must be positive integer
- `createdAt` must be within last 24 hours (session expiration check)
- `clockOffset` must be reasonable (-10000ms to +10000ms, warn if > 500ms)

### Answer Record
- `choiceIndex` must be within valid range (0 to question.choices.length - 1)
- `responseTimeMs` must be non-negative
- `retryCount` must be 0-3
- `status` must be valid enum value

### Game State
- `phase` must be valid enum value
- `activeQuestion` required when phase='answering' or phase='reveal'
- `correctChoice` required when phase='reveal', null otherwise
- `serverStartTime` required when phase='answering'

---

## Storage Strategies

### localStorage (Persistent)
- **GuestSession**: Survives browser refresh, expires after 24 hours
- **Cleanup**: Check `createdAt` on app load, delete if > 24 hours old

### React State (In-Memory)
- **GameState**: Lost on browser refresh, restored from Firestore on reconnect
- **AnswerQueue**: Lost on browser refresh (acceptable, questions are time-sensitive)

### Firestore Listeners (Real-Time)
- **GuestStatus**: Real-time updates, auto-reconnects on network restore
- **Unsubscribe**: Clean up listener on component unmount or logout

---

## Performance Considerations

### Pre-Fetching
- Fetch questions for current period + next period during initialization
- Background fetch remaining periods during gameplay
- Cache questions in React state to avoid re-fetching

### Memory Management
- Delete AnswerRecords from queue after successful submission
- Limit answer history display to last 10 questions (if implemented)
- Clean up old GuestSession entries from localStorage (> 24 hours)

### Network Optimization
- Batch clock sync pings (5 sequential requests within ~1 second)
- Re-sync clock every 30-60s (not per question)
- Use WebSocket for real-time events (lower latency than polling)

---

**Completed**: 2025-11-03
**Entities Defined**: 5 (GuestSession, AnswerRecord, GameState, GuestStatus, Question)
**Data Flows Documented**: 3 (Authentication, Answer Submission, Drop-Out Detection)
