/**
 * Unit tests for auth middleware
 * Tests Firebase ID token validation and user claims extraction
 */

import { Request, Response, NextFunction } from 'express';
import { auth } from '../../../src/middleware/auth';
import { admin } from '../../../src/utils/firestore';

// Mock Firebase Admin
jest.mock('../../../src/utils/firestore', () => ({
  admin: {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
  },
}));

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockVerifyIdToken: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    mockVerifyIdToken = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should reject request with missing Authorization header', async () => {
      await auth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('token'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Authorization header', async () => {
      req.headers = { authorization: 'InvalidFormat' };

      await auth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization format',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await auth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('Invalid'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept request with valid token', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      const decodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        firebase: {
          sign_in_provider: 'google.com',
        },
      };
      mockVerifyIdToken.mockResolvedValue(decodedToken);

      await auth(req as Request, res as Response, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('User Claims Extraction', () => {
    it('should extract uid, email, and sign_in_provider from token', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      const decodedToken = {
        uid: 'user-456',
        email: 'admin@example.com',
        firebase: {
          sign_in_provider: 'google.com',
        },
      };
      mockVerifyIdToken.mockResolvedValue(decodedToken);

      await auth(req as Request, res as Response, next);

      expect((req as any).user).toEqual({
        uid: 'user-456',
        email: 'admin@example.com',
        signInProvider: 'google.com',
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle anonymous sign-in provider', async () => {
      req.headers = { authorization: 'Bearer anon-token' };
      const decodedToken = {
        uid: 'anon-789',
        firebase: {
          sign_in_provider: 'anonymous',
        },
      };
      mockVerifyIdToken.mockResolvedValue(decodedToken);

      await auth(req as Request, res as Response, next);

      expect((req as any).user).toEqual({
        uid: 'anon-789',
        email: undefined,
        signInProvider: 'anonymous',
      });
      expect(next).toHaveBeenCalled();
    });
  });
});
