/**
 * Unit tests for projectorAuthMiddleware
 * Feature: 001-projector-auth [US2]
 *
 * Tests Firebase ID token verification for projector WebSocket connections
 * With audit logging support
 */

import type { Socket } from 'socket.io';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
  credential: {
    applicationDefault: jest.fn(),
  },
  initializeApp: jest.fn(),
}));

// Mock audit logger
jest.mock('../../src/services/auditLogger', () => ({
  auditLogger: {
    logSocketAuthSuccess: jest.fn(),
    logSocketAuthFailed: jest.fn(),
  },
}));

describe('projectorAuthMiddleware', () => {
  let mockSocket: Partial<Socket>;
  let mockNext: (err?: Error) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {},
      } as any,
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    };
    mockNext = jest.fn();
  });

  describe('authentication flow', () => {
    it('should call next() when valid token with projector role is provided', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-abc123',
        role: 'projector',
      });

      jest.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-firebase-id-token',
      };

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.data).toHaveProperty('uid', 'projector-abc123');
      expect(mockSocket.data).toHaveProperty('role', 'projector');
    });

    it('should emit AUTH_FAILED and disconnect when token is missing', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      mockSocket.handshake!.auth = {}; // No token

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockSocket.emit).toHaveBeenCalledWith('AUTH_FAILED', {
        reason: 'Missing Firebase authentication token',
        code: 'INVALID_TOKEN',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit AUTH_FAILED when token verification fails', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      const mockVerifyIdToken = jest.fn().mockRejectedValue(
        new Error('Token verification failed')
      );

      jest.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      mockSocket.handshake!.auth = {
        firebaseToken: 'invalid-token',
      };

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockSocket.emit).toHaveBeenCalledWith('AUTH_FAILED', {
        reason: expect.stringContaining('verification failed'),
        code: 'INVALID_TOKEN',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit AUTH_FAILED when token is expired', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      const expiredError = new Error('Firebase ID token has expired');
      (expiredError as any).code = 'auth/id-token-expired';

      const mockVerifyIdToken = jest.fn().mockRejectedValue(expiredError);

      jest.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      mockSocket.handshake!.auth = {
        firebaseToken: 'expired-token',
      };

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockSocket.emit).toHaveBeenCalledWith('AUTH_FAILED', {
        reason: expect.stringContaining('expired'),
        code: 'EXPIRED_TOKEN',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should emit AUTH_FAILED when role is not projector', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'user-123',
        role: 'participant', // Wrong role
      });

      jest.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token-wrong-role',
      };

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockSocket.emit).toHaveBeenCalledWith('AUTH_FAILED', {
        reason: 'Invalid role: expected projector',
        code: 'INVALID_ROLE',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit AUTH_FAILED when role claim is missing', async () => {
      const { createProjectorAuthMiddleware } = await import(
        '../../src/middleware/projectorAuthMiddleware'
      );

      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-abc123',
        // role claim missing
      });

      jest.mocked(admin.auth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token-no-role',
      };

      const middleware = createProjectorAuthMiddleware();
      await middleware(mockSocket as Socket, mockNext);

      expect(mockSocket.emit).toHaveBeenCalledWith('AUTH_FAILED', {
        reason: 'Role claim is missing',
        code: 'INVALID_ROLE',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
