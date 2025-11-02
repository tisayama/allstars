/**
 * Role-based access control middleware
 * Enforces authentication method requirements (Google vs Anonymous)
 */

import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

/**
 * Middleware to require Google login (admin/host endpoints)
 * Must be used after auth middleware
 */
export function requireGoogleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if user is authenticated
  if (!req.user) {
    const error = new UnauthorizedError("User not authenticated", [
      { message: "Authentication required - please log in" },
    ]);
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  // Check if user signed in with Google
  if (req.user.signInProvider !== "google.com") {
    const error = new ForbiddenError("Google authentication required", [
      {
        message: "This endpoint requires Google login (admin/host access only)",
      },
    ]);
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  next();
}

/**
 * Middleware to require anonymous login (participant endpoints)
 * Must be used after auth middleware
 */
export function requireAnonymousLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if user is authenticated
  if (!req.user) {
    const error = new UnauthorizedError("User not authenticated", [
      { message: "Authentication required - please log in anonymously" },
    ]);
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  // Check if user signed in anonymously
  if (req.user.signInProvider !== "anonymous") {
    const error = new ForbiddenError("Anonymous authentication required", [
      {
        message:
          "This endpoint requires anonymous login (participant access only)",
      },
    ]);
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  next();
}
