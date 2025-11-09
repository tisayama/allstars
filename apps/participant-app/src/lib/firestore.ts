import { getFirestore, doc, getDoc } from 'firebase/firestore';
import type { Question } from '@allstars/types';

/**
 * Fetch a question from Firestore by ID
 * @param questionId - Question ID (e.g., "q-first-half-001")
 * @returns Question data or null if not found
 */
export async function fetchQuestion(questionId: string): Promise<Question | null> {
  try {
    const db = getFirestore();
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) {
      console.error(`Question ${questionId} not found in Firestore`);
      return null;
    }

    const data = questionSnap.data();

    // Validate required fields
    if (!data.questionText || !Array.isArray(data.choices)) {
      console.error(`Invalid question data for ${questionId}:`, data);
      return null;
    }

    return {
      questionId,
      questionText: data.questionText,
      choices: data.choices,
      period: data.period || 'first-half',
      questionNumber: data.questionNumber || 0,
      ...(data.type && { type: data.type }),
      ...(data.correctAnswer && { correctAnswer: data.correctAnswer }),
      ...(data.skipAttributes && { skipAttributes: data.skipAttributes }),
      ...(data.deadline && { deadline: data.deadline }),
    } as Question;
  } catch (error) {
    console.error(`Failed to fetch question ${questionId}:`, error);
    return null;
  }
}
