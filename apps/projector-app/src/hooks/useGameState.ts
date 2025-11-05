import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestoreInstance } from '@/lib/firebase';
import type { GameState, ConnectionStatus } from '@/types';

interface UseGameStateResult {
  gameState: GameState | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

/**
 * Hook to listen to gameState/live Firestore document
 * Returns current game state, connection status, and error state
 */
export function useGameState(): UseGameStateResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    firestore: false,
    websocket: false, // WebSocket managed separately
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const firestore = getFirestoreInstance();
      const gameStateRef = doc(firestore, 'gameState', 'live');

      console.log('Setting up Firestore listener on gameState/live');

      unsubscribe = onSnapshot(
        gameStateRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GameState;
            setGameState(data);
            setConnectionStatus((prev) => ({ ...prev, firestore: true }));
            setError(null);
            console.log('GameState updated:', data.currentPhase);
          } else {
            setError('GameState document does not exist');
            setConnectionStatus((prev) => ({ ...prev, firestore: false }));
            console.error('GameState document does not exist');
          }
        },
        (err) => {
          setError(err.message);
          setConnectionStatus((prev) => ({ ...prev, firestore: false }));
          console.error('Firestore listener error:', err);
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setConnectionStatus((prev) => ({ ...prev, firestore: false }));
      console.error('Failed to set up Firestore listener:', err);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('Firestore listener cleaned up');
      }
    };
  }, []);

  return { gameState, connectionStatus, error };
}
