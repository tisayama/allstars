/**
 * Authentication middleware
 * Validates Firebase ID tokens and extracts user claims
 */

import { Request, Response, NextFunction } from 'express';
import { admin } from '../utils/firestore';
import { UnauthorizedError } from '../utils/errors';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        signInProvider: string;
      };
    }
  }
}

/**
 * Middleware to validate Firebase ID token and extract user claims
 */
export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const error = new UnauthorizedError('Missing authentication token', [
        { message: 'Authorization header is required' },
      ]);
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    // Verify Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      const error = new UnauthorizedError('Invalid authorization format', [
        { message: 'Authorization header must be "Bearer <token>"' },
      ]);
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    const token = parts[1];

    // Verify Firebase ID token
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Extract user claims
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        signInProvider: decodedToken.firebase.sign_in_provider,
      };

      next();
    } catch (verifyError) {
      console.error('[Auth] Token verification failed:', verifyError);

      const error = new UnauthorizedError('Invalid or expired token', [
        { message: 'Failed to verify Firebase ID token' },
      ]);
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }
  } catch (error) {
    // Handle Firebase Auth service unavailability (FR-033)
    console.error('[Auth] Firebase Auth service error:', error);

    const serviceError = new UnauthorizedError(
      'Authentication service unavailable',
      [{ message: 'Unable to verify authentication at this time' }]
    );
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: serviceError.message,
      details: serviceError.details,
    });
    return;
  }
}
