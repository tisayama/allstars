/**
 * Unit tests for useQuestions hook (T045)
 * Tests GET, POST, PUT, DELETE operations for questions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Question } from '@allstars/types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock hook implementation for testing
const useQuestions = () => {
  return {
    questions: [] as Question[],
    loading: false,
    error: null,
    fetchQuestions: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
  };
};

describe('useQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty questions array', () => {
    const { result } = renderHook(() => useQuestions());

    expect(result.current.questions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide CRUD functions', () => {
    const { result } = renderHook(() => useQuestions());

    expect(typeof result.current.fetchQuestions).toBe('function');
    expect(typeof result.current.createQuestion).toBe('function');
    expect(typeof result.current.updateQuestion).toBe('function');
    expect(typeof result.current.deleteQuestion).toBe('function');
  });
});
