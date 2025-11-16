# Research: Firebase Service Account Authentication for Projector WebSocket

**Feature Branch**: `001-projector-auth`
**Research Date**: 2025-11-16
**Status**: Complete

## Executive Summary

This research document provides implementation patterns for authenticating the projector-app with the WebSocket server using Firebase service account credentials. The projector-app requires automatic, unattended authentication to support kiosk mode deployment at wedding venues.

**Key Decision**: Use Firebase Admin SDK custom tokens generated server-side and passed to the client via a dedicated `/projector-socket` namespace, rather than exposing service account credentials client-side.

---

## 1. Firebase Service Account Authentication Patterns

### 1.1 Service Accounts vs User Authentication

#### Service Account Overview

**Definition**: Service accounts are special Google Cloud accounts that belong to applications or virtual machines, not individual users. They contain an RSA private key for signing JWTs and provide elevated privileges for backend services.

**Key Characteristics**:
- Used for server-to-server authentication
- Do NOT sign in users (stateless operations only)
- Provide access to Firebase Admin SDK capabilities
- Contain sensitive private keys that must be protected

**Source**: Firebase Admin SDK documentation, Stack Overflow discussions on Firebase authentication patterns

#### User Authentication (Current Implementation)

The existing socket-server implementation uses Firebase ID tokens from authenticated users:

```typescript
// From /home/tisayama/allstars/apps/socket-server/src/auth/tokenVerifier.ts
export async function verifyAuthToken(token: string): Promise<TokenVerificationResult> {
  const decodedToken = await admin.auth().verifyIdToken(token, true);
  return {
    userId: decodedToken.uid,
    isValid: true,
  };
}
```

**Current Flow**:
1. Client authenticates user via Firebase Auth SDK (email/anonymous)
2. Client obtains ID token from authenticated user
3. Client sends ID token to socket-server via `authenticate` event
4. Server verifies token using Firebase Admin SDK

**Source**: `/home/tisayama/allstars/apps/socket-server/src/auth/tokenVerifier.ts`, `/home/tisayama/allstars/apps/projector-app/src/hooks/useWebSocket.ts`

#### Key Differences

| Aspect | User Authentication | Service Account Authentication |
|--------|-------------------|-------------------------------|
| **Purpose** | Individual user identity | Application/service identity |
| **Client SDK** | Firebase Auth SDK (client-side) | N/A - never client-side |
| **Token Type** | ID Token (from user login) | Custom Token (generated server-side) |
| **Expiration** | 1 hour (auto-refreshed by SDK) | 1 hour (must manually refresh) |
| **Scope** | User-specific permissions | Service-level permissions |
| **Interaction** | Requires user login action | Fully automated |

**Source**: Firebase documentation on service accounts vs client authentication, Medium articles on Firebase custom authentication

---

### 1.2 Recommended Pattern: Server-Generated Custom Tokens

#### Decision: Hybrid Approach

**RECOMMENDATION**: Use Firebase Admin SDK on a backend service to generate custom tokens for projector-app, NOT direct service account usage in client.

**Rationale**:
1. **Security**: Service account JSON files contain private keys and MUST NEVER be exposed client-side
2. **Best Practice**: Firebase explicitly warns against packaging service account credentials in client applications
3. **Flexibility**: Custom tokens can include claims to identify projector vs participant connections
4. **Token Lifecycle**: Server can manage token rotation and revocation centrally

**Source**: Firebase best practices documentation, Stack Overflow security recommendations

#### Implementation Pattern

**Server-Side (New API Endpoint)**:

```typescript
// New endpoint in api-server or socket-server
import * as admin from 'firebase-admin';

// Initialize Admin SDK with service account (server-side only)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

// Generate custom token for projector-app
app.post('/api/projector/auth-token', async (req, res) => {
  try {
    // Validate request (e.g., check API key, IP whitelist)
    const uid = `projector-${Date.now()}`; // Unique projector instance ID

    const customToken = await admin.auth().createCustomToken(uid, {
      role: 'projector',
      readOnly: true,
    });

    res.json({ token: customToken });
  } catch (error) {
    console.error('Failed to create custom token:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});
```

**Client-Side (Projector-App)**:

```typescript
// In projector-app initialization
async function authenticateProjector() {
  // Step 1: Request custom token from backend
  const response = await fetch(`${API_URL}/api/projector/auth-token`, {
    method: 'POST',
    headers: {
      'X-API-Key': import.meta.env.VITE_PROJECTOR_API_KEY, // Static API key
    },
  });

  const { token: customToken } = await response.json();

  // Step 2: Sign in with custom token (creates Firebase Auth user)
  const userCredential = await signInWithCustomToken(auth, customToken);

  // Step 3: Get ID token from authenticated session
  const idToken = await userCredential.user.getIdToken();

  // Step 4: Connect to WebSocket with ID token
  socket.emit('authenticate', { token: idToken });
}
```

**Source**: Firebase Admin SDK documentation on createCustomToken, custom authentication guides

#### Alternative: Direct Token Passing (Not Recommended)

**Alternative Approach**: Pass custom token directly to WebSocket without signInWithCustomToken step.

**Why NOT Recommended**:
- Custom tokens are meant for client SDK signIn, not direct verification
- Would require modifying socket-server to verify custom tokens differently
- Loses Firebase Auth session management benefits
- More complex token refresh logic

**Source**: Firebase custom authentication documentation

---

### 1.3 Service Account Storage Patterns

#### Server-Side Storage (Recommended)

**Environment Variables Approach**:

```bash
# .env (server-side only, never committed)
FIREBASE_PROJECT_ID=stg-wedding-allstars
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@stg-wedding-allstars.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**File Path Approach**:

```bash
# .env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

```typescript
// Initialize Admin SDK with file path
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
```

**Best Practices**:
- Add `*.json` to `.gitignore` for service account files
- Use separate service accounts for dev/staging/production
- Implement service account key rotation schedule
- Grant minimal necessary permissions (Principle of Least Privilege)
- Never use "Owner" or "Editor" roles for service accounts

**Source**: Google Cloud documentation on service account best practices, ExpertBeacon guides

#### .gitignore Pattern

```gitignore
# Service account files
service-account*.json
*-service-account.json
firebase-adminsdk*.json

# Environment files
.env
.env.local
.env.*.local
```

**Current Project .gitignore**: Already includes `.env` and `.env.local` patterns at `/home/tisayama/allstars/.gitignore`

---

### 1.4 Vite Environment Variable Security

#### Critical Security Principle

**VITE-SPECIFIC SECURITY RULE**: Only environment variables prefixed with `VITE_` are exposed to the client bundle. All `VITE_*` variables are public and visible in browser dev tools.

**Source**: Official Vite documentation on environment variables and modes

#### Safe vs Unsafe Variables

**SAFE for Client (VITE_ prefix)**:
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_SERVER_URL=http://localhost:3001
VITE_PROJECTOR_API_KEY=static-key-for-token-endpoint  # Limited scope, acceptable risk
```

**UNSAFE - NEVER Client-Side**:
```env
# These should NEVER have VITE_ prefix
FIREBASE_PRIVATE_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
API_SECRET_KEY=...
DATABASE_URL=...
```

#### Recommended Pattern for Projector-App

**Problem**: Projector-app (React/Vite) needs to authenticate, but can't store service account credentials safely.

**Solution**: Use a static API key to request custom tokens from backend:

```env
# Projector-app .env.development
VITE_API_URL=http://localhost:3000
VITE_PROJECTOR_API_KEY=dev-projector-key-12345  # Limited scope: only generates tokens
```

**Security Analysis**:
- **Risk**: API key visible in client bundle
- **Mitigation**:
  - Key only grants access to token generation endpoint
  - Backend validates request origin/IP
  - Generated tokens have read-only permissions
  - Tokens expire after 1 hour
  - Rate limiting on token endpoint

**Source**: Vite security guides, Smashing Magazine article on hiding API keys in React

---

## 2. Socket.IO Authentication Patterns

### 2.1 Dedicated Namespace for Projector Connections

#### Current Implementation

The socket-server currently uses a single default namespace (`/`) for all connections:

```typescript
// From /home/tisayama/allstars/apps/socket-server/src/server.ts
io.on('connection', (socket) => {
  logger.debug(`New socket connection: ${socket.id}`);
  setupAuthenticationFlow(socket);
});
```

**Source**: `/home/tisayama/allstars/apps/socket-server/src/server.ts`

#### Recommended Pattern: Dedicated Namespace

**RECOMMENDATION**: Create dedicated `/projector-socket` namespace for projector-app connections.

**Rationale**:
- **Clear Separation**: Distinguish projector vs participant/host connections
- **Authorization**: Apply different middleware/permissions per namespace
- **Scalability**: Easier to add namespace-specific features (e.g., manual refresh)
- **Monitoring**: Track projector connections separately in metrics

**Server-Side Implementation**:

```typescript
// In socket-server setup
import { Server as SocketIOServer } from 'socket.io';

// Default namespace for participants/hosts
io.on('connection', (socket) => {
  setupAuthenticationFlow(socket); // Existing implementation
});

// Dedicated namespace for projector-app
const projectorNamespace = io.of('/projector-socket');

projectorNamespace.use(async (socket, next) => {
  // Middleware for projector authentication
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token (same Firebase ID token verification)
    const result = await verifyAuthToken(token);

    if (!result.isValid) {
      return next(new Error('Invalid authentication token'));
    }

    // Optional: Verify this is a projector token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.role !== 'projector') {
      return next(new Error('Invalid client type'));
    }

    socket.data.userId = result.userId;
    socket.data.isAuthenticated = true;
    socket.data.clientType = 'projector';

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

projectorNamespace.on('connection', (socket) => {
  logger.info(`Projector connected: ${socket.id}`);

  // Join projector room for broadcasts
  socket.join('projectorRoom');

  // Add projector-specific event handlers
  socket.on('REQUEST_STATE_REFRESH', async () => {
    // Handle manual state refresh request
  });

  socket.on('disconnect', () => {
    logger.info(`Projector disconnected: ${socket.id}`);
  });
});
```

**Client-Side Connection**:

```typescript
// In projector-app
import { io } from 'socket.io-client';

const socket = io(`${SOCKET_URL}/projector-socket`, {
  auth: {
    token: idToken, // From Firebase signInWithCustomToken
  },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 60000,
  randomizationFactor: 0.5,
});
```

**Source**: Socket.IO official documentation on namespaces and middleware, GitHub discussions on namespace authentication

#### Alternative: Single Namespace with Client Type Detection

**Alternative Approach**: Use socket.handshake.auth.clientType to distinguish connections within default namespace.

**Why Less Ideal**:
- Mixed authorization logic in single middleware
- Harder to apply namespace-specific rate limiting
- Less clear separation of concerns
- Cannot easily restrict certain events to specific client types

**When to Use**: If namespace overhead is a concern or very simple distinction needed.

---

### 2.2 Authentication Middleware Patterns

#### Socket.IO v4 Middleware Architecture

Socket.IO v4 provides a clean middleware pattern for authentication:

**Key Concepts**:
1. **Handshake Authentication**: Client sends auth data during connection handshake
2. **Middleware Execution**: Middleware runs before 'connection' event fires
3. **Error Handling**: Calling `next(Error)` rejects connection and emits `connect_error`
4. **Socket Data**: `socket.data` stores authenticated user info

**Source**: Official Socket.IO v4 middleware documentation

#### Recommended Middleware Pattern

```typescript
// Authentication middleware with timeout
const AUTH_TIMEOUT_MS = 10000;

projectorNamespace.use(async (socket, next) => {
  const timeoutId = setTimeout(() => {
    next(new Error('Authentication timeout'));
  }, AUTH_TIMEOUT_MS);

  try {
    const { token } = socket.handshake.auth;

    // Validate token presence
    if (!token || typeof token !== 'string') {
      clearTimeout(timeoutId);
      return next(new Error('Invalid authentication payload'));
    }

    // Verify Firebase ID token
    const result = await verifyAuthToken(token);

    clearTimeout(timeoutId);

    if (!result.isValid) {
      return next(new Error(result.error || 'Authentication failed'));
    }

    // Store user data in socket
    socket.data.userId = result.userId;
    socket.data.isAuthenticated = true;
    socket.data.clientType = 'projector';

    next(); // Allow connection
  } catch (error) {
    clearTimeout(timeoutId);
    next(error instanceof Error ? error : new Error('Authentication error'));
  }
});
```

**Best Practices**:
1. Always implement authentication timeout
2. Clear timeouts in all code paths
3. Provide specific error messages for debugging
4. Log authentication attempts for security audit
5. Store minimal data in socket.data

**Source**: Socket.IO best practices, Stack Overflow authentication patterns

#### Client-Side Error Handling

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);

  // Parse error reason
  if (error.message.includes('timeout')) {
    setError('Authentication timed out - check network connection');
  } else if (error.message.includes('Invalid')) {
    setError('Invalid authentication credentials');
  } else {
    setError('Failed to connect to server');
  }
});
```

---

### 2.3 Distinguishing Connection Types

#### Token Claims Approach (Recommended)

**Pattern**: Include custom claims in Firebase custom tokens to identify projector connections.

```typescript
// Server-side token generation
const customToken = await admin.auth().createCustomToken(uid, {
  role: 'projector',
  readOnly: true,
  instanceId: uniqueInstanceId,
});
```

**Server-side verification**:

```typescript
// In namespace middleware
const decodedToken = await admin.auth().verifyIdToken(token);

if (decodedToken.role !== 'projector') {
  return next(new Error('Unauthorized client type'));
}

// Store in socket data for later authorization checks
socket.data.role = decodedToken.role;
socket.data.readOnly = decodedToken.readOnly;
```

**Benefits**:
- Built into token, no separate handshake field needed
- Tamper-proof (signed by Firebase)
- Can include additional metadata (instanceId for multi-projector)

**Source**: Firebase custom token documentation, JWT claims best practices

#### Namespace Approach (Already Implemented Above)

Using dedicated `/projector-socket` namespace inherently distinguishes connection type.

**Benefits**:
- Implicit identification via connection URL
- No need to verify role claims
- Clear architectural separation

**Drawback**:
- Must maintain separate namespace codebases

**Recommendation**: Use BOTH approaches - dedicated namespace AND role claims for defense-in-depth.

---

## 3. Exponential Backoff Implementation

### 3.1 Existing Implementation in Codebase

The project already has retry implementations in the api-server:

**File**: `/home/tisayama/allstars/apps/api-server/src/utils/retry.ts`

```typescript
export interface RetryConfig {
  retries?: number;      // default: 3
  factor?: number;       // default: 2
  minTimeout?: number;   // default: 1000
  maxTimeout?: number;   // default: 5000
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return pRetry(operation, {
    retries: mergedConfig.retries,
    factor: mergedConfig.factor,
    minTimeout: mergedConfig.minTimeout,
    maxTimeout: mergedConfig.maxTimeout,
    onFailedAttempt: (error) => {
      console.warn(
        `Retry attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
      );
    },
  });
}
```

**Source**: `/home/tisayama/allstars/apps/api-server/src/utils/retry.ts`

**Library Used**: `p-retry` (v6.1) - battle-tested retry library

**Current Usage**: Firestore operations that may fail transiently (from CLAUDE.md error handling patterns)

---

### 3.2 Recommended Pattern for WebSocket Reconnection

#### Socket.IO Built-in Reconnection

Socket.IO has built-in exponential backoff for reconnection:

**Configuration Options**:

```typescript
const socket = io(url, {
  reconnection: true,              // Enable auto-reconnection
  reconnectionAttempts: 10,        // Max retry attempts (spec: FR-003)
  reconnectionDelay: 1000,         // Initial delay: 1 second
  reconnectionDelayMax: 60000,     // Max delay cap: 60 seconds
  randomizationFactor: 0.5,        // Jitter: 0.5 (default)
});
```

**How It Works**:
- **1st attempt**: Delay between 500ms and 1500ms (1000 ± 50%)
- **2nd attempt**: Delay between 1000ms and 3000ms (2000 ± 50%)
- **3rd attempt**: Delay between 2000ms and 5000ms (4000 ± 50%, capped at 60s)
- **nth attempt**: `Math.min(delay * 2^(n-1), 60000)` with ±50% jitter

**Source**: Official Socket.IO client options documentation

#### Why Jitter Matters

**Problem**: Without randomization, all disconnected clients reconnect at exactly the same time, causing thundering herd.

**Solution**: `randomizationFactor: 0.5` adds ±50% randomness to delays, spreading out reconnection attempts.

**Example with 1000ms base delay**:
- Without jitter: All clients retry at exactly 1000ms, 2000ms, 4000ms
- With 0.5 jitter: Clients retry randomly between:
  - 500-1500ms (attempt 1)
  - 1000-3000ms (attempt 2)
  - 2000-6000ms (attempt 3)

**Source**: AWS Architecture Blog on exponential backoff and jitter, Socket.IO documentation

#### Recommended Configuration for Projector-App

```typescript
// Based on FR-003 requirements
const socket = io(`${SOCKET_URL}/projector-socket`, {
  auth: {
    token: idToken,
  },
  autoConnect: false,

  // Reconnection settings (FR-003)
  reconnection: true,
  reconnectionAttempts: 10,        // Maximum 10 attempts
  reconnectionDelay: 1000,         // Start at 1 second
  reconnectionDelayMax: 60000,     // Cap at 60 seconds
  randomizationFactor: 0.5,        // ±50% jitter to prevent thundering herd

  // Connection health
  timeout: 20000,                  // 20s connection timeout
  pingTimeout: 60000,              // 60s ping timeout
  pingInterval: 25000,             // 25s ping interval
});
```

**Delay Progression**:
- Attempt 1: 0.5-1.5s
- Attempt 2: 1-3s
- Attempt 3: 2-6s
- Attempt 4: 4-12s
- Attempt 5: 8-24s
- Attempt 6: 16-48s
- Attempts 7-10: 30-90s (capped at 60s max)

**Source**: Spec FR-003 requirements, Socket.IO best practices

---

### 3.3 Application-Level Token Refresh

#### Problem: Expired Tokens During Reconnection

Firebase ID tokens expire after 1 hour. If projector-app disconnects for >1 hour and tries to reconnect, the token will be expired.

**Solution**: Refresh token before reconnection attempt.

```typescript
// Custom reconnection handler with token refresh
socket.on('disconnect', () => {
  console.log('Disconnected from server');
  setIsConnected(false);
});

socket.io.on('reconnect_attempt', async (attemptNumber) => {
  console.log(`Reconnection attempt ${attemptNumber}`);

  // Refresh token if needed
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const freshToken = await currentUser.getIdToken(true); // Force refresh
      socket.auth = { token: freshToken };
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
  setIsConnected(true);
  setError(null);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect after max attempts');
  setError('接続失敗：設定を確認してください');

  // Enter degraded mode (FR-010)
  setDegradedMode(true);
});
```

**Best Practice**: Always refresh token before reconnect to avoid authentication failures.

**Source**: Firebase Auth token lifecycle documentation

---

### 3.4 Exponential Backoff with Jitter - Implementation Details

#### Mathematical Formula

**Standard Exponential Backoff**:
```
delay = min(baseDelay * (2 ^ attemptNumber), maxDelay)
```

**With Full Jitter** (recommended):
```
delay = random(0, min(baseDelay * (2 ^ attemptNumber), maxDelay))
```

**With Decorrelated Jitter** (even better for high load):
```
delay = min(maxDelay, random(baseDelay, previousDelay * 3))
```

**Source**: AWS Architecture Blog, Better Stack monitoring guides

#### Best Practices Summary

1. **Always Cap Maximum Delay**: Prevents infinite growth (60s is common)
2. **Always Add Jitter**: Prevents thundering herd (0.5 factor is standard)
3. **Identify Retryable Errors**: Don't retry 4xx errors (client-side issues)
4. **Log Retry Attempts**: For debugging and monitoring
5. **Provide User Feedback**: Show connection status during retries
6. **Implement Circuit Breaker**: Stop retrying if service is consistently down

**Source**: Multiple sources - AWS, Better Stack, Medium articles on retry patterns

#### TypeScript Implementation (Custom, if needed)

If you need custom retry logic beyond Socket.IO's built-in:

```typescript
interface BackoffConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

class ExponentialBackoff {
  private attempt = 0;
  private config: BackoffConfig;

  constructor(config: BackoffConfig) {
    this.config = config;
  }

  getNextDelay(): number | null {
    if (this.attempt >= this.config.maxAttempts) {
      return null; // Max attempts reached
    }

    // Calculate exponential delay
    const exponential = this.config.baseDelay * Math.pow(2, this.attempt);
    const capped = Math.min(exponential, this.config.maxDelay);

    // Apply jitter (full jitter)
    const jitter = capped * this.config.jitterFactor;
    const min = capped - jitter;
    const max = capped + jitter;
    const delay = Math.random() * (max - min) + min;

    this.attempt++;
    return Math.floor(delay);
  }

  reset(): void {
    this.attempt = 0;
  }
}

// Usage
const backoff = new ExponentialBackoff({
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 60000,
  jitterFactor: 0.5,
});

async function connectWithRetry() {
  while (true) {
    const delay = backoff.getNextDelay();

    if (delay === null) {
      console.error('Max retry attempts reached');
      return;
    }

    try {
      await attemptConnection();
      backoff.reset();
      return;
    } catch (error) {
      console.warn(`Connection failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

**Note**: Socket.IO's built-in reconnection already implements this pattern, so custom implementation is rarely needed.

**Source**: npm exponential-backoff package, TypeScript retry pattern examples

---

## 4. Environment Variable Management

### 4.1 Development vs Production Patterns

#### Development Environment

**Recommended Setup**:

```bash
# apps/api-server/.env.development
FIREBASE_PROJECT_ID=stg-wedding-allstars
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@stg-wedding-allstars.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# OR file-based approach
GOOGLE_APPLICATION_CREDENTIALS=./config/dev-service-account.json
```

```bash
# apps/projector-app/.env.development
VITE_API_URL=http://localhost:3000
VITE_SOCKET_SERVER_URL=http://localhost:3001
VITE_PROJECTOR_API_KEY=dev-projector-key-12345
```

**Best Practices**:
- Use `.env.example` files with placeholder values (committed to git)
- Add actual `.env` files to `.gitignore`
- Document required variables in README
- Use consistent naming across environments

**Source**: Vite environment variable documentation

#### Production Environment

**Recommended Setup**:

```bash
# Server-side (Cloud Run, Cloud Functions)
# Set via gcloud CLI or console
gcloud run services update socket-server \
  --update-env-vars FIREBASE_PROJECT_ID=prod-wedding-allstars \
  --update-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest

# OR use default credentials
# No GOOGLE_APPLICATION_CREDENTIALS needed - uses Cloud Run service identity
```

```bash
# Client-side (projector-app)
# Build-time variables only
VITE_API_URL=https://api.wedding-allstars.com
VITE_SOCKET_SERVER_URL=https://socket.wedding-allstars.com
VITE_PROJECTOR_API_KEY=prod-projector-key-abc123
```

**Best Practices**:
- Use Google Cloud Secret Manager for sensitive values
- Rotate secrets regularly (quarterly or after exposure)
- Use separate service accounts per environment
- Never log environment variable values in production

**Source**: Google Cloud environment variable documentation, Cloud Run best practices

---

### 4.2 .gitignore Patterns

#### Recommended Patterns

```gitignore
# Service account files
service-account*.json
*-service-account.json
firebase-adminsdk*.json
credentials.json

# Environment files
.env
.env.local
.env.*.local
.env.development.local
.env.production.local

# Exception: Example files should be committed
!.env.example
!.env.*.example
```

**Current Project Status**: Already includes `.env` and `.env.local` patterns in `/home/tisayama/allstars/.gitignore`

**Additional Recommendation**: Add service account JSON patterns explicitly.

**Source**: GitHub security best practices, Google Cloud documentation

---

### 4.3 Loading Service Account Files in Vite

#### Critical Rule: NEVER Load Service Accounts in Vite/React

**WRONG APPROACH** (Security vulnerability):

```typescript
// ❌ NEVER DO THIS
import serviceAccount from './service-account.json';
const credential = admin.credential.cert(serviceAccount);
```

**Why This Fails**:
1. Vite bundles all imported files into client JavaScript
2. Service account credentials would be exposed in browser
3. Private key would be visible in dev tools
4. Anyone could impersonate your application

**Source**: Vite bundling documentation, Firebase security warnings

#### Correct Approach: Backend API for Token Generation

```typescript
// ✅ CORRECT: Server-side only
// In api-server or Cloud Function

import * as admin from 'firebase-admin';

// Initialize with environment variables (server-side)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

// Expose token generation endpoint
app.post('/api/projector/auth-token', async (req, res) => {
  const customToken = await admin.auth().createCustomToken(uid, claims);
  res.json({ token: customToken });
});
```

```typescript
// ✅ CORRECT: Client-side token request
// In projector-app

async function getAuthToken() {
  const response = await fetch(`${API_URL}/api/projector/auth-token`, {
    method: 'POST',
    headers: {
      'X-API-Key': import.meta.env.VITE_PROJECTOR_API_KEY,
    },
  });

  const { token } = await response.json();
  return token;
}
```

**Source**: React security best practices, Vite environment variable security guides

---

### 4.4 Base64 Encoding for Service Account JSON (Alternative)

#### Pattern: Environment Variable with Base64 Encoding

**Use Case**: When deploying to platforms that handle environment variables better than files (Vercel, Netlify, etc.)

**Encoding**:

```bash
# One-time conversion
cat service-account.json | base64 > service-account-base64.txt

# Set as environment variable
export FIREBASE_SERVICE_ACCOUNT_BASE64="ewogICJ0eXBlIjogInNlcn..."
```

**Decoding (Server-side)**:

```typescript
import * as admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!serviceAccountBase64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 not set');
}

const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
```

**Pros**:
- Works on platforms that don't support file uploads
- Single environment variable instead of multiple fields
- Easy to rotate (just update env var)

**Cons**:
- Longer environment variable value
- Extra encoding/decoding step
- Slightly less readable for debugging

**Source**: Stack Overflow patterns, deployment platform documentation

---

## Summary of Recommendations

### 1. Firebase Service Account Authentication

**DECISION**: Use server-generated custom tokens, NOT direct service account exposure.

**Implementation**:
1. Create API endpoint in api-server to generate custom tokens
2. Projector-app requests token using static API key
3. Projector-app signs in with custom token via Firebase Auth SDK
4. Projector-app connects to WebSocket with resulting ID token

**Rationale**: Maximizes security while maintaining automatic authentication.

---

### 2. Socket.IO Authentication

**DECISION**: Use dedicated `/projector-socket` namespace with middleware authentication.

**Implementation**:
1. Create namespace: `io.of('/projector-socket')`
2. Add middleware to verify Firebase ID tokens
3. Verify custom claims (role: 'projector')
4. Store client type in socket.data

**Rationale**: Clear separation of concerns, easier authorization, better monitoring.

---

### 3. Exponential Backoff

**DECISION**: Use Socket.IO's built-in reconnection with proper configuration.

**Configuration**:
```typescript
{
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 60000,
  randomizationFactor: 0.5,
}
```

**Additional Logic**: Refresh Firebase token before reconnection attempts.

**Rationale**: Battle-tested implementation, no need to reinvent the wheel.

---

### 4. Environment Variable Management

**DECISION**:
- Server-side: Use environment variables for service account credentials
- Client-side: Use VITE_PROJECTOR_API_KEY for token endpoint access only

**Security Rules**:
1. NEVER expose service account credentials client-side
2. NEVER prefix sensitive values with VITE_
3. Use .gitignore for service account JSON files
4. Rotate secrets regularly

**Rationale**: Follows platform-specific security best practices.

---

## Implementation Checklist

### Server-Side (api-server)

- [ ] Create `/api/projector/auth-token` POST endpoint
- [ ] Validate API key from request headers
- [ ] Generate custom token with projector claims
- [ ] Implement rate limiting (10 requests/minute per IP)
- [ ] Add audit logging for token generation
- [ ] Set up environment variables for service account

### Server-Side (socket-server)

- [ ] Create `/projector-socket` namespace
- [ ] Implement namespace middleware for authentication
- [ ] Verify Firebase ID tokens with role claims
- [ ] Add projector-specific event handlers
- [ ] Update metrics to track projector connections separately
- [ ] Add `REQUEST_STATE_REFRESH` event handler

### Client-Side (projector-app)

- [ ] Create token request helper function
- [ ] Implement Firebase signInWithCustomToken flow
- [ ] Update useWebSocket to connect to `/projector-socket`
- [ ] Configure exponential backoff settings
- [ ] Implement token refresh on reconnection
- [ ] Add connection status UI (green/yellow/red bar)
- [ ] Implement degraded mode (last known state)
- [ ] Add error handling for authentication failures

### Configuration

- [ ] Add VITE_PROJECTOR_API_KEY to projector-app/.env.example
- [ ] Add service account patterns to .gitignore
- [ ] Document environment variables in README
- [ ] Set up separate service accounts for dev/staging/prod
- [ ] Create rotation schedule for API keys and service accounts

---

## References

### Official Documentation
- [Firebase Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Socket.IO Namespaces](https://socket.io/docs/v4/namespaces/)
- [Socket.IO Middlewares](https://socket.io/docs/v4/middlewares/)
- [Socket.IO Client Options](https://socket.io/docs/v4/client-options/)
- [Vite Environment Variables](https://vite.dev/guide/env-and-mode)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

### Best Practices Guides
- [AWS Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [ExpertBeacon GOOGLE_APPLICATION_CREDENTIALS Guide](https://expertbeacon.com/mastering-the-google_application_credentials-environment-variable-the-ultimate-guide-for-google-cloud-developers/)
- [Smashing Magazine: Hide API Keys in React](https://www.smashingmagazine.com/2023/05/safest-way-hide-api-keys-react/)

### Codebase References
- `/home/tisayama/allstars/apps/socket-server/src/auth/tokenVerifier.ts`
- `/home/tisayama/allstars/apps/socket-server/src/middleware/authMiddleware.ts`
- `/home/tisayama/allstars/apps/projector-app/src/hooks/useWebSocket.ts`
- `/home/tisayama/allstars/apps/api-server/src/utils/retry.ts`
- `/home/tisayama/allstars/specs/001-projector-auth/spec.md`

### Libraries
- [p-retry](https://www.npmjs.com/package/p-retry) - Used in existing codebase
- [exponential-backoff](https://www.npmjs.com/package/exponential-backoff) - Alternative option

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Author**: Research conducted via web search and codebase analysis
