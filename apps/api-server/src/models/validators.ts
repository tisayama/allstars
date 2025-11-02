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
