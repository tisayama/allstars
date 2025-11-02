# Data Model: API Server Refinement

**Feature**: 002-api-server-refinement
**Date**: 2025-11-02
**Database**: Firebase Firestore

## Overview

This document defines the Firestore data model for the refined API server implementation. All changes from 001-api-server are marked with **[CHANGED]** or **[NEW]**.

## Firestore Collections & Documents

### 1. GameState Collection

**Path**: `gameState/live` **[CHANGED from `gameState/current`]**

**Purpose**: Stores the current state of the active game session

**Structure**:
```typescript
interface GameState {
  currentQuestionId: string | null;        // ID of current question being played
  phase: GamePhase;                        // Current game phase
  isGongActive: boolean;                   // Whether gong can be triggered
  prizeCarryover: number;                  // Accumulated prize from all-incorrect questions [NEW]
  questionsAsked: number;                  // Count of questions asked in current game
  createdAt: Timestamp;                    // Game creation timestamp
  updatedAt: Timestamp;                    // Last update timestamp
}

type GamePhase =
  | 'accepting_answers'
  | 'showing_distribution'
  | 'showing_correct_answer'
  | 'showing_results'
  | 'all_incorrect'                        // [NEW] All guests answered incorrectly
  | 'all_revived';                         // [NEW] All dropped guests were revived
```

**Validation Rules**:
- `prizeCarryover` MUST be >= 0
- `questionsAsked` MUST be >= 0
- `phase` MUST be one of the 6 valid GamePhase values
- `currentQuestionId` MUST be null or reference an existing question document

**State Transitions**:
```
Initial: null → accepting_answers
Normal flow: accepting_answers → showing_distribution → showing_correct_answer → showing_results → accepting_answers
All incorrect: showing_results → all_incorrect → accepting_answers
All revived: any phase → all_revived → accepting_answers
```

**Indexes**: None required (single document)

---

### 2. Guests Collection

**Path**: `guests/{guestId}`

**Purpose**: Stores information about game participants

**Structure**:
```typescript
interface Guest {
  id: string;                              // Unique guest identifier (matches document ID)
  name: string;                            // Display name
  status: GuestStatus;                     // Current participation status [CHANGED]
  score: number;                           // Total winnings accumulated
  createdAt: Timestamp;                    // Registration timestamp
  updatedAt: Timestamp;                    // Last update timestamp
}

type GuestStatus = 'active' | 'dropped';   // [CHANGED from 'alive' | 'eliminated']
```

**Validation Rules**:
- `id` MUST match document ID
- `name` MUST be non-empty string
- `status` MUST be either 'active' or 'dropped'
- `score` MUST be >= 0

**Indexes**:
- Composite: `status` ASC, `score` DESC (for leaderboard queries)

---

### 3. Questions Collection

**Path**: `questions/{questionId}`

**Purpose**: Stores quiz questions with answer options

**Structure**:
```typescript
interface Question {
  id: string;                              // Unique question identifier (matches document ID)
  text: string;                            // Question text
  options: AnswerOption[];                 // Array of answer choices
  correctAnswerId: string;                 // ID of the correct answer
  prize: number;                           // Base prize amount for this question
  deadline: Timestamp;                     // When answer submission period ends [NEW]
  submittedCount: number;                  // Count of submitted answers
  answersDistribution: Record<string, number>; // Map of answerId → count
  createdAt: Timestamp;                    // Question creation timestamp
  updatedAt: Timestamp;                    // Last update timestamp
}

interface AnswerOption {
  id: string;                              // Unique answer identifier
  text: string;                            // Answer text
}
```

**Validation Rules**:
- `options` MUST have 2-6 choices
- `correctAnswerId` MUST be one of the option IDs
- `prize` MUST be > 0
- `deadline` MUST be in the future when question starts
- `answersDistribution` keys MUST match option IDs

**Indexes**:
- Single field: `createdAt` DESC (for listing questions)

---

### 4. Answers Sub-collection

**Path**: `questions/{questionId}/answers/{guestId}` **[CHANGED from top-level `answers` collection]**

**Purpose**: Stores guest answers to questions

**Structure**:
```typescript
interface Answer {
  guestId: string;                         // ID of guest who submitted (matches document ID)
  answerId: string;                        // ID of selected answer option
  submittedAt: Timestamp;                  // Submission timestamp
  isCorrect: boolean;                      // Whether answer is correct (calculated after deadline)
}
```

**Validation Rules**:
- `guestId` MUST match document ID
- `guestId` MUST reference an existing guest with `status: 'active'`
- `answerId` MUST be one of the question's option IDs
- `submittedAt` MUST be before question deadline
- Answer can be updated (latest overwrites previous)

**Indexes**:
- Single field: `submittedAt` ASC (for timing analysis)
- Parent collection query optimization handled by Firestore automatically

**Write Pattern**:
```typescript
// Set with merge to allow answer updates
db.collection('questions')
  .doc(questionId)
  .collection('answers')
  .doc(guestId)
  .set(answerData, { merge: true });
```

---

## Data Access Patterns

### Read Patterns

1. **Get Current Game State**
   ```typescript
   const gameState = await db.collection('gameState').doc('live').get();
   ```

2. **Get Active Guests**
   ```typescript
   const guests = await db.collection('guests')
     .where('status', '==', 'active')
     .get();
   ```

3. **Get Question with Answers**
   ```typescript
   const question = await db.collection('questions').doc(questionId).get();
   const answers = await db.collection('questions')
     .doc(questionId)
     .collection('answers')
     .get();
   ```

4. **Check Guest Answer for Question**
   ```typescript
   const answer = await db.collection('questions')
     .doc(questionId)
     .collection('answers')
     .doc(guestId)
     .get();
   ```

### Write Patterns

1. **Update Game State (with Transaction)**
   ```typescript
   await db.runTransaction(async (transaction) => {
     const gameStateRef = db.collection('gameState').doc('live');
     const gameState = await transaction.get(gameStateRef);

     transaction.update(gameStateRef, {
       phase: 'showing_distribution',
       updatedAt: FieldValue.serverTimestamp()
     });
   });
   ```

2. **Submit Answer (Idempotent)**
   ```typescript
   await db.collection('questions')
     .doc(questionId)
     .collection('answers')
     .doc(guestId)
     .set({
       guestId,
       answerId,
       submittedAt: FieldValue.serverTimestamp(),
       isCorrect: false // Updated later
     }, { merge: true });
   ```

3. **Revive All Guests (Batch Write)**
   ```typescript
   const batch = db.batch();
   const guests = await db.collection('guests').get();

   guests.forEach(guestDoc => {
     batch.update(guestDoc.ref, { status: 'active' });
   });

   await batch.commit();
   ```

4. **Drop Guest**
   ```typescript
   await db.collection('guests').doc(guestId).update({
     status: 'dropped',
     updatedAt: FieldValue.serverTimestamp()
   });
   ```

---

## Concurrency & Consistency

### Transaction Usage

**MUST use transactions for**:
- Game state phase transitions (FR-014)
- Concurrent game state reads and updates
- Operations requiring atomic multi-document updates

**Example: Phase Transition**
```typescript
await db.runTransaction(async (transaction) => {
  const gameStateRef = db.collection('gameState').doc('live');
  const gameState = await transaction.get(gameStateRef);

  // Validate current phase
  if (gameState.data()?.phase !== 'accepting_answers') {
    throw new Error('Cannot advance from current phase');
  }

  // Update phase
  transaction.update(gameStateRef, {
    phase: 'showing_distribution',
    updatedAt: FieldValue.serverTimestamp()
  });
});
```

### Write Contention

**Low contention areas**:
- Answer submissions (separate documents per guest/question)
- Guest updates (separate documents per guest)

**High contention areas**:
- Game state document (single document, frequent updates)
- Question `submittedCount` field (incremented on each answer)

**Mitigation**:
- Use transactions for game state updates (Firestore retries on contention)
- Use `FieldValue.increment()` for counters to avoid read-modify-write
- Wrap operations in retry logic (see research.md)

---

## Migration from 001-api-server

### Document Path Changes

| Old Path | New Path | Migration Required |
|----------|----------|-------------------|
| `gameState/current` | `gameState/live` | Rename document |
| `answers/{answerId}` | `questions/{questionId}/answers/{guestId}` | Restructure collection |

### Field Changes

| Collection | Field | Old Value | New Value |
|------------|-------|-----------|-----------|
| GameState | phase | (5 values) | (6 values: add `all_incorrect`, `all_revived`) |
| GameState | prizeCarryover | N/A | Add field (default: 0) |
| Guest | status | `'alive' \| 'eliminated'` | `'active' \| 'dropped'` |
| Question | deadline | N/A | Add field (Timestamp) |

### Migration Script Outline

```typescript
// Run during deployment in controlled environment
async function migrateFirestoreSchema() {
  const db = admin.firestore();

  // 1. Rename gameState document
  const oldGameState = await db.collection('gameState').doc('current').get();
  if (oldGameState.exists) {
    await db.collection('gameState').doc('live').set(oldGameState.data()!);
    await db.collection('gameState').doc('current').delete();
  }

  // 2. Add prizeCarryover field
  await db.collection('gameState').doc('live').update({
    prizeCarryover: 0
  });

  // 3. Update guest status values
  const guests = await db.collection('guests').get();
  const batch = db.batch();

  guests.forEach(guestDoc => {
    const data = guestDoc.data();
    const newStatus = data.status === 'alive' ? 'active' : 'dropped';
    batch.update(guestDoc.ref, { status: newStatus });
  });

  await batch.commit();

  // 4. Migrate answers to sub-collections
  // NOTE: This requires knowing which question each answer belongs to
  // May need to infer from answer timestamps or question order
  const oldAnswers = await db.collection('answers').get();

  // Migration logic depends on how to determine questionId for each answer
  // This may require application-specific logic or manual data cleanup
}
```

---

## Security Rules

Firestore Security Rules should be updated to enforce access control:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function: Check if user is host
    function isHost() {
      return isAuthenticated() && request.auth.token.role == 'host';
    }

    // Helper function: Check if user is guest
    function isGuest() {
      return isAuthenticated() && request.auth.token.role == 'guest';
    }

    // Game state: Read-only for all authenticated users, write for hosts only
    match /gameState/{docId} {
      allow read: if isAuthenticated();
      allow write: if isHost();
    }

    // Guests: Read for all authenticated, write for hosts only
    match /guests/{guestId} {
      allow read: if isAuthenticated();
      allow write: if isHost();
    }

    // Questions: Read for all authenticated, write for hosts only
    match /questions/{questionId} {
      allow read: if isAuthenticated();
      allow write: if isHost();

      // Answers sub-collection: Guests can write their own answers
      match /answers/{guestId} {
        allow read: if isAuthenticated();
        allow write: if isGuest() && request.auth.uid == guestId;
      }
    }
  }
}
```

**Note**: These rules are defensive. The API server already enforces authorization, but security rules provide defense-in-depth.

---

## Summary

### Key Changes from 001-api-server

1. **GameState document**: Renamed to `gameState/live`, added `prizeCarryover` field, expanded `phase` enum
2. **Guest status**: Changed from `'alive'/'eliminated'` to `'active'/'dropped'`
3. **Answer storage**: Moved from top-level collection to sub-collection under questions
4. **Question deadline**: Added `deadline` field for answer submission cutoff

### Performance Characteristics

- **Reads**: Fast (single document or collection query)
- **Writes**: Subject to Firestore limits (~1 write/sec per document for sustained writes)
- **Contention**: Game state is hotspot; answers are isolated
- **Scalability**: Supports ~10-50 concurrent guests per game session

### Next Steps

Phase 1 continues with:
- Create OpenAPI contract updates (contracts/api-server.yaml)
- Create quickstart.md for local development
- Update agent context with new technologies
