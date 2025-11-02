/**
 * Answer submission entity
 * Represents a participant's answer to a specific question
 */

export interface Answer {
  /** Firestore document ID */
  id: string;

  /** Guest ID who submitted the answer (from Firebase Auth) */
  guestId: string;

  /** Question ID being answered */
  questionId: string;

  /** Submitted answer choice (e.g., 'A', 'B', 'C', 'D') */
  answer: string;

  /** Response time in milliseconds from question start */
  responseTimeMs: number;

  /** Whether the answer is correct */
  isCorrect: boolean;

  /** Server timestamp when answer was submitted */
  submittedAt: Date;
}
