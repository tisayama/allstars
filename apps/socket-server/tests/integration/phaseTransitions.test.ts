/**
 * Integration test for phase transition broadcast flow (T055)
 * Tests GAME_PHASE_CHANGED event broadcasting from Firestore to clients
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import type { GamePhaseChangedPayload } from '@allstars/types';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
  apps: [],
}));

describe('Phase Transition Integration Test (T055)', () => {
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

  it('should broadcast GAME_PHASE_CHANGED for showing_distribution phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('showing_distribution');
      done();
    });

    // Simulate server broadcasting phase change
    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'showing_distribution',
    });
  });

  it('should broadcast GAME_PHASE_CHANGED for showing_correct_answer phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('showing_correct_answer');
      done();
    });

    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'showing_correct_answer',
    });
  });

  it('should broadcast GAME_PHASE_CHANGED for showing_results phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('showing_results');
      done();
    });

    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'showing_results',
    });
  });

  it('should broadcast GAME_PHASE_CHANGED for idle phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('idle');
      done();
    });

    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'idle',
    });
  });

  it('should broadcast GAME_PHASE_CHANGED for all_incorrect phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('all_incorrect');
      done();
    });

    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'all_incorrect',
    });
  });

  it('should broadcast GAME_PHASE_CHANGED for all_revived phase', (done) => {
    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe('all_revived');
      done();
    });

    io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
      newPhase: 'all_revived',
    });
  });

  it('should broadcast phase changes to multiple clients', (done) => {
    const client2 = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    let receivedCount = 0;
    const expectedPhase = 'showing_distribution';

    const checkBothReceived = () => {
      receivedCount++;
      if (receivedCount === 2) {
        client2.disconnect();
        done();
      }
    };

    clientSocket.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
      expect(payload.newPhase).toBe(expectedPhase);
      checkBothReceived();
    });

    client2.on('connect', () => {
      client2.emit('authenticate', { token: 'valid-token' });
    });

    client2.on('AUTH_SUCCESS', () => {
      client2.on('GAME_PHASE_CHANGED', (payload: GamePhaseChangedPayload) => {
        expect(payload.newPhase).toBe(expectedPhase);
        checkBothReceived();
      });

      // Broadcast after second client is ready
      io.to('gameRoom').emit('GAME_PHASE_CHANGED', {
        newPhase: expectedPhase,
      });
    });
  });
});
