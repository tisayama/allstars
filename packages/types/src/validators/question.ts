/**
 * Zod validation schema for Question entity
 */

import { z } from 'zod';

export const questionTypeSchema = z.enum(['multiple-choice']);

export const questionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  period: z.string().min(1, 'Period is required'),
  questionNumber: z.number().int().positive('Question number must be a positive integer'),
  type: questionTypeSchema,
  text: z.string().min(1, 'Question text is required'),
  choices: z.array(z.string()).min(2, 'At least 2 choices are required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  skipAttributes: z.array(z.string()),
  deadline: z.any(), // Firestore Timestamp - validated at runtime
});

export type QuestionInput = z.infer<typeof questionSchema>;
