/**
 * Event Mapper - Maps Firestore GameState changes to Socket.io events
 * FR-004: Broadcast START_QUESTION when currentPhase = "accepting_answers"
 * FR-007: Include serverStartTime for clock synchronization
 */
import type {
  StartQuestionPayload,
  GamePhaseChangedPayload,
  GongActivatedPayload,
  IdleStatePayload,
} from '@allstars/types';
import { logger } from '../utils/logger';

export interface SocketEvent {
  eventName: string;
  payload: any;
}

/**
 * Map GameState changes to appropriate Socket.io events
 * Priority: IDLE_STATE > GONG_ACTIVATED > START_QUESTION > GAME_PHASE_CHANGED
 * @param gameState - Validated GameState document from Firestore (or null for idle state)
 * @returns Socket.io event name and payload
 */
export function mapToSocketEvent(gameState: any): SocketEvent {
  // FR-003a: IDLE_STATE when no active game (null/undefined gameState)
  if (gameState === null || gameState === undefined) {
    logger.debug('Mapped to IDLE_STATE: no active game');
    const payload: IdleStatePayload = {};
    return {
      eventName: 'IDLE_STATE',
      payload,
    };
  }

  const { currentPhase, currentQuestionId, isGongActive } = gameState;

  // FR-005: GONG_ACTIVATED event takes highest priority
  // GONG can occur during any phase and should always be broadcast immediately
  if (isGongActive) {
    logger.debug('Mapped to GONG_ACTIVATED');
    const payload: GongActivatedPayload = {};
    return {
      eventName: 'GONG_ACTIVATED',
      payload,
    };
  }

  // FR-004: START_QUESTION event when phase is accepting_answers
  if (currentPhase === 'accepting_answers') {
    if (!currentQuestionId) {
      throw new Error('currentQuestionId is required for accepting_answers phase');
    }

    const payload: StartQuestionPayload = {
      questionId: currentQuestionId,
      serverStartTime: Date.now(), // FR-007: Server timestamp for clock sync
    };

    logger.debug(`Mapped to START_QUESTION: ${currentQuestionId}`);

    return {
      eventName: 'START_QUESTION',
      payload,
    };
  }

  // FR-006: GAME_PHASE_CHANGED for other phase transitions
  const payload: GamePhaseChangedPayload = {
    newPhase: currentPhase,
  };

  logger.debug(`Mapped to GAME_PHASE_CHANGED: ${currentPhase}`);

  return {
    eventName: 'GAME_PHASE_CHANGED',
    payload,
  };
}
