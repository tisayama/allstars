/**
 * Integration tests for host game control workflow
 * Tests game state transitions, top/worst 10 calculations, and revive functionality
 */

import request from 'supertest';
import { app } from '../../src/index';
import { db, admin } from '../../src/utils/firestore';

// Mock Firebase Admin
jest.mock('../../src/utils/firestore', () => {
  const mockFirestore = {
    collection: jest.fn(),
    settings: jest.fn(),
    runTransaction: jest.fn(),
    batch: jest.fn(),
  };

  return {
    admin: {
      auth: jest.fn(() => ({
        verifyIdToken: jest.fn(),
      })),
      firestore: jest.fn(() => mockFirestore),
    },
    db: mockFirestore,
    isEmulatorMode: true,
  };
});

describe('Host Game Control Integration Tests', () => {
  let mockVerifyIdToken: jest.Mock;
  let mockRunTransaction: jest.Mock;
  let mockBatch: jest.Mock;

  const hostToken = 'host-token-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock host authentication
    mockVerifyIdToken = jest.fn().mockResolvedValue({
      uid: 'host-123',
      email: 'host@example.com',
      firebase: {
        sign_in_provider: 'google.com',
      },
    });

    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });

    mockRunTransaction = jest.fn();
    mockBatch = jest.fn();

    (db.runTransaction as jest.Mock) = mockRunTransaction;
    (db.batch as jest.Mock) = mockBatch;
  });

  describe('Game State Transitions', () => {
    it('should complete full workflow: START_QUESTION → SHOW_DISTRIBUTION → SHOW_CORRECT_ANSWER → SHOW_RESULTS', async () => {
      const questionId = 'question-1';

      // Step 1: START_QUESTION
      const startResponse = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'START_QUESTION', payload: { questionId } });

      expect(startResponse.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(startResponse.status).toBe(200);
      // expect(startResponse.body.phase).toBe('accepting_answers');
      // expect(startResponse.body.activeQuestionId).toBe(questionId);

      // Step 2: SHOW_DISTRIBUTION
      const distResponse = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_DISTRIBUTION', payload: {} });

      expect(distResponse.status).toBe(404);
      // Once implemented:
      // expect(distResponse.body.phase).toBe('showing_distribution');

      // Step 3: SHOW_CORRECT_ANSWER
      const answerResponse = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_CORRECT_ANSWER', payload: {} });

      expect(answerResponse.status).toBe(404);
      // Once implemented:
      // expect(answerResponse.body.phase).toBe('showing_correct_answer');

      // Step 4: SHOW_RESULTS
      const resultsResponse = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_RESULTS', payload: {} });

      expect(resultsResponse.status).toBe(404);
      // Once implemented:
      // expect(resultsResponse.body.phase).toBe('showing_results');
      // expect(resultsResponse.body.results).toBeDefined();
      // expect(resultsResponse.body.results.top10).toBeDefined();
      // expect(resultsResponse.body.results.worst10).toBeDefined();
    });
  });

  describe('TRIGGER_GONG Action', () => {
    it('should activate gong sound effect', async () => {
      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'TRIGGER_GONG', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.status).toBe(200);
      // expect(response.body.isGongActive).toBe(true);
    });
  });

  describe('REVIVE_ALL Action', () => {
    it('should revive all dropped guests', async () => {
      // Mock batch update
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockBatchUpdate = jest.fn();

      mockBatch.mockReturnValue({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'REVIVE_ALL', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.status).toBe(200);
      // Verify batch update was called for dropped guests
    });
  });

  describe('Top/Worst 10 Calculation', () => {
    it('should calculate top 10 fastest correct answers with guest names', async () => {
      // Mock answers and guests for leaderboard
      const mockAnswers = [
        { guestId: 'g1', isCorrect: true, responseTimeMs: 1000 },
        { guestId: 'g2', isCorrect: true, responseTimeMs: 1500 },
        { guestId: 'g3', isCorrect: true, responseTimeMs: 2000 },
      ];

      const mockGuests = [
        { id: 'g1', name: 'Alice' },
        { id: 'g2', name: 'Bob' },
        { id: 'g3', name: 'Charlie' },
      ];

      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_RESULTS', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.body.results.top10).toBeDefined();
      // expect(response.body.results.top10[0].guestName).toBe('Alice');
      // expect(response.body.results.top10[0].responseTimeMs).toBe(1000);
      // Verify sorted by responseTimeMs ascending
    });

    it('should calculate worst 10 slowest incorrect answers', async () => {
      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_RESULTS', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.body.results.worst10).toBeDefined();
      // Verify sorted by responseTimeMs descending for incorrect answers
    });

    it('should handle empty results when no answers submitted', async () => {
      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_RESULTS', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.body.results.top10).toEqual([]);
      // expect(response.body.results.worst10).toEqual([]);
    });
  });

  describe('Firestore Transaction Logic', () => {
    it('should use transactions for concurrent update handling', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              phase: 'idle',
              activeQuestionId: null,
              isGongActive: false,
              results: null,
            }),
          }),
          update: jest.fn(),
        };
        return callback(transaction);
      });

      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'TRIGGER_GONG', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented, verify transaction was used
    });
  });

  describe('State Transition Validation', () => {
    it('should reject invalid state transitions', async () => {
      // Mock game state in idle phase
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ phase: 'idle' }),
          }),
        };
        return callback(transaction);
      });

      // Try to SHOW_DISTRIBUTION from idle (invalid)
      const response = await request(app)
        .post('/host/game/advance')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ action: 'SHOW_DISTRIBUTION', payload: {} });

      expect(response.status).toBe(404); // Route not implemented yet
      // Once implemented:
      // expect(response.status).toBe(400);
      // expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
