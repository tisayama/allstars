/**
 * Global game state entity
 * Singleton document tracking current game phase and results
 */

export type GamePhase =
  | 'idle'
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
  /** Firestore document ID (singleton: 'current') */
  id: string;

  /** Currently active question ID, or null if no question active */
  activeQuestionId: string | null;

  /** Current phase of the game */
  phase: GamePhase;

  /** Whether the gong sound effect is currently active */
  isGongActive: boolean;

  /** Denormalized results for current question (calculated during SHOW_RESULTS) */
  results: GameResults | null;

  /** Accumulated prize money from questions where all guests answered incorrectly */
  prizeCarryover: number;
}
