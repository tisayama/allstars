/**
 * Socket.io Authentication Middleware
 * FR-002: Clients MUST authenticate within 10 seconds
 * FR-008: Invalid/expired tokens MUST be rejected
 * FR-011a: Reject new connections when Firestore listener is unhealthy
 * OR-001: Track connection count
 * OR-002: Track auth failures
 */
import type { Socket } from 'socket.io';
import type { SocketData } from '@allstars/types';
import { verifyAuthToken } from '../auth/tokenVerifier';
import { logger } from '../utils/logger';
import { connectionCountGauge, authFailureCounter } from '../monitoring/metrics';
import { isHealthy } from '../utils/healthState';

const AUTH_TIMEOUT_MS = 10000; // 10 seconds per FR-002

/**
 * Set up authentication flow for a Socket.io connection
 * @param socket - Socket.io socket instance
 */
export function setupAuthenticationFlow(socket: Socket<any, any, any, SocketData>): void {
  // FR-011a: Check if server is healthy before allowing new connections
  if (!isHealthy()) {
    logger.warn(`Rejecting new connection ${socket.id}: server is in degraded state`);
    authFailureCounter.inc({ reason: 'degraded_state' });
    socket.emit('AUTH_FAILED', { reason: 'Server is in degraded state' });
    socket.disconnect();
    return;
  }

  // Development mode: Skip authentication if DISABLE_AUTH is set
  if (process.env.DISABLE_AUTH === 'true') {
    logger.warn(`[DEV MODE] Bypassing authentication for ${socket.id}`);
    socket.data.userId = 'dev-user';
    socket.data.isAuthenticated = true;
    socket.join('gameRoom');
    connectionCountGauge.inc();
    socket.emit('AUTH_SUCCESS', { userId: 'dev-user' });
    socket.on('disconnect', () => {
      connectionCountGauge.dec();
      logger.info(`Dev user disconnected (socket ${socket.id})`);
    });
    return;
  }

  logger.info(`New connection from ${socket.id}, requesting authentication`);

  // Send AUTH_REQUIRED event immediately on connection
  socket.emit('AUTH_REQUIRED', { timeout: AUTH_TIMEOUT_MS });

  // Set up authentication timeout
  const authTimeoutId = setTimeout(() => {
    if (!socket.data.isAuthenticated) {
      logger.warn(`Authentication timeout for socket ${socket.id}, disconnecting`);
      authFailureCounter.inc({ reason: 'timeout' });
      socket.disconnect();
    }
  }, AUTH_TIMEOUT_MS);

  // Handle authenticate event from client
  socket.on('authenticate', async (payload: any) => {
    clearTimeout(authTimeoutId);

    // Validate payload structure
    if (!payload || typeof payload.token !== 'string') {
      logger.warn(`Invalid authenticate payload from ${socket.id}`);
      authFailureCounter.inc({ reason: 'invalid_payload' });
      socket.emit('AUTH_FAILED', { reason: 'Invalid authentication payload' });
      socket.disconnect();
      return;
    }

    try {
      // Verify token with Firebase Admin
      const result = await verifyAuthToken(payload.token);

      if (result.isValid && result.userId) {
        // Authentication successful
        socket.data.userId = result.userId;
        socket.data.isAuthenticated = true;

        // Join the game room for broadcasts
        socket.join('gameRoom');

        // Increment connection count metric (OR-001)
        connectionCountGauge.inc();

        logger.info(`User ${result.userId} authenticated successfully (socket ${socket.id})`);

        // Send success event
        socket.emit('AUTH_SUCCESS', { userId: result.userId });

        // Set up disconnect handler to decrement connection count
        socket.on('disconnect', () => {
          connectionCountGauge.dec();
          logger.info(`User ${socket.data.userId} disconnected (socket ${socket.id})`);
        });
      } else {
        // Authentication failed
        const reason = result.error || 'Authentication failed';

        logger.warn(
          `Authentication failed for ${socket.id}: ${reason} (token: ${payload.token.substring(0, 20)}...)`
        );

        // Increment auth failure counter (OR-002)
        authFailureCounter.inc({ reason: sanitizeFailureReason(reason) });

        socket.emit('AUTH_FAILED', { reason });
        socket.disconnect();
      }
    } catch (error) {
      logger.error(`Authentication error for ${socket.id}`, error as Error);
      authFailureCounter.inc({ reason: 'server_error' });
      socket.emit('AUTH_FAILED', { reason: 'Authentication server error' });
      socket.disconnect();
    }
  });
}

/**
 * Sanitize failure reason for metric labels (remove spaces, special chars)
 */
function sanitizeFailureReason(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .substring(0, 50); // Limit length for Prometheus labels
}
