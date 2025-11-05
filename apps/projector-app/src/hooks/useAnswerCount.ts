import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFirestoreInstance } from '@/lib/firebase';

/**
 * Answer counts by choice text
 */
export type AnswerCounts = Record<string, number>;

/**
 * Hook to listen to real-time answer counts for a specific question
 * @param questionId - The question ID to listen to, or null if no question is active
 * @returns Answer counts by choice text, or null if questionId is null
 */
export function useAnswerCount(questionId: string | null): AnswerCounts | null {
  const [answerCounts, setAnswerCounts] = useState<AnswerCounts | null>(null);

  useEffect(() => {
    // If no question is active, return null
    if (!questionId) {
      setAnswerCounts(null);
      return;
    }

    // Initialize with empty counts
    setAnswerCounts({});

    let unsubscribe: (() => void) | undefined;

    try {
      const firestore = getFirestoreInstance();
      const answersRef = collection(firestore, 'questions', questionId, 'answers');

      unsubscribe = onSnapshot(answersRef, (snapshot) => {
        const counts: AnswerCounts = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const selectedAnswer = data.selectedAnswer as string;

          if (selectedAnswer) {
            counts[selectedAnswer] = (counts[selectedAnswer] || 0) + 1;
          }
        });

        setAnswerCounts(counts);
      });
    } catch (err) {
      console.error('Error setting up answer count listener:', err);
      setAnswerCounts({});
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [questionId]);

  return answerCounts;
}
