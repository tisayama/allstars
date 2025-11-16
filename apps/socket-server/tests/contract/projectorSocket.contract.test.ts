/**
 * Contract tests for /projector-socket namespace
 * Feature: 001-projector-auth [US1]
 *
 * Validates WebSocket events against contract specification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'socket.io';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
vi.mock('firebase-admin');

describe('/projector-socket Contract Tests', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: ClientSocket;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach((done) => {
    // Create HTTP server
    httpServer = createServer();
    io = new Server(httpServer);

    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;

      // Setup mock Firebase auth
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        uid: 'projector-test-123',
        role: 'projector',
      });

      vi.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      // Import and setup namespace (will fail until implemented)
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

  describe('Connection flow', () => {
    it('should emit AUTH_REQUIRED event on connection', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'test-token' },
      });

      clientSocket.on('AUTH_REQUIRED', (payload) => {
        expect(payload).toHaveProperty('timeout');
        expect(typeof payload.timeout).toBe('number');
        expect(payload.timeout).toBe(10000); // 10 seconds default
        done();
      });
    });

    it('should emit authenticated event after successful auth', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-firebase-token' },
      });

      clientSocket.on('authenticated', (payload) => {
        expect(payload).toHaveProperty('sessionId');
        expect(payload).toHaveProperty('uid');
        expect(payload).toHaveProperty('message');

        expect(payload.uid).toBe('projector-test-123');
        expect(typeof payload.sessionId).toBe('string');
        done();
      });
    });

    it('should emit AUTH_FAILED on invalid token', (done) => {
      const mockVerifyIdToken = vi.fn().mockRejectedValue(
        new Error('Invalid token')
      );

      vi.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'invalid-token' },
      });

      clientSocket.on('AUTH_FAILED', (payload) => {
        expect(payload).toHaveProperty('reason');
        expect(payload).toHaveProperty('code');

        expect(payload.code).toMatch(/^(INVALID_TOKEN|EXPIRED_TOKEN|TIMEOUT|INVALID_ROLE)$/);
        expect(typeof payload.reason).toBe('string');
        done();
      });
    });
  });

  describe('Event payload validation', () => {
    it('should validate AUTH_REQUIRED payload structure', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'test-token' },
      });

      clientSocket.on('AUTH_REQUIRED', (payload) => {
        // Validate required fields
        expect(Object.keys(payload)).toContain('timeout');

        // Validate no extra fields
        expect(Object.keys(payload)).toHaveLength(1);
        done();
      });
    });

    it('should validate authenticated payload structure', (done) => {
      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('authenticated', (payload) => {
        // Validate required fields
        const requiredFields = ['sessionId', 'uid', 'message'];
        requiredFields.forEach((field) => {
          expect(payload).toHaveProperty(field);
        });

        // Validate types
        expect(typeof payload.sessionId).toBe('string');
        expect(typeof payload.uid).toBe('string');
        expect(typeof payload.message).toBe('string');
        done();
      });
    });

    it('should validate AUTH_FAILED payload structure', (done) => {
      const mockVerifyIdToken = vi.fn().mockRejectedValue(
        new Error('Test error')
      );

      vi.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      clientSocket = Client(`http://localhost:${port}/projector-socket`, {
        auth: { token: 'bad-token' },
      });

      clientSocket.on('AUTH_FAILED', (payload) => {
        // Validate required fields
        expect(payload).toHaveProperty('reason');
        expect(payload).toHaveProperty('code');

        // Validate code is one of the allowed values
        expect(['INVALID_TOKEN', 'EXPIRED_TOKEN', 'TIMEOUT', 'INVALID_ROLE']).toContain(
          payload.code
        );
        done();
      });
    });
  });

  describe('Namespace isolation', () => {
    it('should be separate from default namespace', (done) => {
      // Connect to default namespace
      const defaultClient = Client(`http://localhost:${port}`);

      // Default namespace should not trigger AUTH_REQUIRED
      const authRequiredSpy = vi.fn();
      defaultClient.on('AUTH_REQUIRED', authRequiredSpy);

      setTimeout(() => {
        expect(authRequiredSpy).not.toHaveBeenCalled();
        defaultClient.close();
        done();
      }, 100);
    });
  });
});
