/**
 * Host Control API types
 * Request and response types for POST /host/game/advance endpoint
 */

export type HostAction =
  | 'START_QUESTION'          // Begin new question (requires payload.questionId)
  | 'SHOW_DISTRIBUTION'       // Show answer distribution
  | 'SHOW_CORRECT_ANSWER'     // Reveal correct answer
  | 'SHOW_RESULTS'            // Display rankings and eliminations
  | 'TRIGGER_GONG'            // Activate final question gong
  | 'REVIVE_ALL'              // Restore all eliminated participants
  | 'ready_for_next';         // Return to ready state

export interface HostActionRequest {
  /** The game action to execute */
  action: HostAction;
  /** Action-specific data (required for START_QUESTION) */
  payload?: {
    questionId?: string;
    [key: string]: unknown;  // Future extensibility
  };
}

export interface HostActionResponse {
  /** True if action processed successfully, false if error */
  success: boolean;
  /** Error message when success=false (omitted when success=true) */
  message?: string;
}

export interface HostUser {
  /** Firebase user ID */
  uid: string;
  /** Google account email */
  email: string;
  /** User's display name from Google profile */
  displayName: string | null;
  /** Firebase ID token for API Authorization header */
  idToken: string;
  /** Unix timestamp when idToken expires (for refresh logic) */
  tokenExpiresAt: number;
}
