# Data Model: End-to-End Testing Infrastructure

**Feature**: 008-e2e-playwright-tests
**Date**: 2025-01-04
**Purpose**: Define test data structures, fixtures, and validation schemas

## Overview

This document defines the data model for E2E test infrastructure. Unlike application features, this "data model" focuses on **test data structures** (fixtures, test configurations, helper state) rather than production entities. The E2E tests **consume** existing production data models from `/packages/types/` but do not define new production entities.

## Test Infrastructure Entities

### 1. TestRunContext

**Purpose**: Maintains state for a single test run to enable parallel execution isolation

**Structure**:
```typescript
interface TestRunContext {
  /** Unique identifier for this test run (UUID) */
  runId: string;

  /** Collection prefix for Firestore isolation (e.g., "test_1704369600000_a1b2c3d4_") */
  collectionPrefix: string;

  /** Timestamp when test run started */
  startTime: number;

  /** Browser contexts for each app */
  contexts: {
    projector?: BrowserContext;
    host?: BrowserContext;
    guestA?: BrowserContext;
    guestB?: BrowserContext;
    guestC?: BrowserContext;
    admin?: BrowserContext;
  };

  /** Process handles for cleanup */
  processes: {
    emulators?: ChildProcess;
    apiServer?: ChildProcess;
    socketServer?: ChildProcess;
    apps?: ChildProcess[]; // Frontend apps
  };
}
```

**Lifecycle**:
1. **Created**: In Playwright `globalSetup` or test fixture
2. **Used**: Throughout test execution for context and data isolation
3. **Destroyed**: In `globalTeardown` or test fixture cleanup

**Validation Rules**:
- `runId` MUST be unique per test execution (UUID v4)
- `collectionPrefix` MUST follow pattern `test_${timestamp}_${uuid}_` to enable cleanup and debugging
- All browser contexts MUST be closed in teardown
- All child processes MUST be terminated in teardown

---

### 2. TestQuestion (Fixture)

**Purpose**: Pre-defined question data for tests, typed using production `Question` interface from `/packages/types/`

**Structure**:
```typescript
import { Question } from '@allstars/types';

interface TestQuestion extends Omit<Question, 'questionId'> {
  /** Test-friendly identifier (e.g., "Q1_EASY_4CHOICE") */
  testId: string;

  /** Optional description for test readability */
  description?: string;
}

// Example fixture
const QUESTION_4CHOICE_EASY: TestQuestion = {
  testId: 'Q1_EASY_4CHOICE',
  description: 'Easy 4-choice question for basic flow testing',
  questionText: 'What is the capital of France?',
  questionType: '4-choice',
  choices: [
    { id: 'A', text: 'London', isCorrect: false },
    { id: 'B', text: 'Paris', isCorrect: true },
    { id: 'C', text: 'Berlin', isCorrect: false },
    { id: 'D', text: 'Madrid', isCorrect: false },
  ],
  period: 'first-half',
  questionNumber: 1,
  skipAttributes: [],
  basePrize: 10000,
};
```

**Lifecycle**:
1. **Defined**: In `tests/e2e/fixtures/questions.ts` as constants
2. **Used**: Injected into tests via Playwright fixtures or directly imported
3. **Stored**: Created in Firestore using Admin SDK with `collectionPrefix`

**Validation Rules**:
- MUST conform to production `Question` interface from `/packages/types/`
- `testId` MUST be unique within fixture file for test readability
- `choices` array MUST have exactly one `isCorrect: true` for 4-choice questions
- `questionType` MUST be one of: `'4-choice' | 'sorting'`

---

### 3. TestGuest (Fixture)

**Purpose**: Pre-defined guest data for tests, typed using production `Guest` interface from `/packages/types/`

**Structure**:
```typescript
import { Guest } from '@allstars/types';

interface TestGuest extends Omit<Guest, 'guestId' | 'joinToken'> {
  /** Test-friendly identifier (e.g., "GUEST_A") */
  testId: string;

  /** Optional description for test readability */
  description?: string;
}

// Example fixture
const GUEST_A_NORMAL: TestGuest = {
  testId: 'GUEST_A',
  description: 'Normal guest with no special attributes',
  name: 'Guest A',
  status: 'active',
  attributes: [],
  authMethod: 'anonymous',
};

const GUEST_B_SPEECH: TestGuest = {
  testId: 'GUEST_B',
  description: 'Guest with speech_guest attribute (skips certain questions)',
  name: 'Guest B',
  status: 'active',
  attributes: ['speech_guest'],
  authMethod: 'anonymous',
};
```

**Lifecycle**:
1. **Defined**: In `tests/e2e/fixtures/guests.ts` as constants
2. **Used**: Created in Firestore via Admin SDK, generates `guestId` and `joinToken`
3. **Authenticated**: Tests navigate to join URL with token, Firebase Anonymous Auth links to guest

**Validation Rules**:
- MUST conform to production `Guest` interface from `/packages/types/`
- `testId` MUST be unique within fixture file
- `status` MUST be one of: `'active' | 'dropped' | 'waiting'`
- `authMethod` MUST be `'anonymous'` for participants, `'google'` for admin

---

### 4. TestGameState (Fixture)

**Purpose**: Pre-defined game state scenarios for testing different phases

**Structure**:
```typescript
import { GameState } from '@allstars/types';

interface TestGameState extends Partial<GameState> {
  /** Test-friendly identifier (e.g., "STATE_READY_FOR_NEXT") */
  testId: string;

  /** Optional description for test readability */
  description?: string;
}

// Example fixture
const STATE_READY_FOR_NEXT: TestGameState = {
  testId: 'STATE_READY_FOR_NEXT',
  description: 'Initial state before any questions started',
  currentPhase: 'ready_for_next',
  currentQuestion: null,
  isGongActive: false,
  results: null,
  prizeCarryover: 0,
};

const STATE_ACCEPTING_ANSWERS: TestGameState = {
  testId: 'STATE_ACCEPTING_ANSWERS',
  description: 'Question active, guests can submit answers',
  currentPhase: 'accepting_answers',
  currentQuestion: {
    questionId: 'question-1', // Will be replaced with actual ID
    questionText: 'Sample question',
    // ... other fields
  },
  isGongActive: false,
  results: null,
};
```

**Lifecycle**:
1. **Defined**: In `tests/e2e/fixtures/gameState.ts` as constants
2. **Used**: Set via API calls or Admin SDK during test setup
3. **Verified**: Tests assert game state transitions match expected states

**Validation Rules**:
- MUST conform to production `GameState` interface from `/packages/types/`
- `testId` MUST be unique within fixture file
- `currentPhase` MUST be one of defined `GamePhase` enum values
- `isGongActive` MUST be boolean

---

### 5. AppHealthStatus (Helper State)

**Purpose**: Tracks health check status for each app during startup

**Structure**:
```typescript
interface AppHealthStatus {
  /** App identifier */
  appName: 'admin-app' | 'host-app' | 'projector-app' | 'participant-app' | 'api-server' | 'socket-server';

  /** Health check URL */
  healthUrl: string;

  /** Current status */
  status: 'pending' | 'ready' | 'failed';

  /** Last check timestamp */
  lastCheckTime?: number;

  /** Error message if failed */
  error?: string;

  /** Number of check attempts */
  attempts: number;
}
```

**Lifecycle**:
1. **Created**: When app launch initiated in `globalSetup`
2. **Updated**: During health check polling loop
3. **Resolved**: When status becomes 'ready' or 'failed'

**Validation Rules**:
- `status` MUST transition: `pending` → `ready` OR `pending` → `failed`
- `attempts` MUST increment on each health check
- `healthUrl` MUST be valid HTTP URL

---

## Test Data Factories

### QuestionFactory

**Purpose**: Generate test questions programmatically with randomization

**API**:
```typescript
class QuestionFactory {
  /**
   * Create a 4-choice question with specified difficulty and correctness
   */
  static create4Choice(options: {
    questionNumber: number;
    period: GamePeriod;
    correctChoiceIndex: number; // 0-3
    skipAttributes?: string[];
    basePrize?: number;
  }): TestQuestion;

  /**
   * Create a sorting question with specified order
   */
  static createSorting(options: {
    questionNumber: number;
    period: GamePeriod;
    items: string[]; // Correct order
    basePrize?: number;
  }): TestQuestion;

  /**
   * Create question with all choices incorrect (for testing all_incorrect flow)
   */
  static createUnanswerable(options: {
    questionNumber: number;
    period: GamePeriod;
  }): TestQuestion;
}
```

**Usage**:
```typescript
const question = QuestionFactory.create4Choice({
  questionNumber: 1,
  period: 'first-half',
  correctChoiceIndex: 1, // Choice B is correct
  skipAttributes: ['speech_guest'],
});
```

---

### GuestFactory

**Purpose**: Generate test guests with varying attributes

**API**:
```typescript
class GuestFactory {
  /**
   * Create a normal active guest
   */
  static createNormal(name: string): TestGuest;

  /**
   * Create a guest with specific attributes
   */
  static createWithAttributes(name: string, attributes: string[]): TestGuest;

  /**
   * Create a dropped guest
   */
  static createDropped(name: string): TestGuest;

  /**
   * Create multiple guests with sequential names
   */
  static createMany(count: number, prefix: string = 'Guest'): TestGuest[];
}
```

**Usage**:
```typescript
const guests = GuestFactory.createMany(3); // ['Guest 1', 'Guest 2', 'Guest 3']
const speechGuest = GuestFactory.createWithAttributes('VIP', ['speech_guest']);
```

---

## Firestore Collection Naming Convention

### With Collection Prefix

All Firestore collections MUST use the `collectionPrefix` from `TestRunContext` to enable parallel execution:

| Production Collection | Test Collection Pattern | Example |
|-----------------------|-------------------------|---------|
| `questions` | `${prefix}questions` | `test_1704369600_a1b2_questions` |
| `guests` | `${prefix}guests` | `test_1704369600_a1b2_guests` |
| `gameState` | `${prefix}gameState` | `test_1704369600_a1b2_gameState` |
| `answers` | `${prefix}answers` | `test_1704369600_a1b2_answers` |

### Cleanup Strategy

**Option 1 (Recommended)**: Clear all emulator data in `globalSetup` before each test run
- Pros: Simple, guarantees clean state
- Cons: Cannot inspect test data post-run for debugging

**Option 2**: Delete collections matching `test_*` prefix pattern in `globalTeardown`
- Pros: Keeps data for debugging until next run
- Cons: Complexity in cleanup logic

**Decision**: Use Option 1 (clear all data at start) per clarification session findings.

---

## Data Validation

### Test Fixtures Validation

All test fixtures MUST be validated against production TypeScript interfaces from `/packages/types/` at compile time:

```typescript
import { Question, Guest, GameState } from '@allstars/types';

// TypeScript will error if fixture doesn't match interface
const validQuestion: Omit<Question, 'questionId'> = {
  questionText: 'Valid question',
  questionType: '4-choice',
  // ... all required fields
};
```

### Runtime Validation

Tests SHOULD validate Firestore data structure after creation:

```typescript
import { questionSchema } from '@allstars/types/schemas'; // Zod schemas if available

test('question created with correct structure', async ({ collectionPrefix }) => {
  const questionRef = await createQuestion(QUESTION_4CHOICE_EASY, collectionPrefix);
  const snapshot = await questionRef.get();
  const data = snapshot.data();

  // Validate against schema
  expect(() => questionSchema.parse(data)).not.toThrow();

  // Validate specific fields
  expect(data.questionType).toBe('4-choice');
  expect(data.choices).toHaveLength(4);
});
```

---

## Summary

The E2E test data model focuses on **fixtures and test infrastructure state** rather than new production entities. All test data conforms to existing production interfaces from `/packages/types/`. The collection prefix strategy enables safe parallel execution while maintaining type safety and validation.

**Key Design Decisions**:
1. **Reuse production types**: Test fixtures extend `/packages/types/` interfaces
2. **Collection prefixes for isolation**: `test_${timestamp}_${uuid}_` pattern prevents collisions
3. **Factory pattern for generation**: Simplifies test data creation with sensible defaults
4. **Compile-time validation**: TypeScript enforces type safety for all fixtures
5. **Runtime validation**: Optional Zod schema validation for extra safety

**Next Phase**: Define minimal API contracts (test helper APIs) in `contracts/` directory.
