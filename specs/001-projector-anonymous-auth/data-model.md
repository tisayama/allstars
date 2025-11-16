# Data Model: Projector Anonymous Authentication

**Feature**: 001-projector-anonymous-auth
**Created**: 2025-11-16
**Status**: Design

## Overview

This feature introduces minimal new data structures, primarily reusing existing Firebase and application state patterns. The data model focuses on authentication state management and connection monitoring for the projector display system.

## Entities

### 1. Anonymous User Session

**Purpose**: Represents the projector's Firebase anonymous authentication state

**Storage**: Firebase Authentication service (managed by Firebase SDK) + browser localStorage (session metadata)

**Lifecycle**: Created on first app launch, persisted until browser data cleared or 24-hour expiration

**Fields**:

| Field Name | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `uid` | string | Yes | Firebase-generated unique identifier for anonymous user | Firebase SDK managed |
| `idToken` | string | Yes | JWT token for authenticating to backend services | Firebase SDK managed, auto-refreshed |
| `refreshToken` | string | Yes | Token used to obtain new ID tokens | Firebase SDK managed, opaque |
| `expiresAt` | timestamp | Yes | When the current ID token expires (typically 1 hour from issue) | Firebase SDK managed |
| `createdAt` | timestamp | Yes | When the session was first created | Stored in localStorage |
| `isAnonymous` | boolean | Yes | Always `true` for projector sessions | Firebase SDK property |

**State Transitions**:
- **Unauthenticated** → **Authenticating**: App calls `signInAnonymously()`
- **Authenticating** → **Authenticated**: Firebase completes auth and returns session
- **Authenticated** → **TokenRefreshing**: ID token nearing expiration (automatic)
- **TokenRefreshing** → **Authenticated**: New ID token obtained (automatic)
- **Authenticated** → **Unauthenticated**: Session expired (>24 hours) or browser data cleared

**Relationships**:
- Used by: WebSocket connection (includes ID token in auth handshake)
- Used by: Firestore read operations (implicit - Firebase SDK attaches token)

---

### 2. Connection Status

**Purpose**: Tracks the health and state of all network connections (Firebase Auth, WebSocket, Firestore)

**Storage**: React component state (ephemeral, not persisted)

**Lifecycle**: Exists while app is running, reset on app reload

**Fields**:

| Field Name | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `firebaseAuthState` | enum | Yes | Current Firebase authentication state | `'unauthenticated' \| 'authenticating' \| 'authenticated' \| 'error'` |
| `websocketState` | enum | Yes | Current WebSocket connection state | `'disconnected' \| 'connecting' \| 'connected' \| 'error'` |
| `firestoreListenerState` | enum | Yes | Current Firestore snapshot listener state | `'inactive' \| 'active' \| 'error'` |
| `lastError` | string \| null | No | Most recent error message (if any) | Max 500 characters |
| `lastUpdateTimestamp` | timestamp | No | When the last successful update was received | Unix timestamp (ms) |
| `reconnectAttempts` | number | No | Count of reconnection attempts (for exponential backoff) | Non-negative integer |

**State Transitions**:
- **Firebase Auth**: `unauthenticated` → `authenticating` → `authenticated` (or `error`)
- **WebSocket**: `disconnected` → `connecting` → `connected` (or `error` → retry → `connecting`)
- **Firestore**: `inactive` → `active` (or `error`)

**Relationships**:
- Displayed by: `ConnectionStatus` component
- Updated by: `useProjectorAuth`, `useWebSocket`, `useFirestoreListener` hooks

---

### 3. Update Event

**Purpose**: Represents a game state update received through either WebSocket or Firestore

**Storage**: Ephemeral (processed and discarded, not persisted)

**Lifecycle**: Received from network, deduplicated, processed, then discarded

**Fields**:

| Field Name | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `source` | enum | Yes | Which channel delivered this update | `'websocket' \| 'firestore'` |
| `eventType` | string | Yes | Type of game event | One of: `'GAME_STATE_CHANGED'`, `'TIME_SYNC'`, etc. |
| `payload` | object | Yes | Event-specific data | Varies by `eventType` |
| `timestamp` | timestamp | Yes | Server-side timestamp of the event | Unix timestamp (ms) |
| `receivedAt` | timestamp | Yes | Client-side timestamp when received | Unix timestamp (ms) |

**Deduplication Logic**:
- Track last processed timestamp per `eventType`
- Accept update if `update.timestamp > lastProcessed[eventType]`
- Ignore update if `update.timestamp <= lastProcessed[eventType]`
- First channel to deliver wins, second channel's duplicate is dropped

**Relationships**:
- Produced by: WebSocket listener, Firestore snapshot listener
- Consumed by: Game state reducer/updater

---

## Data Flow

```
┌─────────────────┐
│  App Launch     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  signInAnonymously()        │ ← Creates Anonymous User Session
│  (Firebase SDK)             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  onAuthStateChanged         │ ← Updates Connection Status (Firebase)
│  (session established)      │
└────────┬────────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│  WebSocket       │    │  Firestore Snapshot  │
│  Connect         │    │  Listener Start      │
│  (with ID token) │    │  (with auth)         │
└────────┬─────────┘    └─────────┬────────────┘
         │                        │
         │  ← Updates Connection Status (WebSocket/Firestore)
         │                        │
         ▼                        ▼
┌──────────────────────────────────────────┐
│         Update Events Stream             │
│  (WebSocket events + Firestore changes)  │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Deduplication Logic         │ ← Processes Update Events
│  (timestamp-based)           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Game State Update           │
│  (UI re-render)              │
└──────────────────────────────┘
```

## Validation Rules

### Anonymous User Session
- `uid` must be Firebase-generated (no custom validation needed)
- `idToken` must be valid JWT (Firebase SDK enforces)
- `createdAt` must not be more than 24 hours old (stale sessions rejected)

### Connection Status
- `firebaseAuthState` must transition logically (can't go from `unauthenticated` to `authenticated` without `authenticating`)
- `reconnectAttempts` must reset to 0 when connection succeeds
- `lastError` cleared when state transitions to success

### Update Event
- `timestamp` must be within reasonable bounds (server time ±5 minutes tolerance)
- Duplicate events (same `eventType` + `timestamp`) must be dropped
- `payload` structure validated against event type schema (from @allstars/types)

## Error Handling

### Authentication Errors
- **Network unavailable during auth**: Retry with exponential backoff, show "Connecting..." status
- **Session expired**: Automatically re-authenticate with `signInAnonymously()`
- **Permission denied**: Log error, show configuration issue message (likely Firestore rules misconfigured)

### Connection Errors
- **WebSocket disconnect**: Auto-reconnect with exponential backoff (1s → 60s max)
- **Firestore listener error**: Log error, rely on WebSocket as primary channel
- **Both channels fail**: Show "Connection Lost" warning, keep retrying both

### Update Errors
- **Malformed payload**: Log error, skip update (don't crash)
- **Out-of-order timestamps**: Accept newer, reject older (timestamp-based deduplication handles)
- **Unknown event type**: Log warning, ignore gracefully

## Performance Considerations

### Session Persistence
- **localStorage** used for session metadata (synchronous, fast)
- Session check on app load: <10ms
- No network call needed if valid session exists

### Deduplication
- **In-memory map**: `Map<eventType, lastTimestamp>` - O(1) lookup
- Max ~10 event types tracked (minimal memory footprint)
- Cleaned up on app unmount

### Connection Monitoring
- State updates trigger React re-renders only when values change
- Debounce status UI updates (2-second delay before showing disconnect)
- Minimal overhead (<1% CPU)

## Assumptions

- Firebase SDK manages all token refresh logic automatically (no manual intervention)
- Browser localStorage available and not quota-exceeded
- System clock reasonably accurate (±5 minutes tolerance)
- Firestore and WebSocket servers have synchronized clocks for timestamp comparison
- Maximum 100 updates/second sustained (well within browser/network capacity)

## Out of Scope

- Multi-device session synchronization (each projector operates independently)
- Session transfer between browsers (anonymous sessions are device-bound)
- Offline mode or local caching (projector requires live connection)
- User profile or preferences (projector is stateless display)
