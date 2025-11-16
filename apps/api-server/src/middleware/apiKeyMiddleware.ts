/**
 * API Key Middleware
 * Feature: 001-projector-auth
 *
 * Validates X-API-Key header for projector token generation endpoint
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate X-API-Key header
 *
 * Checks if the provided API key matches the PROJECTOR_API_KEY environment variable.
 * Returns 401 if key is missing or invalid.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if PROJECTOR_API_KEY is configured
  const expectedApiKey = process.env.PROJECTOR_API_KEY;
  if (!expectedApiKey) {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Server configuration error",
      statusCode: 500,
    });
    return;
  }

  // Get API key from header (case-insensitive)
  const providedApiKey = req.headers["x-api-key"] as string | undefined;

  // Check if API key is provided
  if (!providedApiKey) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "API key is required in X-API-Key header",
      statusCode: 401,
    });
    return;
  }

  // Validate API key
  if (providedApiKey !== expectedApiKey) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid API key",
      statusCode: 401,
    });
    return;
  }

  // API key is valid, proceed to next middleware
  next();
}
