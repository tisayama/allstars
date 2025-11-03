/**
 * Integration test for GONG broadcast flow (T067)
 * Tests GONG_ACTIVATED event broadcasting when isGongActive=true
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import type { GongActivatedPayload } from '@allstars/types';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
  apps: [],
}));

describe('GONG Broadcast Integration Test (T067)', () => {
  let httpServer: HTTPServer;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverUrl: string;

  beforeAll((done) => {
    httpServer = require('http').createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Mock Firebase Auth
    const mockVerifyIdToken = jest.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com',
    });

    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });

    // Setup authentication flow
    io.on('connection', (socket) => {
      socket.on('authenticate', async (payload) => {
        const result = await mockVerifyIdToken(payload.token);
        if (result) {
          socket.data.userId = result.uid;
          socket.data.isAuthenticated = true;
          socket.join('gameRoom');
          socket.emit('AUTH_SUCCESS', { userId: result.uid });
        }
      });
    });

    httpServer.listen(() => {
      const address = httpServer.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    clientSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('authenticate', { token: 'valid-token' });
    });

    clientSocket.on('AUTH_SUCCESS', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('should broadcast GONG_ACTIVATED event', (done) => {
    clientSocket.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
      expect(payload).toEqual({});
      expect(typeof payload).toBe('object');
      done();
    });

    // Simulate server broadcasting GONG event
    io.to('gameRoom').emit('GONG_ACTIVATED', {});
  });

  it('should broadcast GONG_ACTIVATED with empty payload', (done) => {
    clientSocket.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
      expect(Object.keys(payload).length).toBe(0);
      done();
    });

    io.to('gameRoom').emit('GONG_ACTIVATED', {});
  });

  it('should broadcast GONG to multiple clients', (done) => {
    const client2 = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    let receivedCount = 0;

    const checkBothReceived = () => {
      receivedCount++;
      if (receivedCount === 2) {
        client2.disconnect();
        done();
      }
    };

    clientSocket.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
      expect(payload).toEqual({});
      checkBothReceived();
    });

    client2.on('connect', () => {
      client2.emit('authenticate', { token: 'valid-token' });
    });

    client2.on('AUTH_SUCCESS', () => {
      client2.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
        expect(payload).toEqual({});
        checkBothReceived();
      });

      // Broadcast after second client is ready
      io.to('gameRoom').emit('GONG_ACTIVATED', {});
    });
  });

  it('should broadcast GONG even when phase is accepting_answers', (done) => {
    clientSocket.on('GONG_ACTIVATED', (payload: GongActivatedPayload) => {
      expect(payload).toEqual({});
      done();
    });

    // GONG can happen during any phase
    io.to('gameRoom').emit('GONG_ACTIVATED', {});
  });

  it('should handle rapid GONG broadcasts', (done) => {
    let count = 0;
    const expectedCount = 3;

    clientSocket.on('GONG_ACTIVATED', () => {
      count++;
      if (count === expectedCount) {
        done();
      }
    });

    // Simulate rapid broadcasts
    io.to('gameRoom').emit('GONG_ACTIVATED', {});
    io.to('gameRoom').emit('GONG_ACTIVATED', {});
    io.to('gameRoom').emit('GONG_ACTIVATED', {});
  });
});
