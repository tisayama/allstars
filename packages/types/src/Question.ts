/**
 * Quiz question entity
 * Represents a single question in the quiz game
 */

import { Timestamp } from 'firebase-admin/firestore';

export type QuestionType = 'multiple-choice';

export interface Question {
  /** Firestore document ID */
  id: string;

  /** Game period (e.g., 'first-half', 'second-half') */
  period: string;

  /** Question number within the period (1-based) */
  questionNumber: number;

  /** Question type (currently only multiple-choice supported) */
  type: QuestionType;

  /** Question text displayed to participants */
  text: string;

  /** Array of answer choices (e.g., ['A', 'B', 'C', 'D']) */
  choices: string[];

  /** Correct answer choice (must be one of the choices) */
  correctAnswer: string;

  /** Attributes to skip when displaying this question (e.g., ['age-under-20']) */
  skipAttributes: string[];

  /** Deadline for answering this question (Firestore Timestamp) */
  deadline: Timestamp;
}
