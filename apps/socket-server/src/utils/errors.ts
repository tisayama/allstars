/**
 * Custom error classes for socket-server
 */

/**
 * Authentication-related errors (invalid/expired tokens, auth timeout)
 */
export class AuthenticationError extends Error {
  constructor(message: string, public readonly statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Data validation errors (malformed GameState, invalid event payloads)
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Firestore listener errors (connection failure, document read errors)
 */
export class ListenerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ListenerError';
    Object.setPrototypeOf(this, ListenerError.prototype);
  }
}
