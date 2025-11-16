/**
 * Unit tests for projector permissions enforcement
 * Feature: 001-projector-auth [US2]
 *
 * Validates that projector connections have read-only permissions
 * and cannot emit write/admin events
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import type { AddressInfo } from 'net';

describe('Projector Permissions - Read-only Enforcement [US2]', () => {
  let io: Server;
  let clientSocket: ClientSocket;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;
  let rejectedEvents: Array<{ event: string; reason: string }>;

  beforeEach((done) => {
    rejectedEvents = [];
    httpServer = createServer();
    io = new Server(httpServer);

    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;

      // Import and setup namespace (will be implemented in T036)
      import('../../src/namespaces/projectorNamespace').then(({ setupProjectorNamespace }) => {
        setupProjectorNamespace(io);
        done();
      });
    });
  });

  afterEach(() => {
    if (clientSocket) clientSocket.close();
    io.close();
    httpServer.close();
  });

  describe('Write event rejection', () => {
    it('should reject START_GAME event from projector', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('START_GAME');
        expect(payload.reason).toContain('read-only');
        expect(payload.code).toBe('WRITE_DENIED');
        done();
      });

      // Attempt to emit write event
      clientSocket.emit('START_GAME', { gameId: 'test-game' });
    });

    it('should reject ADVANCE_PHASE event from projector', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('ADVANCE_PHASE');
        expect(payload.reason).toContain('read-only');
        done();
      });

      clientSocket.emit('ADVANCE_PHASE', { newPhase: 'showing_results' });
    });

    it('should reject SUBMIT_ANSWER event from projector', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('SUBMIT_ANSWER');
        expect(payload.code).toBe('WRITE_DENIED');
        done();
      });

      clientSocket.emit('SUBMIT_ANSWER', { answer: 'A' });
    });

    it('should reject UPDATE_GAME_STATE event from projector', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('UPDATE_GAME_STATE');
        done();
      });

      clientSocket.emit('UPDATE_GAME_STATE', { state: {} });
    });
  });

  describe('Admin event rejection', () => {
    it('should reject RESET_GAME admin event', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('RESET_GAME');
        expect(payload.reason).toContain('read-only');
        done();
      });

      clientSocket.emit('RESET_GAME', {});
    });

    it('should reject KICK_PARTICIPANT admin event', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.event).toBe('KICK_PARTICIPANT');
        done();
      });

      clientSocket.emit('KICK_PARTICIPANT', { userId: 'user-123' });
    });
  });

  describe('Allowed events', () => {
    it('should allow REQUEST_STATE_REFRESH event', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      // Should not receive PERMISSION_DENIED
      const deniedSpy = jest.fn();
      clientSocket.on('PERMISSION_DENIED', deniedSpy);

      clientSocket.emit('REQUEST_STATE_REFRESH');

      setTimeout(() => {
        expect(deniedSpy).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should allow disconnect event', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      const deniedSpy = jest.fn();
      clientSocket.on('PERMISSION_DENIED', deniedSpy);

      clientSocket.disconnect();

      setTimeout(() => {
        expect(deniedSpy).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Permission whitelist', () => {
    it('should have explicit whitelist of allowed events', (done) => {
      // This test validates that the permission system uses a whitelist approach
      // Only explicitly allowed events should pass through
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      const allowedEvents = ['REQUEST_STATE_REFRESH', 'disconnect'];
      const deniedCount = { count: 0 };

      clientSocket.on('PERMISSION_DENIED', () => {
        deniedCount.count++;
      });

      // Try various events - most should be denied
      const testEvents = [
        'START_GAME',
        'ADVANCE_PHASE',
        'CUSTOM_EVENT',
        'WRITE_DATA',
        'DELETE_DATA',
      ];

      testEvents.forEach(event => {
        clientSocket.emit(event, {});
      });

      setTimeout(() => {
        // Should have denied all non-whitelisted events
        expect(deniedCount.count).toBe(testEvents.length);
        done();
      }, 200);
    });
  });

  describe('Error payload structure', () => {
    it('should return structured PERMISSION_DENIED payload', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        // Validate payload structure
        expect(payload).toHaveProperty('event');
        expect(payload).toHaveProperty('reason');
        expect(payload).toHaveProperty('code');
        expect(payload).toHaveProperty('timestamp');

        expect(payload.code).toBe('WRITE_DENIED');
        expect(typeof payload.event).toBe('string');
        expect(typeof payload.reason).toBe('string');
        expect(typeof payload.timestamp).toBe('number');

        done();
      });

      clientSocket.emit('START_GAME', {});
    });

    it('should include helpful error messages', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('PERMISSION_DENIED', (payload) => {
        expect(payload.reason).toMatch(/read-only/i);
        expect(payload.reason).toMatch(/permission/i);
        done();
      });

      clientSocket.emit('UPDATE_GAME_STATE', {});
    });
  });

  describe('Logging', () => {
    it('should log permission denied attempts', (done) => {
      const consoleSpy = jest.spyOn(console, 'warn');

      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.emit('START_GAME', {});

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('PERMISSION_DENIED'),
          expect.anything()
        );
        consoleSpy.mockRestore();
        done();
      }, 100);
    });
  });
});
