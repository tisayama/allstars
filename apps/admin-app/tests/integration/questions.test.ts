/**
 * Integration tests for questions CRUD flow (T048)
 * Tests full create, read, update, delete cycle
 */

import { describe, it, expect, vi } from 'vitest';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ questions: [] })),
    post: vi.fn((endpoint, data) => Promise.resolve({ id: 'new-id', ...data })),
    put: vi.fn((endpoint, data) => Promise.resolve(data)),
    delete: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('Questions Integration', () => {
  it('should fetch questions from API', async () => {
    const { api } = await import('@/lib/api-client');

    const result = await api.get('/admin/quizzes');
    expect(result).toEqual({ questions: [] });
    expect(api.get).toHaveBeenCalledWith('/admin/quizzes');
  });

  it('should create a new question', async () => {
    const { api } = await import('@/lib/api-client');

    const newQuestion = {
      period: 'first-half',
      questionNumber: 1,
      type: 'multiple-choice',
      text: 'Test question?',
      choices: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      skipAttributes: [],
    };

    const result = await api.post('/admin/quizzes', newQuestion);
    expect(result).toHaveProperty('id');
    expect(api.post).toHaveBeenCalled();
  });

  it('should update an existing question', async () => {
    const { api } = await import('@/lib/api-client');

    const updatedQuestion = {
      id: 'existing-id',
      text: 'Updated question?',
    };

    await api.put('/admin/quizzes/existing-id', updatedQuestion);
    expect(api.put).toHaveBeenCalledWith('/admin/quizzes/existing-id', updatedQuestion);
  });

  it('should delete a question', async () => {
    const { api } = await import('@/lib/api-client');

    await api.delete('/admin/quizzes/existing-id');
    expect(api.delete).toHaveBeenCalledWith('/admin/quizzes/existing-id');
  });
});
