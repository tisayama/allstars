# Quickstart Guide: API Server Development

**Branch**: `001-api-server` | **Date**: 2025-11-02
**Purpose**: Developer onboarding and local development setup guide

## Prerequisites

Before starting development on the API server, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (LTS recommended)
- **pnpm**: Version 8.x or higher (monorepo package manager)
- **Firebase CLI**: Latest version (`npm install -g firebase-tools`)
- **Git**: For version control
- **Code Editor**: VS Code recommended with ESLint and Prettier extensions

**Verification Commands**:
```bash
node --version    # Should output v18.x.x or higher
pnpm --version    # Should output 8.x.x or higher
firebase --version # Should output latest Firebase CLI version
```

---

## Initial Setup

### 1. Clone Repository and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd allstars

# Install all workspace dependencies from monorepo root
pnpm install

# Navigate to api-server directory
cd apps/api-server
```

### 2. Configure Firebase Emulator Suite

Create or verify `firebase.json` in repository root:

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
    "indexes": "apps/api-server/firestore.indexes.json"
  },
  "functions": {
    "source": "apps/api-server",
    "runtime": "nodejs18",
    "predeploy": ["pnpm --prefix apps/api-server run build"]
  }
}
```

### 3. Initialize Firestore Indexes

Create `apps/api-server/firestore.indexes.json` with the composite indexes defined in [data-model.md](./data-model.md).

### 4. Set Up Environment Variables

Create `apps/api-server/.env` for local development:

```env
# Firebase Emulator Configuration
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FUNCTIONS_EMULATOR=true

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Development Workflow

### Starting the Development Environment

```bash
# From repository root
firebase emulators:start --import=./emulator-data --export-on-exit
```

This command:
- Starts Auth, Firestore, and Functions emulators
- Imports existing test data from `./emulator-data` (if present)
- Exports data on exit for persistence between sessions
- Opens Emulator UI at http://localhost:4000

**Emulator Endpoints**:
- **Emulator UI**: http://localhost:4000
- **Functions**: http://localhost:5001/{projectId}/us-central1
- **Firestore**: localhost:8080
- **Auth**: localhost:9099

### Running the API Server Locally

The Firebase Emulator Suite automatically builds and serves the Cloud Functions. To manually trigger rebuild:

```bash
cd apps/api-server
pnpm run build
```

### Testing API Endpoints

Use curl, Postman, or any HTTP client to test endpoints:

**Example: Get Server Time (no auth required)**:
```bash
curl http://localhost:5001/demo-allstars/us-central1/participant/time
```

**Example: Create Question (requires auth)**:
```bash
# First, create a test user in Emulator Auth UI (http://localhost:4000)
# Then get ID token and use it:

curl -X POST http://localhost:5001/demo-allstars/us-central1/admin/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  -d '{
    "period": 1,
    "questionNumber": 1,
    "type": "four_choice",
    "text": "Test question?",
    "choices": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "skipAttributes": []
  }'
```

### Running Tests

```bash
cd apps/api-server

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/services/questionService.test.ts
```

**Test Structure**:
- **Unit Tests**: `tests/unit/**/*.test.ts` (fast, isolated)
- **Integration Tests**: `tests/integration/**/*.test.ts` (require emulators)
- **Contract Tests**: `tests/contract/**/*.test.ts` (validate OpenAPI compliance)

### Linting and Formatting

```bash
cd apps/api-server

# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Run Prettier formatting
pnpm format

# Check formatting without changes
pnpm format:check
```

---

## Project Structure Navigation

```
apps/api-server/
├── src/
│   ├── index.ts                 # Entry point: Express app initialization
│   ├── middleware/              # Auth, error handling, logging
│   ├── routes/                  # Route handlers (admin, host, participant)
│   ├── services/                # Business logic layer
│   ├── models/                  # Validation schemas, Firestore collections
│   └── utils/                   # Helpers, error classes
├── tests/
│   ├── unit/                    # Isolated unit tests
│   ├── integration/             # End-to-end API tests
│   └── contract/                # OpenAPI contract validation
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest test configuration
├── .eslintrc.js                 # ESLint rules
└── firestore.indexes.json       # Firestore composite indexes
```

**Key Files to Start With**:
1. `src/index.ts` - Understand Express app initialization
2. `src/routes/admin.ts` - See endpoint implementation pattern
3. `src/services/questionService.ts` - Study business logic structure
4. `src/middleware/auth.ts` - Learn auth token validation

---

## Common Development Tasks

### Adding a New Endpoint

1. **Define OpenAPI Contract**: Update `/specs/001-api-server/contracts/api-server-openapi.yaml`
2. **Write Tests First** (TDD):
   ```typescript
   // tests/integration/newEndpoint.test.ts
   describe('POST /new/endpoint', () => {
     it('should handle valid request', async () => {
       const response = await request(app)
         .post('/new/endpoint')
         .send({ /* test data */ })
         .expect(200);

       expect(response.body).toMatchObject({ /* expected shape */ });
     });
   });
   ```
3. **Implement Route Handler**: Add to appropriate file in `src/routes/`
4. **Implement Service Logic**: Add to `src/services/`
5. **Run Tests**: Verify red → green → refactor cycle

### Adding Input Validation

Use Zod schemas in `src/models/validators.ts`:

```typescript
import { z } from 'zod';

export const NewRequestSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});

// In route handler
import { NewRequestSchema } from '../models/validators';

router.post('/new/endpoint', async (req, res, next) => {
  try {
    const validated = NewRequestSchema.parse(req.body);
    // Use validated data
  } catch (error) {
    // Zod validation error → FR-029 error format
    next(transformZodError(error));
  }
});
```

### Working with Firestore Transactions

See `src/services/gameStateService.ts` for reference pattern:

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function updateWithTransaction() {
  const firestore = getFirestore();

  return await firestore.runTransaction(async (transaction) => {
    const ref = firestore.collection('collectionName').doc('docId');
    const doc = await transaction.get(ref);

    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const data = doc.data();
    // Validate and transform data

    transaction.update(ref, {
      ...updatedData,
      updatedAt: FieldValue.serverTimestamp()
    });

    return updatedData;
  });
}
```

### Debugging with VS Code

Create `.vscode/launch.json` in repository root:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Functions Emulator",
      "port": 9229,
      "restart": true,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/apps/api-server/lib/**/*.js"]
    }
  ]
}
```

Start emulator with debugging:
```bash
firebase emulators:start --inspect-functions
```

Then attach VS Code debugger (F5).

---

## Testing Guide

### Unit Testing Services

```typescript
// tests/unit/services/questionService.test.ts
import { createQuestion } from '../../../src/services/questionService';
import { getFirestore } from 'firebase-admin/firestore';

jest.mock('firebase-admin/firestore');

describe('questionService', () => {
  describe('createQuestion', () => {
    it('should create question with valid data', async () => {
      // Mock Firestore
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({ doc: mockDoc })
      });

      const questionData = {
        period: 1,
        questionNumber: 1,
        type: 'four_choice',
        text: 'Test?',
        choices: ['A', 'B'],
        correctAnswer: 'A',
        skipAttributes: []
      };

      await createQuestion(questionData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining(questionData)
      );
    });
  });
});
```

### Integration Testing with Emulator

```typescript
// tests/integration/admin.test.ts
import request from 'supertest';
import { app } from '../../../src/index';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Admin API Integration Tests', () => {
  let testEnv;
  let adminToken;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-allstars',
      firestore: {
        host: 'localhost',
        port: 8080
      }
    });

    // Create admin user and get token
    const adminAuth = testEnv.authenticatedContext('admin-user', {
      email: 'admin@example.com',
      firebase: { sign_in_provider: 'google.com' }
    });
    adminToken = await adminAuth.idToken();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('POST /admin/quizzes creates question', async () => {
    const response = await request(app)
      .post('/admin/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        period: 1,
        questionNumber: 1,
        type: 'four_choice',
        text: 'Test question?',
        choices: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        skipAttributes: []
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe('Test question?');
  });
});
```

### Contract Testing with OpenAPI

```typescript
// tests/contract/openapi.test.ts
import request from 'supertest';
import { app } from '../../src/index';
import * as OpenApiValidator from 'express-openapi-validator';
import path from 'path';

describe('OpenAPI Contract Validation', () => {
  it('should validate all endpoints against OpenAPI spec', async () => {
    const apiSpec = path.join(__dirname, '../../specs/001-api-server/contracts/api-server-openapi.yaml');

    await OpenApiValidator.middleware({
      apiSpec,
      validateRequests: true,
      validateResponses: true
    });

    // Test actual endpoints and verify they conform
    const response = await request(app)
      .get('/participant/time')
      .expect(200);

    expect(response.body).toHaveProperty('serverTime');
    expect(typeof response.body.serverTime).toBe('number');
  });
});
```

---

## Deployment

### Building for Production

```bash
cd apps/api-server
pnpm run build

# Output will be in lib/ directory
```

### Deploying to Firebase

```bash
# From repository root
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:apiServer
```

### Environment Variables for Production

Set via Firebase CLI:

```bash
firebase functions:config:set \
  api.cors_origin="https://your-frontend-domain.com" \
  api.rate_limit="100"
```

---

## Troubleshooting

### Emulator Not Starting

```bash
# Check if ports are in use
lsof -i :5001
lsof -i :8080

# Kill processes if needed
kill -9 <PID>

# Clear emulator data and restart
rm -rf emulator-data
firebase emulators:start
```

### TypeScript Compilation Errors

```bash
# Clean build artifacts
rm -rf lib/

# Reinstall dependencies
pnpm install

# Rebuild
pnpm run build
```

### Authentication Errors in Tests

```bash
# Ensure FIREBASE_AUTH_EMULATOR_HOST is set
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Verify emulator is running
curl http://localhost:9099
```

### Firestore Transaction Conflicts

- Check for long-running transactions (timeout is 270 seconds)
- Verify read-modify-write pattern is correct
- Reduce contention by minimizing transaction scope

---

## Additional Resources

- **OpenAPI Spec**: [contracts/api-server-openapi.yaml](./contracts/api-server-openapi.yaml)
- **Data Model**: [data-model.md](./data-model.md)
- **Research Decisions**: [research.md](./research.md)
- **Firebase Functions Docs**: https://firebase.google.com/docs/functions
- **Firestore Transactions**: https://firebase.google.com/docs/firestore/manage-data/transactions
- **Zod Documentation**: https://zod.dev
- **Jest Testing**: https://jestjs.io/docs/getting-started

---

## Next Steps

1. Review the [data-model.md](./data-model.md) to understand Firestore schema
2. Read [research.md](./research.md) for technology decisions and patterns
3. Explore [contracts/api-server-openapi.yaml](./contracts/api-server-openapi.yaml) for API contract
4. Run `/speckit.tasks` to generate implementation task breakdown
5. Follow TDD workflow: Write test → Run test (red) → Implement (green) → Refactor

**Ready to start coding!** Begin with Phase 2 task generation: `/speckit.tasks`
