/**
 * Firestore collection name constants
 * Centralized definition to prevent typos and ensure consistency
 */

export const COLLECTIONS = {
  QUESTIONS: 'questions',
  GUESTS: 'guests',
  ANSWERS: 'answers',
  GAME_STATE: 'gameState',
} as const;

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
