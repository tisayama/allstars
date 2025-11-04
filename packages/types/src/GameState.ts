/**
 * Global game state entity
 * Singleton document tracking current game phase and results
 */

import type { Question } from './Question';

// Firebase Timestamp type (compatible with both admin and client SDKs)
export type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
};

export type GamePhase =
  | 'ready_for_next'
  | 'accepting_answers'
  | 'showing_distribution'
  | 'showing_correct_answer'
  | 'showing_results'
  | 'all_incorrect'
  | 'all_revived';

export interface GameResults {
  /** Top 10 fastest correct answers */
  top10: Array<{
    guestId: string;
    guestName: string;
    responseTimeMs: number;
  }>;

  /** Worst 10 slowest incorrect answers */
  worst10: Array<{
    guestId: string;
    guestName: string;
    responseTimeMs: number;
  }>;
}

export interface GameState {
  /** Firestore document ID (singleton: 'live') */
  id?: string;

  /** Current phase of the game */
  currentPhase: GamePhase;

  /** Currently active question object, or null if no question active */
  currentQuestion: Question | null;

  /** Whether the gong sound effect is currently active */
  isGongActive: boolean;

  /** Number of active participants (for display) */
  participantCount?: number;

  /** Seconds remaining in current phase (optional display) */
  timeRemaining?: number | null;

  /** Firestore server timestamp of last state change */
  lastUpdate: Timestamp;

  /** Denormalized results for current question (calculated during SHOW_RESULTS) */
  results?: GameResults | null;

  /** Accumulated prize money from questions where all guests answered incorrectly */
  prizeCarryover?: number;
}
