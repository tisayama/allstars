/**
 * GameState validation using Zod
 * FR-011c: Validate Firestore documents before broadcasting
 */
import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Zod schema for GamePhase enum
 * Must match GamePhase type from @allstars/types
 */
const GamePhaseEnum = z.enum([
  'ready_for_next',
  'accepting_answers',
  'showing_distribution',
  'showing_correct_answer',
  'showing_results',
  'all_incorrect',
  'all_revived',
]);

/**
 * Zod schema for GameState document
 * Supports both old field names (currentPhase, currentQuestionId) and new field names (phase, activeQuestionId)
 */
const GameStateSchema = z.object({
  // Support both naming conventions
  phase: GamePhaseEnum.optional(),
  currentPhase: GamePhaseEnum.optional(),
  activeQuestionId: z.string().nullable().optional(),
  currentQuestionId: z.string().optional(),
  isGongActive: z.boolean().default(false),
  questionStartTime: z.number().optional(),
  questionTimeLimit: z.number().optional(),
  participants: z.array(z.any()).optional(),
  // Allow additional fields from Firestore
}).passthrough();

/**
 * Validate GameState document from Firestore
 * @param data - Raw data from Firestore snapshot
 * @returns Validated GameState object
 * @throws ValidationError if data is invalid
 */
export function validateGameState(data: unknown): any {
  try {
    const validated = GameStateSchema.parse(data);

    // Normalize field names (support both conventions)
    const currentPhase = validated.currentPhase || validated.phase;
    const currentQuestionId = validated.currentQuestionId || validated.activeQuestionId;

    if (!currentPhase) {
      throw new ValidationError('Either currentPhase or phase field is required');
    }

    // Additional validation: if phase is accepting_answers, questionId is required
    if (currentPhase === 'accepting_answers' && !currentQuestionId) {
      throw new ValidationError(
        'Question ID is required when phase is accepting_answers',
        { currentPhase }
      );
    }

    // Return normalized structure
    return {
      ...validated,
      currentPhase,
      currentQuestionId,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('GameState validation failed', error.errors);
    }
    throw error;
  }
}
