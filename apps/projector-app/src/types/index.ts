/**
 * Type definitions for projector-app
 * Re-exports shared types from @allstars/types and defines local types
 */

// Re-export shared types
export type {
  GameState,
  GamePhase,
  Question,
  GamePeriod,
  QuestionChoice,
  Answer,
  Guest,
  ErrorResponse,
  Choice,
  GameResults,
  RankedAnswer,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  GongActivatedPayload,
  StartQuestionPayload,
  GamePhaseChangedPayload,
  AuthRequiredPayload,
  AuthSuccessPayload,
  AuthFailedPayload,
  IdleStatePayload,
} from '@allstars/types';

// Local projector-app types

/**
 * Connection status for real-time data sources
 */
export interface ConnectionStatus {
  firestore: boolean;
  websocket: boolean;
}

/**
 * Audio asset metadata and loading state
 */
export interface AudioAsset {
  id: string;
  url: string;
  type: 'bgm' | 'sfx';
  buffer: AudioBuffer | null;
  loaded: boolean;
}

/**
 * Phase-specific audio configuration
 */
export interface PhaseConfig {
  phase: string; // GamePhase from shared types
  bgm: string[];
  sfx: string[];
}

// ============================================
// Authentication Types (Feature: 001-projector-anonymous-auth)
// ============================================

/**
 * Firebase authentication state enum
 * Tracks the lifecycle of Firebase Anonymous Authentication
 */
export type FirebaseAuthState =
  | 'unauthenticated'  // No active session
  | 'authenticating'    // signInAnonymously() in progress
  | 'authenticated'     // Valid Firebase user session
  | 'error';            // Authentication failed

/**
 * Projector authentication state
 * Returned by useProjectorAuth hook
 */
export interface ProjectorAuthState {
  /** Firebase authenticated user (null if not authenticated) */
  user: import('firebase/auth').User | null;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether authentication is in progress */
  isLoading: boolean;

  /** Authentication error message (null if no error) */
  error: string | null;
}

// ============================================
// Enhanced Connection Status Types (Feature: 001-projector-anonymous-auth)
// ============================================

/**
 * WebSocket connection state enum
 * Tracks Socket.IO connection lifecycle
 */
export type WebSocketState =
  | 'disconnected'  // Not connected to socket server
  | 'connecting'    // Connection attempt in progress
  | 'connected'     // Successfully connected and ready
  | 'error';        // Connection failed

/**
 * Firestore snapshot listener state enum
 * Tracks Firestore real-time listener status
 */
export type FirestoreListenerState =
  | 'inactive'  // Listener not started or stopped
  | 'active'    // Listener actively receiving updates
  | 'error';    // Listener encountered error

/**
 * Enhanced connection status for all channels
 * Replaces basic ConnectionStatus for auth-aware monitoring
 */
export interface EnhancedConnectionStatus {
  /** Current Firebase authentication state */
  firebaseAuthState: FirebaseAuthState;

  /** Current WebSocket connection state */
  websocketState: WebSocketState;

  /** Current Firestore snapshot listener state */
  firestoreListenerState: FirestoreListenerState;

  /** Most recent error message (null if no errors) */
  lastError: string | null;

  /** Timestamp of last successful update (Unix ms) */
  lastUpdateTimestamp: number | null;

  /** Number of reconnection attempts (for exponential backoff) */
  reconnectAttempts: number;
}

// ============================================
// Update Event Types (Feature: 001-projector-anonymous-auth)
// ============================================

/**
 * Source channel for game state updates
 */
export type UpdateSource = 'websocket' | 'firestore';

/**
 * Update event received from WebSocket or Firestore
 * Used for deduplication logic in dual-channel pattern
 */
export interface UpdateEvent {
  /** Channel that delivered this update */
  source: UpdateSource;

  /** Type of game event (e.g., 'GAME_PHASE_CHANGED', 'TIME_SYNC') */
  eventType: string;

  /** Event-specific payload data */
  payload: unknown;

  /** Server-side timestamp of the event (Unix ms) */
  timestamp: number;

  /** Client-side timestamp when received (Unix ms) */
  receivedAt: number;
}

/**
 * Deduplication map tracking last processed timestamps
 * Key: eventType (e.g., 'GAME_PHASE_CHANGED')
 * Value: last processed timestamp (Unix ms)
 */
export type DeduplicationMap = Map<string, number>;
