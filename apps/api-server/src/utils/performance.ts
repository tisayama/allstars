/**
 * Performance monitoring middleware
 * Tracks response time for API requests
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to track response time for each request
 * Adds X-Response-Time header to response with elapsed time in milliseconds
 *
 * @example
 * ```typescript
 * app.use(performanceMiddleware);
 * ```
 */
export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Capture when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Add response time header
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log performance metrics
    console.log(
      `[Performance] ${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`
    );
  });

  next();
}

/**
 * Helper function to measure execution time of async operations
 * Useful for measuring specific service/operation performance
 *
 * @param operation - Async function to measure
 * @param label - Label for logging purposes
 * @returns Promise that resolves with the operation result
 *
 * @example
 * ```typescript
 * const result = await measurePerformance(
 *   () => expensiveOperation(),
 *   'expensiveOperation'
 * );
 * ```
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    console.log(`[Performance] ${label} - ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Performance] ${label} - ${duration}ms (failed)`);
    throw error;
  }
}
