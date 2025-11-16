/**
 * Projector WebSocket Namespace
 * Feature: 001-projector-auth [US1, US2]
 *
 * Dedicated /projector-socket namespace for projector-app connections
 * US2: Read-only permissions - projectors cannot emit write/admin events
 * US2: Session tracking with audit logging
 */

import type { Server, Socket, Namespace } from 'socket.io';
import { createProjectorAuthMiddleware } from '../middleware/projectorAuthMiddleware';
import { SessionManager } from '../services/sessionManager';
import { auditLogger } from '../services/auditLogger';

/**
 * Whitelist of events projectors are allowed to emit
 * All other events will be rejected with PERMISSION_DENIED
 */
const ALLOWED_PROJECTOR_EVENTS = [
  'REQUEST_STATE_REFRESH', // Read-only state refresh request
  'disconnect',             // Standard socket.io event
];

/**
 * Singleton session manager for tracking projector connections
 */
const sessionManager = new SessionManager();

/**
 * Sets up the /projector-socket namespace with authentication middleware
 * and read-only permission enforcement
 *
 * @param io - Socket.IO server instance
 * @returns Configured projector namespace
 */
export function setupProjectorNamespace(io: Server): Namespace {
  // Create dedicated namespace for projector connections
  const projectorNs = io.of('/projector-socket');

  // Apply authentication middleware
  projectorNs.use(createProjectorAuthMiddleware());

  // Handle successful connections
  projectorNs.on('connection', (socket: Socket) => {
    const { uid, role } = socket.data;

    // Create session for this connection (US2)
    const session = sessionManager.createSession(socket.id, uid, role);

    console.log(`Projector connected: ${socket.id}, uid: ${uid}, role: ${role}, sessionId: ${session.sessionId}`);

    // Apply permission enforcement middleware (US2) per connection
    // Intercept ALL incoming events and check against whitelist
    socket.use((packet, next) => {
      const [event] = packet;

      // Allow whitelisted events
      if (ALLOWED_PROJECTOR_EVENTS.includes(event)) {
        return next();
      }

      // Deny all other events
      console.warn(`PERMISSION_DENIED: Projector ${socket.id} attempted to emit ${event}`);

      socket.emit('PERMISSION_DENIED', {
        event,
        reason: 'Projectors have read-only permissions and cannot emit write/admin events',
        code: 'WRITE_DENIED',
        timestamp: Date.now(),
      });

      // Block the event from being processed
      return next(new Error('Permission denied'));
    });

    // Send authenticated confirmation with real session ID (US2)
    socket.emit('authenticated', {
      sessionId: session.sessionId,
      uid: uid,
      message: 'Authentication successful',
    });

    // Handle disconnection (US2)
    socket.on('disconnect', (reason) => {
      // Terminate session and calculate duration
      const terminatedSession = sessionManager.terminateSession(socket.id, reason);

      if (terminatedSession) {
        // Audit log: Session disconnection
        auditLogger.logSocketDisconnected(
          socket.id,
          uid,
          reason,
          terminatedSession.duration
        );

        console.log(
          `Projector disconnected: ${socket.id}, reason: ${reason}, ` +
          `duration: ${terminatedSession.duration}ms, sessionId: ${terminatedSession.sessionId}`
        );
      }
    });

    // Handle manual state refresh request (FR-008, US2 allowed)
    socket.on('REQUEST_STATE_REFRESH', () => {
      console.log(`State refresh requested by projector: ${socket.id}`);
      // TODO: Implement state refresh logic in Phase 4
      // For now, just acknowledge the request
    });
  });

  return projectorNs;
}

/**
 * Exports session manager for monitoring and testing
 */
export function getSessionManager(): SessionManager {
  return sessionManager;
}
