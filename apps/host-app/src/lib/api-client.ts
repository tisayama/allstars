/**
 * API Client for Host Actions
 * Handles communication with backend API for game control
 */

import { logger } from '@/lib/logger';
import type { HostActionRequest, HostActionResponse } from '@allstars/types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/allstars-wedding-quiz/us-central1';
const API_TIMEOUT = 10000; // 10 seconds

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Send a host action request to the API
 */
export async function sendHostAction(
  sessionId: string,
  action: HostActionRequest,
  idToken: string,
  options: ApiClientOptions = {}
): Promise<HostActionResponse> {
  const endpoint = `/api/host-action/${sessionId}`;
  const url = `${API_BASE_URL}${endpoint}`;
  const timeout = options.timeout || API_TIMEOUT;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    logger.gameState.actionTriggered(action.action, action.payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...options.headers,
      },
      body: JSON.stringify(action),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(
        `API request failed: ${response.statusText} - ${errorText}`,
        response.status,
        endpoint
      );
    }

    const data = (await response.json()) as HostActionResponse;

    if (!data.success) {
      throw new ApiError(data.message || 'Action failed', response.status, endpoint);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      logger.api.requestFailure(endpoint, error, {
        action: action.action,
        statusCode: error.statusCode,
      });
      throw error;
    }

    if ((error as Error).name === 'AbortError') {
      const timeoutError = new ApiError(`Request timeout after ${timeout}ms`, undefined, endpoint);
      logger.api.timeout(endpoint, timeout);
      throw timeoutError;
    }

    // Network or other errors
    const networkError = new ApiError(
      `Network error: ${(error as Error).message}`,
      undefined,
      endpoint
    );
    logger.api.requestFailure(endpoint, networkError, { action: action.action });
    throw networkError;
  }
}

/**
 * Retry a host action with exponential backoff
 */
export async function sendHostActionWithRetry(
  sessionId: string,
  action: HostActionRequest,
  idToken: string,
  maxRetries = 2
): Promise<HostActionResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sendHostAction(sessionId, action, idToken);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (
        error instanceof ApiError &&
        error.statusCode &&
        error.statusCode >= 400 &&
        error.statusCode < 500
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Validate session connectivity
 */
export async function validateSession(sessionId: string, idToken: string): Promise<boolean> {
  const endpoint = `/api/session/${sessionId}/validate`;
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
