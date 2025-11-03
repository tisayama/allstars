/**
 * Question choice entity
 * Represents an answer option within a quiz question
 */

export interface Choice {
  /** Unique identifier for the choice (e.g., 'A', 'B', 'C', 'D') */
  id: string;

  /** Text content of the choice */
  text: string;

  /** Optional image URL for visual representation of the choice */
  imageUrl?: string;
}
