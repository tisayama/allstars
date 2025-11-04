/**
 * Quiz question entity
 * Represents a single question in the quiz game
 */

import type { Timestamp } from './GameState';

export type QuestionType = 'multiple-choice';

export type GamePeriod =
  | 'first-half'   // Regular questions before gong
  | 'second-half'  // Questions after some eliminations
  | 'overtime';     // Final tiebreaker questions

export interface QuestionChoice {
  /** 0-based choice index */
  index: number;
  /** Choice label (e.g., "A. Paris", "B. London") */
  text: string;
}

export interface Question {
  /** Unique question identifier (e.g., "q-first-half-001") */
  questionId: string;

  /** Question text displayed to participants */
  questionText: string;

  /** Array of answer choices (2-4 choices) */
  choices: QuestionChoice[];

  /** Game period classification */
  period: GamePeriod;

  /** Sequential question number (1-based) */
  questionNumber: number;

  /** Question type (currently only multiple-choice supported) */
  type?: QuestionType;

  /** Correct answer choice (must be one of the choices) */
  correctAnswer?: string;

  /** Attributes to skip when displaying this question (e.g., ['age-under-20']) */
  skipAttributes?: string[];

  /** Deadline for answering this question (Firestore Timestamp) */
  deadline?: Timestamp;
}
