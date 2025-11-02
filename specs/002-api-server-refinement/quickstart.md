# Quickstart: API Server Refinement

**Feature**: 002-api-server-refinement
**Target**: apps/api-server
**Prerequisites**: Node.js >= 18.0.0, Firebase CLI, pnpm

## Overview

This quickstart guide helps you set up the refined API server for local development, including Firebase Emulator Suite and test execution.

## Initial Setup

### 1. Install Dependencies

```bash
# From repository root
cd apps/api-server
pnpm install
```

### 2. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 3. Configure Firebase Project

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Functions (configure Cloud Functions)
# - Firestore (configure Firestore)
# - Emulators (set up emulators for local development)
```

## Local Development

### Running the Firebase Emulator

The Firebase Emulator Suite allows you to run Firestore and Cloud Functions locally without deploying to production.

```bash
# From apps/api-server directory
pnpm emulator
```

This starts:
- **Firestore Emulator**: http://localhost:8080
- **Functions Emulator**: http://localhost:5001
- **Emulator UI**: http://localhost:4000

### Seeding Test Data

```bash
# Seed database with test questions and guests
pnpm seed
```

This creates:
- Sample questions in `questions/` collection
- Test guests in `guests/` collection
- Initial game state in `gameState/live` document

### Testing the API

Once the emulator is running, you can test endpoints:

```bash
# Get server time (public endpoint)
curl http://localhost:5001/demo-allstars/us-central1/api/participant/time

# Submit answer (requires auth token)
curl -X POST http://localhost:5001/demo-allstars/us-central1/api/participant/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "questionId": "q1",
    "answerId": "a1"
  }'
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage
```

### Contract Tests

Contract tests validate that the implementation matches the OpenAPI specification.

```bash
# Run contract tests
pnpm test -- --testPathPattern=contract
```

### Integration Tests

Integration tests require the Firebase Emulator to be running.

```bash
# Terminal 1: Start emulator
pnpm emulator

# Terminal 2: Run integration tests
pnpm test -- --testPathPattern=integration
```

## Code Quality

### Linting

```bash
# Check for lint errors
pnpm lint

# Auto-fix lint errors
pnpm lint:fix
```

### Formatting

```bash
# Check formatting
pnpm format:check

# Auto-format code
pnpm format
```

## Development Workflow

### TDD Cycle (Test-Driven Development)

This project follows strict TDD principles:

1. **Write failing test** (RED):
   ```bash
   # Create test file in tests/unit/ or tests/integration/
   # Run: pnpm test:watch
   # Verify test fails
   ```

2. **Implement minimal code** (GREEN):
   ```bash
   # Write code in src/ to make test pass
   # Verify test passes
   ```

3. **Refactor** (REFACTOR):
   ```bash
   # Improve code quality
   # Ensure tests still pass
   # Run: pnpm lint:fix && pnpm format
   ```

### Pre-Commit Checklist

Before committing changes:

```bash
# 1. Run linter
pnpm lint:fix

# 2. Format code
pnpm format

# 3. Run all tests
pnpm test

# 4. Build TypeScript
pnpm build

# 5. Verify no TypeScript errors
tsc --noEmit
```

## Key Files for Refactoring

### Services to Update

1. **apps/api-server/src/services/gameStateService.ts**
   - Change document path to `gameState/live`
   - Add `prizeCarryover` field handling
   - Update phase enum to include `all_incorrect` and `all_revived`

2. **apps/api-server/src/services/answerService.ts**
   - Change to sub-collection: `questions/{id}/answers/{guestId}`
   - Add guest status validation (`active` only)
   - Add deadline validation
   - Implement answer overwrite logic

3. **apps/api-server/src/services/guestService.ts**
   - Update status enum: `active`/`dropped` (not `alive`/`eliminated`)
   - Implement REVIVE_ALL batch operation

4. **apps/api-server/src/services/questionService.ts**
   - Add `deadline` field when creating questions
   - Update result calculation logic for 3 cases

### New Files to Create

1. **apps/api-server/src/services/firestoreRetry.ts**
   - Implement retry wrapper with exponential backoff
   - Max 3 attempts, return 503 on failure

2. **apps/api-server/src/utils/performance.ts**
   - Performance tracking middleware
   - Log response times for P95 monitoring

3. **apps/api-server/src/middleware/auth.ts** (enhance existing)
   - Add role-based authorization
   - Verify custom claims (guest vs host)

### Shared Types to Update

**packages/types/src/GameState.ts**:
```typescript
type GamePhase =
  | 'accepting_answers'
  | 'showing_distribution'
  | 'showing_correct_answer'
  | 'showing_results'
  | 'all_incorrect'    // NEW
  | 'all_revived';     // NEW

interface GameState {
  currentQuestionId: string | null;
  phase: GamePhase;
  isGongActive: boolean;
  prizeCarryover: number;  // NEW
  questionsAsked: number;
  // ...
}
```

**packages/types/src/Guest.ts**:
```typescript
type GuestStatus = 'active' | 'dropped';  // CHANGED from 'alive' | 'eliminated'
```

**packages/types/src/Question.ts**:
```typescript
interface Question {
  // ...
  deadline: Timestamp;  // NEW
}
```

## Debugging

### Firebase Emulator Logs

```bash
# View Firestore operations in real-time
# Navigate to http://localhost:4000
# Select "Firestore" tab to see all reads/writes
```

### Function Logs

```bash
# Cloud Functions logs appear in terminal where emulator is running
# Add console.log() in your functions for debugging
```

### Test Debugging

```bash
# Run single test file
pnpm test -- path/to/test.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should submit answer"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## OpenAPI Validation

```bash
# Validate OpenAPI spec
npx swagger-cli validate ../../specs/002-api-server-refinement/contracts/api-server.yaml

# Generate TypeScript types from OpenAPI (optional)
npx openapi-typescript ../../specs/002-api-server-refinement/contracts/api-server.yaml --output src/types/generated.ts
```

## Common Issues

### Issue: "Port already in use"

**Solution**: Kill process using the port
```bash
# Find process
lsof -i :5001

# Kill process
kill -9 <PID>
```

### Issue: "Firebase Admin not initialized"

**Solution**: Ensure `admin.initializeApp()` is called once at module level
```typescript
// src/index.ts (top level)
import * as admin from 'firebase-admin';
admin.initializeApp();
```

### Issue: "Tests failing with Firestore errors"

**Solution**: Mock Firestore in unit tests
```typescript
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    // ... mock methods
  }))
}));
```

### Issue: "TypeScript errors after updating types"

**Solution**: Rebuild packages
```bash
# From repository root
pnpm --filter @allstars/types build
pnpm --filter @allstars/api-server build
```

## Performance Monitoring

### Measuring P95 Latency

```typescript
// Add to utils/performance.ts
const responseTimes: number[] = [];

export function trackResponseTime(duration: number) {
  responseTimes.push(duration);

  if (responseTimes.length >= 100) {
    const sorted = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];

    console.log(`P95 latency: ${p95}ms`);
    responseTimes.length = 0; // Reset
  }
}
```

## Resources

- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Firebase Admin SDK Reference](https://firebase.google.com/docs/reference/admin/node)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Next Steps

After completing local setup:

1. Review the implementation plan in `plan.md`
2. Read the data model documentation in `data-model.md`
3. Examine the OpenAPI contract in `contracts/api-server.yaml`
4. Run `/speckit.tasks` to generate detailed implementation tasks
5. Follow TDD workflow: Write test → Implement → Refactor
