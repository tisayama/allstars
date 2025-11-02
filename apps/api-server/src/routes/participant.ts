/**
 * Participant routes
 * Endpoints for wedding guests to interact with the quiz game
 */

import { Router, Request, Response, NextFunction } from "express";
import { auth } from "../middleware/auth";
import { requireAnonymousLogin } from "../middleware/roleGuard";
import { SubmitAnswerSchema } from "../models/validators";
import { submitAnswer } from "../services/answerService";
import { ValidationError } from "../utils/errors";
import { ZodError } from "zod";

const router = Router();

/**
 * GET /participant/time
 * Server time synchronization endpoint
 * Public endpoint - no authentication required
 */
router.get("/time", (req: Request, res: Response) => {
  // Return current server timestamp in milliseconds
  res.status(200).json({
    timestamp: Date.now(),
  });
});

/**
 * POST /participant/answer
 * Submit an answer to the active question
 * Requires anonymous authentication
 */
router.post(
  "/answer",
  auth,
  requireAnonymousLogin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract guest ID from authenticated user
      const guestId = req.user!.uid;

      // Validate request body
      const validatedData = SubmitAnswerSchema.parse(req.body);

      // Submit answer
      const answer = await submitAnswer(guestId, validatedData);

      // Return created answer with correctness and timestamp
      res.status(201).json({
        id: answer.id,
        questionId: answer.questionId,
        answer: answer.answer,
        responseTimeMs: answer.responseTimeMs,
        isCorrect: answer.isCorrect,
        submittedAt: answer.submittedAt,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod validation error to our error format
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        next(new ValidationError("Invalid answer data", details));
      } else {
        next(error);
      }
    }
  }
);

export default router;
