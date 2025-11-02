# Research: API Server Refinement

**Date**: 2025-11-02
**Feature**: 002-api-server-refinement
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Questions Addressed

1. Does 001-api-server have existing OpenAPI specifications?
2. What is the recommended pattern for Firestore retry logic with exponential backoff?
3. How should authentication and role-based authorization be implemented in Express on Firebase Cloud Functions?

---

## 1. OpenAPI Specifications

### Decision: **Update existing OpenAPI specs during Phase 1**

### Findings

✅ **OpenAPI specs EXIST in 001-api-server**

**Location**: `packages/openapi/api-server.yaml`
**Format**: OpenAPI 3.0.3
**Coverage**: Comprehensive - all admin, host, and participant endpoints

**Existing Endpoints**:
- Admin: POST/GET/PUT `/admin/quizzes`, GET `/admin/guests`
- Host: POST `/host/game/advance` (START_QUESTION, TRIGGER_GONG, SHOW_DISTRIBUTION, etc.)
- Participant: GET `/participant/time`, POST `/participant/answer`

**Existing Schemas**: CreateQuestionRequest, UpdateQuestionRequest, GameActionRequest, SubmitAnswerRequest, Question, Guest, GameState, GameResults, ErrorResponse

**Contract Testing**: 001-api-server includes contract tests validating implementation against OpenAPI specs

### Rationale

- High-quality OpenAPI 3.0.3 spec already exists
- Aligns with Constitution Principle III (OpenAPI-First API Design)
- Contract tests already established in 001-api-server
- NOT adding scope - maintaining existing artifacts

### Implementation Plan

1. Copy `packages/openapi/api-server.yaml` from 001-api-server branch
2. Update schemas to reflect refinement changes:
   - GameState: Add `prizeCarryover` field, update phase enum
   - Guest: Change status enum to "active" | "dropped"
   - Question: Add `deadline` field
   - Answer: Update documentation to reflect sub-collection location
3. Add new error responses (401, 403, 503 with Retry-After)
4. Validate with `swagger-cli validate`
5. Update contract tests to validate against revised spec

### Alternatives Considered

- **Defer OpenAPI creation**: Rejected because specs already exist and are comprehensive
- **Skip OpenAPI entirely**: Rejected because it violates Constitution Principle III

---

## 2. Firestore Retry Logic with Exponential Backoff

### Decision: **Use p-retry library with custom configuration**

### Recommended Implementation

```typescript
import pRetry, { AbortError } from 'p-retry';

export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  context?: { operationName: string }
): Promise<T> {
  try {
    return await pRetry(operation, {
      retries: 3,              // Max attempts (per spec)
      factor: 2,               // Exponential multiplier
      minTimeout: 1000,        // Initial delay: 1000ms
      maxTimeout: 60000,       // Max delay: 60 seconds
      randomize: true,         // Add jitter to prevent thundering herd

      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        console.warn('Firestore operation retry', {
          operation: context?.operationName,
          attempt: attemptNumber,
          retriesLeft,
          error: error.message,
          code: error.code
        });
      },

      shouldRetry: ({ error }) => {
        // Don't retry permanent errors
        const permanentErrors = ['PERMISSION_DENIED', 'INVALID_ARGUMENT', 'NOT_FOUND'];
        if (permanentErrors.includes(error.code)) {
          throw new AbortError(error.message);
        }

        // Retry transient errors
        const retryableCodes = ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'ABORTED'];
        return retryableCodes.includes(error.code);
      }
    });
  } catch (error: any) {
    // All retries exhausted - return 503
    const serviceError: any = new Error('Service temporarily unavailable. Please try again.');
    serviceError.statusCode = 503;
    serviceError.retryAfter = 60;
    throw serviceError;
  }
}
```

### Timing Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max Attempts | 3 | Spec requirement; balances reliability vs latency |
| Initial Delay | 1000ms | Google Cloud API standard |
| Backoff Multiplier | 2 | Industry standard exponential backoff |
| Max Delay | 60000ms | Google Cloud API standard |
| Jitter | true (±50%) | Prevents thundering herd problem |
| Retry-After Header | 60 seconds | Guides client retry behavior |

**Delay Sequence**: Attempt 1→2: 500-1500ms, Attempt 2→3: 1000-3000ms, Total: ~4.5s max

### Rationale

- **p-retry library**: Battle-tested (18.7M+ weekly downloads), TypeScript support, minimal overhead
- **Transient errors**: UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED
- **Permanent errors**: PERMISSION_DENIED, INVALID_ARGUMENT, NOT_FOUND (abort immediately)
- **Firestore transactions**: Already have built-in retry for contention; wrapper handles network errors

### Firebase-Specific Considerations

- Firestore transactions auto-retry on `ABORTED: Too much contention`
- Firebase Admin SDK has limited built-in retry (must implement manually)
- Cloud Functions timeout (60s default) allows for retry overhead (~7s max)
- Answer sub-collections reduce write contention naturally

### Alternatives Considered

- **Custom implementation**: Rejected - p-retry is production-ready and well-tested
- **No retry logic**: Rejected - violates spec requirements (FR-024, FR-025)
- **Infinite retries**: Rejected - can cause cascading failures

---

## 3. Authentication & Role-Based Authorization

### Decision: **Firebase Auth with custom claims for roles**

### Recommended Implementation

#### Authentication Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = decodedToken;
    next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Unauthorized', message: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  }
}
```

#### Authorization Middleware

```typescript
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as string | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
```

#### Usage Pattern

```typescript
// Apply authentication to all routes
app.use(authenticate);

// Host-only endpoint
app.post('/admin/revive-all', authorize('host'), async (req, res) => {
  // Only hosts can revive guests
});

// Guest endpoint (all authenticated users)
app.post('/participant/answer', async (req, res) => {
  // All authenticated users can submit answers
});
```

### Custom Claims Setup

```typescript
// Set role when user is created or promoted
import * as admin from 'firebase-admin';

export async function setUserRole(uid: string, role: 'guest' | 'host'): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, { role });
}

// Example: Assign role on user creation
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  await setUserRole(user.uid, 'guest'); // Default to guest
});
```

### Rationale

- **Firebase Auth**: Native integration with Firebase Cloud Functions
- **Custom claims**: Roles embedded in JWT (no database lookup needed)
- **Performance**: Token verification is fast (~5-50ms with cached public keys)
- **Security**: Tokens verified server-side, claims set from privileged environment
- **Standard HTTP codes**: 401 for authentication failures, 403 for authorization failures

### Performance Characteristics

- First verification: ~50-200ms (downloads public keys)
- Subsequent verifications: ~5-15ms (uses cached public keys)
- No need for additional caching (Firebase SDK already optimizes)
- Initialize Admin SDK at module level for container reuse

### Alternatives Considered

- **Session-based auth**: Rejected - adds state, violates stateless architecture
- **API keys**: Rejected - less secure, no user identity
- **JWT without Firebase**: Rejected - Firebase Auth provides infrastructure
- **Database role lookup**: Rejected - adds latency, custom claims are sufficient

---

## Technology Stack Summary

### Dependencies (from 001-api-server)

**Existing**:
- Express 4.18.2
- Firebase Admin SDK 11.11.1
- Firebase Functions 4.5.0
- Zod 3.22.4 (validation)
- Jest 29.5.8 (testing)
- TypeScript 5.3
- ESLint + Prettier

**New Dependencies Required**:
- `p-retry` ^6.1.0 (retry logic)

### Development Tools

- `swagger-cli` (OpenAPI validation)
- Firebase Emulator Suite (local testing)
- `ts-node` (seeding scripts)

---

## Implementation Considerations

### 1. Firestore Data Migration

**Challenge**: Changing document paths and field names in production database

**Strategy**:
- This is a refactoring feature - actual data migration happens during deployment
- For development: Update seed scripts to use new paths
- For production: Coordinate migration with other services (socket-server, admin-app)
- Document in spec.md "Backward Compatibility" section

### 2. Test Strategy

**TDD Approach**:
1. Update test fixtures to use new paths/field names (tests will fail - RED)
2. Refactor services to use new paths (tests pass - GREEN)
3. Add new tests for auth, retry, validation (RED → GREEN → REFACTOR)

**Test Coverage**:
- Unit tests: Service layer with mocked Firestore
- Integration tests: Full request/response cycle with Firebase emulator
- Contract tests: Validate against updated OpenAPI spec

### 3. Performance Monitoring

**Implementation**:
```typescript
// utils/performance.ts
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      threshold: req.method === 'GET' ? 500 : 1000 // P95 targets
    });
  });

  next();
}
```

### 4. Error Handling Standardization

**Pattern**:
```typescript
// middleware/errorHandler.ts
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const response: any = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  };

  if (err.details) response.details = err.details;
  if (err.retryAfter) res.set('Retry-After', err.retryAfter.toString());

  res.status(statusCode).json(response);
}
```

---

## Next Steps

**Phase 1 Actions**:

1. ✅ Complete research (this document)
2. → Create `data-model.md` defining all Firestore entities
3. → Update OpenAPI spec in `contracts/api-server.yaml`
4. → Create `quickstart.md` for local development setup
5. → Update agent context with new technologies (p-retry)
6. → Re-evaluate Constitution Check post-design

**Phase 2** (via `/speckit.tasks`):
- Generate detailed task breakdown for implementation
- Follow TDD discipline: tests first, then implementation
