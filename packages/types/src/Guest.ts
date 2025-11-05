/**
 * Guest (participant) entity
 * Represents a wedding guest who can participate in the quiz
 */

export type GuestStatus = 'active' | 'dropped';

export type AuthMethod = 'google' | 'anonymous';

export interface Guest {
  /** Firestore document ID (matches Firebase Auth UID) */
  id: string;

  /** Guest display name */
  name: string;

  /** Current status in the game (active can answer, dropped cannot) */
  status: GuestStatus;

  /** Guest attributes for question filtering (e.g., ['age-under-20', 'gender-male']) */
  attributes: string[];

  /** Authentication method used (google for admin/host, anonymous for participants) */
  authMethod: AuthMethod;

  /** Optional table number for seating arrangement */
  tableNumber?: number;
}
