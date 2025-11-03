import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '@allstars/types';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));

describe('Socket.io Authentication Flow (Integration)', () => {
  let httpServer: any;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
  let clientSocket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let serverPort: number;
  let mockVerifyIdToken: jest.Mock;

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    // Listen on random port
    httpServer.listen(() => {
      serverPort = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
    // Remove all previous event listeners to avoid multiple handler registrations
    io.removeAllListeners('connection');
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Successful authentication', () => {
    it('should authenticate client with valid token and join gameRoom', (done) => {
      const mockUserId = 'test-user-123';
      const validToken = 'valid-firebase-token';

      mockVerifyIdToken.mockResolvedValue({ uid: mockUserId });

      // Set up server-side authentication handler (will be implemented in middleware)
      io.on('connection', (socket) => {
        socket.emit('AUTH_REQUIRED', { timeout: 10000 });

        socket.on('authenticate', async (payload) => {
          try {
            const decodedToken = await admin.auth().verifyIdToken(payload.token, true);
            socket.data.userId = decodedToken.uid;
            socket.data.isAuthenticated = true;
            socket.join('gameRoom');
            socket.emit('AUTH_SUCCESS', { userId: decodedToken.uid });
          } catch (error) {
            socket.emit('AUTH_FAILED', { reason: 'Invalid token' });
            socket.disconnect();
          }
        });
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('AUTH_REQUIRED', ({ timeout }) => {
        expect(timeout).toBe(10000);
        clientSocket.emit('authenticate', { token: validToken });
      });

      clientSocket.on('AUTH_SUCCESS', ({ userId }) => {
        expect(userId).toBe(mockUserId);
        done();
      });

      clientSocket.on('AUTH_FAILED', ({ reason }) => {
        done(new Error(`Auth failed: ${reason}`));
      });
    });
  });

  describe('Failed authentication', () => {
    it('should reject client with invalid token', (done) => {
      const invalidToken = 'invalid-token';

      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      io.on('connection', (socket) => {
        socket.emit('AUTH_REQUIRED', { timeout: 10000 });

        socket.on('authenticate', async (payload) => {
          try {
            const decodedToken = await admin.auth().verifyIdToken(payload.token, true);
            socket.data.userId = decodedToken.uid;
            socket.data.isAuthenticated = true;
            socket.join('gameRoom');
            socket.emit('AUTH_SUCCESS', { userId: decodedToken.uid });
          } catch (error) {
            socket.emit('AUTH_FAILED', {
              reason: error instanceof Error ? error.message : 'Unknown error',
            });
            socket.disconnect();
          }
        });
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('AUTH_REQUIRED', () => {
        clientSocket.emit('authenticate', { token: invalidToken });
      });

      clientSocket.on('AUTH_FAILED', ({ reason }) => {
        expect(reason).toBe('Invalid token');
        done();
      });

      clientSocket.on('disconnect', () => {
        // Expected - client should be disconnected after auth failure
      });
    });

    it('should disconnect client after auth timeout', (done) => {
      const authTimeout = 1000; // 1 second for testing

      io.on('connection', (socket) => {
        socket.emit('AUTH_REQUIRED', { timeout: authTimeout });

        const timeoutId = setTimeout(() => {
          if (!socket.data.isAuthenticated) {
            socket.disconnect();
          }
        }, authTimeout);

        socket.on('authenticate', () => {
          clearTimeout(timeoutId);
        });
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('disconnect', () => {
        // Client should be disconnected after timeout
        done();
      });

      // Don't send authenticate event - let it timeout
    });
  });

  describe('AUTH_REQUIRED event payload', () => {
    it('should send AUTH_REQUIRED with timeout on connection', (done) => {
      io.on('connection', (socket) => {
        socket.emit('AUTH_REQUIRED', { timeout: 10000 });
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('AUTH_REQUIRED', (payload) => {
        expect(payload).toHaveProperty('timeout');
        expect(typeof payload.timeout).toBe('number');
        expect(payload.timeout).toBe(10000);
        done();
      });
    });
  });
});
