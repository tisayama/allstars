/**
 * Projector Authentication Middleware
 * Feature: 001-projector-auth [US2]
 *
 * Validates Firebase ID tokens for projector WebSocket connections
 * Includes audit logging for all authentication events (SC-003)
 */

import * as admin from 'firebase-admin';
import type { Socket } from 'socket.io';
import { auditLogger } from '../services/auditLogger';

/**
 * Creates middleware for projector WebSocket authentication
 *
 * Verifies Firebase ID token from socket handshake auth and checks for projector role claim.
 * Stores UID and role in socket.data for use in connection handlers.
 *
 * @returns Socket.IO middleware function
 */
export function createProjectorAuthMiddleware() {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    try {
      // Get Firebase token from handshake auth
      const firebaseToken = socket.handshake.auth?.firebaseToken;

      if (!firebaseToken) {
        // Audit log: Missing token
        auditLogger.logSocketAuthFailed(
          socket.id,
          'Missing Firebase authentication token',
          {}
        );

        socket.emit('AUTH_FAILED', {
          reason: 'Missing Firebase authentication token',
          code: 'INVALID_TOKEN',
        });
        socket.disconnect();
        return next(new Error('Missing Firebase authentication token'));
      }

      // Verify Firebase ID token
      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      } catch (error: any) {
        // Audit log: Token verification failed
        auditLogger.logSocketAuthFailed(
          socket.id,
          `Token verification failed: ${error.message}`,
          { error: error.message }
        );

        // Check for specific error codes
        if (error.code === 'auth/id-token-expired') {
          socket.emit('AUTH_FAILED', {
            reason: 'Firebase ID token has expired',
            code: 'EXPIRED_TOKEN',
          });
        } else {
          socket.emit('AUTH_FAILED', {
            reason: `Token verification failed: ${error.message}`,
            code: 'INVALID_TOKEN',
          });
        }
        socket.disconnect();
        return next(new Error(`Token verification failed: ${error.message}`));
      }

      // Check for role claim
      const role = (decodedToken as any).role;
      if (!role) {
        // Audit log: Missing role claim
        auditLogger.logSocketAuthFailed(
          socket.id,
          'Invalid role: role claim is missing',
          { providedRole: undefined }
        );

        socket.emit('AUTH_FAILED', {
          reason: 'Role claim is missing',
          code: 'INVALID_ROLE',
        });
        socket.disconnect();
        return next(new Error('Role claim is missing'));
      }

      // Verify role is 'projector'
      if (role !== 'projector') {
        // Audit log: Invalid role
        auditLogger.logSocketAuthFailed(
          socket.id,
          `Invalid role: expected projector, got ${role}`,
          { providedRole: role }
        );

        socket.emit('AUTH_FAILED', {
          reason: `Invalid role: expected projector`,
          code: 'INVALID_ROLE',
        });
        socket.disconnect();
        return next(new Error(`Invalid role: ${role}`));
      }

      // Store user info in socket data for use in connection handlers
      socket.data.uid = decodedToken.uid;
      socket.data.role = role;

      // Audit log: Authentication successful (SC-003)
      auditLogger.logSocketAuthSuccess(socket.id, decodedToken.uid, role);

      // Authentication successful
      next();
    } catch (error: any) {
      // Audit log: Unexpected error
      auditLogger.logSocketAuthFailed(
        socket.id,
        `Unexpected authentication error: ${error.message}`,
        { error: error.message }
      );

      socket.emit('AUTH_FAILED', {
        reason: `Unexpected authentication error: ${error.message}`,
        code: 'INVALID_TOKEN',
      });
      socket.disconnect();
      next(new Error(`Authentication error: ${error.message}`));
    }
  };
}
