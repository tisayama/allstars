/**
 * Custom error classes for consistent error handling
 * All errors include HTTP status codes and structured details
 */

import { ErrorDetail } from '@allstars/types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details: ErrorDetail[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details: ErrorDetail[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 409, 'DUPLICATE_ERROR', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}
