import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getFirebaseAuth } from '@/lib/firebase';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GongActivatedPayload,
  StartQuestionPayload,
  GamePhaseChangedPayload,
} from '@/types';

/**
 * Options for useWebSocket hook
 */
export interface UseWebSocketOptions {
  onGongActivated?: (payload: GongActivatedPayload) => void;
  onStartQuestion?: (payload: StartQuestionPayload) => void;
  onGamePhaseChanged?: (payload: GamePhaseChangedPayload) => void;
}

/**
 * Return type for useWebSocket hook
 */
export interface UseWebSocketReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Get socket server URL from environment variables
 */
function getSocketServerUrl(): string {
  return import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
}

/**
 * Hook for managing WebSocket connection to socket-server
 *
 * Handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Firebase authentication flow
 * - Event listeners for game events
 *
 * @param options - Optional event handlers for game events
 * @returns Connection state and authentication status
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { onGongActivated, onStartQuestion, onGamePhaseChanged } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  /**
   * Authenticate with the socket server using Firebase ID token
   */
  const authenticate = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;

      if (!user) {
        setError('No Firebase user available for authentication');
        return;
      }

      const token = await user.getIdToken();

      if (!token) {
        setError('Failed to get Firebase ID token');
        return;
      }

      socketRef.current?.emit('authenticate', { token });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Authentication error: ${message}`);
    }
  }, []);

  useEffect(() => {
    const socketUrl = getSocketServerUrl();

    // Create socket connection
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    // Authentication event handlers
    socket.on('AUTH_REQUIRED', (payload) => {
      console.log('Authentication required, timeout:', payload.timeout);
      authenticate();
    });

    socket.on('AUTH_SUCCESS', (payload) => {
      console.log('Authentication successful, userId:', payload.userId);
      setIsAuthenticated(true);
      setError(null);
    });

    socket.on('AUTH_FAILED', (payload) => {
      console.error('Authentication failed:', payload.reason);
      setIsAuthenticated(false);
      setError(`Authentication failed: ${payload.reason}`);
    });

    // Game event handlers
    socket.on('GONG_ACTIVATED', (payload) => {
      console.log('GONG activated');
      onGongActivated?.(payload);
    });

    socket.on('START_QUESTION', (payload) => {
      console.log('Question started:', payload.questionId);
      onStartQuestion?.(payload);
    });

    socket.on('GAME_PHASE_CHANGED', (payload) => {
      console.log('Game phase changed:', payload.newPhase);
      onGamePhaseChanged?.(payload);
    });

    // Connect to server
    socket.connect();

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('AUTH_REQUIRED');
      socket.off('AUTH_SUCCESS');
      socket.off('AUTH_FAILED');
      socket.off('GONG_ACTIVATED');
      socket.off('START_QUESTION');
      socket.off('GAME_PHASE_CHANGED');
      socket.disconnect();
    };
  }, [authenticate, onGongActivated, onStartQuestion, onGamePhaseChanged]);

  return {
    isConnected,
    isAuthenticated,
    error,
  };
}
