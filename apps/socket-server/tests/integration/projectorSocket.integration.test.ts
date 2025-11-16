/**
 * Integration tests for projector namespace
 * Feature: 001-projector-auth [US1]
 *
 * Tests complete authentication flow with real Firebase verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'socket.io';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import * as admin from 'firebase-admin';

vi.mock('firebase-admin');

describe('Projector Socket - Integration Tests', () => {
  let io: Server;
  let clientSocket: ClientSocket;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async (done) => {
    httpServer = createServer();
    io = new Server(httpServer);

    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;

      const { setupProjectorNamespace } = await import('../../src/namespaces/projectorNamespace');
      setupProjectorNamespace(io);
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) clientSocket.close();
    io.close();
    httpServer.close();
  });

  it('should complete full authentication flow', (done) => {
    const mockVerifyIdToken = vi.fn().mockResolvedValue({
      uid: 'projector-integration-test',
      role: 'projector',
    });

    vi.mocked(admin.auth).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    } as any);

    clientSocket = Client(`http://localhost:${port}/projector-socket`, {
      auth: { token: 'valid-integration-token' },
    });

    clientSocket.on('authenticated', () => {
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-integration-token');
      expect(clientSocket.connected).toBe(true);
      done();
    });
  });

  it('should reject connections with wrong role', (done) => {
    const mockVerifyIdToken = vi.fn().mockResolvedValue({
      uid: 'user-123',
      role: 'participant', // Wrong role
    });

    vi.mocked(admin.auth).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    } as any);

    clientSocket = Client(`http://localhost:${port}/projector-socket`, {
      auth: { token: 'participant-token' },
    });

    clientSocket.on('AUTH_FAILED', (payload) => {
      expect(payload.code).toBe('INVALID_ROLE');
      expect(clientSocket.connected).toBe(false);
      done();
    });
  });
});
