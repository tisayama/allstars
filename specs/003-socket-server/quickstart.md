# Quickstart Guide: Socket Server Development

**Feature**: 003-socket-server | **Target Audience**: Developers implementing the real-time synchronization server

## Prerequisites

Before starting implementation, ensure you have:

- ✅ Node.js >= 18.0.0 installed (`node --version`)
- ✅ pnpm package manager installed (`pnpm --version`)
- ✅ Firebase project with Firestore and Authentication enabled
- ✅ Firebase Admin SDK service account credentials (JSON key file)
- ✅ Docker installed (for Cloud Run containerization)
- ✅ Google Cloud SDK (`gcloud`) installed and authenticated

## Initial Setup (5 minutes)

### 1. Create Application Directory

```bash
cd /home/tisayama/allstars
mkdir -p apps/socket-server/{src,tests,scripts}
cd apps/socket-server
```

### 2. Initialize Package Configuration

Create `package.json`:

```json
{
  "name": "@allstars/socket-server",
  "version": "1.0.0",
  "description": "Real-time WebSocket server for game state synchronization",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "socket.io": "^4.7.2",
    "express": "^4.18.2",
    "firebase-admin": "^11.11.0",
    "prom-client": "^15.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^18.19.3",
    "@types/jest": "^29.5.11",
    "socket.io-client": "^4.7.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5. Configure Jest

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',  // Exclude entry point from coverage
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### 6. Configure ESLint

Create `.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### 7. Configure Prettier

Create `.prettierrc.json`:

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

## Development Workflow (TDD Approach)

### Phase 1: Write Failing Tests (RED)

#### Example: Token Verification Test

Create `tests/unit/auth/tokenVerifier.test.ts`:

```typescript
import { verifyAuthToken } from '../../../src/auth/tokenVerifier';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin');

describe('Token Verification', () => {
  it('should return userId for valid token', async () => {
    // Arrange
    const mockToken = 'valid-token-abc123';
    const mockUserId = 'user-123';
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().resolves({ uid: mockUserId }),
    });

    // Act
    const result = await verifyAuthToken(mockToken);

    // Assert
    expect(result).toEqual({ userId: mockUserId, isValid: true });
  });

  it('should return isValid=false for expired token', async () => {
    // Arrange
    const mockToken = 'expired-token-xyz789';
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().rejects(new Error('Token expired')),
    });

    // Act
    const result = await verifyAuthToken(mockToken);

    // Assert
    expect(result).toEqual({ userId: null, isValid: false, error: 'Token expired' });
  });
});
```

Run tests (they should FAIL):

```bash
pnpm test
# Expected: FAIL (tokenVerifier module doesn't exist yet)
```

### Phase 2: Implement Minimal Code (GREEN)

Create `src/auth/tokenVerifier.ts`:

```typescript
import * as admin from 'firebase-admin';

export interface TokenVerificationResult {
  userId: string | null;
  isValid: boolean;
  error?: string;
}

export async function verifyAuthToken(token: string): Promise<TokenVerificationResult> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      isValid: true,
    };
  } catch (error) {
    return {
      userId: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

Run tests again:

```bash
pnpm test
# Expected: PASS (tests now green)
```

### Phase 3: Refactor (CLEAN)

Improve code quality while keeping tests green:

```typescript
// Refactored with better error handling and logging
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export interface TokenVerificationResult {
  userId: string | null;
  isValid: boolean;
  error?: string;
}

export async function verifyAuthToken(token: string): Promise<TokenVerificationResult> {
  if (!token || typeof token !== 'string') {
    return {
      userId: null,
      isValid: false,
      error: 'Invalid token format',
    };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token, true);  // Check revocation
    logger.debug(`Token verified for user: ${decodedToken.uid}`);
    return {
      userId: decodedToken.uid,
      isValid: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Token verification failed: ${errorMessage}`);
    return {
      userId: null,
      isValid: false,
      error: errorMessage,
    };
  }
}
```

Run tests to ensure refactor didn't break anything:

```bash
pnpm test
# Expected: PASS (refactor successful)
```

## Local Development Environment

### 1. Start Firebase Emulator Suite

```bash
# From repository root
firebase emulators:start --only firestore,auth
```

This provides:
- Firestore at `localhost:8080`
- Auth at `localhost:9099`
- Emulator UI at `localhost:4000`

### 2. Set Environment Variables

Create `.env.local`:

```bash
PORT=8080
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
GOOGLE_CLOUD_PROJECT=allstars-dev
LOG_LEVEL=debug
MAX_CONNECTIONS=50  # Lower for local dev
```

### 3. Run Development Server

```bash
pnpm dev
```

Server starts at `http://localhost:8080` with hot-reload enabled.

### 4. Test with Socket.io Client

Create `scripts/test-client.ts`:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('AUTH_REQUIRED', ({ timeout }) => {
  console.log(`Auth required, timeout: ${timeout}ms`);
  // In real client, get Firebase token here
  socket.emit('authenticate', { token: 'test-token-123' });
});

socket.on('AUTH_SUCCESS', ({ userId }) => {
  console.log(`Authenticated as ${userId}`);
});

socket.on('START_QUESTION', (payload) => {
  console.log('Question started:', payload);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

Run test client:

```bash
ts-node scripts/test-client.ts
```

## Testing Checklist

### Unit Tests (Run First)

```bash
pnpm test -- tests/unit
```

- [ ] Token verification (valid, invalid, expired)
- [ ] Event mapper (all game phases → events)
- [ ] Game state validator (Zod schema validation)
- [ ] Metrics collector (counter/gauge/histogram)

### Integration Tests (Run Second)

```bash
pnpm test -- tests/integration
```

- [ ] Socket.io connection lifecycle
- [ ] Authentication flow (success/failure)
- [ ] Event broadcasting (START_QUESTION, GONG_ACTIVATED, etc.)
- [ ] Reconnection handling
- [ ] Degraded state (Firestore disconnect)

### Contract Tests (Run Last)

```bash
pnpm test -- tests/contract
```

- [ ] Event payload schemas match TypeScript types
- [ ] All events have corresponding tests
- [ ] No extra/missing fields in payloads

## Deployment Checklist

### 1. Build Docker Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

Build image:

```bash
docker build -t gcr.io/allstars/socket-server:latest .
```

### 2. Push to Google Container Registry

```bash
docker push gcr.io/allstars/socket-server:latest
```

### 3. Deploy to Cloud Run

```bash
gcloud run deploy socket-server \
  --image gcr.io/allstars/socket-server:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --session-affinity \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=allstars-prod" \
  --service-account socket-server@allstars-prod.iam.gserviceaccount.com
```

### 4. Verify Deployment

```bash
# Check service status
gcloud run services describe socket-server --region us-central1

# Test endpoint
curl https://socket-server-XXXX-uc.a.run.app/healthz
# Expected: {"status":"ok","uptime":123}
```

## Monitoring Setup

### 1. View Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=socket-server" \
  --limit 50 \
  --format json
```

### 2. Set Up Alerts

Create alert for connection spike:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Socket Server High Connections" \
  --condition-display-name="Connections > 180" \
  --condition-threshold-value=180 \
  --condition-threshold-duration=60s \
  --condition-filter='metric.type="custom.googleapis.com/socket_connections_total" resource.type="cloud_run_revision"'
```

### 3. Create Dashboard

1. Go to Cloud Console → Monitoring → Dashboards
2. Create dashboard with charts:
   - Connection count (gauge)
   - Auth failures (counter, rate)
   - Broadcast latency (histogram, p95/p99)
   - Firestore listener status (gauge)

## Troubleshooting

### Issue: Tests Failing with "Firebase Admin not initialized"

**Solution**: Mock Firebase Admin in test setup

```typescript
// tests/setup.ts
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));
```

### Issue: Socket.io Client Cannot Connect

**Solution**: Check CORS configuration

```typescript
// src/server.ts
const io = new Server(httpServer, {
  cors: {
    origin: ['https://participant-app.allstars.com', 'https://projector-app.allstars.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

### Issue: Firestore Listener Not Triggering

**Solution**: Ensure Firestore emulator is running and document exists

```bash
# Check emulator status
curl http://localhost:8080

# Create test document
firebase firestore:write gameState/live '{"currentPhase":"waiting","isGongActive":false}'
```

## Next Steps

1. ✅ Complete unit tests for all modules (TDD red-green-refactor)
2. ✅ Implement integration tests with Firebase emulator
3. ✅ Add contract tests for event payloads
4. ✅ Set up CI/CD pipeline (GitHub Actions or Cloud Build)
5. ✅ Deploy to staging environment
6. ✅ Performance test with 200+ simulated clients
7. ✅ Deploy to production with monitoring

## References

- [Socket.io Server Documentation](https://socket.io/docs/v4/server-api/)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Deployment Guide](https://cloud.google.com/run/docs/deploying)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
- [TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Document Version**: 1.0 | **Last Updated**: 2025-11-03
