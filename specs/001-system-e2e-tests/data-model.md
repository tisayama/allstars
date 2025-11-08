# E2E Test Data Model

**Phase 1 Output** | **Date**: 2025-11-08 | **Feature**: [spec.md](./spec.md)

## Overview

This document defines the data models, fixtures, and test data structures used in AllStars E2E testing. The data model ensures consistent test data across all test scenarios while maintaining isolation between test runs.

---

## Core Principles

1. **Test Isolation**: Each test uses unique collection prefixes to prevent data conflicts
2. **Deterministic Data**: Test data is predictable and reproducible
3. **Realistic Scenarios**: Test data mirrors production patterns
4. **Minimal Fixtures**: Tests create only the data they need
5. **Clean Slate**: Firestore cleared before each test run

---

## Test Data Entities

### 1. Question

Represents a quiz question used in game scenarios.

**Schema**:
```typescript
interface TestQuestion {
  id: string;                    // Unique identifier
  questionText: string;          // Question content
  correctAnswer: string;         // Correct answer (A, B, C, or D)
  options: {                     // Answer options
    A: string;
    B: string;
    C: string;
    D: string;
  };
  timeLimit: number;             // Time limit in seconds
  isFinalQuestion?: boolean;     // Special final question flag
  pointValue?: number;           // Points awarded for correct answer
  category?: string;             // Question category
}
```

**Factory Functions**:
```typescript
// Standard question
createTestQuestion(overrides?: Partial<TestQuestion>): TestQuestion

// Final question (gong-enabled)
createFinalQuestion(overrides?: Partial<TestQuestion>): TestQuestion

// Batch creation
createTestQuestions(count: number): TestQuestion[]
```

**Sample Data**:
```typescript
{
  id: "q1",
  questionText: "What is the capital of France?",
  correctAnswer: "A",
  options: {
    A: "Paris",
    B: "London",
    C: "Berlin",
    D: "Madrid"
  },
  timeLimit: 30,
  isFinalQuestion: false,
  pointValue: 100
}
```

### 2. Guest

Represents a participant in the game.

**Schema**:
```typescript
interface TestGuest {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  joinToken: string;             // Authentication token
  joinUrl: string;               // Full join URL with token
  status: 'active' | 'eliminated'; // Participant status
  score?: number;                // Current score
  answerHistory?: TestAnswer[];  // Previous answers
}
```

**Factory Functions**:
```typescript
// Single guest
createTestGuest(name: string, overrides?: Partial<TestGuest>): TestGuest

// Multiple guests with sequential naming
createTestGuests(count: number, prefix?: string): TestGuest[]

// Guest with predefined score
createGuestWithScore(name: string, score: number): TestGuest
```

**Sample Data**:
```typescript
{
  id: "guest_001",
  name: "Alice",
  joinToken: "abc123def456",
  joinUrl: "http://work-ubuntu:5173?token=abc123def456",
  status: "active",
  score: 250
}
```

### 3. GameSettings

Represents game configuration settings.

**Schema**:
```typescript
interface TestGameSettings {
  defaultRankingRule: 'time' | 'accuracy';  // Ranking calculation method
  defaultDropoutRule: 'worst_one' | 'worst_two' | 'worst_five' | 'none'; // Elimination rule
  showRankings: boolean;                     // Display rankings after each question
  allowLateJoin: boolean;                    // Allow participants to join mid-game
  questionTransitionDelay?: number;          // Delay between questions (seconds)
}
```

**Factory Functions**:
```typescript
// Default settings
createDefaultSettings(): TestGameSettings

// Time-based ranking settings
createTimeBasedSettings(): TestGameSettings

// Accuracy-based ranking settings
createAccuracyBasedSettings(): TestGameSettings

// Custom settings
createCustomSettings(overrides: Partial<TestGameSettings>): TestGameSettings
```

**Sample Data**:
```typescript
{
  defaultRankingRule: "time",
  defaultDropoutRule: "worst_one",
  showRankings: true,
  allowLateJoin: false,
  questionTransitionDelay: 3
}
```

### 4. GameState

Represents the current game state.

**Schema**:
```typescript
interface TestGameState {
  currentPhase: GamePhase;       // Current game phase
  currentQuestion: string | null; // Active question ID
  isGongActive: boolean;         // Gong status (final question)
  participantCount: number;      // Number of participants
  timeRemaining: number | null;  // Remaining time for current question
  lastUpdate: Timestamp;         // Last state update time
  results: GameResults | null;   // Current question results
  prizeCarryover: number;        // Carried-over prize amount
  settings: TestGameSettings | null; // Game settings
}

type GamePhase =
  | 'ready_for_next'
  | 'accepting_answers'
  | 'showing_distribution'
  | 'showing_correct_answer'
  | 'showing_results'
  | 'all_revived'
  | 'all_incorrect';
```

**Factory Functions**:
```typescript
// Initial state (ready for first question)
createInitialGameState(): TestGameState

// State with active question
createAcceptingAnswersState(questionId: string): TestGameState

// State showing results
createShowingResultsState(results: GameResults): TestGameState

// Custom state
createGameState(phase: GamePhase, overrides?: Partial<TestGameState>): TestGameState
```

**Sample Data**:
```typescript
{
  currentPhase: "ready_for_next",
  currentQuestion: null,
  isGongActive: false,
  participantCount: 0,
  timeRemaining: null,
  lastUpdate: Timestamp.now(),
  results: null,
  prizeCarryover: 0,
  settings: {
    defaultRankingRule: "time",
    defaultDropoutRule: "worst_one"
  }
}
```

### 5. Answer

Represents a participant's answer to a question.

**Schema**:
```typescript
interface TestAnswer {
  questionId: string;            // Question being answered
  guestId: string;               // Guest who answered
  answer: string;                // Selected answer (A, B, C, or D)
  responseTime: number;          // Time taken to answer (milliseconds)
  isCorrect: boolean;            // Answer correctness
  timestamp: Timestamp;          // When answer was submitted
}
```

**Factory Functions**:
```typescript
// Correct answer
createCorrectAnswer(questionId: string, guestId: string, responseTimeMs: number): TestAnswer

// Incorrect answer
createIncorrectAnswer(questionId: string, guestId: string, responseTimeMs: number): TestAnswer

// Custom answer
createAnswer(data: Partial<TestAnswer> & { questionId: string; guestId: string }): TestAnswer

// Batch answers (for multiple participants)
createBatchAnswers(questionId: string, guestIds: string[], correctness: boolean[]): TestAnswer[]
```

**Sample Data**:
```typescript
{
  questionId: "q1",
  guestId: "guest_001",
  answer: "A",
  responseTime: 2500,
  isCorrect: true,
  timestamp: Timestamp.now()
}
```

### 6. RankingResult

Represents calculated rankings for a question.

**Schema**:
```typescript
interface TestRankingResult {
  questionId: string;            // Question being ranked
  rankings: RankingEntry[];      // Sorted participant rankings
  fastestCorrect: string | null; // Guest ID of fastest correct answer
  slowestCorrect: string | null; // Guest ID of slowest correct answer
  top10: string[];               // Guest IDs of top 10 performers
  worst10: string[];             // Guest IDs of worst 10 performers
  periodChampions?: string[];    // Guest IDs of period champions
}

interface RankingEntry {
  guestId: string;
  guestName: string;
  rank: number;
  score: number;
  responseTime: number | null;
  isCorrect: boolean;
  badge?: 'fastest' | 'slowest' | 'period_champion';
}
```

**Factory Functions**:
```typescript
// Create rankings from answers
createRankingsFromAnswers(
  questionId: string,
  answers: TestAnswer[],
  guests: TestGuest[]
): TestRankingResult

// Create empty rankings
createEmptyRankings(questionId: string): TestRankingResult
```

---

## Test Fixtures

### Fixture Organization

```
tests/e2e/fixtures/
├── questions.json           # Pre-defined question sets
├── guests.csv               # Sample guest import data
├── settings.json            # Common game settings configurations
└── factories.ts             # Factory functions for test data creation
```

### Pre-defined Question Sets

**questions.json**:
```json
{
  "general_knowledge": [
    {
      "id": "q_geo_001",
      "questionText": "What is the capital of France?",
      "correctAnswer": "A",
      "options": {
        "A": "Paris",
        "B": "London",
        "C": "Berlin",
        "D": "Madrid"
      },
      "timeLimit": 30
    },
    {
      "id": "q_sci_001",
      "questionText": "What is the speed of light?",
      "correctAnswer": "C",
      "options": {
        "A": "299,000 km/s",
        "B": "300,000 km/s",
        "C": "299,792 km/s",
        "D": "298,000 km/s"
      },
      "timeLimit": 45
    }
  ],
  "final_questions": [
    {
      "id": "q_final_001",
      "questionText": "FINAL QUESTION: Who wrote 'Romeo and Juliet'?",
      "correctAnswer": "B",
      "options": {
        "A": "Charles Dickens",
        "B": "William Shakespeare",
        "C": "Jane Austen",
        "D": "Mark Twain"
      },
      "timeLimit": 60,
      "isFinalQuestion": true,
      "pointValue": 500
    }
  ]
}
```

### Sample Guest Import Data

**guests.csv**:
```csv
name,email
Alice Johnson,alice@example.com
Bob Smith,bob@example.com
Carol Williams,carol@example.com
David Brown,david@example.com
Emma Davis,emma@example.com
```

### Common Settings Configurations

**settings.json**:
```json
{
  "time_based_competitive": {
    "defaultRankingRule": "time",
    "defaultDropoutRule": "worst_one",
    "showRankings": true,
    "allowLateJoin": false
  },
  "accuracy_based_casual": {
    "defaultRankingRule": "accuracy",
    "defaultDropoutRule": "none",
    "showRankings": true,
    "allowLateJoin": true
  },
  "tournament_mode": {
    "defaultRankingRule": "time",
    "defaultDropoutRule": "worst_two",
    "showRankings": true,
    "allowLateJoin": false,
    "questionTransitionDelay": 5
  }
}
```

---

## Test Data Seeder

### Seeder Interface

```typescript
interface TestDataSeeder {
  /**
   * Seed questions into Firestore with collection prefix
   */
  seedQuestions(questions: TestQuestion[], prefix: string): Promise<void>;

  /**
   * Seed guests into Firestore with collection prefix
   * Returns guests with generated join tokens and URLs
   */
  seedGuests(guests: TestGuest[], prefix: string): Promise<TestGuest[]>;

  /**
   * Seed game state into Firestore
   */
  seedGameState(state: TestGameState, prefix: string): Promise<void>;

  /**
   * Seed game settings into Firestore
   */
  seedSettings(settings: TestGameSettings, prefix: string): Promise<void>;

  /**
   * Seed answers into Firestore
   */
  seedAnswers(answers: TestAnswer[], prefix: string): Promise<void>;

  /**
   * Clear all collections with given prefix
   */
  clearCollections(prefix: string): Promise<void>;
}
```

### Collection Prefix Strategy

**Purpose**: Isolate test data between parallel test runs

**Format**: `test_{randomString}_{collectionName}`

**Example**:
```
test_abc123_questions
test_abc123_guests
test_abc123_gameState
test_abc123_answers
test_abc123_settings
```

**Implementation**:
```typescript
// Generate unique prefix per test
const collectionPrefix = `test_${crypto.randomBytes(6).toString('hex')}`;

// Use in seeder
await seeder.seedQuestions(questions, collectionPrefix);
// Writes to: {collectionPrefix}_questions

// Clean up after test
await seeder.clearCollections(collectionPrefix);
// Deletes all collections starting with collectionPrefix
```

---

## Test Data Scenarios

### Scenario 1: Single Question Game

**Data Required**:
- 1 question (general knowledge)
- 5 guests
- Default settings (time-based ranking)
- Initial game state (ready_for_next)

**Usage**:
```typescript
const question = createTestQuestion({ id: 'q1' });
const guests = createTestGuests(5, 'Guest');
const settings = createDefaultSettings();
const gameState = createInitialGameState();

await seeder.seedQuestions([question], prefix);
await seeder.seedGuests(guests, prefix);
await seeder.seedSettings(settings, prefix);
await seeder.seedGameState(gameState, prefix);
```

### Scenario 2: Multi-Question Game with Eliminations

**Data Required**:
- 10 questions
- 50 guests
- Worst-one dropout rule
- Time-based ranking

**Usage**:
```typescript
const questions = createTestQuestions(10);
const guests = createTestGuests(50, 'Participant');
const settings = createTimeBasedSettings();
const gameState = createInitialGameState();

await seeder.seedQuestions(questions, prefix);
await seeder.seedGuests(guests, prefix);
await seeder.seedSettings(settings, prefix);
await seeder.seedGameState(gameState, prefix);
```

### Scenario 3: Final Question with Gong

**Data Required**:
- 1 final question (gong-enabled)
- 10 guests (mix of scores)
- Gong-active game state

**Usage**:
```typescript
const finalQuestion = createFinalQuestion({ id: 'q_final' });
const guests = [
  createGuestWithScore('Winner', 500),
  createGuestWithScore('Runner-up', 450),
  ...createTestGuests(8, 'Participant')
];
const settings = createDefaultSettings();
const gameState = createGameState('ready_for_next', {
  isGongActive: true,
  prizeCarryover: 1000
});

await seeder.seedQuestions([finalQuestion], prefix);
await seeder.seedGuests(guests, prefix);
await seeder.seedSettings(settings, prefix);
await seeder.seedGameState(gameState, prefix);
```

### Scenario 4: Concurrent Answer Submission

**Data Required**:
- 1 question
- 50 guests
- 50 answers with varying response times
- Accepting answers game state

**Usage**:
```typescript
const question = createTestQuestion({ id: 'q1' });
const guests = createTestGuests(50, 'Guest');
const settings = createDefaultSettings();
const gameState = createAcceptingAnswersState('q1');

// Create answers with realistic response time distribution
const answers = guests.map((guest, index) => {
  const responseTime = 1000 + Math.random() * 15000; // 1-16 seconds
  const isCorrect = Math.random() > 0.3; // 70% correct rate
  return isCorrect
    ? createCorrectAnswer(question.id, guest.id, responseTime)
    : createIncorrectAnswer(question.id, guest.id, responseTime);
});

await seeder.seedQuestions([question], prefix);
await seeder.seedGuests(guests, prefix);
await seeder.seedSettings(settings, prefix);
await seeder.seedGameState(gameState, prefix);
await seeder.seedAnswers(answers, prefix);
```

---

## Data Validation

### Question Validation

**Rules**:
- `questionText` must not be empty
- `correctAnswer` must be one of: A, B, C, D
- `options` must have exactly 4 entries (A, B, C, D)
- `timeLimit` must be positive integer
- `pointValue` (if provided) must be positive integer

### Guest Validation

**Rules**:
- `name` must not be empty
- `joinToken` must be unique across all guests
- `status` must be 'active' or 'eliminated'
- `score` (if provided) must be non-negative

### GameState Validation

**Rules**:
- `currentPhase` must be valid GamePhase value
- `currentQuestion` must exist in questions collection (if not null)
- `participantCount` must be non-negative
- `timeRemaining` must be positive (if not null)
- `prizeCarryover` must be non-negative

---

## Data Cleanup Strategy

### Per-Test Cleanup

**Pattern**: Clean before, not after
```typescript
test.beforeEach(async ({ seeder, collectionPrefix }) => {
  // Clear any leftover data from failed tests
  await seeder.clearCollections(collectionPrefix);
});
```

### Global Cleanup

**Pattern**: Clear all test data before test suite
```typescript
// In globalSetup.ts
await emulatorManager.clearData();
```

**Rationale**:
- Faster test execution (no teardown wait)
- Failed tests don't block cleanup
- Clean slate guaranteed before each run

---

## Performance Considerations

### Data Seeding Optimization

**Batch Operations**: Use Firestore batch writes for multiple documents
```typescript
const batch = firestore.batch();
questions.forEach(q => {
  batch.set(questionsRef.doc(q.id), q);
});
await batch.commit();
```

**Parallel Seeding**: Seed independent collections concurrently
```typescript
await Promise.all([
  seeder.seedQuestions(questions, prefix),
  seeder.seedGuests(guests, prefix),
  seeder.seedSettings(settings, prefix)
]);
```

### Data Volume Limits

**Recommendations**:
- Maximum 100 questions per test
- Maximum 100 guests per test
- Maximum 1000 answers per test
- Use realistic data volumes (match production scale)

---

## Summary

This data model provides:
- ✅ Consistent test data structures across all E2E tests
- ✅ Isolation via collection prefix strategy
- ✅ Reusable factory functions for common scenarios
- ✅ Pre-defined fixtures for quick test setup
- ✅ Validation rules to ensure data integrity
- ✅ Performance optimizations for fast test execution

**Next Steps**:
1. Implement factory functions in `tests/e2e/fixtures/factories.ts`
2. Create TestDataSeeder class in `tests/e2e/helpers/testDataSeeder.ts`
3. Add fixture files (questions.json, guests.csv, settings.json)
4. Integrate with Playwright custom fixtures

---

**Document Version**: 1.0
**Date**: 2025-11-08
**Phase**: Phase 1 - Complete
