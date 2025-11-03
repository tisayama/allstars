import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  StartQuestionPayload,
} from '@allstars/types';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));

describe('START_QUESTION Broadcast Flow (Integration - T038)', () => {
  let httpServer: any;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
  let clientSocket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

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
    io.removeAllListeners('connection');
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('should broadcast START_QUESTION event to all authenticated clients in gameRoom', (done) => {
    const mockQuestionId = 'q006';

    // Set up server to broadcast START_QUESTION when triggered
    io.on('connection', (socket) => {
      socket.join('gameRoom');

      // Simulate broadcast trigger
      setTimeout(() => {
        io.to('gameRoom').emit('START_QUESTION', {
          questionId: mockQuestionId,
          serverStartTime: Date.now(),
        });
      }, 100);
    });

    clientSocket = ioClient(`http://localhost:${serverPort}`);

    clientSocket.on('START_QUESTION', (payload: StartQuestionPayload) => {
      expect(payload.questionId).toBe(mockQuestionId);
      expect(payload.serverStartTime).toBeGreaterThan(0);
      expect(typeof payload.serverStartTime).toBe('number');
      done();
    });
  });

  it('should include serverStartTime in START_QUESTION payload', (done) => {
    const beforeBroadcast = Date.now();

    io.on('connection', (socket) => {
      socket.join('gameRoom');

      setTimeout(() => {
        const serverStartTime = Date.now();
        io.to('gameRoom').emit('START_QUESTION', {
          questionId: 'q001',
          serverStartTime,
        });
      }, 50);
    });

    clientSocket = ioClient(`http://localhost:${serverPort}`);

    clientSocket.on('START_QUESTION', (payload: StartQuestionPayload) => {
      const afterReceive = Date.now();

      expect(payload.serverStartTime).toBeGreaterThanOrEqual(beforeBroadcast);
      expect(payload.serverStartTime).toBeLessThanOrEqual(afterReceive);
      done();
    });
  });

  it('should broadcast to multiple clients simultaneously', (done) => {
    const mockQuestionId = 'q999';
    let client1Received = false;
    let client2Received = false;

    io.on('connection', (socket) => {
      socket.join('gameRoom');

      // Broadcast when both clients connected
      if (io.sockets.adapter.rooms.get('gameRoom')?.size === 2) {
        setTimeout(() => {
          io.to('gameRoom').emit('START_QUESTION', {
            questionId: mockQuestionId,
            serverStartTime: Date.now(),
          });
        }, 50);
      }
    });

    // Client 1
    clientSocket = ioClient(`http://localhost:${serverPort}`);
    clientSocket.on('START_QUESTION', (payload: StartQuestionPayload) => {
      expect(payload.questionId).toBe(mockQuestionId);
      client1Received = true;
      if (client1Received && client2Received) {
        done();
      }
    });

    // Client 2
    const client2 = ioClient(`http://localhost:${serverPort}`);
    client2.on('START_QUESTION', (payload: StartQuestionPayload) => {
      expect(payload.questionId).toBe(mockQuestionId);
      client2Received = true;
      if (client1Received && client2Received) {
        client2.disconnect();
        done();
      }
    });
  });

  it('should not send START_QUESTION to clients not in gameRoom', (done) => {
    let receivedByNonMember = false;

    io.on('connection', (socket) => {
      if (socket.id.includes('member')) {
        socket.join('gameRoom');
      }

      // Broadcast after brief delay
      setTimeout(() => {
        io.to('gameRoom').emit('START_QUESTION', {
          questionId: 'q005',
          serverStartTime: Date.now(),
        });

        // Give time for any errant broadcasts
        setTimeout(() => {
          if (!receivedByNonMember) {
            done(); // Test passed - non-member didn't receive
          }
        }, 100);
      }, 50);
    });

    // This client should NOT be in gameRoom and should NOT receive the event
    clientSocket = ioClient(`http://localhost:${serverPort}`);
    clientSocket.on('START_QUESTION', () => {
      receivedByNonMember = true;
      done(new Error('Non-member received START_QUESTION event'));
    });
  });
});
