/**
 * Firestore Listener - Watches gameState/live document and triggers broadcasts
 * FR-003: Listen to Firestore gameState/live document
 * FR-011: Handle listener disconnections gracefully
 * FR-011a: Reject new connections when listener is unhealthy
 * FR-011c: Validate documents before broadcasting
 */
import * as admin from 'firebase-admin';
import { validateGameState } from '../utils/validator';
import { mapToSocketEvent } from '../events/eventMapper';
import { broadcastEvent } from '../events/broadcaster';
import { logger } from '../utils/logger';
import { listenerStatusGauge } from '../monitoring/metrics';
import { setHealthy } from '../utils/healthState';

/**
 * Initialize Firestore listener for gameState/live document
 * @param callback - Callback function to invoke when snapshot is received
 * @returns Unsubscribe function
 */
export function initializeFirestoreListener(callback: (data: any) => void): () => void {
  const db = admin.firestore();
  const docRef = db.collection('gameState').doc('live');

  logger.info('Initializing Firestore listener on gameState/live');

  const unsubscribe = docRef.onSnapshot(
    (snapshot) => {
      // FR-011: Mark server as healthy on successful snapshot
      setHealthy(true);

      if (snapshot.exists) {
        const data = snapshot.data();
        callback(data);
      } else {
        // Document doesn't exist yet - this is expected during initial setup
        logger.debug('gameState/live document does not exist (waiting for game initialization)');
        callback(null);
      }
    },
    (error) => {
      // FR-011: Mark server as unhealthy on listener error
      logger.error('Firestore listener error', error);
      setHealthy(false);
      listenerStatusGauge.set(2); // Error state
    }
  );

  // Initial setup - mark as connected
  listenerStatusGauge.set(1);
  setHealthy(true);

  return unsubscribe;
}

/**
 * Set up Firestore listener with full broadcast pipeline
 * @param io - Socket.io server instance
 * @returns Unsubscribe function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupGameStateListener(io: any): () => void {
  logger.info('Setting up gameState listener with broadcast pipeline');

  return initializeFirestoreListener((data) => {
    if (!data) {
      // Document doesn't exist - send IDLE_STATE (handled in Phase 8)
      logger.debug('No active game state');
      return;
    }

    try {
      // FR-011c: Validate document structure
      const validatedState = validateGameState(data);

      // Map to Socket.io event
      const event = mapToSocketEvent(validatedState);

      // Broadcast to clients
      broadcastEvent(io, event);
    } catch (error) {
      // FR-011c: Log error but maintain connections (per clarification)
      logger.error('Failed to process GameState update', error as Error);
    }
  });
}
