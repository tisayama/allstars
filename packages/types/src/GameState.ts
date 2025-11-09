/**
 * Global game state entity
 * Singleton document tracking current game phase and results
 */

import type { Question, GamePeriod } from './Question';
import type { GameSettings } from './GameSettings';

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

/**
 * Ranked answer entry for Top 10 and Worst 10 rankings
 */
export interface RankedAnswer {
  /** Participant (guest) ID */
  guestId: string;
  /** Participant display name */
  guestName: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
}

export interface GameResults {
  /** Top 10 fastest correct answers (ascending order by responseTimeMs) */
  top10: RankedAnswer[];

  /** Worst 10 slowest correct answers (descending order by responseTimeMs) */
  worst10: RankedAnswer[];

  /**
   * Participant IDs of period champions (fastest correct answers on period-final questions)
   * Supports multiple champions in case of ties
   */
  periodChampions?: string[];

  /**
   * Period identifier for the question these results belong to
   * Matches currentQuestion.period from GameState
   */
  period?: GamePeriod;

  /**
   * True if ranking calculation failed after all retry attempts
   * When true, top10 and worst10 will be empty arrays
   */
  rankingError?: boolean;
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

  /** Game configuration settings */
  settings?: GameSettings;
}

// Type Guards

/**
 * Type guard: Check if GameResults object is valid
 * @param results - GameResults object to validate
 * @returns true if results has required fields (top10 and worst10 arrays)
 */
export function isValidGameResults(results: unknown): results is GameResults {
  if (!results || typeof results !== 'object') {
    return false;
  }
  const r = results as Partial<GameResults>;
  return Array.isArray(r.top10) && Array.isArray(r.worst10);
}

/**
 * Type guard: Check if GameResults has a ranking error
 * @param results - GameResults object to check
 * @returns true if ranking calculation failed
 */
export function hasRankingError(results: GameResults): boolean {
  return results.rankingError === true;
}

/**
 * Type guard: Check if GameResults has period champions designated
 * @param results - GameResults object to check
 * @returns true if periodChampions array exists and has at least one champion
 */
export function hasPeriodChampions(results: GameResults): boolean {
  return Array.isArray(results.periodChampions) && results.periodChampions.length > 0;
}

// Helper Functions

/**
 * Get the appropriate ranking to display based on question type
 * @param results - GameResults object
 * @param isGongActive - Whether gong is active (identifies period-final question)
 * @returns 'top10' for period-final questions, 'worst10' for non-final questions
 */
export function getDisplayRanking(
  _results: GameResults,
  isGongActive: boolean
): 'top10' | 'worst10' {
  return isGongActive ? 'top10' : 'worst10';
}
