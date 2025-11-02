/**
 * Question service
 * Business logic for quiz question management
 */

import { db, admin } from '../utils/firestore';
import { COLLECTIONS } from '../models/firestoreCollections';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../models/validators';
import { Question } from '@allstars/types';
import { DuplicateError, NotFoundError } from '../utils/errors';

/**
 * Create a new quiz question
 * Validates uniqueness of period + questionNumber combination
 */
export async function createQuestion(
  data: CreateQuestionInput
): Promise<Question> {
  // Check for duplicate period + questionNumber
  const existingQuery = await db
    .collection(COLLECTIONS.QUESTIONS)
    .where('period', '==', data.period)
    .where('questionNumber', '==', data.questionNumber)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    throw new DuplicateError(
      'Question with this period and question number already exists',
      [
        {
          field: 'period',
          message: `Question ${data.questionNumber} already exists in period "${data.period}"`,
        },
        {
          field: 'questionNumber',
          message: `Question number ${data.questionNumber} is already used in this period`,
        },
      ]
    );
  }

  // Validate that correctAnswer is one of the choices
  if (!data.choices.includes(data.correctAnswer)) {
    throw new DuplicateError('Correct answer must be one of the choices', [
      {
        field: 'correctAnswer',
        message: `"${data.correctAnswer}" is not in the choices list`,
      },
    ]);
  }

  // Create the question with deadline as Firestore Timestamp
  const deadline = admin.firestore.Timestamp.fromDate(new Date(data.deadline));
  const questionRef = await db.collection(COLLECTIONS.QUESTIONS).add({
    period: data.period,
    questionNumber: data.questionNumber,
    type: data.type,
    text: data.text,
    choices: data.choices,
    correctAnswer: data.correctAnswer,
    skipAttributes: data.skipAttributes || [],
    deadline,
  });

  // Return the created question
  return {
    id: questionRef.id,
    ...data,
    skipAttributes: data.skipAttributes || [],
    deadline,
  };
}

/**
 * List all quiz questions
 * Ordered by period and questionNumber
 */
export async function listQuestions(): Promise<Question[]> {
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .orderBy('period')
    .orderBy('questionNumber')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      period: data.period,
      questionNumber: data.questionNumber,
      type: data.type,
      text: data.text,
      choices: data.choices,
      correctAnswer: data.correctAnswer,
      skipAttributes: data.skipAttributes || [],
    } as Question;
  });
}

/**
 * Update an existing quiz question
 * Supports partial updates
 */
export async function updateQuestion(
  questionId: string,
  data: UpdateQuestionInput
): Promise<Question> {
  const questionRef = db.collection(COLLECTIONS.QUESTIONS).doc(questionId);
  const questionDoc = await questionRef.get();

  if (!questionDoc.exists) {
    throw new NotFoundError('Question not found', [
      {
        field: 'questionId',
        message: `No question found with ID "${questionId}"`,
      },
    ]);
  }

  const currentData = questionDoc.data() as Question;

  // Validate that correctAnswer matches one of the choices
  const updatedChoices = data.choices || currentData.choices;
  const updatedCorrectAnswer = data.correctAnswer || currentData.correctAnswer;

  if (!updatedChoices.includes(updatedCorrectAnswer)) {
    throw new DuplicateError('Correct answer must be one of the choices', [
      {
        field: 'correctAnswer',
        message: `"${updatedCorrectAnswer}" is not in the choices list`,
      },
    ]);
  }

  // Update the question
  const updateData: any = {
    ...(data.text && { text: data.text }),
    ...(data.choices && { choices: data.choices }),
    ...(data.correctAnswer && { correctAnswer: data.correctAnswer }),
    ...(data.skipAttributes !== undefined && {
      skipAttributes: data.skipAttributes,
    }),
  };

  if (data.deadline) {
    updateData.deadline = admin.firestore.Timestamp.fromDate(new Date(data.deadline));
  }

  await questionRef.update(updateData);

  // Return the updated question
  const updatedDoc = await questionRef.get();
  const updatedData = updatedDoc.data();

  return {
    ...updatedData,
    id: questionId,
  } as Question;
}

/**
 * Get a question by ID
 */
export async function getQuestionById(
  questionId: string
): Promise<Question | null> {
  const questionDoc = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .get();

  if (!questionDoc.exists) {
    return null;
  }

  const data = questionDoc.data();
  return {
    id: questionDoc.id,
    ...data,
  } as Question;
}
