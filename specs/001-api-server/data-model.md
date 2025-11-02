# Data Model: API Server for Quiz Game System

**Branch**: `001-api-server` | **Date**: 2025-11-02
**Purpose**: Phase 1 data model design for Firestore collections and document structures

## Overview

The API server uses Firestore as its persistent data layer with four primary collections: `questions`, `guests`, `answers`, and `gameState`. The data model is designed to support efficient querying, atomic transactions for game state updates, and composite indexes for duplicate prevention and leaderboard calculations.

## Collections

### 1. questions

**Purpose**: Stores quiz questions created by admins

**Document ID**: Auto-generated Firestore document ID

**Schema**:
```typescript
interface Question {
  id: string;                    // Firestore document ID
  period: number;                // Game phase number (1, 2, 3, etc.)
  questionNumber: number;        // Question number within period (1, 2, 3, etc.)
  type: 'four_choice' | 'true_false';  // Question type
  text: string;                  // Question text (max 500 chars)
  choices: string[];             // Array of answer choices (2-5 items)
  correctAnswer: string;         // Correct answer (must match one of choices)
  skipAttributes: string[];      // Optional guest attributes to exclude (e.g., ["groom_family"])
  createdAt: Timestamp;          // Server timestamp when created
  updatedAt: Timestamp;          // Server timestamp when last updated
}
```

**Indexes**:
- Composite index on `(period, questionNumber)` for uniqueness enforcement (FR-006)
- Single-field index on `period` for filtering by game phase

**Validation Rules**:
- `period`: Positive integer
- `questionNumber`: Positive integer
- `text`: Non-empty string, max 500 characters
- `choices`: Array with 2-5 elements
- `correctAnswer`: Must exist in `choices` array
- `(period, questionNumber)` combination must be unique

**Example Document**:
```json
{
  "id": "q_abc123",
  "period": 1,
  "questionNumber": 5,
  "type": "four_choice",
  "text": "What is the groom's favorite food?",
  "choices": ["Pizza", "Sushi", "Tacos", "Pasta"],
  "correctAnswer": "Sushi",
  "skipAttributes": ["groom_family"],
  "createdAt": "2025-11-02T10:00:00Z",
  "updatedAt": "2025-11-02T10:00:00Z"
}
```

---

### 2. guests

**Purpose**: Stores registered wedding guests and their participation status

**Document ID**: Auto-generated Firestore document ID (used as guestId)

**Schema**:
```typescript
interface Guest {
  id: string;                    // Firestore document ID
  name: string;                  // Guest full name
  status: 'active' | 'eliminated';  // Participation status
  attributes: string[];          // Guest categories (e.g., ["groom_family", "table_5"])
  authMethod: 'google' | 'anonymous';  // Authentication method used
  createdAt: Timestamp;          // Server timestamp when registered
  lastActiveAt: Timestamp;       // Server timestamp of last activity
}
```

**Indexes**:
- Single-field index on `status` for filtering active/eliminated guests
- Single-field index on `attributes` (array-contains) for skip logic

**Validation Rules**:
- `name`: Non-empty string
- `status`: Must be 'active' or 'eliminated'
- `attributes`: Array of strings (can be empty)

**Example Document**:
```json
{
  "id": "guest_xyz789",
  "name": "John Smith",
  "status": "active",
  "attributes": ["bride_family", "table_3"],
  "authMethod": "anonymous",
  "createdAt": "2025-11-02T09:00:00Z",
  "lastActiveAt": "2025-11-02T10:30:00Z"
}
```

---

### 3. answers

**Purpose**: Stores participant answer submissions with correctness and timing data

**Document ID**: Auto-generated Firestore document ID

**Schema**:
```typescript
interface Answer {
  id: string;                    // Firestore document ID
  guestId: string;               // Reference to guests collection
  questionId: string;            // Reference to questions collection
  answer: string;                // Selected answer choice
  responseTimeMs: number;        // Client-measured response time in milliseconds
  isCorrect: boolean;            // Whether answer matches question.correctAnswer
  submittedAt: Timestamp;        // Server timestamp when submitted
}
```

**Indexes**:
1. Composite index on `(guestId, questionId)` for duplicate prevention (FR-025)
2. Composite index on `(questionId, isCorrect DESC, responseTimeMs ASC)` for top 10 query
3. Composite index on `(questionId, isCorrect ASC, responseTimeMs DESC)` for worst 10 query

**Validation Rules**:
- `guestId`: Must reference existing guest document
- `questionId`: Must reference existing question document
- `answer`: Non-empty string
- `responseTimeMs`: Positive number
- `isCorrect`: Boolean
- `(guestId, questionId)` combination must be unique

**Example Document**:
```json
{
  "id": "ans_def456",
  "guestId": "guest_xyz789",
  "questionId": "q_abc123",
  "answer": "Sushi",
  "responseTimeMs": 2345,
  "isCorrect": true,
  "submittedAt": "2025-11-02T10:15:23Z"
}
```

---

### 4. gameState

**Purpose**: Stores the current state of the live game (singleton document)

**Document ID**: `current` (fixed ID, always exactly one document)

**Schema**:
```typescript
interface GameState {
  activeQuestionId: string | null;  // Currently active question ID (null if no question active)
  phase: 'idle' | 'accepting_answers' | 'showing_distribution' | 'showing_correct_answer' | 'showing_results';
  isGongActive: boolean;            // Whether gong sound/animation is active
  results: {                         // Populated during SHOW_RESULTS action
    top10: Array<{
      guestId: string;
      guestName: string;
      answer: string;
      responseTimeMs: number;
      isCorrect: boolean;
    }>;
    worst10: Array<{
      guestId: string;
      guestName: string;
      answer: string;
      responseTimeMs: number;
      isCorrect: boolean;
    }>;
  } | null;
  updatedAt: Timestamp;              // Server timestamp of last update
}
```

**Indexes**: None required (singleton document accessed by fixed ID)

**Validation Rules**:
- `activeQuestionId`: Must reference existing question or be null
- `phase`: Must be one of enum values
- `isGongActive`: Boolean
- `results`: Null or object with top10/worst10 arrays

**State Transitions**:
```
idle → accepting_answers (START_QUESTION)
accepting_answers → showing_distribution (SHOW_DISTRIBUTION)
showing_distribution → showing_correct_answer (SHOW_CORRECT_ANSWER)
showing_correct_answer → showing_results (SHOW_RESULTS)
showing_results → idle (START_QUESTION for next question)
any state → any state + isGongActive=true (TRIGGER_GONG)
```

**Example Document**:
```json
{
  "activeQuestionId": "q_abc123",
  "phase": "accepting_answers",
  "isGongActive": false,
  "results": null,
  "updatedAt": "2025-11-02T10:15:00Z"
}
```

**Example with Results**:
```json
{
  "activeQuestionId": "q_abc123",
  "phase": "showing_results",
  "isGongActive": false,
  "results": {
    "top10": [
      {
        "guestId": "guest_xyz789",
        "guestName": "John Smith",
        "answer": "Sushi",
        "responseTimeMs": 1234,
        "isCorrect": true
      }
    ],
    "worst10": [
      {
        "guestId": "guest_abc456",
        "guestName": "Jane Doe",
        "answer": "Pizza",
        "responseTimeMs": 9876,
        "isCorrect": false
      }
    ]
  },
  "updatedAt": "2025-11-02T10:16:30Z"
}
```

---

## Firestore Indexes Configuration

**File**: `apps/api-server/firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "questions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "period", "order": "ASCENDING" },
        { "fieldPath": "questionNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "answers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "guestId", "order": "ASCENDING" },
        { "fieldPath": "questionId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "answers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "questionId", "order": "ASCENDING" },
        { "fieldPath": "isCorrect", "order": "DESCENDING" },
        { "fieldPath": "responseTimeMs", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "answers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "questionId", "order": "ASCENDING" },
        { "fieldPath": "isCorrect", "order": "ASCENDING" },
        { "fieldPath": "responseTimeMs", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Data Access Patterns

### Admin Operations

**Create Question**:
```typescript
// 1. Check uniqueness
const existing = await firestore.collection('questions')
  .where('period', '==', period)
  .where('questionNumber', '==', questionNumber)
  .limit(1)
  .get();

if (!existing.empty) {
  throw new ValidationError('DUPLICATE_PERIOD_QUESTION');
}

// 2. Create question
const questionRef = firestore.collection('questions').doc();
await questionRef.set({
  period,
  questionNumber,
  type,
  text,
  choices,
  correctAnswer,
  skipAttributes,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
});
```

**List All Questions**:
```typescript
const snapshot = await firestore.collection('questions')
  .orderBy('period', 'asc')
  .orderBy('questionNumber', 'asc')
  .get();

return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Update Question**:
```typescript
const questionRef = firestore.collection('questions').doc(questionId);
await questionRef.update({
  ...updates,
  updatedAt: FieldValue.serverTimestamp()
});
```

**Get Guest List**:
```typescript
const snapshot = await firestore.collection('guests').get();
return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Host Operations

**Update Game State (Transactional)**:
```typescript
await firestore.runTransaction(async (transaction) => {
  const gameStateRef = firestore.collection('gameState').doc('current');
  const gameStateDoc = await transaction.get(gameStateRef);

  if (!gameStateDoc.exists) {
    throw new Error('Game state not found');
  }

  const currentState = gameStateDoc.data();

  // Apply state transition based on action
  const newState = applyAction(currentState, action, payload);

  transaction.update(gameStateRef, {
    ...newState,
    updatedAt: FieldValue.serverTimestamp()
  });

  return newState;
});
```

**Calculate Top/Worst 10**:
```typescript
const [top10Snapshot, worst10Snapshot] = await Promise.all([
  firestore.collection('answers')
    .where('questionId', '==', questionId)
    .orderBy('isCorrect', 'desc')
    .orderBy('responseTimeMs', 'asc')
    .limit(10)
    .get(),
  firestore.collection('answers')
    .where('questionId', '==', questionId)
    .orderBy('isCorrect', 'asc')
    .orderBy('responseTimeMs', 'desc')
    .limit(10)
    .get()
]);

// Hydrate with guest names
const top10 = await hydrateWithGuestNames(top10Snapshot);
const worst10 = await hydrateWithGuestNames(worst10Snapshot);
```

**Revive All Guests**:
```typescript
const guestsSnapshot = await firestore.collection('guests')
  .where('status', '==', 'eliminated')
  .get();

const batch = firestore.batch();
guestsSnapshot.docs.forEach(doc => {
  batch.update(doc.ref, { status: 'active' });
});

await batch.commit();
```

### Participant Operations

**Submit Answer (Transactional)**:
```typescript
await firestore.runTransaction(async (transaction) => {
  // Check for duplicate
  const duplicateQuery = firestore.collection('answers')
    .where('guestId', '==', guestId)
    .where('questionId', '==', questionId)
    .limit(1);

  const existing = await transaction.get(duplicateQuery);

  if (!existing.empty) {
    throw new ValidationError('DUPLICATE_ANSWER');
  }

  // Get question to validate correctness
  const questionRef = firestore.collection('questions').doc(questionId);
  const questionDoc = await transaction.get(questionRef);

  if (!questionDoc.exists) {
    throw new NotFoundError('Question not found');
  }

  const question = questionDoc.data();
  const isCorrect = answer === question.correctAnswer;

  // Create answer
  const answerRef = firestore.collection('answers').doc();
  transaction.create(answerRef, {
    guestId,
    questionId,
    answer,
    responseTimeMs,
    isCorrect,
    submittedAt: FieldValue.serverTimestamp()
  });
});
```

---

## Security Considerations

**Firestore Security Rules** (out of scope for api-server but documented for reference):
- All client access should be denied; API server is sole accessor
- API server uses Firebase Admin SDK with unrestricted access
- Authentication/authorization enforced at API layer (FR-001 through FR-004)

**Data Retention**:
- Questions: Persist indefinitely (reusable across events)
- Guests: Clear after event completion
- Answers: Archive after event for analytics
- GameState: Reset before each new game event

**Backup Strategy**:
- Firestore automated daily backups (Firebase built-in)
- Manual export before production events
- Point-in-time recovery within 7 days

---

## Migration & Initialization

**Initial Game State Setup**:
```typescript
// Run once before first game event
await firestore.collection('gameState').doc('current').set({
  activeQuestionId: null,
  phase: 'idle',
  isGongActive: false,
  results: null,
  updatedAt: FieldValue.serverTimestamp()
});
```

**Test Data Seeding** (for development):
```typescript
// Seed questions, guests, and answers for local testing
// Script location: apps/api-server/scripts/seed-data.ts
```

---

## Relationship Diagram

```
┌─────────────┐
│  questions  │
│  (many)     │
└──────┬──────┘
       │
       │ activeQuestionId
       │
       ▼
┌─────────────┐         ┌─────────────┐
│  gameState  │◄────────│   answers   │
│  (singleton)│         │   (many)    │
└─────────────┘         └──────┬──────┘
                               │
                               │ guestId
                               │
                               ▼
                        ┌─────────────┐
                        │   guests    │
                        │   (many)    │
                        └─────────────┘
```

**Relationships**:
- `gameState.activeQuestionId` → `questions.id` (nullable foreign key)
- `answers.questionId` → `questions.id` (foreign key)
- `answers.guestId` → `guests.id` (foreign key)
- `gameState.results.top10[].guestId` → `guests.id` (denormalized)
- `gameState.results.worst10[].guestId` → `guests.id` (denormalized)

**Denormalization Rationale**:
- Guest names copied into gameState.results to avoid N+1 queries during results display
- Trade-off: Stale names if guest updates after results calculated (acceptable for short game duration)

---

## Next Steps

Data model complete. Proceed to:
- Generate OpenAPI contract specification
- Generate quickstart.md developer guide
- Update agent context with technology stack
