# Data Model: Admin Dashboard

**Feature**: 004-admin-app
**Date**: 2025-11-03
**Related**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities managed by the admin-app dashboard. All entities are stored in Firestore and accessed via the api-server REST API. The admin-app is a **read-write client** for pre-event setup data.

---

## Entity Definitions

### 1. Question

**Purpose**: Represents a quiz question with multiple types (four_choice, sorting, survey)

**Firestore Collection**: `questions`

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | Auto (Firestore) | - | Unique question identifier (Firestore doc ID) |
| `period` | number | Yes | >= 1 | Quiz round/period number (groups questions) |
| `questionNumber` | number | Yes | >= 1 | Order within period (for display sorting) |
| `type` | string | Yes | Enum: "four_choice", "sorting", "survey" | Question format type |
| `text` | string | Yes | 1-500 chars | Question text displayed to players |
| `vtrUrl` | string | No | Valid URL or empty | Optional video URL (YouTube, Vimeo, etc.) |
| `choices` | array | Yes | 2-4 items | Array of Choice objects (see below) |
| `correctAnswer` | string | Conditional | Depends on type | Correct answer (see Answer Format below) |
| `skipAttributes` | array | No | String array | Tags for guest targeting (e.g., ["groom_family", "speech_guest"]) |
| `createdAt` | timestamp | Auto | - | Firestore server timestamp |
| `updatedAt` | timestamp | Auto | - | Firestore server timestamp |

**Choice Object** (nested within `choices` array):

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | Yes | "A", "B", "C", "D" | Choice identifier (letter) |
| `text` | string | Yes | 1-200 chars | Choice text |
| `imageUrl` | string | No | Valid HTTPS URL or empty | Optional image for visual choices |

**Answer Format** (based on `type`):

- **four_choice**: Single letter (e.g., `"C"`) matching a choice ID
- **sorting**: Comma-separated letters in correct order (e.g., `"B,D,A,C"`)
- **survey**: Empty string or null (survey questions have no correct answer)

**Validation Rules**:

- Combination of (`period`, `questionNumber`) MUST be unique across all questions
- `choices` array length MUST match question type:
  - `four_choice`: exactly 4 choices
  - `sorting`: 2-4 choices
  - `survey`: 2-4 choices
- `correctAnswer` MUST reference valid choice IDs from `choices` array
- `skipAttributes` array MUST contain valid attribute tags (validated against Guest.attributes)

**Example**:

```json
{
  "id": "q3p2",
  "period": 2,
  "questionNumber": 3,
  "type": "four_choice",
  "text": "Where did the couple meet?",
  "vtrUrl": "https://www.youtube.com/watch?v=example",
  "choices": [
    { "id": "A", "text": "Coffee shop", "imageUrl": "" },
    { "id": "B", "text": "University", "imageUrl": "https://example.com/image.jpg" },
    { "id": "C", "text": "Mutual friend", "imageUrl": "" },
    { "id": "D", "text": "Online", "imageUrl": "" }
  ],
  "correctAnswer": "B",
  "skipAttributes": [],
  "createdAt": "2025-11-03T10:00:00Z",
  "updatedAt": "2025-11-03T10:00:00Z"
}
```

---

### 2. Guest

**Purpose**: Represents a pre-registered wedding guest with unique authentication token

**Firestore Collection**: `guests`

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `guestId` | string | Auto (Firestore) | - | Unique guest identifier (Firestore doc ID) |
| `name` | string | Yes | 1-100 chars | Guest display name |
| `tableNumber` | number | Yes | >= 1 | Seating table assignment |
| `attributes` | array | No | String array | Tags for question targeting (e.g., ["groom_friend", "bride_family"]) |
| `authToken` | string | Auto (server) | 32-byte random | One-time-use token for QR code authentication |
| `authTokenUsed` | boolean | Auto | Default: false | Tracks if guest has redeemed their token |
| `firebaseUid` | string | Auto (on auth) | - | Firebase Anonymous Auth UID (set after QR code scan) |
| `createdAt` | timestamp | Auto | - | Firestore server timestamp |
| `lastLoginAt` | timestamp | Auto | - | Last authentication timestamp (null until first login) |

**Validation Rules**:

- `authToken` MUST be generated server-side using cryptographically secure random (crypto.randomBytes)
- `authToken` MUST be unique across all guests
- `name` SHOULD NOT contain special characters beyond basic punctuation
- `attributes` array values MUST match Question.skipAttributes vocabulary

**Example**:

```json
{
  "guestId": "guest123",
  "name": "John Doe",
  "tableNumber": 5,
  "attributes": ["groom_friend", "speech_guest"],
  "authToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "authTokenUsed": false,
  "firebaseUid": null,
  "createdAt": "2025-11-03T09:00:00Z",
  "lastLoginAt": null
}
```

---

### 3. GameSettings

**Purpose**: Global game configuration settings (stored in gameState/live document)

**Firestore Document**: `gameState/live` (nested within `settings` object)

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `defaultDropoutRule` | string | Yes | Enum: "period", "worst_one" | How players are eliminated |
| `defaultRankingRule` | string | Yes | Enum: "time", "point" | How players are ranked |

**Dropout Rule Options**:

- `"period"`: Players eliminated at end of each period based on performance
- `"worst_one"`: Lowest-scoring player eliminated after each question

**Ranking Rule Options**:

- `"time"`: Faster correct answers rank higher (speed + accuracy)
- `"point"`: Only accuracy matters (correct answer = points, no time bonus)

**Example**:

```json
{
  "gameState": {
    "live": {
      "settings": {
        "defaultDropoutRule": "period",
        "defaultRankingRule": "time"
      }
    }
  }
}
```

---

## Entity Relationships

```
Question (1:N) Choices
  - A question has 2-4 choices
  - Choices are embedded objects, not separate documents

Guest (1:1) Firebase Anonymous Auth UID
  - After QR code scan, guest is linked to Firebase UID
  - Relationship stored via `firebaseUid` field

Question (N:M) Guest (via skipAttributes)
  - Questions with skipAttributes target specific guest groups
  - Implicit relationship (no join table)
  - Example: Question with skipAttributes=["groom_family"] only shown to guests with "groom_family" attribute
```

---

## State Transitions

### Question Lifecycle

```
[Created] → [Active in Quiz] → [Archived]
```

**States**:
- **Created**: Question exists in Firestore but not used in any quiz session
- **Active**: Question is currently being presented in a live quiz (tracked by gameState/live)
- **Archived**: Question has been used in a completed quiz (historical data)

**State Triggers**:
- Created → Active: Host starts question in host-app
- Active → Archived: Quiz session completes

**Admin Operations**:
- **Create**: Any time (adds to question pool)
- **Edit**: Only when **not Active** (prevents mid-quiz changes)
- **Delete**: Only when **not Active** (prevents deleting active questions)

### Guest Authentication Flow

```
[Pre-Registered] → [Token Generated] → [QR Code Scanned] → [Authenticated]
```

**States**:
- **Pre-Registered**: Guest record created, `authToken` generated, `authTokenUsed=false`
- **Token Generated**: QR code URL includes token: `https://[app]/join?token=[authToken]`
- **QR Code Scanned**: Guest opens participant-app via QR code, token is validated
- **Authenticated**: participant-app exchanges token for Firebase Anonymous Auth, `authTokenUsed=true`, `firebaseUid` set

**Admin Operations**:
- **Create**: Generates new guest with unique token
- **Edit**: Can update name, table, attributes (token remains unchanged)
- **Delete**: Only when `authTokenUsed=false` (prevents deleting active participants)

---

## Firestore Indexes

### Required Composite Indexes

**questions Collection**:

```
Index: period (ASC) + questionNumber (ASC)
Purpose: Efficient queries for displaying questions grouped by period and sorted by number
```

**guests Collection**:

```
Index: authToken (ASC)
Purpose: Fast lookup when participant-app validates QR code token
```

```
Index: tableNumber (ASC) + name (ASC)
Purpose: Guest list display sorted by table and name
```

---

## Data Constraints

### Business Rules

1. **Question Uniqueness**: No two questions can have the same (`period`, `questionNumber`) combination
2. **Guest Token Uniqueness**: All `authToken` values must be globally unique
3. **Image Size Limits**: `imageUrl` references must point to images ≤ 5MB
4. **CSV Import**: Bulk guest creation must validate all fields before committing (atomic operation)

### Firestore Limits (per Firebase documentation)

- **Document Size**: Max 1 MB per question document (includes all choices)
- **Array Fields**: Max 20,000 items per array (choices array safely within limit)
- **String Fields**: Max 1,048,487 bytes (UTF-8) per string field
- **Batch Writes**: Max 500 operations per batch (for CSV bulk import)

---

## API Contract Summary

The admin-app interacts with these entities via the api-server REST API:

**Questions**:
- `GET /admin/quizzes` - Fetch all questions
- `POST /admin/quizzes` - Create new question
- `PUT /admin/quizzes/{quizId}` - Update existing question
- `DELETE /admin/quizzes/{quizId}` - Delete question (if not active)

**Guests**:
- `GET /admin/guests` - Fetch all guests
- `POST /admin/guests` - Create new guest (generates authToken)
- `PUT /admin/guests/{guestId}` - Update guest (name, table, attributes)
- `DELETE /admin/guests/{guestId}` - Delete guest (if token not used)

**Settings**:
- `GET /admin/settings` - Fetch game settings
- `PUT /admin/settings` - Update game settings (dropoutRule, rankingRule)

See [contracts/api-server.yaml](./contracts/api-server.yaml) for full OpenAPI specification.

---

## Shared Type Definitions

All types are defined in `/packages/types/src/` and shared between api-server and admin-app:

**TypeScript Interfaces** (packages/types/src/Question.ts):
```typescript
export interface Question {
  id: string;
  period: number;
  questionNumber: number;
  type: 'four_choice' | 'sorting' | 'survey';
  text: string;
  vtrUrl?: string;
  choices: Choice[];
  correctAnswer: string;
  skipAttributes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Choice {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string;
}
```

**Zod Schemas** (packages/types/src/validators/question.ts):
```typescript
import { z } from 'zod';

export const ChoiceSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1).max(200),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const CreateQuestionSchema = z.object({
  period: z.number().int().min(1),
  questionNumber: z.number().int().min(1),
  type: z.enum(['four_choice', 'sorting', 'survey']),
  text: z.string().min(1).max(500),
  vtrUrl: z.string().url().optional().or(z.literal('')),
  choices: z.array(ChoiceSchema).min(2).max(4),
  correctAnswer: z.string(),
  skipAttributes: z.array(z.string()).optional(),
});
```

These schemas are used for:
- **API validation** (api-server validates request bodies)
- **Client-side validation** (admin-app validates forms before submission)
- **Type generation** (TypeScript types derived from Zod schemas)
