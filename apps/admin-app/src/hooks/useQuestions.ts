/**
 * useQuestions hook for quiz management (T049)
 * Handles CRUD operations for questions
 */

import { useState, useCallback } from 'react';
import type { Question } from '@allstars/types';
import { api } from '@/lib/api-client';

interface UseQuestionsResult {
  questions: Question[];
  loading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  createQuestion: (data: Omit<Question, 'id' | 'deadline'> & { deadline: string }) => Promise<Question>;
  updateQuestion: (id: string, data: Partial<Question>) => Promise<Question>;
  deleteQuestion: (id: string) => Promise<void>;
}

export function useQuestions(): UseQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ questions: Question[] }>('/admin/quizzes');
      setQuestions(response.questions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch questions';
      setError(errorMessage);
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuestion = useCallback(async (data: Omit<Question, 'id' | 'deadline'> & { deadline: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<Question>('/admin/quizzes', data);
      setQuestions((prev) => [...prev, response]);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQuestion = useCallback(async (id: string, data: Partial<Question>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.put<Question>(`/admin/quizzes/${id}`, data);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? response : q))
      );
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      await api.delete(`/admin/quizzes/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
}
