/**
 * QR code generator utility (T083)
 * Generates participant app URLs for QR codes
 */

import { participantAppUrl } from '@/lib/firebase';

/**
 * Generate participant app URL for QR code
 * Format: {VITE_PARTICIPANT_APP_URL}/join?token={authToken}
 */
export function generateGuestQRCodeUrl(authToken: string): string {
  if (!authToken) {
    throw new Error('Auth token is required for QR code generation');
  }

  // Encode token to handle special characters
  const encodedToken = encodeURIComponent(authToken);

  return `${participantAppUrl}/join?token=${encodedToken}`;
}

/**
 * Validate that the participant app URL is configured
 */
export function validateParticipantAppUrl(): void {
  if (!participantAppUrl) {
    throw new Error(
      'VITE_PARTICIPANT_APP_URL is not configured. Please set this environment variable.'
    );
  }
}
