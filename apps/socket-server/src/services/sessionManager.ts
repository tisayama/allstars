/**
 * Session Manager for Projector Connections
 * Feature: 001-projector-auth [US2]
 *
 * Tracks projector WebSocket sessions with unique identifiers
 * Monitors connection duration, disconnection reasons, and session metadata
 */

import { randomUUID } from 'crypto';

/**
 * Represents a projector WebSocket session
 */
export interface ProjectorSession {
  sessionId: string;
  socketId: string;
  uid: string;
  role?: string;
  connectedAt: number;
  disconnectedAt?: number;
  disconnectReason?: string;
  duration?: number;
}

/**
 * SessionManager class for tracking projector WebSocket sessions
 */
export class SessionManager {
  private sessions: Map<string, ProjectorSession>;
  private sessionIdToSocketId: Map<string, string>;

  constructor() {
    this.sessions = new Map();
    this.sessionIdToSocketId = new Map();
  }

  /**
   * Creates a new projector session
   *
   * @param socketId - Socket.IO socket ID
   * @param uid - Firebase UID from authentication
   * @param role - User role (default: undefined)
   * @returns Created session object
   */
  public createSession(socketId: string, uid: string, role?: string): ProjectorSession {
    const sessionId = `session-${randomUUID()}`;

    const session: ProjectorSession = {
      sessionId,
      socketId,
      uid,
      role,
      connectedAt: Date.now(),
    };

    // Store session by both socket ID and session ID for efficient lookup
    this.sessions.set(socketId, session);
    this.sessionIdToSocketId.set(sessionId, socketId);

    return session;
  }

  /**
   * Retrieves an active session by socket ID
   *
   * @param socketId - Socket.IO socket ID
   * @returns Session object or undefined if not found
   */
  public getSessionBySocketId(socketId: string): ProjectorSession | undefined {
    return this.sessions.get(socketId);
  }

  /**
   * Retrieves an active session by session ID
   *
   * @param sessionId - Unique session identifier
   * @returns Session object or undefined if not found
   */
  public getSessionById(sessionId: string): ProjectorSession | undefined {
    const socketId = this.sessionIdToSocketId.get(sessionId);
    if (!socketId) {
      return undefined;
    }
    return this.sessions.get(socketId);
  }

  /**
   * Terminates a session and calculates duration
   *
   * @param socketId - Socket.IO socket ID
   * @param reason - Reason for disconnection
   * @returns Terminated session object or undefined if session not found
   */
  public terminateSession(socketId: string, reason: string): ProjectorSession | undefined {
    const session = this.sessions.get(socketId);
    if (!session) {
      return undefined;
    }

    // Mark session as disconnected
    const disconnectedAt = Date.now();
    session.disconnectedAt = disconnectedAt;
    session.disconnectReason = reason;
    session.duration = disconnectedAt - session.connectedAt;

    // Remove from active sessions
    this.sessions.delete(socketId);
    this.sessionIdToSocketId.delete(session.sessionId);

    return session;
  }

  /**
   * Gets list of all active sessions
   *
   * @returns Array of active session objects
   */
  public getActiveSessions(): ProjectorSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets count of active sessions
   *
   * @returns Number of active sessions
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
