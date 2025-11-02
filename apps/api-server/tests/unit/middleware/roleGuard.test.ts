/**
 * Unit tests for roleGuard middleware
 * Tests role-based access control (Google vs Anonymous authentication)
 */

import { Request, Response, NextFunction } from 'express';
import {
  requireGoogleLogin,
  requireAnonymousLogin,
} from '../../../src/middleware/roleGuard';

describe('RoleGuard Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireGoogleLogin', () => {
    it('should allow requests with Google sign-in provider', () => {
      (req as any).user = {
        uid: 'user-123',
        email: 'admin@example.com',
        signInProvider: 'google.com',
      };

      requireGoogleLogin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests with anonymous sign-in provider', () => {
      (req as any).user = {
        uid: 'anon-456',
        signInProvider: 'anonymous',
      };

      requireGoogleLogin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FORBIDDEN',
          message: expect.stringContaining('Google'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without user object', () => {
      requireGoogleLogin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authenticated'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnonymousLogin', () => {
    it('should allow requests with anonymous sign-in provider', () => {
      (req as any).user = {
        uid: 'anon-789',
        signInProvider: 'anonymous',
      };

      requireAnonymousLogin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests with Google sign-in provider', () => {
      (req as any).user = {
        uid: 'user-123',
        email: 'admin@example.com',
        signInProvider: 'google.com',
      };

      requireAnonymousLogin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FORBIDDEN',
          message: expect.stringContaining('anonymous'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without user object', () => {
      requireAnonymousLogin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authenticated'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
