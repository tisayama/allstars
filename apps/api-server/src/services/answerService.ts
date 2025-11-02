/**
 * Answer service
 * Business logic for participant answer submission
 */

import { db, admin } from '../utils/firestore';
import { COLLECTIONS } from '../models/firestoreCollections';
import { SubmitAnswerInput } from '../models/validators';
import { Answer } from '@allstars/types';
import { DuplicateError, NotFoundError, ValidationError } from '../utils/errors';
import { getQuestionById } from './questionService';

/**
 * Submit an answer to a question
 * Uses Firestore transaction to prevent duplicate submissions
 */
export async function submitAnswer(
  guestId: string,
  data: SubmitAnswerInput
): Promise<Answer> {
  // First, verify the question exists and get its details
  const question = await getQuestionById(data.questionId);

  if (!question) {
    throw new NotFoundError('Question not found', [
      {
        field: 'questionId',
        message: `No question found with ID "${data.questionId}"`,
      },
    ]);
  }

  // Validate that the answer is one of the valid choices
  if (!question.choices.includes(data.answer)) {
    throw new ValidationError('Invalid answer choice', [
      {
        field: 'answer',
        message: `"${data.answer}" is not a valid choice. Valid choices are: ${question.choices.join(', ')}`,
      },
    ]);
  }

  // Use transaction to check for duplicates and create answer atomically
  const result = await db.runTransaction(async (transaction) => {
    // Check for existing answer from this guest for this question
    // Using sub-collection path: questions/{questionId}/answers/{guestId}
    const answerRef = db
      .collection(COLLECTIONS.QUESTIONS)
      .doc(data.questionId)
      .collection('answers')
      .doc(guestId);

    const existingAnswer = await transaction.get(answerRef);

    if (existingAnswer.exists) {
      throw new DuplicateError(
        'You have already submitted an answer for this question',
        [
          {
            field: 'questionId',
            message: `Answer already exists for question "${data.questionId}"`,
          },
        ]
      );
    }

    // Determine if the answer is correct
    const isCorrect = data.answer === question.correctAnswer;

    // Create the answer document in sub-collection
    const answerData = {
      guestId,
      questionId: data.questionId,
      answer: data.answer,
      responseTimeMs: data.responseTimeMs,
      isCorrect,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(answerRef, answerData);

    return {
      id: answerRef.id,
      ...answerData,
      submittedAt: new Date(), // Will be overwritten by serverTimestamp
    };
  });

  return result as Answer;
}

/**
 * Get answers for a specific question
 * Used for leaderboard calculations
 * Reads from sub-collection: questions/{questionId}/answers
 */
export async function getAnswersByQuestion(
  questionId: string
): Promise<Answer[]> {
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection('answers')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      guestId: data.guestId,
      questionId: data.questionId,
      answer: data.answer,
      responseTimeMs: data.responseTimeMs,
      isCorrect: data.isCorrect,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as Answer;
  });
}

/**
 * Get top 10 fastest correct answers for a question
 * Reads from sub-collection: questions/{questionId}/answers
 */
export async function getTop10CorrectAnswers(
  questionId: string
): Promise<Answer[]> {
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection('answers')
    .where('isCorrect', '==', true)
    .orderBy('responseTimeMs', 'asc')
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as Answer;
  });
}

/**
 * Get worst 10 slowest incorrect answers for a question
 * Reads from sub-collection: questions/{questionId}/answers
 */
export async function getWorst10IncorrectAnswers(
  questionId: string
): Promise<Answer[]> {
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection('answers')
    .where('isCorrect', '==', false)
    .orderBy('responseTimeMs', 'desc')
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as Answer;
  });
}
