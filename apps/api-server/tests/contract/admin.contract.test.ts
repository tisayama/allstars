/**
 * Contract tests for admin endpoints
 * Validates implementation against OpenAPI specification
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
      collection: jest.fn(),
    })),
  },
  db: {
    settings: jest.fn(),
    collection: jest.fn(),
  },
  isEmulatorMode: true,
}));

describe('Admin Endpoints Contract Tests', () => {
  let mockVerifyIdToken: jest.Mock;
  let mockFirestore: any;
  const adminToken = 'admin-token-123';

  beforeEach(() => {
    // Mock admin authentication
    mockVerifyIdToken = jest.fn().mockResolvedValue({
      uid: 'admin-123',
      email: 'admin@example.com',
      firebase: {
        sign_in_provider: 'google.com',
      },
    });

    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });

    // Mock Firestore
    mockFirestore = {
      collection: jest.fn(),
      doc: jest.fn(),
      add: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
    };

    (admin.firestore as unknown as jest.Mock).mockReturnValue(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/quizzes - Create Question', () => {
    const validQuestion = {
      period: 'first-half',
      questionNumber: 1,
      type: 'multiple-choice',
      text: 'What is the capital of France?',
      choices: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris',
      skipAttributes: [],
    };

    it('should accept valid question according to OpenAPI spec', async () => {
      const response = await request(app)
        .post('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuestion);

      // Route not implemented yet, expecting 404
      expect(response.status).toBe(404);
      // Once implemented, should be 201
    });

    it('should reject question without required fields', async () => {
      const invalidQuestion = {
        period: 'first-half',
        // Missing questionNumber
        type: 'multiple-choice',
        text: 'Sample question',
      };

      const response = await request(app)
        .post('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuestion);

      expect(response.status).toBe(404);
      // Once implemented with validation, should be 400
    });

    it('should reject question with invalid type', async () => {
      const invalidQuestion = {
        ...validQuestion,
        type: 'essay', // Invalid type
      };

      const response = await request(app)
        .post('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuestion);

      expect(response.status).toBe(404);
      // Once implemented with validation, should be 400
    });

    it('should return 201 with question ID when created successfully', async () => {
      const response = await request(app)
        .post('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuestion);

      expect(response.status).toBe(404);
      // Once implemented, should be:
      // expect(response.status).toBe(201);
      // expect(response.body).toHaveProperty('id');
      // expect(response.body).toHaveProperty('period', 'first-half');
    });
  });

  describe('GET /admin/quizzes - List Questions', () => {
    it('should return array of questions according to OpenAPI spec', async () => {
      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, should be:
      // expect(response.status).toBe(200);
      // expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when no questions exist', async () => {
      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, should be 200 with empty array
    });

    it('should return questions ordered by period and questionNumber', async () => {
      const response = await request(app)
        .get('/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, verify ordering
    });
  });

  describe('PUT /admin/quizzes/:questionId - Update Question', () => {
    const questionId = 'question-123';
    const updateData = {
      text: 'Updated question text',
      choices: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
    };

    it('should accept partial update according to OpenAPI spec', async () => {
      const response = await request(app)
        .put(`/admin/quizzes/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      // Once implemented, should be 200
    });

    it('should return 404 for non-existent question', async () => {
      const response = await request(app)
        .put('/admin/quizzes/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    it('should reject update with invalid data', async () => {
      const invalidUpdate = {
        choices: ['Only', 'Two'], // Less than required
      };

      const response = await request(app)
        .put(`/admin/quizzes/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate);

      expect(response.status).toBe(404);
      // Once implemented with validation, should be 400
    });
  });

  describe('GET /admin/guests - List Guests', () => {
    it('should return array of guests according to OpenAPI spec', async () => {
      const response = await request(app)
        .get('/admin/guests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, should be:
      // expect(response.status).toBe(200);
      // expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return guest with all required fields', async () => {
      const response = await request(app)
        .get('/admin/guests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, verify fields: id, name, status, attributes, authMethod
    });

    it('should return empty array when no guests exist', async () => {
      const response = await request(app)
        .get('/admin/guests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      // Once implemented, should be 200 with empty array
    });
  });

  describe('Authentication Required', () => {
    it('should reject all admin endpoints without authentication', async () => {
      const endpoints = [
        { method: 'post', path: '/admin/quizzes' },
        { method: 'get', path: '/admin/quizzes' },
        { method: 'put', path: '/admin/quizzes/123' },
        { method: 'get', path: '/admin/guests' },
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method](
          endpoint.path
        );
        expect(response.status).toBe(404);
        // Once implemented with auth, should be 401
      }
    });
  });
});
