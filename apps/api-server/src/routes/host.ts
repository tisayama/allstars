/**
 * Host routes
 * Endpoints for game host to control game flow
 */

import { Router, Request, Response, NextFunction } from "express";
import { auth } from "../middleware/auth";
import { requireGoogleLogin } from "../middleware/roleGuard";
import { GameActionSchema } from "../models/validators";
import { advanceGame, getCurrentGameState } from "../services/gameStateService";
import { ValidationError } from "../utils/errors";
import { ZodError } from "zod";

const router = Router();

// Apply authentication and role guard to all host routes
router.use(auth);
router.use(requireGoogleLogin);

/**
 * GET /host/game/state
 * Get current game state
 */
router.get(
  "/game/state",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gameState = await getCurrentGameState();
      res.status(200).json(gameState);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /host/game/advance
 * Advance game state based on host action
 */
router.post(
  "/game/advance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = GameActionSchema.parse(req.body);

      // Advance game state
      const gameState = await advanceGame(validatedData);

      // Return updated game state
      res.status(200).json(gameState);
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod validation error to our error format
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        next(new ValidationError("Invalid game action", details));
      } else {
        next(error);
      }
    }
  }
);

export default router;
