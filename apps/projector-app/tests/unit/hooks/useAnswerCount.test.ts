import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnswerCount } from '@/hooks/useAnswerCount';

// Mock Firestore
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockGetFirestoreInstance = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock('@/lib/firebase', () => ({
  getFirestoreInstance: () => mockGetFirestoreInstance(),
}));

describe('useAnswerCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFirestoreInstance.mockReturnValue({});
    mockCollection.mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when questionId is null', () => {
    const { result } = renderHook(() => useAnswerCount(null));

    expect(result.current).toBeNull();
  });

  it('should initialize with empty answer counts', () => {
    mockOnSnapshot.mockImplementation(() => () => {});

    const { result } = renderHook(() => useAnswerCount('q1'));

    expect(result.current).toEqual({});
  });

  it('should count answers for each choice', async () => {
    const mockAnswers = [
      { id: 'a1', data: () => ({ selectedAnswer: 'Paris' }) },
      { id: 'a2', data: () => ({ selectedAnswer: 'Paris' }) },
      { id: 'a3', data: () => ({ selectedAnswer: 'London' }) },
      { id: 'a4', data: () => ({ selectedAnswer: 'Paris' }) },
    ];

    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      setTimeout(() => {
        callback({
          docs: mockAnswers,
        });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useAnswerCount('q1'));

    await waitFor(() => {
      expect(result.current).toEqual({
        Paris: 3,
        London: 1,
      });
    });
  });

  it('should update counts when new answers arrive', async () => {
    const initialAnswers = [
      { id: 'a1', data: () => ({ selectedAnswer: 'Paris' }) },
    ];

    const updatedAnswers = [
      { id: 'a1', data: () => ({ selectedAnswer: 'Paris' }) },
      { id: 'a2', data: () => ({ selectedAnswer: 'Paris' }) },
      { id: 'a3', data: () => ({ selectedAnswer: 'London' }) },
    ];

    let snapshotCallback!: (snapshot: any) => void;

    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      snapshotCallback = callback;
      setTimeout(() => {
        callback({ docs: initialAnswers });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useAnswerCount('q1'));

    await waitFor(() => {
      expect(result.current).toEqual({ Paris: 1 });
    });

    // Simulate new answers arriving
    snapshotCallback({ docs: updatedAnswers });

    await waitFor(() => {
      expect(result.current).toEqual({
        Paris: 2,
        London: 1,
      });
    });
  });

  it('should handle empty answer collection', async () => {
    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      setTimeout(() => {
        callback({ docs: [] });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useAnswerCount('q1'));

    await waitFor(() => {
      expect(result.current).toEqual({});
    });
  });

  it('should handle answers with the same choice', async () => {
    const mockAnswers = [
      { id: 'a1', data: () => ({ selectedAnswer: 'True' }) },
      { id: 'a2', data: () => ({ selectedAnswer: 'True' }) },
      { id: 'a3', data: () => ({ selectedAnswer: 'True' }) },
    ];

    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      setTimeout(() => {
        callback({ docs: mockAnswers });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useAnswerCount('q1'));

    await waitFor(() => {
      expect(result.current).toEqual({ True: 3 });
    });
  });

  it('should cleanup listener on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useAnswerCount('q1'));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should reset counts when questionId changes', async () => {
    const mockAnswersQ1 = [
      { id: 'a1', data: () => ({ selectedAnswer: 'Paris' }) },
    ];

    const mockAnswersQ2 = [
      { id: 'a2', data: () => ({ selectedAnswer: 'Berlin' }) },
      { id: 'a3', data: () => ({ selectedAnswer: 'Berlin' }) },
    ];

    let currentQuestionId = 'q1';

    mockCollection.mockImplementation((_firestore, _path1, questionId, _path2) => {
      currentQuestionId = questionId;
      return {};
    });

    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      // Return data based on which questionId was last used in collection()
      setTimeout(() => {
        if (currentQuestionId === 'q1') {
          callback({ docs: mockAnswersQ1 });
        } else if (currentQuestionId === 'q2') {
          callback({ docs: mockAnswersQ2 });
        }
      }, 0);
      return () => {};
    });

    const { result, rerender } = renderHook(
      ({ questionId }: { questionId: string | null }) => useAnswerCount(questionId),
      { initialProps: { questionId: 'q1' as string | null } }
    );

    await waitFor(() => {
      expect(result.current).toEqual({ Paris: 1 });
    });

    // Change questionId
    rerender({ questionId: 'q2' });

    await waitFor(() => {
      expect(result.current).toEqual({ Berlin: 2 });
    });
  });

  it('should handle questionId changing to null', async () => {
    const mockAnswers = [
      { id: 'a1', data: () => ({ selectedAnswer: 'Paris' }) },
    ];

    mockOnSnapshot.mockImplementation((_collectionRef, callback) => {
      setTimeout(() => callback({ docs: mockAnswers }), 0);
      return () => {};
    });

    const { result, rerender } = renderHook(
      ({ questionId }: { questionId: string | null }) => useAnswerCount(questionId),
      { initialProps: { questionId: 'q1' as string | null } }
    );

    await waitFor(() => {
      expect(result.current).toEqual({ Paris: 1 });
    });

    // Change to null
    rerender({ questionId: null });

    expect(result.current).toBeNull();
  });
});
