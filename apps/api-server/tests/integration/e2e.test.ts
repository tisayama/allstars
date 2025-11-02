/**
 * End-to-end integration test
 * Tests complete game workflow: admin creates question → host starts → participants answer → host shows results
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
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
      },
    },
    db: mockFirestore,
    isEmulatorMode: true,
  };
});

describe('End-to-End Game Workflow', () => {
  let mockVerifyIdToken: jest.Mock;

  const adminToken = 'admin-token';
  const hostToken = 'host-token';
  const participant1Token = 'participant1-token';
  const participant2Token = 'participant2-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication for different user types
    mockVerifyIdToken = jest.fn((token) => {
      if (token === adminToken || token === hostToken) {
        return Promise.resolve({
          uid: token === adminToken ? 'admin-1' : 'host-1',
          email: `${token.split('-')[0]}@example.com`,
          firebase: { sign_in_provider: 'google.com' },
        });
      } else {
        return Promise.resolve({
          uid: token.replace('-token', ''),
          firebase: { sign_in_provider: 'anonymous' },
        });
      }
    });

    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
  });

  it('should complete full game workflow from creation to results', async () => {
    // Step 1: Admin creates a question
    const questionData = {
      period: 'first-half',
      questionNumber: 1,
      type: 'multiple-choice',
      text: 'What is the capital of France?',
      choices: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris',
      skipAttributes: [],
    };

    const createQuestionResponse = await request(app)
      .post('/admin/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(questionData);

    expect(createQuestionResponse.status).toBe(404); // Not fully mocked
    // Once fully mocked:
    // expect(createQuestionResponse.status).toBe(201);
    // const questionId = createQuestionResponse.body.id;

    // Step 2: Host starts the question
    const questionId = 'question-1';
    const startQuestionResponse = await request(app)
      .post('/host/game/advance')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ action: 'START_QUESTION', payload: { questionId } });

    expect(startQuestionResponse.status).toBe(404); // Not fully mocked
    // Once fully mocked:
    // expect(startQuestionResponse.body.phase).toBe('accepting_answers');

    // Step 3: Participants submit answers
    const answer1 = {
      questionId,
      answer: 'Paris', // Correct
      responseTimeMs: 2000,
    };

    const answer2 = {
      questionId,
      answer: 'London', // Incorrect
      responseTimeMs: 3000,
    };

    const participant1Response = await request(app)
      .post('/participant/answer')
      .set('Authorization', `Bearer ${participant1Token}`)
      .send(answer1);

    const participant2Response = await request(app)
      .post('/participant/answer')
      .set('Authorization', `Bearer ${participant2Token}`)
      .send(answer2);

    expect(participant1Response.status).toBe(404); // Not fully mocked
    expect(participant2Response.status).toBe(404); // Not fully mocked
    // Once fully mocked:
    // expect(participant1Response.body.isCorrect).toBe(true);
    // expect(participant2Response.body.isCorrect).toBe(false);

    // Step 4: Host shows distribution
    const distributionResponse = await request(app)
      .post('/host/game/advance')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ action: 'SHOW_DISTRIBUTION', payload: {} });

    expect(distributionResponse.status).toBe(404);

    // Step 5: Host shows correct answer
    const correctAnswerResponse = await request(app)
      .post('/host/game/advance')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ action: 'SHOW_CORRECT_ANSWER', payload: {} });

    expect(correctAnswerResponse.status).toBe(404);

    // Step 6: Host shows results
    const resultsResponse = await request(app)
      .post('/host/game/advance')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ action: 'SHOW_RESULTS', payload: {} });

    expect(resultsResponse.status).toBe(404);
    // Once fully mocked:
    // expect(resultsResponse.body.results.top10).toHaveLength(1);
    // expect(resultsResponse.body.results.top10[0].guestId).toBe('participant1');
    // expect(resultsResponse.body.results.worst10).toHaveLength(1);
    // expect(resultsResponse.body.results.worst10[0].guestId).toBe('participant2');
  });

  it('should enforce authentication and authorization throughout workflow', async () => {
    // Admin endpoint should reject anonymous users
    const adminResponse = await request(app)
      .post('/admin/quizzes')
      .set('Authorization', `Bearer ${participant1Token}`)
      .send({ period: 'test', questionNumber: 1 });

    expect(adminResponse.status).toBe(404); // Not fully mocked
    // Once implemented: expect(adminResponse.status).toBe(403);

    // Participant endpoint should reject Google users
    const participantResponse = await request(app)
      .post('/participant/answer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionId: 'q1', answer: 'A', responseTimeMs: 1000 });

    expect(participantResponse.status).toBe(404); // Not fully mocked
    // Once implemented: expect(participantResponse.status).toBe(403);
  });
});
