import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_SERVER_URL;

if (!SOCKET_URL) {
  throw new Error('Missing required environment variable: VITE_SOCKET_SERVER_URL');
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * WebSocket connection hook using Socket.io
 *
 * Manages connection lifecycle, event listeners, and reconnection logic.
 */
export function useWebSocket(guestId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect to WebSocket server
   */
  useEffect(() => {
    // Don't connect if no guestId
    if (!guestId) {
      return;
    }

    setStatus('connecting');
    setError(null);

    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      query: { guestId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    // Connection established
    socketInstance.on('connect', () => {
      console.warn('WebSocket connected:', socketInstance.id);
      setStatus('connected');
      setError(null);
    });

    // Connection error
    socketInstance.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setStatus('error');
      setError(err.message);
    });

    // Disconnected
    socketInstance.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
      setStatus('disconnected');

      // If disconnected by server, try to reconnect
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    // Reconnection attempt
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.warn(`WebSocket reconnection attempt ${attemptNumber}`);
      setStatus('connecting');
    });

    // Reconnected
    socketInstance.on('reconnect', (attemptNumber) => {
      console.warn(`WebSocket reconnected after ${attemptNumber} attempts`);
      setStatus('connected');
      setError(null);
    });

    // Reconnection failed
    socketInstance.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setStatus('error');
      setError('Failed to reconnect to server');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setStatus('disconnected');
    };
  }, [guestId]);

  /**
   * Subscribe to event
   */
  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      if (!socket) {
        console.warn(`Cannot subscribe to ${event}: socket not connected`);
        return;
      }

      socket.on(event, handler);

      // Return cleanup function
      return () => {
        socket.off(event, handler);
      };
    },
    [socket]
  );

  /**
   * Emit event
   */
  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      if (!socket) {
        console.warn(`Cannot emit ${event}: socket not connected`);
        return;
      }

      socket.emit(event, ...args);
    },
    [socket]
  );

  return {
    socket,
    status,
    error,
    isConnected: status === 'connected',
    on,
    emit,
  };
}
