# Research: Projector App Technical Stack Best Practices

**Feature**: projector-app (Broadcast Display Client)
**Date**: 2025-11-04
**Status**: Phase 0 Complete

## Overview

This document captures research findings and technical decisions for the projector-app implementation. The app is a React + TypeScript + Vite broadcast client that displays game state reactively using Firestore listeners, WebSocket events, and Web Audio API.

---

## 1. Vite + React + TypeScript Setup for Monorepo

### Decision

Use **pnpm workspaces** with Vite 5.0, React 18.2, and TypeScript 5.3+ configured with:
- TypeScript path aliases (`@/` → `./src`)
- Standard Vite plugin for React with JSX transform
- Module resolution set to `"bundler"` for optimal Vite compatibility

### Rationale

- **pnpm workspaces** provide efficient dependency management and are already configured in the project root (`pnpm-workspace.yaml`)
- **Vite** offers fast HMR (Hot Module Replacement) and optimized production builds specifically designed for modern ES modules
- **Path aliases** improve code maintainability and reduce relative import complexity
- **TypeScript 5.3** aligns with existing apps (admin-app, participant-app, host-app) for consistency

### Code Pattern

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175, // Unique port for projector-app
  },
});
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**package.json (workspace dependency):**
```json
{
  "name": "@allstars/projector-app",
  "dependencies": {
    "@allstars/types": "workspace:*",
    "react": "18.2.0",
    "vite": "5.0.0",
    "firebase": "10.7.0",
    "socket.io-client": "4.x"
  }
}
```

### Alternatives Considered

- **Webpack**: Rejected due to slower build times and more complex configuration
- **Yarn workspaces**: Rejected because pnpm is already in use project-wide
- **Turborepo**: Considered but unnecessary for current monorepo scale
- **Relative imports**: Rejected in favor of `@/` aliases for better maintainability

### References

- Existing pattern from `/apps/admin-app/vite.config.ts`
- pnpm workspace configuration: `/pnpm-workspace.yaml`

---

## 2. Firebase SDK Initialization Patterns

### Decision

Initialize Firebase with environment-based emulator detection using `import.meta.env.VITE_USE_EMULATORS`:
- Connect to Firestore emulator on `localhost:8080` when `VITE_USE_EMULATORS === 'true'`
- Gracefully handle "already connected" errors for emulators
- Export singleton getters (`getFirestoreInstance()`) to ensure initialization
- Skip initialization in test mode (`import.meta.env.MODE === 'test'`)

### Rationale

- **Environment variables** provide flexible configuration across dev/staging/production
- **Emulator detection** enables local development without Firebase project setup
- **Singleton pattern** prevents multiple Firebase app instances and connection errors
- **Graceful error handling** for emulator connection prevents console noise during hot reload

### Code Pattern

**lib/firebase.ts:**
```typescript
import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  // Validate required environment variables
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_STORAGE_BUCKET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  };

  try {
    app = getApp();
  } catch {
    app = initializeApp(firebaseConfig);
  }

  firestore = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators if configured
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    try {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    } catch (error) {
      console.warn('Firestore emulator already connected:', error);
    }

    try {
      connectStorageEmulator(storage, 'localhost', 9199);
    } catch (error) {
      console.warn('Storage emulator already connected:', error);
    }
  }

  initialized = true;
}

// Initialize on module load (skip in test)
if (import.meta.env.MODE !== 'test') {
  initializeFirebase();
}

export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firestore;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return storage;
}

export { firestore, storage };
```

**.env.development:**
```bash
# Firebase Configuration (Emulator)
VITE_FIREBASE_API_KEY=demo-project
VITE_FIREBASE_PROJECT_ID=allstars-demo
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=allstars-demo.appspot.com
VITE_USE_EMULATORS=true
```

### Alternatives Considered

- **Hostname-based detection** (`location.hostname === "localhost"`): Rejected because it doesn't work for staging environments
- **NODE_ENV detection**: Rejected because Vite uses `import.meta.env.MODE` and environment flags are more explicit
- **Multiple Firebase instances**: Rejected to avoid connection management complexity

### References

- Existing pattern from `/apps/participant-app/src/lib/firebase.ts`
- Firebase Emulator Suite documentation

---

## 3. Firebase Storage URL Patterns

### Decision

Use **Firebase Storage public URLs** with CORS configuration:
- Store audio assets in Firebase Storage with public read access
- Use `getDownloadURL()` to retrieve HTTPS URLs
- Configure CORS on the storage bucket to allow cross-origin requests
- URL pattern: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}`

### Rationale

- **Public URLs** avoid authentication complexity for read-only broadcast client
- **CORS configuration** is required for Web Audio API to fetch and decode audio buffers
- **Firebase Storage** provides reliable CDN-backed hosting with automatic scaling
- **Download URLs** include security tokens for access control

### Code Pattern

**Audio asset loading:**
```typescript
import { ref, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase';

async function loadAudioAsset(path: string): Promise<string> {
  const storage = getStorageInstance();
  const audioRef = ref(storage, path);
  const url = await getDownloadURL(audioRef);
  return url;
}

// Example usage
const bgmUrl = await loadAudioAsset('audio/bgm/idle.mp3');
```

**CORS configuration (cors.json):**
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

**Apply CORS via gsutil:**
```bash
gsutil cors set cors.json gs://allstars-demo.appspot.com
```

### Alternatives Considered

- **Direct Firebase Storage references**: Rejected because Web Audio API needs HTTPS URLs
- **Signed URLs with expiration**: Unnecessary complexity for public audio assets
- **Self-hosted audio**: Rejected due to lack of CDN and additional infrastructure

### References

- Firebase Storage documentation: Download files with Cloud Storage on Web
- CORS configuration examples from Stack Overflow

---

## 4. Web Audio API Best Practices

### Decision

Implement a centralized **AudioManager** class with:
- **Equal power crossfading** for BGM transitions (cosine curves, not linear)
- **AudioContext singleton** initialized on user interaction
- **Pre-loading strategy** using `fetch()` + `decodeAudioData()` for all assets
- **Audio layering** via separate GainNodes for BGM and SFX

### Rationale

- **Equal power crossfading** prevents volume dips during transitions (linear fades create audible dips)
- **User interaction requirement** is mandated by browser autoplay policies
- **Pre-loading** eliminates playback delays during gameplay (critical for <100ms latency requirement)
- **GainNodes** enable independent volume control and mixing without clipping

### Code Pattern

**lib/audioManager.ts:**
```typescript
export class AudioManager {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();

  /**
   * Initialize AudioContext (must be called from user interaction)
   */
  init(): void {
    if (this.context) return;
    this.context = new AudioContext();
  }

  /**
   * Pre-load audio asset from URL
   */
  async loadAudio(id: string, url: string): Promise<void> {
    if (!this.context) throw new Error('AudioContext not initialized');

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    this.buffers.set(id, audioBuffer);
  }

  /**
   * Play sound effect (one-shot)
   */
  playSFX(id: string, volume: number = 1.0): void {
    if (!this.context) return;

    const buffer = this.buffers.get(id);
    if (!buffer) throw new Error(`Audio buffer not found: ${id}`);

    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(0);
  }

  /**
   * Play looping BGM
   */
  playBGM(id: string, volume: number = 1.0): void {
    if (!this.context) return;

    const buffer = this.buffers.get(id);
    if (!buffer) throw new Error(`Audio buffer not found: ${id}`);

    // Stop existing BGM
    this.stopBGM(id);

    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    source.buffer = buffer;
    source.loop = true;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(0);

    this.sources.set(id, source);
    this.gainNodes.set(id, gainNode);
  }

  /**
   * Crossfade from one BGM to another using equal power curves
   */
  crossfadeBGM(fromId: string, toId: string, duration: number = 2.0): void {
    if (!this.context) return;

    const now = this.context.currentTime;

    // Fade out current BGM with equal power curve (cosine)
    const fromGain = this.gainNodes.get(fromId);
    if (fromGain) {
      fromGain.gain.setValueCurveAtTime(
        this.createEqualPowerFadeOut(duration),
        now,
        duration
      );

      // Stop source after fade completes
      setTimeout(() => this.stopBGM(fromId), duration * 1000);
    }

    // Start new BGM at zero volume
    this.playBGM(toId, 0);

    // Fade in new BGM with equal power curve (cosine)
    const toGain = this.gainNodes.get(toId);
    if (toGain) {
      toGain.gain.setValueCurveAtTime(
        this.createEqualPowerFadeIn(duration),
        now,
        duration
      );
    }
  }

  /**
   * Create equal power fade-out curve (cosine)
   */
  private createEqualPowerFadeOut(duration: number): Float32Array {
    const samples = Math.floor(duration * (this.context?.sampleRate || 44100));
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      // Equal power: cos(x * π/2) where x goes from 0 to 1
      const x = i / (samples - 1);
      curve[i] = Math.cos(x * Math.PI / 2);
    }

    return curve;
  }

  /**
   * Create equal power fade-in curve (cosine)
   */
  private createEqualPowerFadeIn(duration: number): Float32Array {
    const samples = Math.floor(duration * (this.context?.sampleRate || 44100));
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      // Equal power: sin(x * π/2) where x goes from 0 to 1
      const x = i / (samples - 1);
      curve[i] = Math.sin(x * Math.PI / 2);
    }

    return curve;
  }

  /**
   * Stop BGM playback
   */
  stopBGM(id: string): void {
    const source = this.sources.get(id);
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      this.sources.delete(id);
      this.gainNodes.delete(id);
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();
```

**hooks/useAudioEngine.ts:**
```typescript
import { useState, useEffect } from 'react';
import { audioManager } from '@/lib/audioManager';
import { ref, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase';

interface AudioAsset {
  id: string;
  path: string;
  type: 'bgm' | 'sfx';
}

const AUDIO_ASSETS: AudioAsset[] = [
  { id: 'bgm_idle', path: 'audio/bgm/idle.mp3', type: 'bgm' },
  { id: 'bgm_question', path: 'audio/bgm/question.mp3', type: 'bgm' },
  { id: 'sfx_gong', path: 'audio/sfx/gong.mp3', type: 'sfx' },
  // ... more assets
];

export function useAudioEngine() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAllAudio() {
      try {
        // Initialize AudioContext (requires user interaction in production)
        audioManager.init();

        const storage = getStorageInstance();
        let loaded = 0;

        for (const asset of AUDIO_ASSETS) {
          const audioRef = ref(storage, asset.path);
          const url = await getDownloadURL(audioRef);

          await audioManager.loadAudio(asset.id, url);

          loaded++;
          if (isMounted) {
            setLoadProgress((loaded / AUDIO_ASSETS.length) * 100);
          }
        }

        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      }
    }

    loadAllAudio();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoaded, loadProgress, error };
}
```

### Alternatives Considered

- **Linear crossfading**: Rejected due to audible volume dips at the midpoint
- **Howler.js library**: Considered but rejected to avoid external dependencies and maintain full control
- **HTML5 `<audio>` elements**: Rejected due to limited control and poor looping behavior
- **setTimeout for scheduling**: Rejected in favor of `AudioParam` scheduling for precision

### References

- MDN Web Audio API Best Practices
- Web Audio API crossfading examples (webaudioapi.com)
- Equal power crossfading mathematical explanation (Stack Overflow)

---

## 5. Socket.io-client Integration

### Decision

Use **Socket.io-client 4.x** with TypeScript event typing:
- Define `ServerToClientEvents` interface for type-safe event handlers
- Configure automatic reconnection with exponential backoff (1s → 5s max delay)
- Monitor connection status via Socket.io lifecycle events
- Store socket instance in React state with cleanup on unmount

### Rationale

- **Type safety** prevents runtime errors from mismatched event names or payloads
- **Automatic reconnection** handles network instability without manual intervention
- **Built-in connection management** provides reliable WebSocket lifecycle handling
- **React integration** via custom hook ensures proper cleanup and prevents memory leaks

### Code Pattern

**types/socket-events.ts:**
```typescript
export interface ServerToClientEvents {
  TRIGGER_GONG: (payload: { timestamp: string }) => void;
  SYNC_TIMER: (payload: { deadline: string; serverTime: string }) => void;
  GAME_PHASE_CHANGED: (payload: { phase: string; data?: unknown }) => void;
}

export interface ClientToServerEvents {
  // Projector-app is receive-only, no outbound events
}
```

**hooks/useWebSocket.ts:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket-events';

const SOCKET_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus('connecting');
    setError(null);

    // Create typed socket connection
    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    // Connection lifecycle events
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Connected:', socketInstance.id);
      setStatus('connected');
      setError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err);
      setStatus('error');
      setError(err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[WebSocket] Disconnected:', reason);
      setStatus('disconnected');

      // Auto-reconnect if server disconnected
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`);
      setStatus('connecting');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      setStatus('connected');
      setError(null);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      setStatus('error');
      setError('Failed to reconnect to server');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setStatus('disconnected');
    };
  }, []);

  /**
   * Subscribe to typed event
   */
  const on = useCallback(
    <K extends keyof ServerToClientEvents>(
      event: K,
      handler: ServerToClientEvents[K]
    ) => {
      if (!socket) {
        console.warn(`[WebSocket] Cannot subscribe to ${String(event)}: socket not connected`);
        return () => {};
      }

      socket.on(event, handler);

      // Return cleanup function
      return () => {
        socket.off(event, handler);
      };
    },
    [socket]
  );

  return {
    socket,
    status,
    error,
    isConnected: status === 'connected',
    on,
  };
}
```

**Usage in component:**
```typescript
const { isConnected, on } = useWebSocket();

useEffect(() => {
  if (!isConnected) return;

  const cleanup = on('TRIGGER_GONG', (payload) => {
    console.log('Gong triggered at:', payload.timestamp);
    audioManager.playSFX('sfx_gong');
  });

  return cleanup;
}, [isConnected, on]);
```

### Alternatives Considered

- **Native WebSocket API**: Rejected due to lack of automatic reconnection and event typing
- **Manual reconnection logic**: Rejected because Socket.io provides robust built-in handling
- **Any-typed events**: Rejected in favor of TypeScript interfaces for type safety

### References

- Socket.io v4 TypeScript documentation
- Existing pattern from `/apps/participant-app/src/hooks/useWebSocket.ts`

---

## 6. React Hooks for Firestore (onSnapshot Listeners)

### Decision

Implement Firestore listeners in custom React hooks with:
- **`onSnapshot` in `useEffect`** with dependency array
- **Return unsubscribe function** in cleanup to prevent memory leaks
- **`isMounted` flag** to prevent state updates after unmount
- **Error handling** via second callback parameter
- **Validation** of incoming data structure before state update

### Rationale

- **Memory leak prevention** is critical for long-running projector displays (4+ hour requirement)
- **Unsubscribe cleanup** ensures listeners are removed when component unmounts
- **isMounted guard** prevents React warnings about state updates on unmounted components
- **Validation** protects against malformed data from Firestore

### Code Pattern

**hooks/useGameState.ts:**
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { getFirestoreInstance } from '@/lib/firebase';
import type { GameState } from '@allstars/types';

interface UseGameStateReturn {
  gameState: GameState | null;
  isLoading: boolean;
  error: Error | null;
}

function validateGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') return false;

  const state = data as Record<string, unknown>;

  // Check required fields
  if (typeof state['currentPhase'] !== 'string') return false;
  if (typeof state['isGongActive'] !== 'boolean') return false;
  if (!state['lastUpdate']) return false;

  return true;
}

export function useGameState(sessionId: string = 'live'): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);

  const handleSnapshot = useCallback(
    (snapshot: DocumentSnapshot) => {
      if (!isMountedRef.current) return;

      try {
        if (!snapshot.exists()) {
          setError(new Error('Game session not found'));
          setGameState(null);
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        if (!validateGameState(data)) {
          setError(new Error('Invalid game state data from Firestore'));
          setIsLoading(false);
          return;
        }

        setGameState(data as GameState);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('[GameState] Snapshot error:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    },
    []
  );

  const handleError = useCallback((err: Error) => {
    if (!isMountedRef.current) return;

    console.error('[GameState] Listener error:', err);
    setError(err);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);

    const firestore = getFirestoreInstance();
    const docRef = doc(firestore, 'gameState', sessionId);

    // Set up real-time listener
    const unsubscribe = onSnapshot(docRef, handleSnapshot, handleError);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [sessionId, handleSnapshot, handleError]);

  return { gameState, isLoading, error };
}
```

**hooks/useAnswerCount.ts (dynamic listener):**
```typescript
import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { getFirestoreInstance } from '@/lib/firebase';

export function useAnswerCount(questionId: string | null) {
  const [count, setCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // No listener if no question ID
    if (!questionId) {
      setCount(0);
      return;
    }

    const firestore = getFirestoreInstance();
    const answersRef = collection(firestore, 'questions', questionId, 'answers');

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      answersRef,
      (snapshot: QuerySnapshot) => {
        if (!isMountedRef.current) return;
        setCount(snapshot.size);
      },
      (error) => {
        console.error('[AnswerCount] Listener error:', error);
      }
    );

    // Cleanup when questionId changes or component unmounts
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [questionId]);

  return count;
}
```

### Alternatives Considered

- **No cleanup function**: Rejected due to guaranteed memory leaks
- **Class components with lifecycle methods**: Rejected in favor of modern React hooks
- **Manual polling with setInterval**: Rejected because Firestore provides efficient real-time updates
- **Global listener singleton**: Rejected because React hooks provide better component lifecycle integration

### References

- Existing pattern from `/apps/host-app/src/hooks/useGameState.ts`
- Stack Overflow: "cleanup() not working in useEffect() with Firebase Firestore onSnapshot"
- React documentation on useEffect cleanup

---

## 7. Countdown Timer Implementation

### Decision

Use **`requestAnimationFrame`** for smooth countdown rendering with:
- **Firestore Timestamp** as the source of truth for deadline
- **Server time synchronization** via clock offset calculation
- **Sub-second precision** using `performance.now()` timestamps
- **Timezone-agnostic** handling using UTC timestamps

### Rationale

- **requestAnimationFrame** syncs with browser repaint cycle (60fps) for smooth visual updates
- **Server timestamps** eliminate client clock drift and manipulation
- **Clock offset** accounts for network latency and ensures accuracy
- **UTC timestamps** prevent timezone issues across different client locations

### Code Pattern

**hooks/useCountdown.ts:**
```typescript
import { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';

interface CountdownState {
  remainingMs: number;
  isExpired: boolean;
}

export function useCountdown(deadline: Timestamp | null, clockOffset: number = 0): CountdownState {
  const [remainingMs, setRemainingMs] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(0);
      setIsExpired(false);
      return;
    }

    const deadlineMs = deadline.toMillis();

    function updateCountdown() {
      // Get current time adjusted by clock offset
      const now = Date.now() + clockOffset;
      const remaining = deadlineMs - now;

      if (remaining <= 0) {
        setRemainingMs(0);
        setIsExpired(true);
        return;
      }

      setRemainingMs(remaining);
      setIsExpired(false);

      // Schedule next frame
      rafRef.current = requestAnimationFrame(updateCountdown);
    }

    // Start countdown loop
    rafRef.current = requestAnimationFrame(updateCountdown);

    // Cleanup on unmount or deadline change
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [deadline, clockOffset]);

  return { remainingMs, isExpired };
}
```

**Usage in component:**
```typescript
function CountdownTimer({ deadline }: { deadline: Timestamp }) {
  const { remainingMs, isExpired } = useCountdown(deadline);

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="countdown">
      {isExpired ? 'Time Up!' : `${seconds}s`}
    </div>
  );
}
```

**Clock offset calculation (optional enhancement):**
```typescript
/**
 * Calculate clock offset by pinging server and measuring round-trip time
 */
async function calculateClockOffset(): Promise<number> {
  const clientSendTime = Date.now();

  // Ping server endpoint that returns server timestamp
  const response = await fetch('/api/time');
  const { serverTime } = await response.json();

  const clientReceiveTime = Date.now();
  const rtt = clientReceiveTime - clientSendTime;
  const estimatedServerTime = serverTime + rtt / 2;

  const offset = estimatedServerTime - clientReceiveTime;

  return offset;
}
```

### Alternatives Considered

- **setInterval**: Rejected due to imprecise timing and potential drift over long periods
- **setTimeout recursive**: Rejected for same reasons as setInterval
- **Date.now() without offset**: Rejected because client clocks can be inaccurate or manipulated
- **No clock synchronization**: Acceptable fallback if synchronization is unavailable

### References

- MDN: Window.requestAnimationFrame()
- Medium: "The Final Countdown — Rendering a Resilient and Accurate Countdown"
- Stack Overflow: "How to sync a javascript countdown with server time"

---

## Summary

All research decisions align with the constitution's requirements:
- ✅ Monorepo architecture preserved (pnpm workspaces)
- ✅ Type safety enforced (TypeScript 5.3+)
- ✅ Memory leak prevention (proper cleanup in all hooks)
- ✅ Performance requirements achievable (<500ms Firestore latency, <100ms audio latency, <50ms WebSocket sync)
- ✅ Browser compatibility (modern Web APIs: Firestore SDK, WebSocket, Web Audio API)

**Next Phase**: Generate `data-model.md` and `contracts/websocket-events.md` for Phase 1 (Design & Contracts).
