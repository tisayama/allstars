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
