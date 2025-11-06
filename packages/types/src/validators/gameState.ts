/**
 * Zod validation schemas for GameState entity
 * Used to validate Firestore gameState/live document structure
 */

import { z } from 'zod';
import { questionSchema } from './question';

// GamePhase enum validation
export const GamePhaseSchema = z.enum([
  'ready_for_next',
  'accepting_answers',
  'showing_distribution',
  'showing_correct_answer',
  'showing_results',
  'all_incorrect',
  'all_revived',
]);

// Timestamp schema (Firestore Timestamp structure)
export const TimestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

// RankedAnswer schema (for top10/worst10)
export const RankedAnswerSchema = z.object({
  guestId: z.string().min(1),
  guestName: z.string().min(1),
  responseTimeMs: z.number().int().nonnegative(),
});

// GameResults schema
export const GameResultsSchema = z.object({
  top10: z.array(RankedAnswerSchema),
  worst10: z.array(RankedAnswerSchema),
  periodChampions: z.array(z.string()).optional(),
  period: z.enum(['FIRST', 'SECOND', 'THIRD']).optional(),
  rankingError: z.boolean().optional(),
});

// GameSettings schema
export const GameSettingsSchema = z.object({
  defaultDropoutRule: z.enum(['worst_one', 'worst_three']),
  defaultRankingRule: z.enum(['time', 'score']),
});

// Full GameState validation schema
export const GameStateSchema = z.object({
  // Required fields
  currentPhase: GamePhaseSchema,
  currentQuestion: questionSchema.nullable(),
  isGongActive: z.boolean(),
  lastUpdate: TimestampSchema,

  // Optional fields
  id: z.string().optional(),
  participantCount: z.number().int().nonnegative().optional(),
  timeRemaining: z.number().int().nullable().optional(),
  results: GameResultsSchema.nullable().optional(),
  prizeCarryover: z.number().nonnegative().optional(),
  settings: GameSettingsSchema.optional(),
});

// Type inference from schema
export type ValidatedGameState = z.infer<typeof GameStateSchema>;

/**
 * Validate gameState data and return typed result
 * Throws ZodError if validation fails
 *
 * @param data - Unknown data to validate
 * @returns Validated GameState
 * @throws {ZodError} If validation fails
 */
export function validateGameState(data: unknown): ValidatedGameState {
  return GameStateSchema.parse(data);
}

/**
 * Safe validation that returns success/error result instead of throwing
 *
 * @param data - Unknown data to validate
 * @returns Success result with data or failure result with error
 */
export function validateGameStateSafe(data: unknown):
  | { success: true; data: ValidatedGameState }
  | { success: false; error: z.ZodError } {
  const result = GameStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
