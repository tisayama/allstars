import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRankingAnimation } from '../../../src/hooks/useRankingAnimation';

describe('useRankingAnimation', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should return shouldAnimate as true for first display of question', () => {
    const { result } = renderHook(() => useRankingAnimation('q1'));

    expect(result.current.shouldAnimate).toBe(true);
  });

  it('should return shouldAnimate as false for previously played question', () => {
    const { result, rerender } = renderHook(
      ({ questionId }) => useRankingAnimation(questionId),
      { initialProps: { questionId: 'q1' } }
    );

    // First render - should animate
    expect(result.current.shouldAnimate).toBe(true);

    // Mark as played
    act(() => {
      result.current.markAsPlayed();
    });

    // Unmount and remount with same question ID
    rerender({ questionId: 'q2' });
    rerender({ questionId: 'q1' });

    // Should NOT animate on second display
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('should return shouldAnimate as true when question ID changes', () => {
    const { result, rerender } = renderHook(
      ({ questionId }) => useRankingAnimation(questionId),
      { initialProps: { questionId: 'q1' } }
    );

    expect(result.current.shouldAnimate).toBe(true);

    // Mark as played
    act(() => {
      result.current.markAsPlayed();
    });

    // Change to new question
    rerender({ questionId: 'q2' });

    // Should animate for new question
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('should persist played state in localStorage', () => {
    const { result } = renderHook(() => useRankingAnimation('q1'));

    act(() => {
      result.current.markAsPlayed();
    });

    // Check localStorage
    const stored = localStorage.getItem('playedQuestions');
    expect(stored).toBeTruthy();
    const playedQuestions = JSON.parse(stored!);
    expect(playedQuestions).toContain('q1');
  });

  it('should load played state from localStorage on mount', () => {
    // Pre-populate localStorage
    localStorage.setItem('playedQuestions', JSON.stringify(['q1', 'q2']));

    const { result } = renderHook(() => useRankingAnimation('q1'));

    // Should recognize as already played
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('should handle multiple different questions', () => {
    const { result: result1, unmount: unmount1 } = renderHook(() => useRankingAnimation('q1'));
    const { result: result2, unmount: unmount2 } = renderHook(() => useRankingAnimation('q2'));
    const { result: result3, unmount: unmount3 } = renderHook(() => useRankingAnimation('q3'));

    // All should animate initially
    expect(result1.current.shouldAnimate).toBe(true);
    expect(result2.current.shouldAnimate).toBe(true);
    expect(result3.current.shouldAnimate).toBe(true);

    // Mark q1 and q2 as played
    act(() => {
      result1.current.markAsPlayed();
      result2.current.markAsPlayed();
    });

    // Unmount original instances
    unmount1();
    unmount2();
    unmount3();

    // Create new instances
    const { result: newResult1 } = renderHook(() => useRankingAnimation('q1'));
    const { result: newResult2 } = renderHook(() => useRankingAnimation('q2'));
    const { result: newResult3 } = renderHook(() => useRankingAnimation('q3'));

    // q1 and q2 should not animate, q3 should
    expect(newResult1.current.shouldAnimate).toBe(false);
    expect(newResult2.current.shouldAnimate).toBe(false);
    expect(newResult3.current.shouldAnimate).toBe(true);
  });

  it('should handle undefined questionId gracefully', () => {
    const { result } = renderHook(() => useRankingAnimation(undefined));

    // Should return false for undefined
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('should provide markAsPlayed function', () => {
    const { result } = renderHook(() => useRankingAnimation('q1'));

    expect(typeof result.current.markAsPlayed).toBe('function');
  });

  it('should update shouldAnimate when markAsPlayed is called', () => {
    const { result } = renderHook(() => useRankingAnimation('q1'));

    expect(result.current.shouldAnimate).toBe(true);

    act(() => {
      result.current.markAsPlayed();
    });

    // After marking as played, it should update immediately
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('Storage full');
    };

    const { result } = renderHook(() => useRankingAnimation('q1'));

    // Should still work even if localStorage fails
    expect(result.current.shouldAnimate).toBe(true);

    act(() => {
      result.current.markAsPlayed();
    });

    // Restore original
    localStorage.setItem = originalSetItem;
  });
});
