/**
 * WebSocket Event Schemas for Participant App
 *
 * These TypeScript interfaces define the contract between socket-server (emitter)
 * and participant-app (listener) for real-time game events.
 *
 * NOTE: This file should be moved to @allstars/types/src/WebSocketEvents.ts
 * to share across socket-server, participant-app, and other clients.
 */

/**
 * Base event structure
 */
export interface WebSocketEvent<T extends string, P> {
  type: T;
  payload: P;
}

/**
 * START_QUESTION Event
 *
 * Emitted by: socket-server
 * Listened by: participant-app, projector-app
 *
 * Triggered when the host starts a new question. Clients should display
 * the question and enable answer submission.
 */
export interface StartQuestionPayload {
  questionId: string;
  questionText: string;
  choices: Array<{
    index: number;
    text: string;
  }>;
  serverStartTime: number; // Unix timestamp in milliseconds
  period: 'first-half' | 'second-half' | 'overtime';
  questionNumber: number; // Sequential number within period
}

export type StartQuestionEvent = WebSocketEvent<
  'START_QUESTION',
  StartQuestionPayload
>;

/**
 * GAME_PHASE_CHANGED Event
 *
 * Emitted by: socket-server
 * Listened by: participant-app, projector-app, host-app
 *
 * Triggered when the game transitions between phases (waiting, answering, reveal, ended).
 * Includes the correct answer when transitioning to 'reveal' phase.
 */
export interface GamePhaseChangedPayload {
  phase: 'waiting' | 'answering' | 'reveal' | 'ended';
  questionId?: string; // Present for 'answering' and 'reveal' phases
  correctChoice?: number; // Only present in 'reveal' phase (0-based index)
  timestamp: number; // Unix timestamp when phase changed
}

export type GamePhaseChangedEvent = WebSocketEvent<
  'GAME_PHASE_CHANGED',
  GamePhaseChangedPayload
>;

/**
 * GUEST_DROPPED Event
 *
 * Emitted by: socket-server
 * Listened by: participant-app (specific guest), projector-app
 *
 * Triggered when a guest is eliminated from the game. Participant-app should
 * display drop-out overlay with final stats.
 */
export interface GuestDroppedPayload {
  guestId: string;
  rank: number;
  totalPoints: number;
  correctAnswers: number;
  timestamp: number;
}

export type GuestDroppedEvent = WebSocketEvent<
  'GUEST_DROPPED',
  GuestDroppedPayload
>;

/**
 * RECONNECT Event
 *
 * Emitted by: participant-app (client)
 * Listened by: socket-server
 *
 * Sent when client reconnects after disconnection to request current game state.
 */
export interface ReconnectPayload {
  guestId: string;
  lastSeenTimestamp: number; // Last event timestamp client received
}

export type ReconnectEvent = WebSocketEvent<'RECONNECT', ReconnectPayload>;

/**
 * STATE_SYNC Event
 *
 * Emitted by: socket-server
 * Listened by: participant-app (response to RECONNECT)
 *
 * Sent in response to RECONNECT event with current game state.
 */
export interface StateSyncPayload {
  currentPhase: 'waiting' | 'answering' | 'reveal' | 'ended';
  activeQuestion?: StartQuestionPayload; // Present if phase='answering'
  guestStatus: 'active' | 'dropped';
  missedEvents: Array<StartQuestionEvent | GamePhaseChangedEvent>; // Events missed during disconnection
}

export type StateSyncEvent = WebSocketEvent<'STATE_SYNC', StateSyncPayload>;

/**
 * Union type of all events
 */
export type GameEvent =
  | StartQuestionEvent
  | GamePhaseChangedEvent
  | GuestDroppedEvent
  | ReconnectEvent
  | StateSyncEvent;

/**
 * Type guard for event type narrowing
 */
export function isEventOfType<T extends GameEvent['type']>(
  event: GameEvent,
  type: T
): event is Extract<GameEvent, { type: T }> {
  return event.type === type;
}

/**
 * Example usage:
 *
 * socket.on('game-event', (event: GameEvent) => {
 *   if (isEventOfType(event, 'START_QUESTION')) {
 *     // TypeScript knows event.payload is StartQuestionPayload
 *     displayQuestion(event.payload);
 *   } else if (isEventOfType(event, 'GAME_PHASE_CHANGED')) {
 *     // TypeScript knows event.payload is GamePhaseChangedPayload
 *     updateGamePhase(event.payload);
 *   }
 * });
 */
