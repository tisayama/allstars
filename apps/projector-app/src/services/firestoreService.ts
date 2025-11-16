/**
 * Firestore Service for projector-app
 * Feature: 001-projector-anonymous-auth
 *
 * Provides read-only access to Firestore collections:
 * - gameState/live (current game state)
 * - questions (game questions)
 * - guests (participant information)
 *
 * Security model:
 * - All operations are read-only (anonymous authentication)
 * - Write operations will fail with permission-denied error
 * - Firestore security rules enforce read-only access for anonymous users
 */

import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import type { GameState } from '@allstars/types';
import { getFirestoreInstance } from '@/lib/firebase';

/**
 * Get DocumentReference for the live game state document
 *
 * @returns DocumentReference to gameState/live
 */
export function getGameStateRef(): DocumentReference {
  const db = getFirestoreInstance();
  return doc(db, 'gameState', 'live');
}

/**
 * Read the current game state from Firestore
 *
 * This function fetches the live game state document from Firestore.
 * It does NOT use a real-time listener - for real-time updates, use
 * the Firestore snapshot listener in useDualChannelUpdates hook.
 *
 * @returns Promise<GameState> - Current game state
 * @throws Error if document doesn't exist or read fails
 */
export async function readGameState(): Promise<GameState> {
  try {
    const docRef = getGameStateRef();
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('gameState/live document does not exist');
    }

    const data = docSnap.data() as GameState;

    console.log('Firestore: Read gameState/live', {
      phase: data.currentPhase,
      question: data.currentQuestion?.questionId || null,
      participantCount: data.participantCount || 0,
    });

    return data;
  } catch (error) {
    const firestoreError = error as Error & { code?: string };

    console.error('Firestore: Failed to read gameState', {
      error: firestoreError.message,
      code: firestoreError.code,
    });

    // Re-throw with context
    throw firestoreError;
  }
}

/**
 * Check if Firestore connection is available
 *
 * Attempts to read gameState to verify Firestore connectivity
 *
 * @returns Promise<boolean> - true if connection successful, false otherwise
 */
export async function checkFirestoreConnection(): Promise<boolean> {
  try {
    await readGameState();
    return true;
  } catch (error) {
    console.warn('Firestore connection check failed:', error);
    return false;
  }
}
