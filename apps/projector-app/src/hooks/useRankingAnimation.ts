import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'playedQuestions';

/**
 * Load played questions from localStorage
 */
function loadPlayedQuestions(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch (error) {
    console.error('Failed to load played questions:', error);
  }
  return new Set();
}

/**
 * Save played questions to localStorage
 */
function savePlayedQuestions(playedQuestions: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(playedQuestions)));
  } catch (error) {
    console.error('Failed to save played questions:', error);
  }
}

interface UseRankingAnimationResult {
  shouldAnimate: boolean;
  markAsPlayed: () => void;
}

/**
 * Custom hook to manage ranking animation state
 *
 * Tracks which questions have been displayed to prevent replaying
 * stagger animations when navigating back to previous questions.
 *
 * @param questionId - Current question ID
 * @returns {UseRankingAnimationResult} Animation state and control
 */
export function useRankingAnimation(
  questionId: string | undefined
): UseRankingAnimationResult {
  const [playedQuestions, setPlayedQuestions] = useState<Set<string>>(() =>
    loadPlayedQuestions()
  );

  // Determine if current question should animate
  const shouldAnimate = questionId ? !playedQuestions.has(questionId) : false;

  // Mark current question as played
  const markAsPlayed = useCallback(() => {
    if (!questionId) return;

    setPlayedQuestions(() => {
      // Reload from localStorage to get latest state from other instances
      const latest = loadPlayedQuestions();
      latest.add(questionId);
      savePlayedQuestions(latest);
      return latest;
    });
  }, [questionId]);

  // Sync with localStorage on mount
  useEffect(() => {
    setPlayedQuestions(loadPlayedQuestions());
  }, []);

  return {
    shouldAnimate,
    markAsPlayed,
  };
}
