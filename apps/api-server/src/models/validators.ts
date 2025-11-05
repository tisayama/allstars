/**
 * Zod validation schemas for request validation
 * Provides runtime type checking with TypeScript inference
 */

import { z } from "zod";

/**
 * Schema for creating a new quiz question
 */
export const CreateQuestionSchema = z.object({
  period: z.string().min(1, "Period is required"),
  questionNumber: z.number().int().positive("Question number must be positive"),
  type: z.literal("multiple-choice", {
    errorMap: () => ({
      message: "Only multiple-choice questions are supported",
    }),
  }),
  text: z.string().min(1, "Question text is required"),
  choices: z
    .array(z.string().min(1))
    .min(2, "At least 2 choices are required")
    .max(10, "Maximum 10 choices allowed"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  skipAttributes: z.array(z.string()).default([]),
  deadline: z.string().datetime("Deadline must be a valid ISO 8601 datetime"),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;

/**
 * Schema for updating an existing quiz question
 * All fields are optional for partial updates
 */
export const UpdateQuestionSchema = z
  .object({
    text: z.string().min(1).optional(),
    choices: z
      .array(z.string().min(1))
      .min(2, "At least 2 choices are required")
      .max(10, "Maximum 10 choices allowed")
      .optional(),
    correctAnswer: z.string().min(1).optional(),
    skipAttributes: z.array(z.string()).optional(),
    deadline: z
      .string()
      .datetime("Deadline must be a valid ISO 8601 datetime")
      .optional(),
  })
  .refine(
    (data) => {
      // If correctAnswer is provided, ensure it matches one of the choices (if choices provided)
      if (data.correctAnswer && data.choices) {
        return data.choices.includes(data.correctAnswer);
      }
      return true;
    },
    {
      message: "Correct answer must be one of the provided choices",
      path: ["correctAnswer"],
    }
  );

export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

/**
 * Schema for submitting an answer (will be used in Phase 5)
 */
export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().min(1, "Answer is required"),
  responseTimeMs: z
    .number()
    .int()
    .min(0, "Response time cannot be negative")
    .max(300000, "Response time cannot exceed 5 minutes"),
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

/**
 * Schema for game action request (will be used in Phase 6)
 */
export const GameActionSchema = z.object({
  action: z.enum([
    "START_QUESTION",
    "TRIGGER_GONG",
    "SHOW_DISTRIBUTION",
    "SHOW_CORRECT_ANSWER",
    "SHOW_RESULTS",
    "REVIVE_ALL",
  ]),
  payload: z.record(z.any()).optional(),
});

export type GameActionInput = z.infer<typeof GameActionSchema>;

/**
 * Schema for ranked answer entry (Top 10 / Worst 10 rankings)
 */
export const RankedAnswerSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  guestName: z.string().min(1, "Guest name is required"),
  responseTimeMs: z
    .number()
    .int()
    .min(0, "Response time cannot be negative")
    .max(300000, "Response time cannot exceed 5 minutes"),
});

export type RankedAnswerData = z.infer<typeof RankedAnswerSchema>;

/**
 * Schema for game results (rankings displayed after each question)
 * Validates both required fields and optional period championship fields
 */
export const GameResultsSchema = z
  .object({
    /** Top 10 fastest correct answers (ascending order by responseTimeMs) */
    top10: z.array(RankedAnswerSchema),

    /** Worst 10 slowest correct answers (descending order by responseTimeMs) */
    worst10: z.array(RankedAnswerSchema),

    /**
     * Participant IDs of period champions (fastest on period-final questions)
     * Optional field, present only when isGongActive is true
     */
    periodChampions: z.array(z.string().min(1)).optional(),

    /**
     * Period identifier for these results
     * Optional field, present only when isGongActive is true
     */
    period: z.enum(["first-half", "second-half", "overtime"]).optional(),

    /**
     * True if ranking calculation failed after all retry attempts
     * When true, top10 and worst10 should be empty arrays
     */
    rankingError: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If rankingError is true, top10 and worst10 must be empty
      if (data.rankingError === true) {
        return data.top10.length === 0 && data.worst10.length === 0;
      }
      return true;
    },
    {
      message:
        "When rankingError is true, top10 and worst10 must be empty arrays",
      path: ["rankingError"],
    }
  )
  .refine(
    (data) => {
      // If periodChampions exists, period must also exist
      if (data.periodChampions && data.periodChampions.length > 0) {
        return data.period !== undefined;
      }
      return true;
    },
    {
      message: "Period field is required when periodChampions are designated",
      path: ["period"],
    }
  );

export type GameResultsData = z.infer<typeof GameResultsSchema>;
