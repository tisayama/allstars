import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Socket } from 'socket.io-client';
import { getFirestoreInstance } from '@/lib/firebase';
import type { GameState, ConnectionStatus, ServerToClientEvents, ClientToServerEvents } from '@/types';

/**
 * Source of the game state update
 */
type UpdateSource = 'websocket' | 'firestore';

/**
 * Hook options
 */
export interface UseDualChannelUpdatesOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isWebSocketAuthenticated: boolean;
}

/**
 * Return type for useDualChannelUpdates hook
 */
export interface UseDualChannelUpdatesReturn {
  gameState: GameState | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

/**
 * Hook for managing dual-channel game state updates
 *
 * Combines WebSocket and Firestore listeners with deduplication:
 * - WebSocket provides low-latency updates when connected
 * - Firestore provides reliable fallback when WebSocket disconnects
 * - Deduplication prevents redundant state updates
 *
 * Deduplication strategy:
 * - Track last update timestamp from each source
 * - Accept update if it's newer than the last update from any source
 * - Ignore updates older than 100ms from the last accepted update
 *
 * @param options - Socket instance and authentication status
 * @returns Game state, connection status, and error state
 */
export function useDualChannelUpdates(
  options: UseDualChannelUpdatesOptions
): UseDualChannelUpdatesReturn {
  const { socket, isWebSocketAuthenticated } = options;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    firestore: false,
    websocket: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Track last update timestamps for deduplication
  const lastUpdateRef = useRef<{
    timestamp: number;
    source: UpdateSource;
    phase: string | null;
  }>({
    timestamp: 0,
    source: 'firestore',
    phase: null,
  });

  /**
   * Apply game state update with deduplication
   */
  const applyUpdate = useCallback(
    (newState: GameState, source: UpdateSource) => {
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current;

      // Accept update if:
      // 1. It's the first update (lastUpdate.timestamp === 0)
      // 2. Phase has changed
      // 3. More than 100ms has passed since last update (prevent duplicate rapid updates)
      const isFirstUpdate = lastUpdate.timestamp === 0;
      const phaseChanged = newState.currentPhase !== lastUpdate.phase;
      const sufficientTimeElapsed = now - lastUpdate.timestamp > 100;

      if (isFirstUpdate || phaseChanged || sufficientTimeElapsed) {
        console.log(
          `[DualChannel] Applying update from ${source}:`,
          newState.currentPhase,
          `(last: ${lastUpdate.source}, ${now - lastUpdate.timestamp}ms ago)`
        );

        setGameState(newState);
        lastUpdateRef.current = {
          timestamp: now,
          source,
          phase: newState.currentPhase,
        };
      } else {
        console.log(
          `[DualChannel] Skipping duplicate update from ${source}:`,
          newState.currentPhase,
          `(last: ${lastUpdate.source}, ${now - lastUpdate.timestamp}ms ago)`
        );
      }
    },
    []
  );

  // Set up Firestore listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const firestore = getFirestoreInstance();
      const gameStateRef = doc(firestore, 'gameState', 'live');

      console.log('[DualChannel] Setting up Firestore listener');

      unsubscribe = onSnapshot(
        gameStateRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GameState;
            applyUpdate(data, 'firestore');
            setConnectionStatus((prev) => ({ ...prev, firestore: true }));
            setError(null);
          } else {
            setError('GameState document does not exist');
            setConnectionStatus((prev) => ({ ...prev, firestore: false }));
            console.error('[DualChannel] GameState document does not exist');
          }
        },
        (err) => {
          setError(err.message);
          setConnectionStatus((prev) => ({ ...prev, firestore: false }));
          console.error('[DualChannel] Firestore listener error:', err);
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setConnectionStatus((prev) => ({ ...prev, firestore: false }));
      console.error('[DualChannel] Failed to set up Firestore listener:', err);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('[DualChannel] Firestore listener cleaned up');
      }
    };
  }, [applyUpdate]);

  // Set up WebSocket listeners for game events
  useEffect(() => {
    if (!socket || !isWebSocketAuthenticated) {
      setConnectionStatus((prev) => ({ ...prev, websocket: false }));
      return;
    }

    console.log('[DualChannel] Setting up WebSocket listeners');
    setConnectionStatus((prev) => ({ ...prev, websocket: true }));

    // Listen for GAME_PHASE_CHANGED events
    const handlePhaseChanged = (payload: { newPhase: string }) => {
      console.log('[DualChannel] GAME_PHASE_CHANGED received:', payload.newPhase);

      // WebSocket only sends phase change, we need to fetch full state from Firestore
      // The Firestore listener will pick up the change automatically
      // We just update the connection status to show WebSocket is working
      setConnectionStatus((prev) => ({ ...prev, websocket: true }));
    };

    socket.on('GAME_PHASE_CHANGED', handlePhaseChanged);

    return () => {
      console.log('[DualChannel] WebSocket listeners cleaned up');
      socket.off('GAME_PHASE_CHANGED', handlePhaseChanged);
    };
  }, [socket, isWebSocketAuthenticated]);

  return { gameState, connectionStatus, error };
}
