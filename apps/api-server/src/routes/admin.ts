/**
 * Admin routes
 * Endpoints for quiz master to manage game content
 */

import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { requireGoogleLogin } from '../middleware/roleGuard';
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
} from '../models/validators';
import {
  createQuestion,
  listQuestions,
  updateQuestion,
} from '../services/questionService';
import { listGuests } from '../services/guestService';
import { ValidationError } from '../utils/errors';
import { ZodError } from 'zod';

const router = Router();

// Apply authentication and role guard to all admin routes
router.use(auth);
router.use(requireGoogleLogin);

/**
 * POST /admin/quizzes
 * Create a new quiz question
 */
router.post(
  '/quizzes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = CreateQuestionSchema.parse(req.body);

      // Create question
      const question = await createQuestion(validatedData);

      // Return created question
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod validation error to our error format
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(
          new ValidationError('Invalid question data', details)
        );
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /admin/quizzes
 * List all quiz questions
 */
router.get(
  '/quizzes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await listQuestions();
      res.status(200).json(questions);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /admin/quizzes/:questionId
 * Update an existing quiz question
 */
router.put(
  '/quizzes/:questionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;

      // Validate request body
      const validatedData = UpdateQuestionSchema.parse(req.body);

      // Update question
      const question = await updateQuestion(questionId, validatedData);

      // Return updated question
      res.status(200).json(question);
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod validation error to our error format
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(
          new ValidationError('Invalid update data', details)
        );
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /admin/guests
 * List all registered guests
 */
router.get(
  '/guests',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guests = await listGuests();
      res.status(200).json(guests);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
