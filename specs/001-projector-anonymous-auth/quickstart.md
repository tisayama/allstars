# Quick Start: Projector Anonymous Authentication

**Feature**: 001-projector-anonymous-auth
**Audience**: Developers implementing this feature
**Estimated Time**: 30 minutes setup + 2-3 hours implementation

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ pnpm installed and configured
- ✅ Firebase project with Authentication and Firestore enabled
- ✅ Firebase Emulator Suite installed (`firebase-tools`)
- ✅ Access to `allstars` monorepo on `001-projector-anonymous-auth` branch
- ✅ Familiarity with React hooks and Firebase SDK

## Setup (5 minutes)

### 1. Install Dependencies

```bash
cd /home/tisayama/allstars
pnpm install
```

### 2. Start Firebase Emulators

```bash
# Terminal 1: Start emulators (Auth + Firestore)
timeout 300 firebase emulators:start
```

**Expected Output**:
```
✔ All emulators ready! It is now safe to connect.
┌─────────────┬────────────────┐
│ Emulator    │ Host:Port      │
├─────────────┼────────────────┤
│ Auth        │ localhost:9099 │
│ Firestore   │ localhost:8080 │
└─────────────┴────────────────┘
```

### 3. Start Projector App (Development Mode)

```bash
# Terminal 2: Start projector-app
pnpm run dev --filter=projector-app
```

**Expected Output**:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5185/
  ➜  Network: use --host to expose
```

### 4. Start Socket Server

```bash
# Terminal 3: Start socket-server
pnpm run dev --filter=socket-server
```

**Expected Output**:
```
Socket server listening on port 3001
WebSocket namespace '/projector-socket' initialized
```

---

## Implementation Steps

### Phase 1: Create Authentication Hook (30 minutes)

**File**: `apps/projector-app/src/hooks/useProjectorAuth.ts`

**Based on**: `apps/participant-app/src/hooks/useAuth.ts`

**Key Modifications**:
1. Remove `registerWithToken()` method (projector doesn't register guests)
2. Remove `guestProfile` state (projector doesn't have user profile)
3. Simplify to pure anonymous authentication
4. Keep session persistence in localStorage (24-hour expiration)

**Implementation**:
```typescript
// 1. Import Firebase SDK
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

// 2. Define return type
export interface ProjectorAuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// 3. Implement hook
export function useProjectorAuth(): ProjectorAuthState {
  // Auto-authenticate on mount
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // No user, sign in anonymously
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, error, isAuthenticated: !!user };
}
```

**Test**: Create `apps/projector-app/tests/unit/useProjectorAuth.test.ts`

---

### Phase 2: Integrate with WebSocket (20 minutes)

**File**: `apps/projector-app/src/hooks/useWebSocket.ts` (modify existing)

**Changes**:
1. Add `useProjectorAuth()` dependency
2. Pass Firebase ID token to WebSocket connection
3. Wait for auth before connecting

**Implementation**:
```typescript
export function useWebSocket() {
  const { user, isAuthenticated } = useProjectorAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = io('http://localhost:3001/projector-socket', {
      auth: {
        firebaseToken: await user.getIdToken()
      },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 60000,
      randomizationFactor: 0.5,
    });

    socket.connect();

    return () => socket.disconnect();
  }, [isAuthenticated, user]);
}
```

**Test**: Create `apps/projector-app/tests/integration/auth-websocket.test.ts`

---

### Phase 3: Add Firestore Listener (20 minutes)

**File**: `apps/projector-app/src/services/firestoreService.ts` (new)

**Purpose**: Listen to Firestore `gameState/live` document for backup updates

**Implementation**:
```typescript
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

export function useGameStateListener(onUpdate: (gameState: GameState) => void) {
  useEffect(() => {
    const db = getFirestore();
    const docRef = doc(db, 'gameState', 'live');

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as GameState);
      }
    });

    return () => unsubscribe();
  }, [onUpdate]);
}
```

**Test**: Create `apps/projector-app/tests/unit/firestoreService.test.ts`

---

### Phase 4: Implement Deduplication (20 minutes)

**File**: `apps/projector-app/src/hooks/useDualChannelUpdates.ts` (new)

**Purpose**: Receive updates from both WebSocket and Firestore, deduplicate

**Implementation**:
```typescript
export function useDualChannelUpdates() {
  const lastTimestamps = useRef<Map<string, number>>(new Map());

  const handleUpdate = (source: 'websocket' | 'firestore', event: UpdateEvent) => {
    const lastTimestamp = lastTimestamps.current.get(event.eventType) || 0;

    if (event.timestamp > lastTimestamp) {
      // New update, process it
      lastTimestamps.current.set(event.eventType, event.timestamp);
      processUpdate(event);
      console.log(`Update from ${source}:`, event.eventType);
    } else {
      // Duplicate, ignore
      console.log(`Duplicate from ${source}, ignoring:`, event.eventType);
    }
  };

  useGameStateListener((data) => handleUpdate('firestore', { ...data, eventType: 'GAME_STATE_CHANGED' }));
  useWebSocket({ onGamePhaseChanged: (payload) => handleUpdate('websocket', { ...payload, eventType: 'GAME_PHASE_CHANGED' }) });
}
```

---

### Phase 5: Update Connection Status UI (15 minutes)

**File**: `apps/projector-app/src/components/ConnectionStatus.tsx` (modify existing)

**Changes**: Add Firebase auth state indicator

**Implementation**:
```typescript
interface ConnectionStatusProps {
  firebaseAuthState: 'authenticated' | 'authenticating' | 'unauthenticated';
  websocketState: 'connected' | 'connecting' | 'disconnected';
  firestoreListenerState: 'active' | 'inactive';
}

export function ConnectionStatus(props: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <StatusIndicator label="Firebase Auth" state={props.firebaseAuthState} />
      <StatusIndicator label="WebSocket" state={props.websocketState} />
      <StatusIndicator label="Firestore" state={props.firestoreListenerState} />
    </div>
  );
}
```

---

## Testing

### Run Unit Tests

```bash
timeout 60 pnpm test --filter=projector-app -- useProjectorAuth
```

**Expected**: All tests pass (authentication hook behaves correctly)

### Run Integration Tests

```bash
timeout 120 pnpm test --filter=projector-app -- auth-websocket
```

**Expected**: Firebase auth → WebSocket connection flow completes successfully

### Run E2E Tests

```bash
timeout 300 pnpm test:e2e --filter=projector-app -- projector-startup
```

**Expected**: App launches, authenticates, connects within 3 seconds

---

## Verification

### Manual Testing Checklist

- [ ] **App Launch**: Projector app loads and authenticates automatically
- [ ] **Connection Status**: All three indicators show "connected" / "authenticated" / "active"
- [ ] **WebSocket Events**: Trigger a game event from host-app, projector receives it
- [ ] **Firestore Updates**: Update `gameState/live` directly, projector receives it
- [ ] **Deduplication**: Same update from both channels, only one processed
- [ ] **Reconnection**: Disconnect network, restore, projector reconnects within 10s
- [ ] **Long Session**: Leave running for 8+ hours, remains connected (token auto-refresh)

### Debug Tips

**Problem**: Projector won't authenticate
- Check Firebase emulators are running (`http://localhost:4000`)
- Verify `VITE_FIREBASE_API_KEY` in `.env` file
- Check browser console for Firebase errors

**Problem**: WebSocket won't connect
- Verify socket-server is running on port 3001
- Check socket-server logs for authentication errors
- Confirm `VITE_SOCKET_SERVER_URL=http://localhost:3001`

**Problem**: Firestore updates not received
- Check Firestore emulator is running (`localhost:8080`)
- Verify `gameState/live` document exists
- Check browser console for Firestore permission errors

---

## Code Quality Checks

Before committing, run:

```bash
# Linting
pnpm run lint --filter=projector-app

# Type checking
pnpm run typecheck --filter=projector-app

# Formatting
pnpm run format --filter=projector-app

# All tests
timeout 300 pnpm test --filter=projector-app
```

**All checks must pass** before creating PR.

---

## Next Steps

After completing implementation:

1. **Run `/speckit.tasks`** to generate detailed task breakdown
2. **Implement tasks** following TDD (test-first) approach
3. **Create PR** with self-review
4. **Merge** after all tests pass

---

## Reference Files

- **Existing Pattern**: `apps/participant-app/src/hooks/useAuth.ts`
- **WebSocket Types**: `packages/types/src/SocketEvents.ts`
- **Firestore Types**: `packages/types/src/GameState.ts`
- **Connection Status**: `apps/projector-app/src/hooks/useConnectionStatus.ts`
- **Retry Utility**: `apps/api-server/src/utils/retry.ts` (reference for backoff patterns)

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| Setup | Install deps, start emulators | 5 min |
| Phase 1 | Create `useProjectorAuth` hook | 30 min |
| Phase 2 | Integrate with WebSocket | 20 min |
| Phase 3 | Add Firestore listener | 20 min |
| Phase 4 | Implement deduplication | 20 min |
| Phase 5 | Update connection status UI | 15 min |
| Testing | Unit + integration + E2E tests | 60 min |
| **Total** | | **2.5 hours** |

---

**Questions or Issues?**
- Check [research.md](./research.md) for technical decisions
- Review [data-model.md](./data-model.md) for entity details
- See [contracts/websocket-auth.md](./contracts/websocket-auth.md) for protocol spec
