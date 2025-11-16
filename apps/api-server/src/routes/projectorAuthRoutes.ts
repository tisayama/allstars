/**
 * Projector Authentication Routes
 * Feature: 001-projector-auth [US1]
 *
 * API endpoint for generating custom Firebase tokens for projector-app
 */

import { Router, Request, Response } from "express";
import { validateApiKey } from "../middleware/apiKeyMiddleware";
import { generateCustomToken } from "../services/customTokenService";
import type {
  TokenGenerationResponse,
  TokenGenerationError,
} from "@allstars/types";

const router = Router();

/**
 * POST /api/projector/auth-token
 *
 * Generates a Firebase custom token for projector authentication
 *
 * @security X-API-Key header required
 * @returns {TokenGenerationResponse} Custom token with expiration and UID
 * @returns {TokenGenerationError} 401 Unauthorized or 500 Internal Error
 */
router.post(
  "/auth-token",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Generate custom token using Firebase Admin SDK
      const tokenData = await generateCustomToken();

      // Return token response matching OpenAPI spec
      const response: TokenGenerationResponse = {
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        uid: tokenData.uid,
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Token generation error:", error);

      // Return error response matching OpenAPI spec
      const errorResponse: TokenGenerationError = {
        error: "INTERNAL_ERROR",
        message: "Failed to generate custom token. Please contact support.",
        statusCode: 500,
      };

      res.status(500).json(errorResponse);
    }
  }
);

export default router;
