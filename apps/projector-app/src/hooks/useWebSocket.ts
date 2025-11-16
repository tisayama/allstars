import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useProjectorAuth } from './useProjectorAuth';
import {
  createProjectorSocket,
  getSocketServerUrl,
  getProjectorNamespace,
} from '../services/socketService';
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
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Hook for managing WebSocket connection to /projector-socket namespace
 *
 * Feature: 001-projector-auth [US1]
 *
 * Handles:
 * - Automatic authentication with useProjectorAuth
 * - Connection to /projector-socket namespace
 * - Event listeners for game events
 * - Reconnection with Firebase ID token refresh
 *
 * @param options - Optional event handlers for game events
 * @returns Connection state and authentication status
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { onGongActivated, onStartQuestion, onGamePhaseChanged } = options;

  // Use projector auth hook for automatic authentication
  const {
    isAuthenticated: isFirebaseAuthenticated,
    firebaseToken,
    error: authError,
  } = useProjectorAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    // Wait for Firebase authentication to complete
    if (!isFirebaseAuthenticated || !firebaseToken) {
      if (authError) {
        setError(`Authentication failed: ${authError}`);
      }
      return;
    }

    const socketUrl = getSocketServerUrl();
    const namespace = getProjectorNamespace();

    // Create socket connection to /projector-socket namespace with Firebase token
    const socket = createProjectorSocket({
      url: socketUrl,
      namespace,
      firebaseToken,
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected to /projector-socket');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    // Projector-specific authentication events
    socket.on('AUTH_SUCCESS', (payload) => {
      console.log('Projector authenticated, userId:', payload.userId);
      setIsAuthenticated(true);
      setError(null);
    });

    socket.on('AUTH_FAILED', (payload) => {
      console.error('Projector authentication failed:', payload.reason);
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
      socket.off('AUTH_SUCCESS');
      socket.off('AUTH_FAILED');
      socket.off('GONG_ACTIVATED');
      socket.off('START_QUESTION');
      socket.off('GAME_PHASE_CHANGED');
      socket.disconnect();
    };
  }, [
    isFirebaseAuthenticated,
    firebaseToken,
    authError,
    onGongActivated,
    onStartQuestion,
    onGamePhaseChanged,
  ]);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    error,
  };
}
