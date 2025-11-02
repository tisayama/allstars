/**
 * Standardized error response format
 * RFC 7807-inspired JSON error structure
 */

export interface ErrorDetail {
  /** Field or parameter that caused the error */
  field?: string;

  /** Human-readable error message for this detail */
  message: string;
}

export interface ErrorResponse {
  /** Machine-readable error code (e.g., 'VALIDATION_ERROR', 'DUPLICATE_ANSWER') */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Array of detailed error information */
  details: ErrorDetail[];
}
