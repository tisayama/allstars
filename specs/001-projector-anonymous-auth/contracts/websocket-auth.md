# WebSocket Authentication Contract

**Feature**: 001-projector-anonymous-auth
**Version**: 1.0.0
**Created**: 2025-11-16

## Overview

This document defines the WebSocket authentication protocol for projector-app. The projector connects to the existing WebSocket server using Firebase Anonymous Authentication ID tokens.

**Contract Type**: Client-Server Protocol (Existing server, new client behavior)
**Namespace**: `/projector-socket` (existing namespace, reused)
**Authentication Method**: Firebase ID Token in connection handshake

## Connection Handshake

### Client → Server: Connection Request

**Event**: Socket.IO connection with auth payload

**Trigger**: App calls `socket.connect()` after Firebase authentication completes

**Auth Payload**:
```typescript
{
  auth: {
    firebaseToken: string  // Firebase ID token from authenticated anonymous user
  }
}
```

**Example**:
```typescript
const socket = io('http://localhost:3001/projector-socket', {
  auth: {
    firebaseToken: await user.getIdToken()  // Firebase ID token
  },
  autoConnect: false
});

socket.connect();
```

**Expected Server Behavior**:
- Server validates `firebaseToken` using Firebase Admin SDK
- Server extracts `uid` from verified token
- Server grants read-only access to Firestore collections
- Server establishes session for this connection

---

### Server → Client: Authentication Success

**Event**: `connect` (Socket.IO built-in event)

**Trigger**: Server successfully validates Firebase token and establishes connection

**Payload**: None (standard Socket.IO connect event)

**Client Behavior**:
- Update connection status to "connected"
- Begin listening for game events
- Ready to receive updates

**Example**:
```typescript
socket.on('connect', () => {
  console.log('Connected to /projector-socket');
  setIsConnected(true);
});
```

---

### Server → Client: Authentication Failure

**Event**: `connect_error` (Socket.IO built-in event)

**Trigger**: Server rejects connection due to invalid/missing/expired Firebase token

**Payload**:
```typescript
{
  message: string  // Error description
}
```

**Possible Error Messages**:
- `"Authentication required"` - Missing `firebaseToken` in auth payload
- `"Invalid Firebase token"` - Token verification failed
- `"Token expired"` - Firebase token is expired
- `"Unauthorized"` - Token valid but user doesn't have permission

**Client Behavior**:
- Log error message
- Update connection status to "error"
- Retry connection with exponential backoff

**Example**:
```typescript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  setError(error.message);
  // Exponential backoff handled by Socket.IO reconnection config
});
```

---

## Game Event Subscriptions

Once authenticated, the projector receives game events through existing WebSocket contracts defined in `packages/types/src/SocketEvents.ts`.

### Subscribed Events (Read-Only)

The projector listens to but does NOT emit these events:

| Event Name | Payload Type | Description | Source |
|-----------|--------------|-------------|--------|
| `GAME_PHASE_CHANGED` | `GamePhaseChangedPayload` | Game phase transition | Host app via server |
| `START_QUESTION` | `StartQuestionPayload` | Question started | Host app via server |
| `GONG_ACTIVATED` | `GongActivatedPayload` | Period gong triggered | Host app via server |
| `TIME_SYNC` | `TimeSyncPayload` | Server time for clock sync | Server periodic broadcast |

**Example Listener**:
```typescript
socket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
  console.log('Phase changed to:', payload.newPhase);
  updateGamePhase(payload.newPhase);
});

socket.on('TIME_SYNC', (payload: TimeSyncPayload) => {
  const offset = payload.serverTime - Date.now();
  adjustLocalClock(offset);
});
```

---

## Connection Lifecycle

### Normal Flow

```
1. App Launch
   ↓
2. Firebase Anonymous Auth (signInAnonymously)
   ↓
3. Get ID Token (user.getIdToken())
   ↓
4. Connect to WebSocket with token (socket.connect())
   ↓
5. Server validates token
   ↓
6. 'connect' event emitted → Connection established
   ↓
7. Listen for game events (GAME_PHASE_CHANGED, etc.)
   ↓
8. Receive and process events
```

### Reconnection Flow (Network Disruption)

```
1. Network connection lost
   ↓
2. 'disconnect' event emitted
   ↓
3. Socket.IO auto-reconnect with exponential backoff
   ↓
4. Get fresh ID token (Firebase auto-refresh if expired)
   ↓
5. Reconnect with new token
   ↓
6. 'connect' event → Resume listening for events
```

### Token Expiration Flow (Long Session)

```
1. Firebase ID token nearing expiration (after ~50 minutes)
   ↓
2. Firebase SDK auto-refreshes token (transparent)
   ↓
3. WebSocket connection remains active (no interruption)
   ↓
4. Next reconnection uses new token automatically
```

---

## Security Constraints

### Read-Only Access

**Projector clients MUST NOT emit events**:
- ❌ No `ANSWER_SUBMITTED` (participant-only)
- ❌ No `ADVANCE_PHASE` (host-only)
- ❌ No `ACTIVATE_GONG` (host-only)
- ✅ Only listen to broadcast events

**Server Enforcement**:
- Server validates event emission permissions based on user role
- Anonymous users (projector) have read-only permissions
- Attempts to emit restricted events result in permission denied

### Token Validation

**Server MUST**:
- Verify `firebaseToken` signature using Firebase Admin SDK
- Check token expiration (reject expired tokens)
- Extract `uid` from verified token claims
- Reject connections with missing or malformed tokens

**Client MUST**:
- Always provide valid Firebase ID token
- Refresh token before expiration (Firebase SDK handles automatically)
- Never send refresh token over WebSocket (only ID token)

---

## Configuration

### Socket.IO Client Options

```typescript
const socket = io('http://localhost:3001/projector-socket', {
  auth: {
    firebaseToken: '<ID-token>'  // Updated on each reconnection
  },
  autoConnect: false,                 // Manual connect after auth ready
  reconnection: true,                 // Enable auto-reconnection
  reconnectionAttempts: Infinity,     // Retry indefinitely
  reconnectionDelay: 1000,            // Start at 1s delay
  reconnectionDelayMax: 60000,        // Cap at 60s delay
  randomizationFactor: 0.5,           // ±50% jitter
  timeout: 20000,                     // 20s connection timeout
});
```

### Environment Variables

**Projector App (.env)**:
```bash
VITE_SOCKET_SERVER_URL=http://localhost:3001
```

**Production**:
```bash
VITE_SOCKET_SERVER_URL=https://socket-server.your-domain.com
```

---

## Error Codes & Handling

| Error Scenario | Client Detection | Client Response |
|---------------|------------------|-----------------|
| Missing token | `connect_error`: "Authentication required" | Re-authenticate with Firebase, retry |
| Invalid token | `connect_error`: "Invalid Firebase token" | Re-authenticate with Firebase, retry |
| Token expired | `connect_error`: "Token expired" | Get fresh token, retry |
| Network timeout | `connect_error` after 20s | Exponential backoff retry |
| Server unavailable | `connect_error`: Connection refused | Exponential backoff retry |

---

## Testing Scenarios

### Unit Tests
- ✅ Socket connects with valid Firebase token
- ✅ Socket rejects connection with missing token
- ✅ Socket rejects connection with invalid token
- ✅ Socket reconnects after network disruption

### Integration Tests
- ✅ End-to-end: Firebase auth → WebSocket connect → Receive event
- ✅ Token expiration: Session survives token refresh
- ✅ Network failure: Auto-reconnect with exponential backoff

### E2E Tests
- ✅ App launch: Auth + WebSocket connection within 3 seconds
- ✅ 8-hour session: Connection maintained, token auto-refreshed
- ✅ Network disruption: Recovery within 10 seconds of restore

---

## Contract Versioning

**Version**: 1.0.0 (Initial)
**Breaking Changes**: None (reuses existing server implementation)
**Backward Compatibility**: Fully compatible with existing `/projector-socket` namespace

**Future Changes**:
- Version changes MUST be documented here
- Breaking changes require MAJOR version bump
- New optional fields require MINOR version bump
