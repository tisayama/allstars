# Research: API Server for Quiz Game System

**Branch**: `001-api-server` | **Date**: 2025-11-02
**Purpose**: Phase 0 research to resolve technical unknowns and document technology decisions

## Research Questions & Findings

### 1. Firebase Cloud Functions Runtime Selection

**Question**: Which Firebase Cloud Functions generation and Node.js runtime should be used?

**Decision**: Firebase Cloud Functions 2nd generation with Node.js 18 runtime

**Rationale**:
- 2nd gen provides better performance with up to 1GB RAM vs 256MB in 1st gen (critical for handling 500 concurrent requests per SC-007)
- Supports longer timeouts (60 minutes vs 9 minutes) reducing cold start impact
- Better integration with Cloud Run infrastructure for future scalability
- Node.js 18 LTS provides stable TypeScript 5.x support and native ES modules
- Firebase Admin SDK 11.x fully supports Node 18 runtime

**Alternatives Considered**:
- 1st generation Cloud Functions: Rejected due to RAM limitations and slower cold starts
- Node.js 16: Rejected as it reaches EOL in September 2023, Node 18 is current LTS
- Node.js 20: Considered but Firebase Functions 2nd gen officially supports Node 18 as latest stable

**Implementation Impact**:
- `firebase.json` runtime configuration: `"runtime": "nodejs18"`
- Package.json engines: `"engines": {"node": ">=18.0.0"}`
- Use `import/export` syntax instead of `require/module.exports`

---

### 2. Input Validation Library Selection

**Question**: Which validation library should be used for request body validation (Zod, Joi, Yup, or class-validator)?

**Decision**: Zod 3.x for runtime validation and type inference

**Rationale**:
- Native TypeScript-first design with automatic type inference (no separate DTO classes needed)
- Zero dependencies, smaller bundle size (critical for Cloud Functions cold start)
- Excellent error messages with path-based validation failures (aligns with FR-029 details array requirement)
- Seamless integration with Express middleware via `zod-express-middleware`
- Built-in transformers and refinements for complex validation (e.g., period+questionNumber uniqueness)

**Alternatives Considered**:
- Joi: Rejected due to lack of TypeScript type inference, requires manual type definitions
- Yup: Rejected due to dependency on lodash (increases bundle size)
- class-validator with class-transformer: Rejected due to decorator overhead and reflection requirements

**Implementation Impact**:
- Create schemas in `src/models/validators.ts` using Zod
- Middleware: Use `zod` validation in route handlers
- Error mapping: Transform Zod validation errors to FR-029 standardized error format

**Example Schema**:
```typescript
import { z } from 'zod';

export const CreateQuestionSchema = z.object({
  period: z.number().int().positive(),
  questionNumber: z.number().int().positive(),
  type: z.enum(['four_choice', 'true_false']),
  text: z.string().min(1).max(500),
  choices: z.array(z.string()).min(2).max(5),
  correctAnswer: z.string(),
  skipAttributes: z.array(z.string()).optional()
});
```

---

### 3. Firestore Transaction Strategy for Game State Updates

**Question**: How should Firestore transactions be implemented to prevent race conditions from concurrent host actions (FR-013)?

**Decision**: Optimistic transactions with read-modify-write pattern

**Rationale**:
- Firestore transactions automatically retry on contention (up to 5 times)
- Optimistic concurrency control ensures last-write-wins semantics (clarification #5)
- Reads within transaction see consistent snapshot preventing phantom reads
- Transaction isolation prevents intermediate states from being visible
- Automatic rollback on failure ensures atomicity

**Alternatives Considered**:
- Pessimistic locking with distributed locks: Rejected due to added complexity and Firestore doesn't support native locks
- Queue-based sequential processing: Rejected as it violates stateless design (FR-028) and adds latency
- Optimistic locking with version fields: Rejected as Firestore transactions provide built-in version control

**Implementation Pattern**:
```typescript
await firestore.runTransaction(async (transaction) => {
  const gameStateRef = firestore.collection('gameState').doc('current');
  const gameStateDoc = await transaction.get(gameStateRef);

  if (!gameStateDoc.exists) {
    throw new Error('Game state not found');
  }

  const currentState = gameStateDoc.data();

  // Validate action against current state (FR-012)
  if (action === 'SHOW_DISTRIBUTION' && currentState.phase !== 'accepting_answers') {
    throw new ValidationError('Cannot show distribution before accepting answers');
  }

  // Apply state transition
  const newState = applyAction(currentState, action, payload);

  transaction.update(gameStateRef, newState);

  return newState;
});
```

**Performance Considerations**:
- Transaction retries count toward SC-004 (2 second target)
- Expect <5ms per transaction under normal load
- Contention probability low (single host user, sequential game flow)
- Firebase Emulator Suite allows testing transaction behavior locally

---

### 4. Duplicate Answer Submission Prevention

**Question**: How should duplicate answer submissions be prevented (FR-025 and clarification #1) - database constraint or application logic?

**Decision**: Firestore composite unique index + application-level check within transaction

**Rationale**:
- Firestore composite indexes on `(guestId, questionId)` enable efficient duplicate detection
- Transaction-based check ensures atomic read-check-write preventing race conditions
- Application logic allows custom error messages (FR-029 error format)
- Firestore query: `answers.where('guestId', '==', guestId).where('questionId', '==', questionId)` is indexed

**Alternatives Considered**:
- Document ID as composite key: Rejected as it complicates answer retrieval patterns
- In-memory deduplication: Rejected as it violates stateless design (FR-028)
- Client-side prevention only: Rejected as it's not secure (clients can be bypassed)

**Implementation Strategy**:
```typescript
await firestore.runTransaction(async (transaction) => {
  const duplicateQuery = firestore.collection('answers')
    .where('guestId', '==', guestId)
    .where('questionId', '==', questionId)
    .limit(1);

  const existing = await transaction.get(duplicateQuery);

  if (!existing.empty) {
    throw new ValidationError('DUPLICATE_ANSWER', 'Answer already submitted for this question');
  }

  const answerRef = firestore.collection('answers').doc();
  transaction.create(answerRef, {
    guestId,
    questionId,
    answer,
    responseTimeMs,
    isCorrect,
    timestamp: FieldValue.serverTimestamp()
  });
});
```

**Firestore Index Configuration** (firebase.json):
```json
{
  "firestore": {
    "indexes": [
      {
        "collectionGroup": "answers",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "guestId", "order": "ASCENDING" },
          { "fieldPath": "questionId", "order": "ASCENDING" }
        ]
      }
    ]
  }
}
```

---

### 5. Error Response Standardization

**Question**: What structure should the standardized error response use (FR-029 and clarification #2)?

**Decision**: RFC 7807 Problem Details-inspired JSON structure

**Rationale**:
- Industry-standard format widely understood by HTTP clients
- Extensible with custom fields while maintaining compatibility
- Clear separation between machine-readable (code) and human-readable (message)
- Details array supports field-level validation errors (Zod integration)
- Compatible with OpenAPI 3.0 error schema definitions

**Error Response Schema**:
```typescript
interface ErrorResponse {
  code: string;           // Machine-readable error code (e.g., "DUPLICATE_ANSWER", "UNAUTHORIZED")
  message: string;        // Human-readable error description
  details: Array<{        // Optional additional context
    field?: string;       // Field name for validation errors
    message: string;      // Detailed explanation
    value?: any;          // Actual value that caused error
  }>;
}
```

**Example Responses**:

*Duplicate Answer*:
```json
{
  "code": "DUPLICATE_ANSWER",
  "message": "Answer already submitted for this question",
  "details": [
    {
      "field": "questionId",
      "message": "Guest has already answered question q001",
      "value": "q001"
    }
  ]
}
```

*Validation Error*:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "period",
      "message": "Expected positive integer, received -1",
      "value": -1
    },
    {
      "field": "correctAnswer",
      "message": "Must be one of the provided choices",
      "value": "F"
    }
  ]
}
```

*Firestore Unavailable*:
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Database temporarily unavailable, please retry",
  "details": []
}
```

**HTTP Status Code Mapping**:
- 400 Bad Request: `VALIDATION_ERROR`, `INVALID_CHOICE`, `DUPLICATE_PERIOD_QUESTION`
- 401 Unauthorized: `UNAUTHORIZED`, `INVALID_TOKEN`, `EXPIRED_TOKEN`
- 403 Forbidden: `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`
- 404 Not Found: `QUESTION_NOT_FOUND`, `GUEST_NOT_FOUND`
- 409 Conflict: `DUPLICATE_ANSWER`, `INVALID_GAME_STATE`
- 503 Service Unavailable: `SERVICE_UNAVAILABLE`, `FIRESTORE_UNAVAILABLE`

---

### 6. Server Time Synchronization Implementation

**Question**: How should server time synchronization achieve <50ms variance (SC-005)?

**Decision**: HTTP response with server timestamp + client-side offset calculation

**Rationale**:
- Server returns `Date.now()` as millisecond Unix timestamp
- Client measures round-trip time (RTT) and calculates offset: `serverTime + (RTT / 2)`
- Multiple samples with median filtering reduce network jitter impact
- No need for NTP or complex protocols, HTTP is sufficient for 50ms target
- Stateless endpoint (no session required) aligns with FR-028

**Implementation**:
```typescript
app.get('/participant/time', (req, res) => {
  res.status(200).json({
    serverTime: Date.now()
  });
});
```

**Client-Side Synchronization** (for frontend reference):
```typescript
async function synchronizeTime(): Promise<number> {
  const samples = [];

  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const response = await fetch('/participant/time');
    const end = performance.now();
    const { serverTime } = await response.json();

    const rtt = end - start;
    const offset = serverTime - Date.now() + (rtt / 2);
    samples.push(offset);
  }

  // Use median to filter outliers
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}
```

**Performance Validation**:
- Measure actual variance in Firebase Emulator Suite
- Target: 5 samples in <500ms total
- Expected RTT: 10-30ms on local network, 50-100ms on internet
- Variance should be <50ms after offset calculation

---

### 7. Worst/Top 10 Calculation Algorithm

**Question**: How should worst/top 10 performers be calculated (FR-018 and assumption clarification)?

**Decision**: Firestore query-based sorting with correctness priority, then response time tiebreaker

**Rationale**:
- Firestore supports composite indexes for multi-field sorting
- Correctness is binary (true/false), making it primary sort field
- Response time breaks ties among correct/incorrect answers
- Query approach scales better than fetching all and sorting in memory
- Single query for top 10, separate query for worst 10

**Sorting Logic**:
1. **Top 10**: `isCorrect DESC, responseTimeMs ASC` (correct answers with fastest times first)
2. **Worst 10**: `isCorrect ASC, responseTimeMs DESC` (incorrect answers with slowest times first)

**Firestore Query Implementation**:
```typescript
// Top 10 performers
const top10 = await firestore.collection('answers')
  .where('questionId', '==', currentQuestionId)
  .orderBy('isCorrect', 'desc')
  .orderBy('responseTimeMs', 'asc')
  .limit(10)
  .get();

// Worst 10 performers
const worst10 = await firestore.collection('answers')
  .where('questionId', '==', currentQuestionId)
  .orderBy('isCorrect', 'asc')
  .orderBy('responseTimeMs', 'desc')
  .limit(10)
  .get();
```

**Firestore Index Configuration**:
```json
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
```

**Edge Case Handling**:
- If <10 participants answered: Return all available answers
- If 0 participants answered (edge case from spec): Return empty arrays for both top/worst
- Tie-breaking: If responseTimeMs identical, Firestore document ID provides deterministic ordering

---

### 8. Firebase Emulator Suite Configuration

**Question**: How should local development environment be configured for testing with Firebase services?

**Decision**: Firebase Emulator Suite with Auth, Firestore, and Functions emulators

**Rationale**:
- Enables local development without consuming Firebase quotas
- Supports hot-reload for functions during development
- Persistent data mode allows testing game flow sequences
- Firestore emulator validates index configurations before deployment
- Auth emulator allows creating test users without real Google accounts

**Configuration** (firebase.json):
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "apps/api-server",
    "runtime": "nodejs18",
    "predeploy": ["npm --prefix apps/api-server run build"]
  }
}
```

**Development Workflow**:
1. Start emulators: `firebase emulators:start --import=./emulator-data --export-on-exit`
2. Run tests against emulator endpoints
3. Emulator data persists between runs in `./emulator-data`
4. UI dashboard at http://localhost:4000 for inspection

**Environment Detection**:
```typescript
import { initializeApp } from 'firebase-admin/app';

const app = initializeApp();
const firestore = getFirestore(app);

if (process.env.FUNCTIONS_EMULATOR === 'true') {
  firestore.settings({
    host: 'localhost:8080',
    ssl: false
  });
}
```

---

## Technology Stack Summary

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Runtime | Node.js | 18 LTS | Firebase Functions 2nd gen latest stable |
| Language | TypeScript | 5.x | Type safety for monorepo shared types |
| Framework | Express.js | 4.x | Standard HTTP routing, middleware ecosystem |
| Cloud Platform | Firebase Cloud Functions | 2nd gen | Serverless, auto-scaling, Firebase integration |
| Database | Firestore | Native mode | Transactions, real-time, Firebase Admin SDK |
| Authentication | Firebase Auth | Admin SDK 11.x | Token validation, role-based access |
| Validation | Zod | 3.x | TypeScript-first, zero dependencies |
| Testing Framework | Jest | 29.x | Ecosystem standard, snapshot testing |
| API Testing | Supertest | 6.x | Express integration testing |
| Emulation | Firebase Emulator Suite | Latest | Local development environment |
| Linting | ESLint + Prettier | Latest | Code quality, TypeScript rules |

---

## Open Questions for Implementation Phase

1. **Firestore Security Rules**: How should Firestore security rules be configured to prevent direct client access? (Out of scope for api-server but affects overall security posture)

2. **Rate Limiting**: Should rate limiting be implemented at API level or rely on Firebase Functions quotas? (Currently out of scope per spec but may be needed for production)

3. **Monitoring & Observability**: What logging/metrics beyond auth failures (FR-033) should be implemented? (Deferred from clarification phase but needed for production readiness)

4. **Deployment Strategy**: Should Cloud Functions use traffic splitting for gradual rollouts? (Deployment strategy not covered in current spec)

5. **Cold Start Optimization**: Should minimum instances be configured to avoid cold starts during game events? (Performance optimization beyond current scope)

## Next Steps

Phase 0 research complete. Proceed to:
- **Phase 1**: Generate data-model.md, contracts/api-server-openapi.yaml, and quickstart.md
- **Phase 2** (via /speckit.tasks): Generate tasks.md with TDD-ordered implementation tasks
