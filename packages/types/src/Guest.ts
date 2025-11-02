/**
 * Guest (participant) entity
 * Represents a wedding guest who can participate in the quiz
 */

export type GuestStatus = 'alive' | 'eliminated';

export type AuthMethod = 'google' | 'anonymous';

export interface Guest {
  /** Firestore document ID (matches Firebase Auth UID) */
  id: string;

  /** Guest display name */
  name: string;

  /** Current status in the game (alive can answer, eliminated cannot) */
  status: GuestStatus;

  /** Guest attributes for question filtering (e.g., ['age-under-20', 'gender-male']) */
  attributes: string[];

  /** Authentication method used (google for admin/host, anonymous for participants) */
  authMethod: AuthMethod;
}
