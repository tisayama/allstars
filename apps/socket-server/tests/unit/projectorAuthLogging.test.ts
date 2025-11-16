/**
 * Unit tests for projector authentication audit logging
 * Feature: 001-projector-auth [US2]
 *
 * Tests audit logging for projector WebSocket authentication events (SC-003)
 * Verifies 100% audit logging coverage for all authentication outcomes
 */

import { Socket } from 'socket.io';
import { auditLogger } from '../../src/services/auditLogger';
import { createProjectorAuthMiddleware } from '../../src/middleware/projectorAuthMiddleware';

// Mock audit logger
jest.mock('../../src/services/auditLogger', () => ({
  auditLogger: {
    logSocketAuthSuccess: jest.fn(),
    logSocketAuthFailed: jest.fn(),
  },
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
  credential: {
    applicationDefault: jest.fn(),
  },
  initializeApp: jest.fn(),
}));

describe('Projector Authentication Audit Logging [US2, SC-003]', () => {
  let mockSocket: Partial<Socket>;
  let mockNext: jest.Mock;
  let authMiddleware: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'socket-test-123',
      handshake: {
        auth: {},
      },
      disconnect: jest.fn(),
      emit: jest.fn(),
      data: {},
    } as any;

    mockNext = jest.fn();
    authMiddleware = createProjectorAuthMiddleware();
  });

  describe('Successful authentication', () => {
    it('should log SOCKET_AUTH_SUCCESS when Firebase token is valid', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-abc123',
        role: 'projector',
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-firebase-token',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      // Should log successful authentication
      expect(auditLogger.logSocketAuthSuccess).toHaveBeenCalledWith(
        'socket-test-123',
        'projector-abc123',
        'projector'
      );

      // Should NOT log failure
      expect(auditLogger.logSocketAuthFailed).not.toHaveBeenCalled();
    });

    it('should include all required fields in success log', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-xyz789',
        role: 'projector',
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthSuccess).toHaveBeenCalledTimes(1);
      const call = (auditLogger.logSocketAuthSuccess as jest.Mock).mock.calls[0];

      // Verify all required parameters
      expect(call[0]).toBe('socket-test-123'); // socketId
      expect(call[1]).toBe('projector-xyz789'); // uid
      expect(call[2]).toBe('projector'); // role
    });
  });

  describe('Authentication failures', () => {
    it('should log AUTH_FAILED when Firebase token is missing', async () => {
      mockSocket.handshake!.auth = {}; // No firebaseToken

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthFailed).toHaveBeenCalledWith(
        'socket-test-123',
        'Missing Firebase authentication token',
        expect.any(Object)
      );

      expect(auditLogger.logSocketAuthSuccess).not.toHaveBeenCalled();
    });

    it('should log AUTH_FAILED when Firebase token verification fails', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockRejectedValue(
        new Error('Token verification failed')
      );
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'invalid-token',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthFailed).toHaveBeenCalledWith(
        'socket-test-123',
        expect.stringContaining('Token verification failed'),
        expect.any(Object)
      );
    });

    it('should log AUTH_FAILED when role claim is missing', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-abc123',
        // No role claim
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token-no-role',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthFailed).toHaveBeenCalledWith(
        'socket-test-123',
        expect.stringContaining('Invalid role'),
        expect.objectContaining({
          providedRole: undefined,
        })
      );
    });

    it('should log AUTH_FAILED when role is not "projector"', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'user-123',
        role: 'participant', // Wrong role
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token-wrong-role',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthFailed).toHaveBeenCalledWith(
        'socket-test-123',
        expect.stringContaining('Invalid role'),
        expect.objectContaining({
          providedRole: 'participant',
        })
      );
    });
  });

  describe('Logging metadata', () => {
    it('should include error details in failure logs', async () => {
      const admin = require('firebase-admin');
      const specificError = new Error('Token expired');
      const mockVerifyIdToken = jest.fn().mockRejectedValue(specificError);
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'expired-token',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      expect(auditLogger.logSocketAuthFailed).toHaveBeenCalledWith(
        'socket-test-123',
        expect.stringContaining('Token expired'),
        expect.any(Object)
      );
    });

    it('should NOT log sensitive token data', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-abc',
        role: 'projector',
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'sensitive-token-should-not-be-logged',
      };

      await authMiddleware(mockSocket as Socket, mockNext);

      // Get all calls to logging functions
      const successCalls = (auditLogger.logSocketAuthSuccess as jest.Mock).mock.calls;

      // Verify token is NOT in any log call
      const allCallArgs = successCalls.flat();
      const hasToken = allCallArgs.some((arg: any) =>
        JSON.stringify(arg).includes('sensitive-token-should-not-be-logged')
      );

      expect(hasToken).toBe(false);
    });
  });

  describe('Logging performance', () => {
    it('should not throw errors during logging', async () => {
      const admin = require('firebase-admin');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'projector-test',
        role: 'projector',
      });
      (admin.auth as jest.Mock).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      });

      mockSocket.handshake!.auth = {
        firebaseToken: 'valid-token',
      };

      // Should not throw even if logger throws
      (auditLogger.logSocketAuthSuccess as jest.Mock).mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // This should not throw - logging errors should be caught
      await expect(
        authMiddleware(mockSocket as Socket, mockNext)
      ).resolves.not.toThrow();
    });
  });
});
