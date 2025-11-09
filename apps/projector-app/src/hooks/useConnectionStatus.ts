import { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

const INDICATOR_DELAY_MS = 2000; // 2 seconds

interface ConnectionStatusResult {
  isConnected: boolean;
  showIndicator: boolean;
}

/**
 * Custom hook to monitor socket connection status
 *
 * Shows a connection indicator after 2 seconds of disconnection
 * Hides the indicator immediately upon reconnection
 *
 * @param socket - Socket.io client instance
 * @returns {ConnectionStatusResult} Connection state
 */
export function useConnectionStatus(socket: Socket | null | undefined): ConnectionStatusResult {
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);
  const [showIndicator, setShowIndicator] = useState(false);
  const indicatorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setShowIndicator(false);

      // Clear any pending indicator timer
      if (indicatorTimerRef.current) {
        clearTimeout(indicatorTimerRef.current);
        indicatorTimerRef.current = null;
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);

      // Start timer to show indicator after delay
      indicatorTimerRef.current = setTimeout(() => {
        setShowIndicator(true);
      }, INDICATOR_DELAY_MS);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      if (indicatorTimerRef.current) {
        clearTimeout(indicatorTimerRef.current);
      }
    };
  }, [socket]);

  return {
    isConnected,
    showIndicator,
  };
}
