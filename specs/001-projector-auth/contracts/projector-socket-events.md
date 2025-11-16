# WebSocket Event Contract: Projector Socket Namespace

**Namespace**: `/projector-socket`
**Feature**: 001-projector-auth
**Protocol**: Socket.IO 4.x
**Created**: 2025-11-16

## Overview

This document defines the WebSocket event contract for the `/projector-socket` namespace,
which provides dedicated WebSocket connections for projector-app instances with
Firebase service account-based authentication.

**Key Differences from Default Namespace (`/`)**:
- Dedicated namespace for projector clients only
- Authentication via Firebase custom tokens (not anonymous auth)
- Read-only access to game state (no mutation events)
- Additional `REQUEST_STATE_REFRESH` event for manual state sync

---

## Connection Flow

```
Client                                Socket Server
  │                                        │
  │─────── connect to /projector-socket ──→│
  │                                        │
  │←────────── AUTH_REQUIRED ──────────────│
  │         {timeout: 10000}               │
  │                                        │
  │────────── authenticate ────────────────→│
  │    {token: "firebase-id-token"}        │
  │                                        │
  │                                        │ (verify token)
  │                                        │ (check role claim)
  │                                        │
  │←────────── authenticated ──────────────│
  │   {sessionId, uid, message}            │
  │                                        │
  │←──────── GAME_STATE_UPDATE ────────────│
  │        (initial state)                 │
  │                                        │
  │         [connected, ready]             │
```

---

## Authentication Events

### 1. AUTH_REQUIRED (Server → Client)

**Direction**: Server → Client
**Trigger**: Immediately after client connects to namespace
**Purpose**: Notify client that authentication is required

**Payload**:
```typescript
interface AuthRequiredPayload {
  timeout: number;  // Milliseconds until connection timeout (default: 10000)
}
```

**Example**:
```json
{
  "timeout": 10000
}
```

**Client Behavior**:
- Must respond with `authenticate` event within timeout period
- If timeout expires, server disconnects with `AUTH_TIMEOUT` error

---

### 2. authenticate (Client → Server)

**Direction**: Client → Server
**Trigger**: Client receives `AUTH_REQUIRED` event
**Purpose**: Provide Firebase ID token for authentication

**Payload**:
```typescript
interface AuthenticatePayload {
  token: string;  // Firebase ID token obtained from signInWithCustomToken
}
```

**Example**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.ewogImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS93ZWRkaW5nLWFsbHN0YXJzIiwKICAiYXVkIjoid2VkZGluZy1hbGxzdGFycyIsCiAgImF1dGhfdGltZSI6MTcwMDAwMDAwMCwKICAidXNlcl9pZCI6InByb2plY3Rvci1hYmNkMTIzNCIsCiAgInN1YiI6InByb2plY3Rvci1hYmNkMTIzNCIsCiAgImlhdCI6MTcwMDAwMDAwMCwKICAiZXhwIjoxNzAwMDAzNjAwLAogICJyb2xlIjoicHJvamVjdG9yIgp9.signature"
}
```

**Validation** (Server-side):
1. Token is valid JWT format
2. Token is not expired (`exp` claim)
3. Token issuer matches Firebase project
4. Token custom claims include `role: 'projector'`

**Error Cases**:
- Invalid token format → `AUTH_FAILED` with code `INVALID_TOKEN`
- Expired token → `AUTH_FAILED` with code `EXPIRED_TOKEN`
- Missing `role` claim → `AUTH_FAILED` with code `INVALID_ROLE`
- Wrong role value → `AUTH_FAILED` with code `INVALID_ROLE`

---

### 3. authenticated (Server → Client)

**Direction**: Server → Client
**Trigger**: Successful token verification
**Purpose**: Confirm authentication success and provide session info

**Payload**:
```typescript
interface AuthenticatedPayload {
  sessionId: string;  // Socket.IO socket.id
  uid: string;        // Firebase UID from token
  message: string;    // Success message
}
```

**Example**:
```json
{
  "sessionId": "abc123xyz",
  "uid": "projector-abcd1234",
  "message": "Authentication successful"
}
```

**Client Behavior**:
- Update UI to show "connected" state (green status bar)
- Begin listening for game state updates
- Store sessionId for debugging/logging

---

### 4. AUTH_FAILED (Server → Client)

**Direction**: Server → Client
**Trigger**: Authentication failure (invalid token, timeout, etc.)
**Purpose**: Notify client of authentication failure with reason

**Payload**:
```typescript
interface AuthFailedPayload {
  reason: string;  // Human-readable error message
  code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'TIMEOUT' | 'INVALID_ROLE';
}
```

**Example**:
```json
{
  "reason": "Firebase ID token has expired",
  "code": "EXPIRED_TOKEN"
}
```

**Error Codes**:
- `INVALID_TOKEN`: Token format invalid or verification failed
- `EXPIRED_TOKEN`: Token `exp` claim is in the past
- `TIMEOUT`: Client did not send `authenticate` within timeout period
- `INVALID_ROLE`: Token missing `role: 'projector'` custom claim

**Client Behavior**:
- Display error status (red status bar)
- Log error details for debugging
- Attempt reconnection with exponential backoff
- Refresh custom token before retry (if EXPIRED_TOKEN)

**Server Behavior**:
- Disconnect socket after sending `AUTH_FAILED`
- Log authentication failure for security audit (FR-007)
- Increment failure counter for rate limiting/alerting

---

## Game State Events

### 5. GAME_STATE_UPDATE (Server → Client)

**Direction**: Server → Client
**Trigger**: Game state changes in Firestore `gameState/live` document
**Purpose**: Broadcast game state updates to projector for display

**Payload**:
```typescript
interface GameStateUpdatePayload {
  gameState: GameState;  // From @allstars/types
  timestamp: number;     // Server timestamp when update was sent
}

// GameState from @allstars/types package
interface GameState {
  currentPhase: GamePhase;
  currentQuestionIndex: number;
  questions: Question[];
  guests: Guest[];
  rankings?: RankingEntry[];
  // ... (full type defined in @allstars/types)
}
```

**Example**:
```json
{
  "gameState": {
    "currentPhase": "showing_question",
    "currentQuestionIndex": 2,
    "questions": [ /* array of questions */ ],
    "guests": [ /* array of guests */ ]
  },
  "timestamp": 1700000000000
}
```

**Client Behavior**:
- Update displayed game state immediately
- Store state for degraded mode (show last known state when disconnected)
- Update `lastConnected` timestamp in ConnectionStatus

**Frequency**: Real-time (whenever Firestore document changes)

**Data Size**: Typical 10-100KB per update (depends on number of guests/questions)

---

### 6. REQUEST_STATE_REFRESH (Client → Server)

**Direction**: Client → Server
**Trigger**: Manual refresh request from projector-app (FR-008)
**Purpose**: Request immediate game state update (bypass Firestore change event)

**Payload**: None (empty event)

**Example**:
```javascript
socket.emit('REQUEST_STATE_REFRESH');
```

**Use Cases**:
- Projector-app recovers from degraded mode
- Venue staff manually triggers refresh (optional UI button)
- After network interruption to ensure latest state

**Server Behavior**:
1. Fetch current `gameState/live` document from Firestore
2. Send `GAME_STATE_UPDATE` event to requesting client
3. Log refresh request for audit

**Rate Limiting**:
- Max 1 request per 5 seconds per socket
- Prevents abuse/excessive Firestore reads

**Error Response** (if rate limited):
```typescript
socket.emit('ERROR', {
  code: 'RATE_LIMITED',
  message: 'State refresh rate limit exceeded. Try again in 5 seconds.'
});
```

---

## Error Events

### 7. ERROR (Server → Client)

**Direction**: Server → Client
**Trigger**: General errors (rate limiting, invalid events, etc.)
**Purpose**: Notify client of non-authentication errors

**Payload**:
```typescript
interface ErrorPayload {
  code: string;     // Machine-readable error code
  message: string;  // Human-readable error message
  details?: any;    // Optional additional context
}
```

**Example**:
```json
{
  "code": "RATE_LIMITED",
  "message": "State refresh rate limit exceeded. Try again in 5 seconds.",
  "details": {
    "limit": 1,
    "window": 5000,
    "retryAfter": 3000
  }
}
```

**Common Error Codes**:
- `RATE_LIMITED`: Too many requests
- `INVALID_EVENT`: Client sent unrecognized event
- `PERMISSION_DENIED`: Client attempted write operation (projector is read-only)

**Client Behavior**:
- Log error for debugging
- Display error in UI if user-facing
- Apply backoff if RATE_LIMITED

---

## Connection Lifecycle Events

### 8. disconnect (Bidirectional)

**Direction**: Client ↔ Server
**Trigger**: Connection closed (intentional or network failure)
**Purpose**: Clean up resources and handle disconnection

**Server-Initiated Disconnect Reasons**:
- `io server disconnect`: Server explicitly closed connection (auth failure, shutdown)
- `transport close`: Underlying transport closed
- `ping timeout`: Client failed to respond to heartbeat

**Client-Initiated Disconnect Reasons**:
- `io client disconnect`: Client explicitly called `socket.disconnect()`
- `transport close`: Network connection lost

**Payload**: None

**Server Behavior** (on disconnect):
- Remove session from active sessions map
- Log disconnection event with timestamp and reason
- Clean up resources

**Client Behavior** (on disconnect):
- Update UI to "disconnected" state (red status bar)
- Start exponential backoff reconnection attempts
- Switch to degraded mode (show last known game state)

---

### 9. connect_error (Client-side Event)

**Direction**: N/A (client-side Socket.IO event)
**Trigger**: Connection attempt fails
**Purpose**: Handle connection failures during reconnection

**Payload**:
```typescript
interface ConnectErrorPayload {
  message: string;  // Error message
  type: string;     // Error type (e.g., 'TransportError')
}
```

**Client Behavior**:
- Log error details
- Update retry attempt counter
- Calculate next retry delay (exponential backoff)
- Update UI with retry status

---

## Namespace Configuration

### Server-Side Configuration

```typescript
// apps/socket-server/src/namespaces/projectorNamespace.ts

import { Namespace, Socket } from 'socket.io';
import { projectorAuthMiddleware } from '../middleware/projectorAuthMiddleware';

export function setupProjectorNamespace(io: Server): Namespace {
  const projectorNs = io.of('/projector-socket');

  // Authentication middleware (FR-004, FR-005)
  projectorNs.use(projectorAuthMiddleware);

  projectorNs.on('connection', (socket: Socket) => {
    console.log(`Projector connected: ${socket.id}`);

    // Handle manual refresh requests (FR-008)
    socket.on('REQUEST_STATE_REFRESH', () => {
      handleStateRefresh(socket);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Projector disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return projectorNs;
}
```

### Client-Side Configuration

```typescript
// apps/projector-app/src/lib/socket.ts

import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL;

export function connectProjectorSocket(firebaseIdToken: string): Socket {
  const socket = io(`${SOCKET_SERVER_URL}/projector-socket`, {
    auth: {
      token: firebaseIdToken,
    },
    reconnection: true,
    reconnectionAttempts: 10,        // FR-003
    reconnectionDelay: 1000,         // 1 second
    reconnectionDelayMax: 60000,     // 60 seconds max
    randomizationFactor: 0.5,        // Jitter ±50%
    timeout: 10000,                  // Connection timeout
  });

  return socket;
}
```

---

## Security Considerations

### Authorization Model

**Projector Role Permissions** (read-only):
- ✅ Listen to `GAME_STATE_UPDATE` events
- ✅ Emit `REQUEST_STATE_REFRESH` event
- ❌ Cannot emit game control events (START_GAME, NEXT_QUESTION, etc.)
- ❌ Cannot emit guest mutation events (SUBMIT_ANSWER, etc.)

**Enforcement**: Server-side middleware checks custom claims for all events

### Rate Limiting

| Event | Limit | Window | Behavior on Exceed |
|-------|-------|--------|-------------------|
| `REQUEST_STATE_REFRESH` | 1 request | 5 seconds | ERROR event, ignore request |
| Connection attempts | 10 attempts | 5 minutes | Temporary IP ban (5 min) |

### Audit Logging (FR-007)

All authentication events MUST be logged with:
- Timestamp
- Socket ID
- UID
- Event type (AUTH_SUCCESS, AUTH_FAILED, etc.)
- IP address
- User agent

**Log Format** (JSON):
```json
{
  "timestamp": 1700000000000,
  "event": "AUTH_SUCCESS",
  "socketId": "abc123xyz",
  "uid": "projector-abcd1234",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
}
```

---

## Testing Contract

### Contract Tests

**Verify**:
1. Authentication flow (AUTH_REQUIRED → authenticate → authenticated)
2. Authentication failure cases (all 4 error codes)
3. GAME_STATE_UPDATE delivery
4. REQUEST_STATE_REFRESH functionality and rate limiting
5. Disconnection and reconnection behavior
6. Permission enforcement (cannot emit write events)

**Test Suite Location**: `apps/socket-server/tests/contract/projector-socket.test.ts`

### Integration Tests

**Verify**:
1. End-to-end authentication with real Firebase tokens
2. Firestore listener triggers GAME_STATE_UPDATE
3. Multiple simultaneous projector connections (FR-009)
4. Reconnection with token refresh after expiration

**Test Suite Location**: `apps/socket-server/tests/integration/projector-socket.integration.test.ts`

---

## Migration from Default Namespace

**Old Behavior** (anonymous auth on `/`):
```typescript
// OLD: Projector uses same namespace as participants
const socket = io(SOCKET_URL); // Connects to /
socket.on('GAME_STATE_UPDATE', handleGameState);
```

**New Behavior** (custom token on `/projector-socket`):
```typescript
// NEW: Projector uses dedicated namespace with custom token
const customToken = await fetchCustomToken();
await signInWithCustomToken(auth, customToken);
const idToken = await auth.currentUser.getIdToken();

const socket = io(`${SOCKET_URL}/projector-socket`, {
  auth: { token: idToken },
});
socket.on('authenticated', () => {
  console.log('Projector authenticated');
});
socket.on('GAME_STATE_UPDATE', handleGameState);
```

**Compatibility**:
- Both namespaces can coexist during migration
- Old projector-app versions continue working on `/` namespace
- New versions use `/projector-socket` namespace
- Gradual rollout with feature flag

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-16 | Initial contract definition for 001-projector-auth feature |
