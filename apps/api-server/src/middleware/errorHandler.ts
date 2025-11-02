/**
 * Global error handler middleware
 * Formats all errors to RFC 7807-inspired JSON structure
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@allstars/types';
import { AppError, ServiceUnavailableError } from '../utils/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging (FR-033 requirement)
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known AppError instances
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      code: err.code,
      message: err.message,
      details: err.details,
    };

    // Add Retry-After header for service unavailable errors (FR-031)
    if (err instanceof ServiceUnavailableError) {
      res.setHeader('Retry-After', '60'); // Retry after 60 seconds
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle Firestore/Firebase service errors (FR-031)
  if (
    err.message.includes('Firestore') ||
    err.message.includes('Firebase') ||
    err.message.includes('UNAVAILABLE')
  ) {
    const errorResponse: ErrorResponse = {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable',
      details: [
        {
          message: 'Database or authentication service is currently unavailable',
        },
      ],
    };

    res.setHeader('Retry-After', '60');
    res.status(503).json(errorResponse);
    return;
  }

  // Handle unknown errors (500 Internal Server Error)
  const errorResponse: ErrorResponse = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: [],
  };

  res.status(500).json(errorResponse);
}
