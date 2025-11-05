/**
 * Admin routes
 * Endpoints for quiz master to manage game content
 */

import { Router, Request, Response, NextFunction } from "express";
import { auth } from "../middleware/auth";
import { requireGoogleLogin } from "../middleware/roleGuard";
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
} from "../models/validators";
import {
  createQuestion,
  listQuestions,
  updateQuestion,
} from "../services/questionService";
import {
  listGuests,
  createGuestAdmin,
  updateGuest,
  deleteGuest,
  bulkCreateGuests,
} from "../services/guestService";
import { getSettings, updateSettings } from "../services/gameStateService";
import { ValidationError } from "../utils/errors";
import { ZodError } from "zod";

const router = Router();

// Apply authentication and role guard to all admin routes
router.use(auth);
router.use(requireGoogleLogin);

/**
 * POST /admin/quizzes
 * Create a new quiz question
 */
router.post(
  "/quizzes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log request body for debugging
      console.log("Create question request body:", JSON.stringify(req.body, null, 2));

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
          field: err.path.join("."),
          message: err.message,
        }));

        // Log detailed validation errors
        console.error("Validation errors:", JSON.stringify(details, null, 2));

        next(new ValidationError("Invalid question data", details));
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
  "/quizzes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await listQuestions();
      res.status(200).json({ questions });
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
  "/quizzes/:questionId",
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
          field: err.path.join("."),
          message: err.message,
        }));

        next(new ValidationError("Invalid update data", details));
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
  "/guests",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guests = await listGuests();
      res.status(200).json({ guests });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/guests
 * Create a new guest
 */
router.post(
  "/guests",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, attributes, tableNumber } = req.body;

      if (!name || typeof name !== "string") {
        return next(
          new ValidationError("Invalid guest data", [
            { field: "name", message: "Name is required" },
          ])
        );
      }

      const guest = await createGuestAdmin({
        name,
        attributes: attributes || [],
        tableNumber,
      });

      res.status(201).json(guest);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /admin/guests/:guestId
 * Update a guest
 */
router.put(
  "/guests/:guestId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { guestId } = req.params;
      const { name, attributes, tableNumber } = req.body;

      const guest = await updateGuest(guestId, {
        name,
        attributes,
        tableNumber,
      });

      res.status(200).json(guest);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /admin/guests/:guestId
 * Delete a guest
 */
router.delete(
  "/guests/:guestId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { guestId } = req.params;

      await deleteGuest(guestId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/guests/bulk
 * Bulk import guests
 */
router.post(
  "/guests/bulk",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { guests } = req.body;

      if (!Array.isArray(guests)) {
        return next(
          new ValidationError("Invalid bulk data", [
            { field: "guests", message: "Guests must be an array" },
          ])
        );
      }

      const createdGuests = await bulkCreateGuests(guests);

      res.status(201).json({ guests: createdGuests, count: createdGuests.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/settings
 * Get game settings
 */
router.get(
  "/settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await getSettings();
      res.status(200).json({ settings });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /admin/settings
 * Update game settings (with merge to preserve other gameState fields)
 */
router.put(
  "/settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { settings } = req.body;

      if (!settings) {
        return next(
          new ValidationError("Invalid settings data", [
            { field: "settings", message: "Settings object is required" },
          ])
        );
      }

      const updatedSettings = await updateSettings(settings);
      res.status(200).json({ settings: updatedSettings });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
