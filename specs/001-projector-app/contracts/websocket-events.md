# WebSocket Event Contracts: Projector App ↔ Socket Server

**Feature**: 001-projector-app
**Date**: 2025-11-04
**Socket Server**: `apps/socket-server` (port 3001)
**Protocol**: Socket.IO 4.x

---

## Connection Configuration

### Client Configuration

```typescript
import { io, Socket } from 'socket.io-client';

const socketServerUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

const socket: Socket = io(socketServerUrl, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
```

### Environment Variables

- **Development**: `VITE_SOCKET_SERVER_URL=http://localhost:3001`
- **Production**: `VITE_SOCKET_SERVER_URL=https://socket.allstars.example.com`

---

## Connection Lifecycle Events

### `connect`

**Direction**: Server → Client (automatic)
**Trigger**: Socket successfully connects to server
**Payload**: None

**Usage**:
```typescript
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
  setConnectionStatus((prev) => ({ ...prev, websocket: true }));
});
```

---

### `disconnect`

**Direction**: Server → Client (automatic)
**Trigger**: Socket loses connection to server
**Payload**: `(reason: string)` - Disconnect reason

**Usage**:
```typescript
socket.on('disconnect', (reason) => {
  console.warn('WebSocket disconnected:', reason);
  setConnectionStatus((prev) => ({ ...prev, websocket: false }));
});
```

---

### `connect_error`

**Direction**: Server → Client (automatic)
**Trigger**: Connection attempt fails
**Payload**: `(error: Error)` - Connection error

**Usage**:
```typescript
socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
  setConnectionStatus((prev) => ({ ...prev, websocket: false }));
});
```

---

## Game Event Contracts

### `TRIGGER_GONG`

**Direction**: Server → Client (broadcast)
**Purpose**: Synchronize gong sound effect playback across all clients
**Trigger**: Host activates gong during period-final question

**Payload**:
```typescript
interface TriggerGongPayload {
  timestamp: string;  // ISO 8601 timestamp when event was emitted
}
```

**Example**:
```json
{
  "timestamp": "2025-11-04T14:30:45.123Z"
}
```

**Validation Rules**:
- `timestamp` MUST be valid ISO 8601 format
- `timestamp` SHOULD be within 1 second of client's current time (clock skew tolerance)

**Client Handler**:
```typescript
socket.on('TRIGGER_GONG', (data: TriggerGongPayload) => {
  console.log('TRIGGER_GONG received:', data.timestamp);

  // Validate payload
  if (!data.timestamp || !isValidISO8601(data.timestamp)) {
    console.error('Invalid TRIGGER_GONG payload:', data);
    return;
  }

  // Play gong sound effect immediately
  audioManager.playSoundEffect('sfx-gong');

  // Log latency for monitoring
  const latency = Date.now() - new Date(data.timestamp).getTime();
  console.log(`Gong playback latency: ${latency}ms`);
});
```

**Performance Target**: Sub-50ms client-to-client synchronization (measured server-side)

---

### `SYNC_TIMER`

**Direction**: Server → Client (broadcast)
**Purpose**: Synchronize countdown timers across all clients to server clock
**Trigger**: Question starts or periodic sync during countdown

**Payload**:
```typescript
interface SyncTimerPayload {
  deadline: string;   // ISO 8601 timestamp when answers close
  serverTime: string; // ISO 8601 current server time for clock offset calculation
}
```

**Example**:
```json
{
  "deadline": "2025-11-04T14:31:30.000Z",
  "serverTime": "2025-11-04T14:31:00.123Z"
}
```

**Validation Rules**:
- `deadline` MUST be valid ISO 8601 format
- `serverTime` MUST be valid ISO 8601 format
- `deadline` MUST be in the future relative to `serverTime`
- Clock offset MUST NOT exceed ±5 seconds (flag warning if exceeded)

**Client Handler**:
```typescript
socket.on('SYNC_TIMER', (data: SyncTimerPayload) => {
  console.log('SYNC_TIMER received:', data);

  // Validate payload
  if (!data.deadline || !data.serverTime) {
    console.error('Invalid SYNC_TIMER payload:', data);
    return;
  }

  // Calculate clock offset
  const serverTimeMs = new Date(data.serverTime).getTime();
  const clientTimeMs = Date.now();
  const clockOffset = serverTimeMs - clientTimeMs;

  // Warn if clock skew is excessive
  if (Math.abs(clockOffset) > 5000) {
    console.warn(`Excessive clock skew detected: ${clockOffset}ms`);
  }

  // Update countdown timer with synchronized deadline
  const deadlineMs = new Date(data.deadline).getTime();
  setCountdownDeadline(deadlineMs + clockOffset);

  console.log(`Timer synchronized. Clock offset: ${clockOffset}ms`);
});
```

**Performance Target**: Timer drift <100ms over 60-second countdown

---

## Outbound Events (None)

**Projector-app is a receive-only client**. It does NOT emit any custom events to the socket-server.

**Rationale**: The projector-app is a read-only broadcast display. All game control actions are performed by the host-app, which communicates with the api-server. The projector-app passively consumes state updates via Firestore and synchronized events via WebSocket.

---

## Error Handling

### Connection Failures

**Scenario**: Socket fails to connect after 5 retry attempts
**Behavior**:
- Display "WebSocket Disconnected" warning in `<ConnectionStatus />` component
- Continue displaying Firestore state (degraded mode)
- Audio playback continues based on Firestore state changes (no WebSocket sync)
- User sees visual indicator that gong synchronization is unavailable

**Code Pattern**:
```typescript
let reconnectAttempts = 0;

socket.on('reconnect_attempt', (attemptNumber) => {
  reconnectAttempts = attemptNumber;
  console.log(`WebSocket reconnect attempt ${attemptNumber}/5`);
});

socket.on('reconnect_failed', () => {
  console.error('WebSocket reconnection failed after 5 attempts');
  setConnectionStatus((prev) => ({ ...prev, websocket: false }));
  // Display warning to user but continue operating
});
```

---

### Malformed Event Payloads

**Scenario**: Server emits event with invalid/missing fields
**Behavior**:
- Log error with full payload details
- Skip processing (do not update state or trigger actions)
- Continue listening for future valid events

**Code Pattern**:
```typescript
function validateTriggerGongPayload(data: any): data is TriggerGongPayload {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.timestamp === 'string' &&
    !isNaN(new Date(data.timestamp).getTime())
  );
}

socket.on('TRIGGER_GONG', (data: any) => {
  if (!validateTriggerGongPayload(data)) {
    console.error('Invalid TRIGGER_GONG payload:', JSON.stringify(data));
    return; // Skip processing
  }

  // Process valid payload
  audioManager.playSoundEffect('sfx-gong');
});
```

---

## Testing Strategies

### Development Event Simulation

For local development without running socket-server, simulate events via browser console:

```javascript
// Simulate TRIGGER_GONG event
socket.emit('TRIGGER_GONG', {
  timestamp: new Date().toISOString()
});

// Simulate SYNC_TIMER event
socket.emit('SYNC_TIMER', {
  deadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
  serverTime: new Date().toISOString()
});
```

### Integration Tests

**File**: `apps/projector-app/tests/integration/websocket.test.ts`

**Test Cases**:
1. ✅ Socket connects successfully with valid URL
2. ✅ Socket reconnects after simulated disconnect
3. ✅ TRIGGER_GONG event plays gong sound
4. ✅ SYNC_TIMER event updates countdown deadline
5. ✅ Invalid payloads are logged and skipped
6. ✅ Connection status updates on connect/disconnect
7. ✅ Reconnection backoff follows exponential delay

**Mock Server Pattern**:
```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Test client connected');

  // Emit test event
  socket.emit('TRIGGER_GONG', { timestamp: new Date().toISOString() });
});

httpServer.listen(3001);
```

---

## Performance Monitoring

### Latency Metrics

Track and log the following metrics for performance analysis:

1. **Connection Latency**
   - Time from `io()` call to `connect` event
   - Target: <500ms

2. **Event Propagation Latency**
   - Time from server emission to client receipt
   - Measured via `timestamp` field comparison
   - Target: <50ms (local network), <200ms (internet)

3. **Audio Playback Latency**
   - Time from event receipt to audio start
   - Target: <100ms

**Logging Pattern**:
```typescript
socket.on('TRIGGER_GONG', (data: TriggerGongPayload) => {
  const eventTime = new Date(data.timestamp).getTime();
  const receiptTime = Date.now();
  const propagationLatency = receiptTime - eventTime;

  const playbackStart = performance.now();
  audioManager.playSoundEffect('sfx-gong');
  const playbackLatency = performance.now() - playbackStart;

  console.log('Gong Performance:', {
    propagationLatency: `${propagationLatency}ms`,
    playbackLatency: `${playbackLatency.toFixed(2)}ms`,
  });
});
```

---

## Security Considerations

### No Authentication Required

**Rationale**: Projector-app is a public broadcast display with no sensitive data exposure.

**Implications**:
- WebSocket connection does not require authentication tokens
- Anyone with the socket-server URL can connect
- Projector-app cannot perform any write operations
- No user-specific data is transmitted via WebSocket

### CORS Configuration

Socket-server MUST allow connections from projector-app origin:

```typescript
// apps/socket-server/src/index.ts
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',  // Vite dev server
      'https://projector.allstars.example.com'  // Production domain
    ],
    credentials: false
  }
});
```

---

## TypeScript Type Definitions

**File**: `apps/projector-app/src/types/websocket.ts`

```typescript
export interface ServerToClientEvents {
  TRIGGER_GONG: (data: TriggerGongPayload) => void;
  SYNC_TIMER: (data: SyncTimerPayload) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

export interface TriggerGongPayload {
  timestamp: string;
}

export interface SyncTimerPayload {
  deadline: string;
  serverTime: string;
}

// Usage in Socket.IO client
import { Socket } from 'socket.io-client';

const socket: Socket<ServerToClientEvents> = io(socketServerUrl);
```

---

## Future Event Extensions (Out of Scope for v1)

Potential future events NOT included in current implementation:

- `SYNC_PHASE`: Server-driven phase transitions (currently Firestore-only)
- `BROADCAST_MESSAGE`: Host messages displayed on projector
- `AUDIO_COMMAND`: Remote audio control (play/pause/volume)
- `EMERGENCY_STOP`: Immediate halt of all audio/video

These would require protocol versioning and backward compatibility handling.

---

**End of WebSocket Event Contracts Document**
