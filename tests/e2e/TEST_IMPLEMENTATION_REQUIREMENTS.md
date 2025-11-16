# E2E Test Implementation Requirements for Projector App

## Overview

The E2E tests in `/tests/e2e/scenarios/projector-auth.spec.ts` require the projector-app to expose specific global variables for test validation. This document describes the interface contract between the application and the E2E test suite.

## Required Global Variables

The projector-app must expose the following variables on the `window` object for E2E test validation:

### Authentication State

```typescript
window.__AUTH_COMPLETE__: boolean
```
- **Purpose**: Indicates whether Firebase Authentication has completed
- **Value**: `true` when user is authenticated, `false` otherwise
- **Updated**: Set to `true` after successful `signInWithCustomToken()`
- **Usage**: Tests use this to verify authentication completion timing

```typescript
window.__AUTH_TOKEN__: string | null
```
- **Purpose**: Stores the current custom authentication token
- **Value**: The Firebase custom token string, or `null` if not authenticated
- **Updated**: Set after successful token generation from API
- **Usage**: Tests verify token persistence and refresh behavior

```typescript
window.__AUTH_STATE__: string
```
- **Purpose**: Tracks current authentication state for state transition testing
- **Values**: `'initializing'` | `'fetching_token'` | `'authenticating'` | `'authenticated'` | `'error'`
- **Updated**: Changes as authentication progresses through states
- **Usage**: Tests verify proper state transitions (TC-AUTH-003)

```typescript
window.__USER_ID__: string | null
```
- **Purpose**: Firebase user UID after authentication
- **Value**: User UID string, or `null` if not authenticated
- **Updated**: Set after successful authentication
- **Usage**: Tests verify user identity persistence

### WebSocket Connection State

```typescript
window.__WS_CONNECTED__: boolean
```
- **Purpose**: Indicates WebSocket connection status
- **Value**: `true` when socket.io is connected, `false` otherwise
- **Updated**: Set to `true` on `socket.on('connect')`, `false` on `socket.on('disconnect')`
- **Usage**: Tests verify WebSocket connection timing (SC-002)

```typescript
window.__WEBSOCKET_CONNECTED__: boolean
```
- **Purpose**: Alternate alias for WebSocket connection status (for reconnection tests)
- **Value**: Same as `__WS_CONNECTED__`
- **Usage**: Used by NetworkSimulator for reconnection time measurement

```typescript
window.__SOCKET_ID__: string | null
```
- **Purpose**: Socket.io client ID for server-side disconnect testing
- **Value**: `socket.id` value from socket.io client
- **Updated**: Set on `socket.on('connect')`, cleared on disconnect
- **Usage**: NetworkSimulator uses this to trigger server-side disconnections

### Firestore State

```typescript
window.__FIRESTORE_ACTIVE__: boolean
```
- **Purpose**: Indicates Firestore listener is active and receiving updates
- **Value**: `true` when Firestore listener is active, `false` otherwise
- **Updated**: Set to `true` after successful Firestore snapshot listener setup
- **Usage**: NetworkSimulator uses this to determine current network state

### Error Tracking

```typescript
window.__CONSOLE_ERRORS__: string[]
```
- **Purpose**: Array of console error messages for test validation
- **Value**: Array of error message strings
- **Updated**: Append on `console.error()` calls
- **Usage**: Tests verify no authentication errors occurred (TC-AUTH-001)

```typescript
window.__CONSOLE_LOGS__: string[]
```
- **Purpose**: Array of console log messages for debugging
- **Value**: Array of log message strings
- **Updated**: Append on significant events (auth, connection)
- **Usage**: Tests verify error logging for invalid API keys (TC-AUTH-003)

```typescript
window.__UNCAUGHT_ERRORS__: Error[]
```
- **Purpose**: Array of uncaught exceptions for error handling validation
- **Value**: Array of Error objects
- **Updated**: Append on `window.onerror` or unhandled promise rejections
- **Usage**: Tests verify no uncaught exceptions during error scenarios (TC-AUTH-003)

### Network Request Tracking

```typescript
window.__NETWORK_CALLS__: Array<{ url: string; timestamp: number }>
```
- **Purpose**: Track API calls for token generation and refresh
- **Value**: Array of objects with URL and timestamp
- **Updated**: Append on each fetch/axios request
- **Usage**: Tests verify token refresh behavior (TC-AUTH-002, TC-AUTH-005)

### Loading State

```typescript
window.__IS_LOADING__: boolean
```
- **Purpose**: Indicates app is in loading state
- **Value**: `true` during initial load/authentication, `false` when ready
- **Updated**: Set to `false` after authentication completes
- **Usage**: General test utility for waiting for app to be ready

## Implementation Example

Here's an example of how to expose these variables in the projector-app:

```typescript
// src/utils/testHelpers.ts

/**
 * Expose global variables for E2E testing
 * Only enabled in test environments
 */
export function exposeTestGlobals() {
  if (import.meta.env.MODE !== 'production') {
    // Authentication state
    (window as any).__AUTH_COMPLETE__ = false;
    (window as any).__AUTH_TOKEN__ = null;
    (window as any).__AUTH_STATE__ = 'initializing';
    (window as any).__USER_ID__ = null;

    // WebSocket state
    (window as any).__WS_CONNECTED__ = false;
    (window as any).__WEBSOCKET_CONNECTED__ = false;
    (window as any).__SOCKET_ID__ = null;

    // Firestore state
    (window as any).__FIRESTORE_ACTIVE__ = false;

    // Error tracking
    (window as any).__CONSOLE_ERRORS__ = [];
    (window as any).__CONSOLE_LOGS__ = [];
    (window as any).__UNCAUGHT_ERRORS__ = [];

    // Network tracking
    (window as any).__NETWORK_CALLS__ = [];

    // Loading state
    (window as any).__IS_LOADING__ = true;

    // Intercept console.error
    const originalError = console.error;
    console.error = (...args: any[]) => {
      (window as any).__CONSOLE_ERRORS__.push(args.join(' '));
      originalError(...args);
    };

    // Track uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      (window as any).__UNCAUGHT_ERRORS__.push(error || new Error(String(message)));
    };
    window.addEventListener('unhandledrejection', (event) => {
      (window as any).__UNCAUGHT_ERRORS__.push(event.reason);
    });
  }
}

export function updateAuthState(state: {
  authComplete?: boolean;
  authToken?: string | null;
  authState?: string;
  userId?: string | null;
}) {
  if (import.meta.env.MODE !== 'production') {
    if (state.authComplete !== undefined) {
      (window as any).__AUTH_COMPLETE__ = state.authComplete;
    }
    if (state.authToken !== undefined) {
      (window as any).__AUTH_TOKEN__ = state.authToken;
    }
    if (state.authState !== undefined) {
      (window as any).__AUTH_STATE__ = state.authState;
    }
    if (state.userId !== undefined) {
      (window as any).__USER_ID__ = state.userId;
    }
  }
}

export function updateWebSocketState(state: {
  connected?: boolean;
  socketId?: string | null;
}) {
  if (import.meta.env.MODE !== 'production') {
    if (state.connected !== undefined) {
      (window as any).__WS_CONNECTED__ = state.connected;
      (window as any).__WEBSOCKET_CONNECTED__ = state.connected;
    }
    if (state.socketId !== undefined) {
      (window as any).__SOCKET_ID__ = state.socketId;
    }
  }
}

export function trackNetworkCall(url: string) {
  if (import.meta.env.MODE !== 'production') {
    (window as any).__NETWORK_CALLS__.push({
      url,
      timestamp: Date.now()
    });
  }
}
```

## Usage in Application Code

### In main.tsx or App.tsx

```typescript
import { exposeTestGlobals } from './utils/testHelpers';

// Initialize test globals
exposeTestGlobals();

// ... rest of app initialization
```

### In Authentication Hook (useProjectorAuth.ts)

```typescript
import { updateAuthState, trackNetworkCall } from '../utils/testHelpers';

export function useProjectorAuth() {
  const [authState, setAuthState] = useState('initializing');

  useEffect(() => {
    async function authenticate() {
      try {
        // Update test state: fetching token
        updateAuthState({ authState: 'fetching_token' });

        // Fetch custom token from API
        const response = await fetch('/api/projector/auth/token', {
          headers: { 'X-API-Key': apiKey }
        });
        const { token } = await response.json();

        // Track network call for tests
        trackNetworkCall('/api/projector/auth/token');

        // Update test state: authenticating
        updateAuthState({ authState: 'authenticating', authToken: token });

        // Sign in with custom token
        const userCredential = await signInWithCustomToken(auth, token);

        // Update test state: authenticated
        updateAuthState({
          authComplete: true,
          authState: 'authenticated',
          userId: userCredential.user.uid
        });

        setAuthState('authenticated');
      } catch (error) {
        updateAuthState({ authState: 'error' });
        throw error;
      }
    }

    authenticate();
  }, []);

  return { authState };
}
```

### In WebSocket Service (socketService.ts)

```typescript
import { updateWebSocketState } from '../utils/testHelpers';

export function createProjectorSocket() {
  const socket = io('http://localhost:3001', {
    auth: { token: authToken }
  });

  socket.on('connect', () => {
    updateWebSocketState({
      connected: true,
      socketId: socket.id
    });
  });

  socket.on('disconnect', () => {
    updateWebSocketState({
      connected: false,
      socketId: null
    });
  });

  return socket;
}
```

## Test Scenarios Affected

- **TC-AUTH-001**: Requires `__AUTH_COMPLETE__`, `__WS_CONNECTED__`, `__CONSOLE_ERRORS__`
- **TC-AUTH-002**: Requires `__AUTH_TOKEN__`, `__NETWORK_CALLS__`
- **TC-AUTH-003**: Requires `__UNCAUGHT_ERRORS__`, `__CONSOLE_LOGS__`
- **TC-AUTH-004**: Requires `__AUTH_COMPLETE__`, `__WS_CONNECTED__`
- **TC-AUTH-005**: Requires `__AUTH_TOKEN__`, `__NETWORK_CALLS__`, `__WS_CONNECTED__`

## Security Considerations

- **Production Safety**: All test globals MUST be disabled in production builds
- **Environment Check**: Use `import.meta.env.MODE !== 'production'` guards
- **No Sensitive Data**: Never expose private keys, service account credentials, or user PII
- **Build Optimization**: Production builds should tree-shake all test helper code

## Next Steps

When implementing the projector authentication feature (`001-projector-auth`):

1. Create `/home/tisayama/allstars/apps/projector-app/src/utils/testHelpers.ts` with the example code above
2. Call `exposeTestGlobals()` in `main.tsx` or `App.tsx`
3. Update `useProjectorAuth` hook to call `updateAuthState()` at each transition
4. Update WebSocket service to call `updateWebSocketState()` on connect/disconnect
5. Add network call tracking to all API fetch operations
6. Run E2E tests to validate integration: `pnpm test:e2e --grep "@P1"`
