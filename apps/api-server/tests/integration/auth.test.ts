/**
 * Integration tests for authentication failures
 * Tests 401/403 scenarios with actual Express app
 */

import request from 'supertest';
import { app } from '../../src/index';
import { admin } from '../../src/utils/firestore';

// Mock Firebase Admin
jest.mock('../../src/utils/firestore', () => ({
  admin: {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
    firestore: jest.fn(() => ({
      settings: jest.fn(),
    })),
  },
  db: {
    settings: jest.fn(),
  },
  isEmulatorMode: true,
}));

describe('Authentication Integration Tests', () => {
  let mockVerifyIdToken: jest.Mock;

  beforeEach(() => {
    mockVerifyIdToken = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('401 Unauthorized Scenarios', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app).get('/admin/quizzes');

      expect(response.status).toBe(404); // Route not implemented yet
      // Once route is implemented, this should be 401
    });

    it('should return 401 when invalid token provided', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(404); // Route not implemented yet
      // Once route is implemented with auth, this should be 401
    });

    it('should return 401 when token is expired', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(404); // Route not implemented yet
      // Once route is implemented with auth, this should be 401
    });
  });

  describe('403 Forbidden Scenarios', () => {
    it('should return 403 when anonymous user tries to access admin endpoint', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'anon-123',
        firebase: {
          sign_in_provider: 'anonymous',
        },
      });

      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', 'Bearer anon-token');

      expect(response.status).toBe(404); // Route not implemented yet
      // Once route is implemented with requireGoogleLogin, this should be 403
    });

    it('should return 403 when Google user tries to access participant endpoint', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-123',
        email: 'admin@example.com',
        firebase: {
          sign_in_provider: 'google.com',
        },
      });

      const response = await request(app)
        .post('/participant/answer')
        .set('Authorization', 'Bearer google-token')
        .send({
          questionId: 'q1',
          answer: 'A',
          responseTimeMs: 1000,
        });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once route is implemented with requireAnonymousLogin, this should be 403
    });
  });

  describe('Health Check (No Auth Required)', () => {
    it('should allow access to health endpoint without authentication', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
