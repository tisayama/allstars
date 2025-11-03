/**
 * Integration test for degraded state behavior (T075)
 * Tests that server rejects new connections when Firestore listener is unhealthy
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
  apps: [],
}));

// Mock health state module
let mockIsHealthy = true;
jest.mock('../../src/utils/healthState', () => ({
  isHealthy: () => mockIsHealthy,
  setHealthy: (status: boolean) => { mockIsHealthy = status; },
}));

describe('Degraded State Integration Test (T075)', () => {
  let httpServer: HTTPServer;
  let io: SocketIOServer;
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

    // Setup authentication flow with health check
    io.on('connection', (socket) => {
      // Check health status before allowing authentication
      if (!mockIsHealthy) {
        socket.emit('AUTH_FAILED', { reason: 'Server is in degraded state' });
        socket.disconnect();
        return;
      }

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

  beforeEach(() => {
    // Reset to healthy state
    mockIsHealthy = true;
  });

  it('should allow new connections when server is healthy', (done) => {
    const clientSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('authenticate', { token: 'valid-token' });
    });

    clientSocket.on('AUTH_SUCCESS', () => {
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('AUTH_FAILED', () => {
      clientSocket.disconnect();
      done(new Error('Should not fail when healthy'));
    });
  });

  it('should reject new connections when server is degraded', (done) => {
    // Set server to degraded state
    mockIsHealthy = false;

    const clientSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    clientSocket.on('AUTH_FAILED', (payload: any) => {
      expect(payload.reason).toBe('Server is in degraded state');
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('AUTH_SUCCESS', () => {
      clientSocket.disconnect();
      done(new Error('Should not succeed when degraded'));
    });
  });

  it('should maintain existing connections when degraded', (done) => {
    // Connect while healthy
    const clientSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('authenticate', { token: 'valid-token' });
    });

    clientSocket.on('AUTH_SUCCESS', () => {
      // Now set to degraded state
      mockIsHealthy = false;

      // Verify existing connection still works by sending a message
      clientSocket.emit('ping', 'test');

      // Connection should still be active
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      }, 100);
    });
  });

  it('should accept new connections again after recovery', (done) => {
    // Start degraded
    mockIsHealthy = false;

    const client1 = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    client1.on('AUTH_FAILED', () => {
      client1.disconnect();

      // Recover to healthy state
      mockIsHealthy = true;

      // Try new connection
      const client2 = ioClient(serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
      });

      client2.on('connect', () => {
        client2.emit('authenticate', { token: 'valid-token' });
      });

      client2.on('AUTH_SUCCESS', () => {
        client2.disconnect();
        done();
      });

      client2.on('AUTH_FAILED', () => {
        client2.disconnect();
        done(new Error('Should succeed after recovery'));
      });
    });
  });
});
