# Socket.io Event Protocol Documentation

**Feature**: 003-socket-server | **Version**: 1.0 | **Last Updated**: 2025-11-03

## Overview

This directory contains the type-safe contract definitions for all Socket.io events between the `socket-server` and client applications (participant-app, projector-app, host-app, admin-app).

## Files

- **socket-events.ts**: TypeScript type definitions for all event payloads and Socket.io generic types

## Event Categories

### 1. Game State Broadcasts (Server → Clients)

These events are triggered by changes to the `gameState/live` Firestore document:

| Event Name | Trigger | Purpose |
|------------|---------|---------|
| `START_QUESTION` | `currentPhase` → `"accepting_answers"` | New question starts, begin countdown |
| `GONG_ACTIVATED` | `isGongActive` → `true` | Final question indicator |
| `GAME_PHASE_CHANGED` | `currentPhase` changes (except to `"accepting_answers"`) | Generic phase transition |
| `IDLE_STATE` | No active game session | Pre-game waiting state |

### 2. Connection Control (Server ↔ Client)

These events manage the Socket.io connection lifecycle:

| Event Name | Direction | Purpose |
|------------|-----------|---------|
| `AUTH_REQUIRED` | Server → Client | Request authentication credentials |
| `authenticate` | Client → Server | Provide Firebase Auth token |
| `AUTH_SUCCESS` | Server → Client | Confirm successful authentication |
| `AUTH_FAILED` | Server → Client | Reject authentication, disconnect imminent |

## Connection Flow

```
Client                          Socket Server
  |                                   |
  |------- connect() ---------------→ |
  |                                   |
  | ←------ AUTH_REQUIRED ------------|  (timeout: 10s)
  |                                   |
  |------- authenticate -----------→ |  (token: string)
  |                                   |
  |                                   | Verify token with Firebase Admin
  |                                   |
  | ←------ AUTH_SUCCESS -------------|  (userId: string)
  |       OR                          |
  | ←------ AUTH_FAILED --------------|  (reason: string)
  |                                   | → disconnect()
  |                                   |
  | ←------ START_QUESTION ---------- |  (game events begin)
  | ←------ GONG_ACTIVATED ---------- |
  | ←------ GAME_PHASE_CHANGED ------ |
  |                                   |
```

## Usage Examples

### Server-Side (TypeScript)

```typescript
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  StartQuestionPayload,
} from './contracts/socket-events';

// Create type-safe Socket.io server
const io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData> =
  new Server(httpServer);

// Type-safe event broadcasting
const payload: StartQuestionPayload = {
  questionId: 'q006',
  serverStartTime: Date.now(),
};
io.to('gameRoom').emit('START_QUESTION', payload);
```

### Client-Side (TypeScript - React/Next.js)

```typescript
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  AuthenticatePayload,
} from '@allstars/types/socket-events';  // From /packages/types/

// Create type-safe Socket.io client
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io('wss://socket-server.allstars.app');

// Type-safe event listening
socket.on('START_QUESTION', (payload) => {
  console.log(`Question ${payload.questionId} started at ${payload.serverStartTime}`);
  startCountdownTimer(payload.questionId, payload.serverStartTime);
});

// Type-safe event emitting
socket.on('AUTH_REQUIRED', async ({ timeout }) => {
  const token = await firebase.auth().currentUser?.getIdToken();
  if (token) {
    socket.emit('authenticate', { token } as AuthenticatePayload);
  }
});
```

## Event Payload Reference

### START_QUESTION

```typescript
{
  questionId: string;        // e.g., "q006"
  serverStartTime: number;   // Millisecond epoch, e.g., 1678886400123
}
```

**Client Action**: Fetch question from Firestore, start countdown timer with clock synchronization

---

### GONG_ACTIVATED

```typescript
{}  // Empty payload
```

**Client Action**: Play GONG sound (projector), display "FINAL QUESTION" badge (all clients)

---

### GAME_PHASE_CHANGED

```typescript
{
  newPhase: GamePhase;  // "showing_distribution" | "showing_correct_answer" | "showing_results" | "all_revived" | ...
}
```

**Client Action**: Respond based on `newPhase` value (fetch distribution, reveal answer, show rankings, etc.)

---

### IDLE_STATE

```typescript
{}  // Empty payload
```

**Client Action**: Display "Waiting for game to start" screen

---

### AUTH_REQUIRED

```typescript
{
  timeout: number;  // Milliseconds before auto-disconnect (default 10000)
}
```

**Client Action**: Emit `authenticate` event with Firebase token immediately

---

### AUTH_SUCCESS

```typescript
{
  userId: string;  // Firebase UID, e.g., "abc123xyz789"
}
```

**Client Action**: Store userId for logging, begin listening for game events

---

### AUTH_FAILED

```typescript
{
  reason: string;  // e.g., "Invalid token", "Token expired"
}
```

**Client Action**: Refresh Firebase token, retry connection with exponential backoff

---

### authenticate (Client → Server)

```typescript
{
  token: string;  // Firebase Auth ID token (JWT format)
}
```

**Server Action**: Verify token with `admin.auth().verifyIdToken()`, admit or reject

---

## Contract Testing

All event payloads should be validated in contract tests:

### Server-Side Test Example

```typescript
// tests/contract/eventSchemas.test.ts
import { isStartQuestionPayload } from '../../src/contracts/socket-events';

describe('START_QUESTION payload validation', () => {
  it('should accept valid payload', () => {
    const payload = {
      questionId: 'q006',
      serverStartTime: 1678886400123,
    };
    expect(isStartQuestionPayload(payload)).toBe(true);
  });

  it('should reject payload with missing questionId', () => {
    const payload = {
      serverStartTime: 1678886400123,
    };
    expect(isStartQuestionPayload(payload)).toBe(false);
  });
});
```

### Client-Side Test Example

```typescript
// participant-app/tests/socket.test.ts
import { socket } from '../src/services/socketService';
import type { StartQuestionPayload } from '@allstars/types/socket-events';

describe('Socket.io event handling', () => {
  it('should handle START_QUESTION event', (done) => {
    socket.once('START_QUESTION', (payload: StartQuestionPayload) => {
      expect(payload.questionId).toBeDefined();
      expect(payload.serverStartTime).toBeGreaterThan(0);
      done();
    });

    // Simulate server event (test environment)
    socket.emit('START_QUESTION', {
      questionId: 'test-q1',
      serverStartTime: Date.now(),
    });
  });
});
```

## Versioning Strategy

- **Major Version**: Breaking changes (rename events, remove payloads, change payload structure)
- **Minor Version**: Additive changes (new optional fields, new events)
- **Patch Version**: Documentation fixes, no code changes

**Current Version**: 1.0.0

## Integration with /packages/types/

These Socket.io event types should be exported from `/packages/types/src/SocketEvents.ts` for monorepo-wide consumption:

```typescript
// packages/types/src/SocketEvents.ts
export * from '../../specs/003-socket-server/contracts/socket-events';
```

Then import in any app:

```typescript
import { StartQuestionPayload } from '@allstars/types';
```

## References

- [Socket.io Emit Cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/)
- [Socket.io TypeScript Support](https://socket.io/docs/v4/typescript/)
- [Firebase Auth ID Token Verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

---

**Maintained By**: AllStars Platform Team
**Questions**: Create issue in monorepo with `socket-server` label
