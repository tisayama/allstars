# Technical Research: Projector Anonymous Authentication

**Feature**: Projector Anonymous Authentication
**Branch**: `001-projector-anonymous-auth`
**Date**: 2025-11-16
**Research Scope**: Firebase Anonymous Auth, Dual-Channel Updates, Connection Monitoring, Exponential Backoff

## 1. Firebase Anonymous Authentication Best Practices

### Decision: Use Firebase SDK's Built-in Session Management

**What was chosen**:
- Use `signInAnonymously()` with `onAuthStateChanged()` listener pattern
- Rely on Firebase SDK's automatic token refresh (no manual implementation needed)
- Use default `localStorage` persistence for web platform
- Session duration: indefinite (Firebase manages token rotation automatically)

**Rationale**:
- Firebase SDK automatically handles token refresh - ID tokens expire after 1 hour, but the SDK uses refresh tokens to obtain new ID tokens transparently without developer intervention
- Firebase manages auth state persistence in localStorage by default, eliminating need for custom session management
- Anonymous sessions persist across app restarts/page reloads automatically
- SDK handles network failures and retries token refresh operations internally
- Existing participant-app implementation (`/home/tisayama/allstars/apps/participant-app/src/hooks/useAuth.ts`) successfully uses this pattern

**Alternatives Considered**:

1. **Manual Token Refresh Implementation**
   - Rejected: Unnecessary complexity, Firebase SDK already handles this
   - Would require tracking token expiration time and scheduling refresh 5 minutes before expiry
   - Risk of bugs in custom refresh logic (race conditions, network failures)

2. **sessionStorage Instead of localStorage**
   - Rejected: Projector needs to persist across browser tab closures
   - sessionStorage cleared when browser tab closes, requiring re-authentication
   - localStorage provides 24+ hour persistence suitable for unattended operation

3. **In-Memory Only (No Persistence)**
   - Rejected: Requires re-authentication on every page reload
   - Unacceptable for unattended projector display (may reload during wedding reception)

**Implementation Notes**:

```typescript
// Pattern from participant-app (apps/participant-app/src/hooks/useAuth.ts)
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';

// In React hook
useEffect(() => {
  const auth = getAuthInstance();

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User authenticated - save to state
      setUser(firebaseUser);
    } else {
      // No user - sign in anonymously
      const credential = await signInAnonymously(auth);
      setUser(credential.user);
    }
  });

  return () => unsubscribe();
}, []);
```

**Key Behaviors**:
- `onAuthStateChanged` fires immediately with current auth state (null or User)
- If user is null, call `signInAnonymously()` to create anonymous session
- If user exists, Firebase has already loaded session from localStorage
- Token refresh happens automatically in background (every ~50 minutes for 1-hour tokens)
- No explicit token refresh calls needed in application code
- Firebase handles network disconnections during token refresh gracefully

**Security Considerations**:
- Anonymous users should have read-only Firestore access (enforced via security rules)
- Anonymous tokens can be generated via Firebase REST API by malicious actors
- Use Firestore security rules to differentiate anonymous vs authenticated users:
  ```javascript
  // Example Firestore rule
  allow read: if request.auth != null; // Allows anonymous + authenticated
  allow write: if request.auth != null && request.auth.token.email_verified == true; // Denies anonymous
  ```

**Error Handling**:
- Authentication failures (network errors) automatically retried by Firebase SDK
- Display "Connecting..." status during initial authentication
- Log authentication errors but don't block app initialization
- Fallback: Show error message if authentication fails after 30 seconds

---

## 2. Dual-Channel Update Pattern (WebSocket + Firestore)

### Decision: Timestamp-Based Deduplication with First-Wins Strategy

**What was chosen**:
- Receive updates via both WebSocket (primary) and Firestore snapshot listeners (backup)
- Use timestamp-based deduplication: track last update timestamp per event type
- First update wins: whichever channel delivers first is processed, subsequent duplicates ignored
- Independent channel health monitoring (both channels can fail independently)

**Rationale**:
- WebSocket provides low-latency updates (< 100ms) for real-time game events
- Firestore snapshots provide reliability if WebSocket disconnects temporarily
- Timestamp deduplication is simpler than event IDs (no server-side ID generation required)
- First-wins strategy prevents race conditions (both channels racing to deliver same update)
- Both channels use same underlying data (gameState/live document), ensuring consistency

**Alternatives Considered**:

1. **Event ID-Based Deduplication**
   - Rejected: Requires server to generate unique event IDs for each state change
   - More complex: need to track processed event IDs in memory/localStorage
   - Advantage: More precise (can detect exactly which events were processed)
   - Disadvantage: Requires backend changes to add event IDs to gameState document

2. **WebSocket-Only (No Firestore Redundancy)**
   - Rejected: Single point of failure if WebSocket disconnects
   - Projector may miss critical updates during reconnection window
   - Not acceptable for unattended display system

3. **Firestore-Only (No WebSocket)**
   - Rejected: Higher latency (Firestore snapshot updates typically 200-500ms)
   - Inefficient: polling-like behavior instead of push-based updates
   - No clock synchronization mechanism (WebSocket provides TIME_SYNC events)

4. **Last-Wins Strategy (Overwrite with Latest Update)**
   - Rejected: Risk of processing stale updates if Firestore delivers slower than WebSocket
   - First-wins guarantees fastest delivery channel is used

**Implementation Notes**:

```typescript
// Deduplication state (in-memory)
const lastUpdateTimestamps = useRef<Record<string, number>>({
  gamePhase: 0,
  currentQuestion: 0,
  gongActivated: 0,
});

// WebSocket event handler
function handleWebSocketUpdate(eventType: string, payload: any) {
  const timestamp = payload.timestamp || Date.now();

  if (timestamp <= lastUpdateTimestamps.current[eventType]) {
    console.debug(`Ignoring duplicate ${eventType} update (WebSocket)`);
    return; // Ignore duplicate
  }

  lastUpdateTimestamps.current[eventType] = timestamp;
  processUpdate(payload);
}

// Firestore snapshot handler
function handleFirestoreUpdate(snapshot: DocumentSnapshot) {
  const data = snapshot.data();
  const timestamp = data.updatedAt || Date.now();

  if (timestamp <= lastUpdateTimestamps.current.gamePhase) {
    console.debug('Ignoring duplicate gameState update (Firestore)');
    return;
  }

  lastUpdateTimestamps.current.gamePhase = timestamp;
  processUpdate(data);
}
```

**Timestamp Source Considerations**:
- Use server-generated timestamps when available (e.g., `serverStartTime` in START_QUESTION)
- Fallback to client-side `Date.now()` if server timestamp not provided
- Firestore `updatedAt` field should be server timestamp (`FieldValue.serverTimestamp()`)
- Clock skew between client/server is acceptable (deduplication still works)

**Edge Cases**:

1. **Same update arrives simultaneously from both channels**
   - First to execute deduplication check wins
   - Race condition possible, but both updates have same data (idempotent)
   - UI will render same state regardless of which wins

2. **Firestore delivers faster than WebSocket (rare)**
   - Firestore update processed first
   - WebSocket update arrives later, ignored as duplicate
   - Acceptable: both channels deliver same data

3. **WebSocket disconnected, only Firestore active**
   - Firestore updates processed normally
   - When WebSocket reconnects, may deliver stale updates (ignored via timestamp check)

4. **Both channels fail simultaneously**
   - Display "Connection Lost" warning
   - Connection status component shows both WebSocket and Firestore as disconnected
   - Auto-reconnection logic for both channels continues in background

**Performance Implications**:
- Minimal overhead: single timestamp comparison per update
- Memory usage: ~100 bytes for timestamp map (3-5 event types)
- No localStorage persistence needed (timestamps reset on page reload is acceptable)
- Firestore snapshot listener has minimal overhead (single document listener)

**Failover Logic**:
- No explicit failover needed - both channels always active
- Natural failover: if WebSocket fails, Firestore continues delivering updates
- If Firestore fails, WebSocket continues delivering updates
- Both channels reconnect independently with exponential backoff

---

## 3. Connection Status Monitoring

### Decision: Multi-Layer Status Tracking with Separate Indicators

**What was chosen**:
- Track three connection states independently:
  1. Firebase Authentication state (`onAuthStateChanged`)
  2. WebSocket connection state (Socket.IO events)
  3. Firestore listener state (snapshot error callbacks)
- Display connection status in UI with 2-second delay for disconnection indicator
- Use Socket.IO's built-in connection events (`connect`, `disconnect`, `reconnect`)
- Monitor Firestore listener via snapshot error callbacks

**Rationale**:
- Each layer can fail independently (Firebase auth can succeed while WebSocket fails)
- Separate indicators allow operators to diagnose specific failures
- 2-second delay prevents flickering indicators during brief network hiccups
- Socket.IO provides robust built-in connection lifecycle events
- Firestore snapshot listeners provide error callbacks for monitoring

**Alternatives Considered**:

1. **Single Combined Connection Status**
   - Rejected: Hides which specific layer failed
   - Difficult to diagnose: "Connection Lost" doesn't indicate if it's auth, WebSocket, or Firestore
   - Less actionable for operators

2. **Polling-Based Health Checks**
   - Rejected: Unnecessary overhead, all services provide event-based status
   - Firebase auth: `onAuthStateChanged` fires on auth state changes
   - WebSocket: `connect`/`disconnect` events
   - Firestore: snapshot listener error callbacks

3. **Immediate Disconnection Indicators (No Delay)**
   - Rejected: Causes UI flickering during brief network hiccups
   - Participant-app research shows 2-second delay provides good UX
   - Reconnections often happen within 1-2 seconds, no need to alarm users

**Implementation Notes**:

```typescript
// From apps/projector-app/src/hooks/useConnectionStatus.ts (existing pattern)
interface ConnectionStatus {
  firebaseAuth: boolean;
  websocket: boolean;
  firestore: boolean;
}

// Firebase Auth state (apps/participant-app/src/hooks/useAuth.ts pattern)
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setConnectionStatus(prev => ({
      ...prev,
      firebaseAuth: !!user
    }));
  });
  return unsubscribe;
}, []);

// WebSocket state (apps/projector-app/src/hooks/useWebSocket.ts pattern)
socket.on('connect', () => {
  setConnectionStatus(prev => ({ ...prev, websocket: true }));
  clearTimeout(disconnectTimerRef.current); // Cancel pending indicator
});

socket.on('disconnect', () => {
  setConnectionStatus(prev => ({ ...prev, websocket: false }));

  // Show indicator after 2 second delay
  disconnectTimerRef.current = setTimeout(() => {
    setShowDisconnectIndicator(true);
  }, 2000);
});

// Firestore listener state (apps/projector-app/src/hooks/useGameState.ts pattern)
const unsubscribe = onSnapshot(
  gameStateRef,
  (snapshot) => {
    setConnectionStatus(prev => ({ ...prev, firestore: true }));
  },
  (error) => {
    setConnectionStatus(prev => ({ ...prev, firestore: false }));
    console.error('Firestore listener error:', error);
  }
);
```

**Firebase Auth State Changes**:
- Initial load: `onAuthStateChanged` fires with `null` or existing User
- Sign-in success: Fires with User object
- Token refresh: Does NOT fire (happens silently in background)
- Sign-out: Fires with `null`
- Network disconnection: Does NOT fire (auth state persists in memory)

**WebSocket Connection Health Monitoring**:
- Use Socket.IO's built-in events: `connect`, `disconnect`, `connect_error`
- Monitor reconnection attempts: `reconnect_attempt`, `reconnect`, `reconnect_failed`
- Track authentication flow: `AUTH_REQUIRED`, `AUTH_SUCCESS`, `AUTH_FAILED`
- Connection considered healthy when: `socket.connected === true` AND authenticated

**Firestore Listener State Tracking**:
- Listener active: Snapshot callback fires successfully
- Listener error: Error callback fires (permission denied, network failure, etc.)
- Listener can fail independently of Firebase Auth (e.g., security rule changes)
- No built-in "reconnected" event - monitor snapshot callback resuming

**UI Patterns for Connection Status**:

```typescript
// Connection indicator component (from apps/projector-app/src/hooks/useConnectionStatus.ts)
function ConnectionIndicator({ connectionStatus, showIndicator }: Props) {
  if (!showIndicator) return null; // Don't show during brief disconnects

  return (
    <div className="connection-status">
      {!connectionStatus.firebaseAuth && <Badge>Auth Disconnected</Badge>}
      {!connectionStatus.websocket && <Badge>WebSocket Disconnected</Badge>}
      {!connectionStatus.firestore && <Badge>Firestore Disconnected</Badge>}
    </div>
  );
}
```

**Status Indicator Display Logic**:
- All connected: No indicator shown
- Disconnection < 2 seconds: No indicator shown (prevents flicker)
- Disconnection >= 2 seconds: Show indicator for disconnected services
- Reconnection: Immediately hide indicator (no delay)

**Monitoring Reconnection**:
- WebSocket: `reconnect` event fires after successful reconnection
- Firestore: Snapshot callback resumes firing
- Firebase Auth: `onAuthStateChanged` fires if auth state changes during reconnection

**Error Logging**:
- Log all connection state changes to console for debugging
- Include timestamps, error messages, and reconnection attempt counts
- Example: `console.error('WebSocket disconnected:', reason, { timestamp: Date.now() })`

---

## 4. Exponential Backoff for Reconnection

### Decision: Standard Exponential Backoff with Jitter (1s to 60s max)

**What was chosen**:
- Algorithm: Exponential backoff with full jitter
- Base delay: 1 second
- Max delay: 60 seconds
- Jitter: ±50% randomization (full jitter)
- Max attempts: Infinity for WebSocket, 5 for initial Firestore connection
- Formula: `min(maxDelay, baseDelay * 2^attempt) * (0.5 + random(0, 0.5))`

**Rationale**:
- Exponential backoff prevents overwhelming server during outages
- Jitter prevents thundering herd problem (many clients reconnecting simultaneously)
- 1-second base delay balances quick recovery vs server load
- 60-second max delay prevents excessively long waits
- Infinite attempts suitable for unattended display (keep trying until network restored)
- Full jitter (±50%) spreads reconnection attempts across wider time window

**Alternatives Considered**:

1. **Fixed Delay Retry (e.g., retry every 5 seconds)**
   - Rejected: Causes thundering herd when many clients disconnect simultaneously
   - All clients retry at exactly 5s, 10s, 15s intervals
   - Can overwhelm server during recovery from outage

2. **Linear Backoff (1s, 2s, 3s, 4s, ...)**
   - Rejected: Too slow to recover for early attempts, too aggressive for later attempts
   - Exponential provides better balance

3. **No Jitter (Deterministic Exponential)**
   - Rejected: Still causes thundering herd with synchronized disconnections
   - Example: 100 clients disconnect at same time, all retry at exactly 1s, 2s, 4s, 8s
   - Adding jitter distributes retries across time window

4. **Decorrelated Jitter**
   - Considered: More complex algorithm, spreads retries more evenly
   - Rejected: Full jitter is simpler and sufficient for this use case
   - Formula: `random(baseDelay, previousDelay * 3)`

5. **Max Attempts = 10 Instead of Infinity**
   - Rejected: Projector should keep trying indefinitely (unattended operation)
   - Wedding reception may last 4+ hours, network may be down for 30+ minutes
   - Better to keep retrying than give up permanently

**Implementation Notes**:

```typescript
// Socket.IO configuration (apps/projector-app/src/hooks/useWebSocket.ts)
const socket = io(socketUrl, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000, // 1 second base delay
  reconnectionDelayMax: 60000, // 60 seconds max delay
  randomizationFactor: 0.5, // ±50% jitter
});

// Socket.IO automatically applies exponential backoff with jitter
// Formula: min(reconnectionDelayMax, reconnectionDelay * 2^attemptNumber) * (1 + randomizationFactor * randomValue)
// Example progression with jitter:
// Attempt 1: 500ms - 1500ms (avg 1s)
// Attempt 2: 1000ms - 3000ms (avg 2s)
// Attempt 3: 2000ms - 6000ms (avg 4s)
// Attempt 4: 4000ms - 12000ms (avg 8s)
// Attempt 5: 8000ms - 24000ms (avg 16s)
// Attempt 6: 16000ms - 48000ms (avg 32s)
// Attempt 7+: 30000ms - 90000ms (avg 60s, capped at max)
```

**Jitter Strategies**:

1. **Full Jitter** (Chosen):
   - Formula: `random(0, exponentialDelay)`
   - Spreads retries across entire range [0, exponentialDelay]
   - Example: For 4s delay, retry anywhere from 0ms to 4000ms
   - Best for preventing thundering herd

2. **Equal Jitter**:
   - Formula: `exponentialDelay / 2 + random(0, exponentialDelay / 2)`
   - Spreads retries across [50%, 100%] of exponential delay
   - Example: For 4s delay, retry between 2s and 4s
   - More predictable than full jitter

3. **Decorrelated Jitter**:
   - Formula: `random(baseDelay, previousDelay * 3)`
   - More mathematically optimal but complex
   - Not necessary for this use case

**Socket.IO's Built-In Backoff**:
- Socket.IO implements exponential backoff with jitter automatically
- `randomizationFactor` parameter controls jitter amount (0.5 = ±50%)
- No custom backoff logic needed for WebSocket reconnection

**Firestore Reconnection**:
- Firestore SDK handles reconnection automatically for snapshot listeners
- No explicit backoff configuration available (managed internally by SDK)
- Firestore uses Long Polling or WebSocket under the hood with built-in retry logic

**Monitoring Backoff**:
```typescript
// Socket.IO reconnection events
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`WebSocket reconnection attempt ${attemptNumber}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('WebSocket reconnection failed after max attempts');
  // Note: With reconnectionAttempts = Infinity, this should never fire
});
```

**Thundering Herd Scenario**:
- Without jitter: 1000 clients disconnect at 12:00:00, all retry at exactly 12:00:01, 12:00:02, 12:00:04
- With 50% jitter: 1000 clients retry spread across 12:00:00.5-12:00:01.5, 12:00:01-12:00:03, 12:00:02-12:00:06
- Server sees smooth ramp-up instead of synchronized spikes

**Max Delay Rationale**:
- 60 seconds chosen as reasonable upper limit
- Prevents indefinite waiting (e.g., 10 minutes after many failed attempts)
- Projector will retry every ~60 seconds (with jitter) once max delay reached
- Operators can manually reload page if network restored (faster than waiting)

**Testing Backoff**:
- Simulate network disconnection: Browser DevTools > Network > Offline
- Observe console logs for reconnection attempts
- Verify delays increase exponentially: ~1s, ~2s, ~4s, ~8s, ~16s, ~32s, ~60s
- Verify jitter: delays should vary randomly within expected range

---

## Summary of Decisions

| Aspect | Decision | Key Rationale |
|--------|----------|---------------|
| **Authentication** | Firebase `signInAnonymously()` with SDK auto-refresh | SDK handles token refresh automatically, no manual implementation needed |
| **Session Persistence** | localStorage (Firebase default) | Survives page reloads, suitable for unattended operation |
| **Dual Channels** | WebSocket (primary) + Firestore snapshots (backup) | Low latency + reliability, natural failover |
| **Deduplication** | Timestamp-based, first-wins | Simpler than event IDs, no server changes required |
| **Connection Monitoring** | Multi-layer (Auth + WebSocket + Firestore) | Independent failure diagnosis, actionable for operators |
| **Status Indicator** | 2-second delay for disconnection | Prevents UI flickering during brief network hiccups |
| **Reconnection Backoff** | Exponential with full jitter (1s-60s, infinite attempts) | Prevents thundering herd, suitable for long-running sessions |

---

## References

### Existing Codebase Patterns

- **Participant-app Auth Hook**: `/home/tisayama/allstars/apps/participant-app/src/hooks/useAuth.ts`
  - Anonymous auth with session persistence (lines 31-183)
  - Session expiry logic (24-hour window, lines 49-55)
  - Error handling patterns (lines 109-114)

- **Participant-app WebSocket Hook**: `/home/tisayama/allstars/apps/participant-app/src/hooks/useWebSocket.ts`
  - Socket.IO configuration with reconnection (lines 36-43)
  - Authentication flow (AUTH_REQUIRED, AUTH_SUCCESS, AUTH_FAILED, lines 53-77)
  - Connection event handlers (lines 46-115)

- **Projector-app WebSocket Hook**: `/home/tisayama/allstars/apps/projector-app/src/hooks/useWebSocket.ts`
  - Firebase token-based authentication (lines 61-83)
  - Connection state tracking (lines 52-54)
  - Event subscription pattern (lines 130-143)

- **Projector-app Connection Status Hook**: `/home/tisayama/allstars/apps/projector-app/src/hooks/useConnectionStatus.ts`
  - 2-second delay for disconnection indicator (lines 4, 46-48)
  - Immediate indicator hide on reconnection (lines 31-39)
  - Timer cleanup pattern (lines 60-65)

- **Projector-app Firestore Hook**: `/home/tisayama/allstars/apps/projector-app/src/hooks/useGameState.ts`
  - Firestore snapshot listener setup (lines 24-67)
  - Connection status tracking (lines 18-22, 39, 44, 50)
  - Error callback handling (lines 48-52)

- **API Server Retry Utility**: `/home/tisayama/allstars/apps/api-server/src/utils/retry.ts`
  - Exponential backoff with p-retry library (lines 1-71)
  - Default config: 3 retries, 1-5s delays (lines 25-30)
  - Non-transient error detection (lines 85-100)

- **Participant-app Answer Queue**: `/home/tisayama/allstars/apps/participant-app/src/utils/answer-queue.ts`
  - Exponential backoff for submission retries (lines 23, 103-108)
  - Non-retryable error detection (lines 113-121)
  - localStorage persistence (lines 28-51)

### External Resources

1. **Firebase Authentication State Persistence**
   - Firebase Docs: [Auth State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
   - Default: `browserLocalPersistence` (survives page reloads)
   - Token refresh handled automatically by SDK

2. **Firebase Anonymous Authentication Best Practices**
   - Firebase Blog: [Best Practices for Anonymous Authentication (2023)](https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/)
   - Security: Use Firestore rules to restrict anonymous user permissions
   - Persistence: Anonymous sessions survive app restarts

3. **Exponential Backoff with Jitter**
   - Medium: [Mitigating the Thundering Herd Problem](https://medium.com/@avnein4988/mitigating-the-thundering-herd-problem-exponential-backoff-with-jitter-b507cdf90d62)
   - Better Stack: [Mastering Exponential Backoff in Distributed Systems](https://betterstack.com/community/guides/monitoring/exponential-backoff/)
   - Full jitter formula: `random(0, exponentialDelay)`

4. **WebSocket Reconnection Strategies**
   - DEV.to: [Robust WebSocket Reconnection Strategies in JavaScript](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
   - Socket.IO Docs: [Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery)
   - Best practices: exponential backoff with jitter, max delay cap

5. **Dual-Channel Architecture**
   - DEV.to: [Real-time Data Synchronization Patterns](https://dev.to/aaravjoshi/real-time-data-synchronization-patterns-build-modern-web-apps-with-websocket-and-firebase-d7i)
   - Ably: [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
   - Deduplication: timestamp-based or sequence numbers

6. **Socket.IO Connection Health Monitoring**
   - Socket.IO Docs: [Client API](https://socket.io/docs/v4/client-api/)
   - Stack Overflow: [Get connection status on Socket.io client](https://stackoverflow.com/questions/16518153/get-connection-status-on-socket-io-client)
   - Events: `connect`, `disconnect`, `reconnect_attempt`, `reconnect`

7. **Firebase onAuthStateChanged Behavior**
   - Stack Overflow: [Is onAuthStateChanged performing a fetch?](https://stackoverflow.com/questions/41639446/is-firebase-auth-onauthstatechanged-performing-a-fetch)
   - Behavior: Fires immediately with current state, then on every auth state change
   - No network traffic for attaching listener, but state changes may involve network calls

---

## Next Steps

Based on this research, the implementation should proceed with:

1. **Phase 1: Authentication Hook**
   - Adapt participant-app's `useAuth.ts` pattern for projector use case
   - Remove guest registration logic (not needed for projector)
   - Keep session persistence and error handling patterns
   - Test: Authentication completes within 3 seconds, persists across reloads

2. **Phase 2: WebSocket Integration**
   - Update `useWebSocket.ts` to use Firebase ID token for authentication
   - Configure Socket.IO with exponential backoff (1s-60s, infinite attempts, 50% jitter)
   - Implement connection status tracking
   - Test: Reconnection after network disruption, backoff timing

3. **Phase 3: Firestore Dual Channel**
   - Add Firestore snapshot listener on `gameState/live` document
   - Implement timestamp-based deduplication logic
   - Handle updates from both WebSocket and Firestore
   - Test: Deduplication works, updates received via either channel

4. **Phase 4: Connection Status UI**
   - Enhance `ConnectionStatus.tsx` component with multi-layer indicators
   - Implement 2-second delay for disconnection indicator
   - Show separate status for Auth, WebSocket, Firestore
   - Test: Indicator behavior during disconnection/reconnection scenarios

5. **Phase 5: Integration Testing**
   - E2E test: Full startup sequence (auth → WebSocket → Firestore)
   - E2E test: Network disconnection and automatic recovery
   - E2E test: 8+ hour continuous operation (token refresh, reconnections)
   - Load test: Verify deduplication under high update frequency
