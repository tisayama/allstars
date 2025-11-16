/**
 * Unit tests for ProjectorSession management
 * Feature: 001-projector-auth [US2]
 *
 * Tests session tracking for projector connections with unique identifiers
 * Tracks connection duration, disconnection reasons, and session metadata
 */

import { SessionManager, ProjectorSession } from '../../src/services/sessionManager';

describe('SessionManager [US2]', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Session creation', () => {
    it('should create a new session with unique session ID', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc');

      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('socketId', 'socket-123');
      expect(session).toHaveProperty('uid', 'projector-abc');
      expect(session).toHaveProperty('connectedAt');
      expect(session.sessionId).toMatch(/^session-[a-f0-9-]+$/);
    });

    it('should generate unique session IDs for each connection', () => {
      const session1 = sessionManager.createSession('socket-1', 'projector-1');
      const session2 = sessionManager.createSession('socket-2', 'projector-2');

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should set connectedAt timestamp to current time', () => {
      const beforeTime = Date.now();
      const session = sessionManager.createSession('socket-123', 'projector-abc');
      const afterTime = Date.now();

      expect(session.connectedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(session.connectedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should initialize session with no disconnection info', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc');

      expect(session).not.toHaveProperty('disconnectedAt');
      expect(session).not.toHaveProperty('disconnectReason');
      expect(session).not.toHaveProperty('duration');
    });
  });

  describe('Session retrieval', () => {
    it('should retrieve session by socket ID', () => {
      const created = sessionManager.createSession('socket-123', 'projector-abc');
      const retrieved = sessionManager.getSessionBySocketId('socket-123');

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent socket ID', () => {
      const session = sessionManager.getSessionBySocketId('non-existent-socket');

      expect(session).toBeUndefined();
    });

    it('should retrieve session by session ID', () => {
      const created = sessionManager.createSession('socket-123', 'projector-abc');
      const retrieved = sessionManager.getSessionById(created.sessionId);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent session ID', () => {
      const session = sessionManager.getSessionById('session-non-existent');

      expect(session).toBeUndefined();
    });
  });

  describe('Session termination', () => {
    it('should mark session as disconnected with reason', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc');
      const beforeDisconnect = Date.now();

      const terminated = sessionManager.terminateSession('socket-123', 'client namespace disconnect');

      expect(terminated).toBeDefined();
      expect(terminated!.disconnectedAt).toBeGreaterThanOrEqual(beforeDisconnect);
      expect(terminated!.disconnectReason).toBe('client namespace disconnect');
    });

    it('should calculate session duration on termination', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc');

      // Simulate a short delay
      const startTime = session.connectedAt;

      const terminated = sessionManager.terminateSession('socket-123', 'normal disconnect');

      expect(terminated!.duration).toBeGreaterThanOrEqual(0);
      expect(terminated!.duration).toBe(terminated!.disconnectedAt! - startTime);
    });

    it('should return undefined when terminating non-existent session', () => {
      const result = sessionManager.terminateSession('non-existent-socket', 'test');

      expect(result).toBeUndefined();
    });

    it('should remove session from active sessions after termination', () => {
      sessionManager.createSession('socket-123', 'projector-abc');
      sessionManager.terminateSession('socket-123', 'disconnect');

      const retrieved = sessionManager.getSessionBySocketId('socket-123');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('Session listing', () => {
    it('should list all active sessions', () => {
      sessionManager.createSession('socket-1', 'projector-1');
      sessionManager.createSession('socket-2', 'projector-2');
      sessionManager.createSession('socket-3', 'projector-3');

      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toHaveLength(3);
    });

    it('should not include terminated sessions in active list', () => {
      sessionManager.createSession('socket-1', 'projector-1');
      sessionManager.createSession('socket-2', 'projector-2');
      sessionManager.terminateSession('socket-1', 'disconnect');

      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].socketId).toBe('socket-2');
    });

    it('should return empty array when no active sessions', () => {
      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toEqual([]);
    });
  });

  describe('Session count', () => {
    it('should return count of active sessions', () => {
      sessionManager.createSession('socket-1', 'projector-1');
      sessionManager.createSession('socket-2', 'projector-2');

      const count = sessionManager.getActiveSessionCount();

      expect(count).toBe(2);
    });

    it('should return 0 when no active sessions', () => {
      const count = sessionManager.getActiveSessionCount();

      expect(count).toBe(0);
    });

    it('should decrement count after session termination', () => {
      sessionManager.createSession('socket-1', 'projector-1');
      sessionManager.createSession('socket-2', 'projector-2');
      sessionManager.terminateSession('socket-1', 'disconnect');

      const count = sessionManager.getActiveSessionCount();

      expect(count).toBe(1);
    });
  });

  describe('Session metadata', () => {
    it('should include role information in session', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc', 'projector');

      expect(session).toHaveProperty('role', 'projector');
    });

    it('should default to undefined role if not provided', () => {
      const session = sessionManager.createSession('socket-123', 'projector-abc');

      expect(session.role).toBeUndefined();
    });
  });

  describe('Concurrent sessions', () => {
    it('should support multiple simultaneous projector sessions', () => {
      const session1 = sessionManager.createSession('socket-1', 'projector-1');
      const session2 = sessionManager.createSession('socket-2', 'projector-2');
      const session3 = sessionManager.createSession('socket-3', 'projector-3');

      expect(sessionManager.getActiveSessionCount()).toBe(3);

      const retrieved1 = sessionManager.getSessionBySocketId('socket-1');
      const retrieved2 = sessionManager.getSessionBySocketId('socket-2');
      const retrieved3 = sessionManager.getSessionBySocketId('socket-3');

      expect(retrieved1).toEqual(session1);
      expect(retrieved2).toEqual(session2);
      expect(retrieved3).toEqual(session3);
    });
  });
});
