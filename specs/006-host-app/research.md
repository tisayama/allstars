# React + Firebase Implementation Best Practices for Host App

Research conducted: November 3, 2025
Target: Tablet-first (768-1024px) React SPA with Firebase backend

---

## 1. Firebase SDK Setup

### Decision
Use Firebase SDK v9+ modular API with dedicated configuration file (`firebase.ts`) that initializes services and exports them for use throughout the app. Connect to emulators conditionally based on environment detection.

### Rationale
The modular SDK reduces bundle size by approximately 80% through tree-shaking and enables more efficient imports. Creating a centralized configuration file prevents multiple initializations and provides a single source of truth for Firebase services. Emulator support enables fast, safe, and cost-free local development with complete isolation from production data.

### Implementation Pattern

```typescript
// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Emulator Setup Commands

```bash
# Initialize emulators
firebase init emulators --project $PROJECT_ID

# Select: Authentication, Firestore
# Accept default ports: Auth (9099), Firestore (8080)
# Enable Emulator UI: Yes

# Run with data persistence
firebase emulators:start --import=./emulator-data --export-on-exit
```

### Alternatives Considered

- **Firebase Compat API (v8)**: Rejected due to significantly larger bundle size and lack of tree-shaking support
- **Multiple initialization files**: Rejected to avoid configuration drift and duplicate initialization attempts
- **Always-on emulator connection**: Rejected because production builds would fail; environment detection is required

---

## 2. Firestore Real-Time Listeners

### Decision
Create custom React hooks that wrap Firestore `onSnapshot()` with proper cleanup, error handling, metadata tracking, and loading states. Use the unsubscribe function returned by `onSnapshot()` in the `useEffect` cleanup.

### Rationale
Firestore listeners must be unsubscribed when components unmount to prevent memory leaks and state updates on unmounted components. Custom hooks encapsulate this complexity and provide consistent patterns across the app. Including metadata tracking (`fromCache`, `hasPendingWrites`) enables proper offline/online state detection and UI feedback.

### Implementation Pattern

```typescript
// src/hooks/useFirestoreDocument.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, DocumentReference, FirestoreError } from 'firebase/firestore';

interface FirestoreDocumentState<T> {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export function useFirestoreDocument<T>(
  docRef: DocumentReference
): FirestoreDocumentState<T> {
  const [state, setState] = useState<FirestoreDocumentState<T>>({
    data: null,
    loading: true,
    error: null,
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    // Subscribe to document changes
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true }, // Track cache/server source
      (snapshot) => {
        setState({
          data: snapshot.exists() ? (snapshot.data() as T) : null,
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });
      },
      (error) => {
        setState({
          data: null,
          loading: false,
          error,
          fromCache: false,
          hasPendingWrites: false,
        });
      }
    );

    // Cleanup: unsubscribe when component unmounts
    return () => unsubscribe();
  }, [docRef]);

  return state;
}
```

### Usage Example

```typescript
// Component usage
function GameComponent({ gameId }: { gameId: string }) {
  const docRef = doc(db, 'games', gameId);
  const { data, loading, error, fromCache } = useFirestoreDocument<GameState>(docRef);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data) return <NotFound />;

  return (
    <div>
      {fromCache && <OfflineIndicator />}
      <GameView game={data} />
    </div>
  );
}
```

### Reconnection Handling

Firestore automatically handles reconnection when network connectivity is restored. However, the SDK may not always detect restored connections immediately. Best practices:

1. **Use metadata changes**: The `fromCache` flag switches from `true` to `false` when reconnection occurs
2. **Don't rely on first call after reconnect**: Some users report the first `get()` call after reconnection may be ignored; onSnapshot listeners are more reliable
3. **Manual sync trigger**: Consider implementing a "refresh" button that re-fetches data if automatic reconnection appears stalled

### Alternatives Considered

- **react-firebase-hooks library**: Provides similar functionality but adds a dependency; custom hooks offer more control and can be tailored to fail-fast requirements
- **useEffect without cleanup**: Rejected due to memory leaks and "Can't perform a React state update on an unmounted component" warnings
- **Single global listener**: Rejected because it couples all components to the same data source and prevents granular subscriptions

---

## 3. API Client with Timeout

### Decision
Use native `fetch()` with `AbortController` for 10-second timeout and fail-fast behavior. Do not implement automatic retry logic.

### Rationale
For a tablet-first app with fail-fast requirements, `fetch()` with `AbortController` provides timeout control without adding external dependencies. The native API has zero bundle size cost and is sufficient for straightforward HTTP requests. Axios adds 13KB minified for features (interceptors, automatic JSON parsing) that aren't essential for this use case where we want explicit, predictable error handling without auto-retry magic.

### Implementation Pattern

```typescript
// src/utils/apiClient.ts
export class RequestTimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new RequestTimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}
```

### Usage Example

```typescript
// Component usage
try {
  const data = await fetchWithTimeout<Answer>(
    `${API_BASE_URL}/games/${gameId}/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: userAnswer }),
    },
    10000 // 10-second timeout
  );
  // Handle success
} catch (error) {
  if (error instanceof RequestTimeoutError) {
    // Show timeout error to user - no retry
    showError('Request timed out. Please try again.');
  } else {
    // Handle other errors
    showError('An error occurred. Please try again.');
  }
}
```

### Alternatives Considered

- **Axios with timeout config**: Rejected due to 13KB bundle size overhead and features (interceptors, auto-retry) that conflict with fail-fast requirements. Axios timeout configuration is simpler (`{ timeout: 10000 }`), but the convenience doesn't justify the dependency for this use case.
- **No timeout implementation**: Rejected because requests could hang indefinitely, creating poor UX on unstable tablet connections
- **Fetch without AbortController**: Rejected because there's no standard way to enforce timeouts

---

## 4. Tablet-Optimized React

### Decision
Use CSS media queries with min-width/max-width ranges targeting 768-1024px, implement orientation-specific styles with `@media (orientation: portrait|landscape)`, and enforce minimum 44×44px touch targets for all interactive elements using CSS padding.

### Rationale
Media queries provide precise control over tablet-specific layouts without JavaScript overhead. The 44×44px minimum follows WCAG 2.5.5 AAA guidelines and Apple's Human Interface Guidelines, ensuring comfortable tap targets for finger-based interaction. Using padding to expand hit areas allows smaller visual icons while maintaining accessible touch zones.

### Implementation Pattern

```css
/* Base styles - mobile first */
.button {
  padding: 12px 16px;
  font-size: 16px;
  min-height: 44px;
  min-width: 44px;
  /* Icon can be smaller, but interactive area must be 44x44 */
}

/* Tablet styles: 768-1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .button {
    padding: 16px 24px;
    font-size: 18px;
    min-height: 48px;
    min-width: 48px;
  }

  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

/* Tablet portrait */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .sidebar {
    width: 100%;
    position: static;
  }

  .main-content {
    padding: 20px;
  }
}

/* Tablet landscape */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .sidebar {
    width: 280px;
    position: fixed;
  }

  .main-content {
    margin-left: 280px;
    padding: 32px;
  }
}

/* Touch-specific styles */
@media (hover: none) and (pointer: coarse) {
  /* Increase spacing between interactive elements */
  .button-group > * + * {
    margin-left: 12px;
  }

  /* Remove hover effects that don't work on touch */
  .button:hover {
    background-color: inherit;
  }

  /* Add active/tap states */
  .button:active {
    transform: scale(0.95);
  }
}
```

### Touch Target Guidelines

- **Top/bottom of screen**: 44-46px minimum (harder to reach areas)
- **Center of screen**: 42px minimum (easier to reach)
- **Spacing between targets**: 8-12px minimum
- **Icons**: Visual icon can be smaller, use padding to reach 44×44px hit area

### React Implementation

```typescript
// Optional: Use react-responsive for conditional rendering
import { useMediaQuery } from 'react-responsive';

function ResponsiveLayout() {
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1024 });
  const isPortrait = useMediaQuery({ orientation: 'portrait' });

  if (isTablet && isPortrait) {
    return <PortraitTabletLayout />;
  }

  if (isTablet) {
    return <LandscapeTabletLayout />;
  }

  return <DefaultLayout />;
}
```

### Alternatives Considered

- **JavaScript-based responsive design**: Rejected due to potential layout shifts and performance overhead; CSS media queries are more efficient and render-blocking
- **Smaller touch targets (36×36px)**: Rejected for failing to meet WCAG AAA standards and creating usability issues for users with larger fingers or motor impairments
- **Desktop-first approach**: Rejected because mobile-first improves performance and aligns with progressive enhancement principles

---

## 5. Concurrent Session Sync

### Decision
Rely on Firestore's built-in real-time synchronization via `onSnapshot()`. Multiple clients listening to the same document automatically receive updates in real-time with last-write-wins conflict resolution.

### Rationale
Firestore handles multi-client synchronization natively without additional code. When one client updates a document, the SDK immediately forwards the update to all other clients with active onSnapshot listeners. Within a single application, multiple subscriptions to the same document are optimized into a single connection, reducing costs and bandwidth. Firestore's latency compensation immediately notifies the writing client before backend confirmation, providing instant UI feedback.

### How It Works

1. **Client A** writes to `games/abc123`
2. **Firestore backend** receives and processes the write
3. **Client B** (and all other listening clients) receive the update through their `onSnapshot()` listeners automatically
4. **Conflict resolution**: Last write wins if multiple clients write simultaneously

### Latency Compensation

When a client performs a write, the local `onSnapshot()` listener fires immediately with the new data (marked with `hasPendingWrites: true`), before the data is sent to the backend. This provides instant UI feedback. Once the backend confirms the write, the listener fires again with `hasPendingWrites: false`.

```typescript
// Example: Detect pending writes
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'games', gameId),
    { includeMetadataChanges: true },
    (snapshot) => {
      const data = snapshot.data();
      const pending = snapshot.metadata.hasPendingWrites;

      if (pending) {
        // Show "Saving..." indicator
      } else {
        // Show "Saved" or remove indicator
      }
    }
  );

  return () => unsubscribe();
}, [gameId]);
```

### Optimization

Multiple `onSnapshot()` calls to the same document within the same app are automatically combined into a single connection by Firestore's SDK, reducing read costs and bandwidth usage.

### Offline Behavior

- Writes made offline are queued and synced when connectivity is restored
- If the same document is updated multiple times offline, only the last update is synced (last-write-wins)
- Use `fromCache: true` metadata to detect when data is served from local cache vs. server

### Alternatives Considered

- **Manual polling**: Rejected due to increased read costs, latency, and complexity compared to native real-time listeners
- **WebSocket implementation**: Rejected because Firestore already provides this functionality with better reliability and offline support
- **Optimistic locking with version fields**: Rejected for typical use cases; Firestore's last-write-wins is simpler and sufficient for the host app's collaborative game sessions

---

## 6. Error Monitoring

### Decision
Use Sentry for client-side error tracking in the React SPA tablet web app.

### Rationale
Sentry provides comprehensive error tracking and performance monitoring specifically designed for web applications, including React SPAs. Unlike Firebase Crashlytics (which primarily targets native mobile apps), Sentry offers React-specific features like error boundaries integration, source map support, breadcrumbs, session replay, and deep context for triaging web errors. Sentry's platform-agnostic approach ensures full support for tablet web browsers without requiring native app wrappers.

### Key Advantages for React SPA

- **React integration**: First-class support for React error boundaries, component stack traces, and hooks
- **Source maps**: Automatic unminification of production errors for readable stack traces
- **Breadcrumbs**: Captures user interactions (clicks, navigation) leading up to errors
- **Session Replay**: Video-like replay of user sessions to reproduce bugs
- **Performance monitoring**: Track slow renders, API calls, and resource loading
- **Multi-platform**: Works consistently across all tablet browsers (Safari, Chrome, Edge)

### Implementation Pattern

```typescript
// src/index.tsx
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Filter out non-actionable errors
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof RequestTimeoutError) {
        // Add custom context for timeout errors
        event.tags = { ...event.tags, error_type: 'timeout' };
      }
    }
    return event;
  },
});

// Wrap app in error boundary
function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <YourApp />
    </Sentry.ErrorBoundary>
  );
}
```

### Custom Context

```typescript
// Add custom context for debugging
Sentry.setContext('game', {
  gameId: currentGameId,
  round: currentRound,
  playersCount: players.length,
});

Sentry.setUser({
  id: userId,
  deviceType: 'tablet',
  orientation: window.screen.orientation.type,
});
```

### Crashlytics Limitations for Web

- **No React Native source map support**: Crashlytics doesn't provide auto instrumentation for React Native
- **Mobile-only focus**: Tailored for iOS and Android native apps, not web browsers
- **Limited web support**: Minimal features for JavaScript/TypeScript web applications
- **No session replay**: Cannot reproduce user sessions leading to errors

### Alternatives Considered

- **Firebase Crashlytics**: Rejected due to primary focus on native mobile platforms with limited web/React SPA support
- **LogRocket**: Good alternative with session replay but more expensive than Sentry for comparable features
- **Rollbar**: Viable alternative but less React-specific tooling compared to Sentry's error boundary integration
- **Custom error logging**: Rejected due to complexity of building breadcrumbs, session replay, and alerting from scratch

---

## 7. Testing Strategy

### Decision
Use Vitest + React Testing Library for React component and hook testing, with Firebase Emulator integration for testing Firestore listeners. Mock Firebase functions for unit tests; use emulators for integration tests.

### Rationale
Vitest provides fast, modern testing with native ESM support and excellent Vite integration, matching the host app's build tooling. React Testing Library ensures tests focus on user behavior rather than implementation details. Firebase Emulators enable realistic integration testing with actual Firestore behavior (real-time listeners, offline persistence) without hitting production services or incurring costs. The `@firebase/rules-unit-testing` library simplifies auth mocking and emulator management.

### Setup

#### Install Dependencies

```bash
pnpm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @firebase/rules-unit-testing
```

#### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

#### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### Unit Testing: Mock Firebase

```typescript
// src/hooks/__tests__/useFirestoreDocument.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { doc } from 'firebase/firestore';
import { useFirestoreDocument } from '../useFirestoreDocument';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((docRef, options, onNext, onError) => {
    // Simulate snapshot callback
    setTimeout(() => {
      onNext({
        exists: () => true,
        data: () => ({ id: '123', name: 'Test Game' }),
        metadata: { fromCache: false, hasPendingWrites: false },
      });
    }, 0);

    // Return unsubscribe function
    return vi.fn();
  }),
}));

describe('useFirestoreDocument', () => {
  it('should load document data', async () => {
    const docRef = doc({} as any, 'games', '123');
    const { result } = renderHook(() => useFirestoreDocument(docRef));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ id: '123', name: 'Test Game' });
    });
  });
});
```

### Integration Testing: Firebase Emulators

```typescript
// src/test/firestoreIntegration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore real-time listeners', () => {
  it('should receive real-time updates', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const gameRef = doc(db, 'games', 'test-game');

    // Track snapshots
    const snapshots: any[] = [];
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      snapshots.push(snapshot.data());
    });

    // Write data
    await setDoc(gameRef, { round: 1 });
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update data
    await setDoc(gameRef, { round: 2 });
    await new Promise(resolve => setTimeout(resolve, 100));

    unsubscribe();

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toEqual({ round: 1 });
    expect(snapshots[1]).toEqual({ round: 2 });
  });
});
```

### Running Tests with Emulators

```bash
# Start emulators and run tests
firebase emulators:exec --only firestore "pnpm test"

# Or run emulators in background
firebase emulators:start --only firestore &
pnpm test
firebase emulators:stop
```

### Test Organization

```
src/
├── components/
│   ├── GameView.tsx
│   └── __tests__/
│       └── GameView.test.tsx
├── hooks/
│   ├── useFirestoreDocument.ts
│   └── __tests__/
│       └── useFirestoreDocument.test.ts
└── test/
    ├── setup.ts
    ├── firestoreIntegration.test.ts
    └── utils/
        └── testHelpers.ts
```

### Testing React Hooks with Firestore

```typescript
// Example: Testing custom hook with Firestore
import { renderHook, waitFor } from '@testing-library/react';
import { doc } from 'firebase/firestore';
import { useGameState } from '../useGameState';

it('should handle Firestore errors', async () => {
  // Mock onSnapshot to trigger error
  vi.mocked(onSnapshot).mockImplementation((docRef, options, onNext, onError) => {
    setTimeout(() => {
      onError(new Error('Firestore connection failed'));
    }, 0);
    return vi.fn();
  });

  const { result } = renderHook(() => useGameState('game-123'));

  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Firestore connection failed');
  });
});
```

### Alternatives Considered

- **Jest instead of Vitest**: Rejected due to slower performance and ESM configuration complexity; Vitest has better Vite integration
- **Enzyme instead of React Testing Library**: Rejected due to implementation-focused testing and lack of React 18 support
- **Mocking Firestore for all tests**: Rejected for integration tests because emulators provide more realistic behavior (real-time updates, offline persistence)
- **Manual emulator management**: Rejected in favor of `@firebase/rules-unit-testing` which simplifies setup and cleanup

---

## Summary

This research provides production-ready patterns for building a tablet-first React + Firebase application with:

1. **Modular Firebase SDK** with emulator support for fast local development
2. **Custom hooks** for Firestore listeners with proper lifecycle management and error handling
3. **Native fetch() + AbortController** for fail-fast HTTP requests with 10-second timeout
4. **Media query-based responsive design** targeting 768-1024px tablets with 44×44px touch targets
5. **Built-in Firestore synchronization** for real-time multi-client updates
6. **Sentry error monitoring** for comprehensive React SPA error tracking and session replay
7. **Vitest + React Testing Library + Firebase Emulators** for fast, reliable testing

All recommendations prioritize fail-fast behavior, tablet-optimized UX, and real-time synchronization as required by the host-app specifications.
