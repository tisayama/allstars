/**
 * Socket Service
 * Feature: 001-projector-auth [US1, US3]
 *
 * Manages Socket.IO connection to /projector-socket namespace
 * US3: Exponential backoff for reliable reconnection (SC-002)
 */

import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types';

/**
 * Configuration for socket connection
 */
export interface SocketConfig {
  url: string;
  namespace: string;
  firebaseToken: string | null;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

/**
 * Creates and configures a Socket.IO client connected to /projector-socket namespace
 *
 * @param config - Socket configuration including URL and Firebase token
 * @returns Configured Socket.IO client instance
 */
export function createProjectorSocket(
  config: SocketConfig
): Socket<ServerToClientEvents, ClientToServerEvents> {
  const {
    url,
    namespace,
    firebaseToken,
    autoConnect = false,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
  } = config;

  // Construct full namespace URL
  const namespaceUrl = `${url}${namespace}`;

  // Create socket with authentication token in handshake
  // Exponential backoff configuration (US3, SC-002):
  // - 10 reconnection attempts
  // - Initial delay: 1s, max delay: 60s
  // - Randomization factor: ±50% jitter to prevent thundering herd
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(namespaceUrl, {
    autoConnect,
    reconnection: true,
    reconnectionAttempts, // 10 attempts (US3)
    reconnectionDelay, // 1s initial delay (US3)
    reconnectionDelayMax: 60000, // 60s max delay (US3)
    randomizationFactor: 0.5, // ±50% jitter (US3)
    auth: {
      firebaseToken, // Changed from 'token' to match middleware expectation
    },
  });

  return socket;
}

/**
 * Get socket server URL from environment variables
 *
 * @returns Socket server URL (defaults to localhost:3001)
 */
export function getSocketServerUrl(): string {
  return import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
}

/**
 * Get projector socket namespace path
 *
 * @returns Namespace path (defaults to /projector-socket)
 */
export function getProjectorNamespace(): string {
  return '/projector-socket';
}
