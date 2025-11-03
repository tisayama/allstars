/**
 * Socket.io Event Type Definitions for Real-Time Game Synchronization
 *
 * This file defines the contract between the socket-server and all clients
 * (participant-app, projector-app, host-app, admin-app).
 *
 * Usage:
 * - Server: Import event payload types for type-safe event broadcasting
 * - Clients: Import event payload types for type-safe event listeners
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Types (from /packages/types/)
// ============================================================================

/**
 * Game phase enum - represents the current state of the game
 * Source: /packages/types/src/GameState.ts
 */
export type GamePhase =
  | 'waiting'                 // Pre-game state, no active question
  | 'accepting_answers'       // Question is live, accepting participant answers
  | 'showing_distribution'    // Displaying answer distribution graph
  | 'showing_correct_answer'  // Revealing the correct answer
  | 'showing_results'         // Displaying player rankings/eliminations
  | 'all_revived'             // All eliminated players revived
  | 'game_over';              // Final state, game ended

// ============================================================================
// Server → Client Events (Game State Broadcasts)
// ============================================================================

/**
 * START_QUESTION Event Payload
 *
 * Broadcast when a new question begins (currentPhase → "accepting_answers")
 * Functional Requirement: FR-004
 *
 * @example
 * ```typescript
 * socket.on('START_QUESTION', (payload: StartQuestionPayload) => {
 *   const localOffset = Date.now() - payload.serverStartTime;
 *   startCountdownTimer(payload.questionId, localOffset);
 * });
 * ```
 */
export interface StartQuestionPayload {
  /**
   * Unique identifier for the question (e.g., "q006")
   * Clients should fetch full question details from Firestore using this ID
   */
  questionId: string;

  /**
   * Server-side millisecond epoch timestamp when event was broadcast
   * Used for client-side clock synchronization and countdown timers
   *
   * @example 1678886400123
   */
  serverStartTime: number;
}

/**
 * GONG_ACTIVATED Event Payload
 *
 * Broadcast when the GONG is triggered (final question indicator)
 * Functional Requirement: FR-005
 *
 * @example
 * ```typescript
 * socket.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
 *   playDramaticGongSound();
 *   displayFinalQuestionBadge();
 * });
 * ```
 */
export interface GongActivatedPayload {
  // Empty object - GONG event carries no additional data
  // The event itself is the signal
}

/**
 * GAME_PHASE_CHANGED Event Payload
 *
 * Broadcast when the game transitions to a non-"accepting_answers" phase
 * Functional Requirement: FR-006
 *
 * Clients should react based on the newPhase value:
 * - "showing_distribution": Query answers, display distribution graph
 * - "showing_correct_answer": Highlight correct answer
 * - "showing_results": Fetch rankings, display leaderboard
 * - "all_revived": Play resurrection animation
 *
 * @example
 * ```typescript
 * socket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
 *   switch (payload.newPhase) {
 *     case 'showing_distribution':
 *       fetchAndDisplayDistribution();
 *       break;
 *     case 'showing_results':
 *       fetchAndDisplayRankings();
 *       break;
 *   }
 * });
 * ```
 */
export interface GamePhaseChangedPayload {
  /**
   * The phase the game has transitioned to
   * Determines what UI/logic the client should activate
   */
  newPhase: GamePhase;
}

/**
 * IDLE_STATE Event Payload
 *
 * Sent to clients connecting before any game has started
 * Functional Requirement: FR-003a
 *
 * @example
 * ```typescript
 * socket.on('IDLE_STATE', (payload: IdleStatePayload) => {
 *   displayWaitingScreen("Waiting for game to start...");
 * });
 * ```
 */
export interface IdleStatePayload {
  // Empty object - indicates no active game session
}

// ============================================================================
// Server → Client Events (Connection Control)
// ============================================================================

/**
 * AUTH_REQUIRED Event Payload
 *
 * Server instructs client to send authentication credentials immediately
 * Sent automatically upon connection establishment
 * Functional Requirement: FR-002
 *
 * @example
 * ```typescript
 * socket.on('AUTH_REQUIRED', (payload: AuthRequiredPayload) => {
 *   const token = await firebase.auth().currentUser?.getIdToken();
 *   socket.emit('authenticate', { token });
 * });
 * ```
 */
export interface AuthRequiredPayload {
  /**
   * Milliseconds before the server forcibly disconnects unauthenticated client
   * Default: 10000 (10 seconds)
   */
  timeout: number;
}

/**
 * AUTH_SUCCESS Event Payload
 *
 * Server confirms successful authentication
 * Client is now admitted to the game room and will receive game events
 * Functional Requirement: FR-002
 *
 * @example
 * ```typescript
 * socket.on('AUTH_SUCCESS', (payload: AuthSuccessPayload) => {
 *   console.log(`Authenticated as ${payload.userId}`);
 *   subscribeToGameEvents();
 * });
 * ```
 */
export interface AuthSuccessPayload {
  /**
   * Firebase UID extracted from the verified token
   * Clients can use this for logging/debugging
   */
  userId: string;
}

/**
 * AUTH_FAILED Event Payload
 *
 * Server rejects authentication attempt
 * Connection will be closed after this event
 * Functional Requirement: FR-008
 *
 * @example
 * ```typescript
 * socket.on('AUTH_FAILED', (payload: AuthFailedPayload) => {
 *   console.error(`Auth failed: ${payload.reason}`);
 *   refreshTokenAndRetry();
 * });
 * ```
 */
export interface AuthFailedPayload {
  /**
   * Human-readable error message explaining why authentication failed
   * @example "Invalid token", "Token expired", "Token signature invalid"
   */
  reason: string;
}

// ============================================================================
// Client → Server Events
// ============================================================================

/**
 * authenticate Event Payload
 *
 * Client provides Firebase Auth ID token for server verification
 * MUST be sent within AUTH_REQUIRED.timeout milliseconds
 * Functional Requirement: FR-002
 *
 * @example
 * ```typescript
 * const token = await firebase.auth().currentUser?.getIdToken();
 * socket.emit('authenticate', { token } as AuthenticatePayload);
 * ```
 */
export interface AuthenticatePayload {
  /**
   * Firebase Auth ID token (JWT format)
   * Obtained via firebase.auth().currentUser.getIdToken()
   */
  token: string;
}

// ============================================================================
// Event Name Constants (Type-Safe Event Names)
// ============================================================================

/**
 * Server → Client Event Names
 * Use these constants to ensure type-safe event names
 */
export const ServerEventNames = {
  START_QUESTION: 'START_QUESTION',
  GONG_ACTIVATED: 'GONG_ACTIVATED',
  GAME_PHASE_CHANGED: 'GAME_PHASE_CHANGED',
  IDLE_STATE: 'IDLE_STATE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILED: 'AUTH_FAILED',
} as const;

/**
 * Client → Server Event Names
 * Use these constants to ensure type-safe event names
 */
export const ClientEventNames = {
  AUTHENTICATE: 'authenticate',
} as const;

/**
 * Union type of all server event names
 */
export type ServerEventName = keyof typeof ServerEventNames;

/**
 * Union type of all client event names
 */
export type ClientEventName = keyof typeof ClientEventNames;

// ============================================================================
// Type-Safe Socket.io Server/Client Interfaces
// ============================================================================

/**
 * Server → Client event map for Socket.io type safety
 * Use with Socket.io TypeScript generic types
 *
 * @example
 * ```typescript
 * import { Server } from 'socket.io';
 * import { ServerToClientEvents } from './socket-events';
 *
 * const io: Server<ClientToServerEvents, ServerToClientEvents> = new Server(httpServer);
 * ```
 */
export interface ServerToClientEvents {
  START_QUESTION: (payload: StartQuestionPayload) => void;
  GONG_ACTIVATED: (payload: GongActivatedPayload) => void;
  GAME_PHASE_CHANGED: (payload: GamePhaseChangedPayload) => void;
  IDLE_STATE: (payload: IdleStatePayload) => void;
  AUTH_REQUIRED: (payload: AuthRequiredPayload) => void;
  AUTH_SUCCESS: (payload: AuthSuccessPayload) => void;
  AUTH_FAILED: (payload: AuthFailedPayload) => void;
}

/**
 * Client → Server event map for Socket.io type safety
 * Use with Socket.io TypeScript generic types
 *
 * @example
 * ```typescript
 * import { Server } from 'socket.io';
 * import { ClientToServerEvents } from './socket-events';
 *
 * const io: Server<ClientToServerEvents, ServerToClientEvents> = new Server(httpServer);
 * ```
 */
export interface ClientToServerEvents {
  authenticate: (payload: AuthenticatePayload) => void;
}

/**
 * Socket data attached to each connection (for server-side tracking)
 */
export interface SocketData {
  userId?: string;      // Firebase UID (set after successful auth)
  isAuthenticated: boolean;  // Auth status flag
}

// ============================================================================
// Validation Helpers (Runtime Type Guards)
// ============================================================================

/**
 * Type guard for StartQuestionPayload
 * Use for runtime validation before broadcasting
 */
export function isStartQuestionPayload(payload: unknown): payload is StartQuestionPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as StartQuestionPayload).questionId === 'string' &&
    typeof (payload as StartQuestionPayload).serverStartTime === 'number'
  );
}

/**
 * Type guard for GamePhaseChangedPayload
 * Use for runtime validation before broadcasting
 */
export function isGamePhaseChangedPayload(payload: unknown): payload is GamePhaseChangedPayload {
  const validPhases: GamePhase[] = [
    'waiting',
    'accepting_answers',
    'showing_distribution',
    'showing_correct_answer',
    'showing_results',
    'all_revived',
    'game_over',
  ];
  return (
    typeof payload === 'object' &&
    payload !== null &&
    validPhases.includes((payload as GamePhaseChangedPayload).newPhase)
  );
}

/**
 * Type guard for AuthenticatePayload
 * Use for runtime validation of client auth messages
 */
export function isAuthenticatePayload(payload: unknown): payload is AuthenticatePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as AuthenticatePayload).token === 'string' &&
    (payload as AuthenticatePayload).token.length > 0
  );
}
