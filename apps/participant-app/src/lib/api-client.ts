import { getAuthInstance } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Missing required environment variable: VITE_API_BASE_URL');
}

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
  const auth = getAuthInstance();
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  return await auth.currentUser.getIdToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Guest Profile returned from registration
 */
export interface GuestProfile {
  guestId: string;
  name: string;
  tableNumber: number;
  attributes?: string[];
}

/**
 * Register guest with QR code token
 *
 * @param token - Unique guest token extracted from QR code
 * @returns Guest profile information
 * @throws Error if token is invalid or already used
 */
export async function registerGuest(token: string): Promise<GuestProfile> {
  return await apiRequest<GuestProfile>('/participant/register', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/**
 * Server time response for clock synchronization
 */
export interface ServerTimeResponse {
  serverTime: number;
  clientSendTime: number;
}

/**
 * Get server time for clock synchronization
 *
 * @param clientSendTime - Client timestamp when request was sent (Unix ms)
 * @returns Server time and echoed client send time
 */
export async function getServerTime(clientSendTime: number): Promise<ServerTimeResponse> {
  return await apiRequest<ServerTimeResponse>('/participant/time', {
    method: 'POST',
    body: JSON.stringify({ clientSendTime }),
  });
}

/**
 * Answer submission data
 */
export interface AnswerSubmission {
  guestId: string;
  questionId: string;
  choiceIndex: number;
  responseTimeMs: number;
}

/**
 * Answer submission response
 */
export interface AnswerSubmissionResponse {
  success: boolean;
  answerId: string;
}

/**
 * Submit answer to question
 *
 * @param answerData - Answer submission with timing information
 * @returns Answer submission confirmation
 * @throws Error if answer is duplicate or guest is dropped out
 */
export async function submitAnswer(
  answerData: AnswerSubmission
): Promise<AnswerSubmissionResponse> {
  return await apiRequest<AnswerSubmissionResponse>('/participant/answer', {
    method: 'POST',
    body: JSON.stringify(answerData),
  });
}
