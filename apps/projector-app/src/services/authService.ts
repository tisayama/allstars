/**
 * Authentication Service
 * Feature: 001-projector-auth [US1]
 *
 * Fetches custom Firebase tokens from API server for projector authentication
 */

import type { ProjectorAuthToken } from '@allstars/types';

/**
 * Fetches a custom Firebase token from the API server
 *
 * @returns Promise resolving to ProjectorAuthToken with token, expiresAt, uid
 * @throws Error if environment variables are missing or API call fails
 */
export async function fetchCustomToken(): Promise<ProjectorAuthToken> {
  // Validate environment variables
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_PROJECTOR_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_PROJECTOR_API_KEY is not configured');
  }

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  // Construct endpoint URL
  const url = `${apiBaseUrl}/projector/auth-token`;

  // Make API request
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch custom token: ${response.status}`);
    }

    const data: ProjectorAuthToken = await response.json();
    return data;
  } catch (error) {
    // Re-throw with original error message for network failures
    if (error instanceof Error && error.message.startsWith('Failed to fetch custom token')) {
      throw error;
    }
    throw error;
  }
}
