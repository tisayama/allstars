/**
 * Question service
 * Business logic for quiz question management
 */

import { db } from "../utils/firestore";
import { COLLECTIONS } from "../models/firestoreCollections";
import { CreateQuestionInput, UpdateQuestionInput } from "../models/validators";
import { Question } from "@allstars/types";
import { DuplicateError, NotFoundError } from "../utils/errors";
import { Timestamp } from "firebase-admin/firestore";

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
    .where("period", "==", data.period)
    .where("questionNumber", "==", data.questionNumber)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    throw new DuplicateError(
      "Question with this period and question number already exists",
      [
        {
          field: "period",
          message: `Question ${data.questionNumber} already exists in period "${data.period}"`,
        },
        {
          field: "questionNumber",
          message: `Question number ${data.questionNumber} is already used in this period`,
        },
      ]
    );
  }

  // Validate that correctAnswer is one of the choices
  if (!data.choices.includes(data.correctAnswer)) {
    throw new DuplicateError("Correct answer must be one of the choices", [
      {
        field: "correctAnswer",
        message: `"${data.correctAnswer}" is not in the choices list`,
      },
    ]);
  }

  // Create the question with deadline as Firestore Timestamp
  const deadline = Timestamp.fromDate(new Date(data.deadline));
  const questionRef = await db.collection(COLLECTIONS.QUESTIONS).add({
    period: data.period,
    questionNumber: data.questionNumber,
    type: data.type,
    questionText: (data as any).questionText || (data as any).text, // Support both old and new field names
    choices: data.choices,
    correctAnswer: data.correctAnswer,
    skipAttributes: data.skipAttributes || [],
    deadline,
  });

  // Return the created question
  return {
    questionId: questionRef.id,
    questionText: (data as any).questionText || (data as any).text,
    choices: (data as any).choices,
    period: (data as any).period,
    questionNumber: (data as any).questionNumber,
    type: (data as any).type,
    correctAnswer: (data as any).correctAnswer,
    skipAttributes: (data as any).skipAttributes || [],
    deadline,
  } as Question;
}

/**
 * List all quiz questions
 * Ordered by period and questionNumber
 */
export async function listQuestions(): Promise<Question[]> {
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .orderBy("period")
    .orderBy("questionNumber")
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      questionId: doc.id,
      period: data.period,
      questionNumber: data.questionNumber,
      type: data.type,
      questionText: data.questionText || data.text, // Support both old and new field names
      choices: data.choices,
      correctAnswer: data.correctAnswer,
      skipAttributes: data.skipAttributes || [],
      deadline: data.deadline,
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
    throw new NotFoundError("Question not found", [
      {
        field: "questionId",
        message: `No question found with ID "${questionId}"`,
      },
    ]);
  }

  const currentData = questionDoc.data() as Question;

  // Validate that correctAnswer matches one of the choices
  const updatedChoices = (data as any).choices || currentData.choices;
  const updatedCorrectAnswer =
    (data as any).correctAnswer || currentData.correctAnswer;

  if (Array.isArray(updatedChoices) && updatedChoices.length > 0) {
    const choiceTexts = updatedChoices.map((choice: any) =>
      typeof choice === "string" ? choice : choice.text
    );
    if (!choiceTexts.includes(updatedCorrectAnswer)) {
      throw new DuplicateError("Correct answer must be one of the choices", [
        {
          field: "correctAnswer",
          message: `"${updatedCorrectAnswer}" is not in the choices list`,
        },
      ]);
    }
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
    updateData.deadline = Timestamp.fromDate(new Date(data.deadline));
  }

  await questionRef.update(updateData);

  // Return the updated question
  const updatedDoc = await questionRef.get();
  const updatedData = updatedDoc.data();

  if (!updatedData) {
    throw new NotFoundError("Question not found after update", []);
  }

  return {
    questionId: questionId,
    questionText:
      (updatedData as any).questionText || (updatedData as any).text,
    choices: (updatedData as any).choices,
    period: (updatedData as any).period,
    questionNumber: (updatedData as any).questionNumber,
    type: (updatedData as any).type,
    correctAnswer: (updatedData as any).correctAnswer,
    skipAttributes: (updatedData as any).skipAttributes || [],
    deadline: (updatedData as any).deadline,
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
  if (!data) {
    return null;
  }

  return {
    questionId: questionDoc.id,
    questionText: (data as any).questionText || (data as any).text, // Support both old and new field names
    choices: (data as any).choices,
    period: (data as any).period,
    questionNumber: (data as any).questionNumber,
    type: (data as any).type,
    correctAnswer: (data as any).correctAnswer,
    skipAttributes: (data as any).skipAttributes || [],
    deadline: (data as any).deadline,
  } as Question;
}

/**
 * Get the next question to be asked
 * Returns the first question ordered by period and questionNumber
 */
export async function getNextQuestion(): Promise<Question | null> {
  const questionsSnapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .orderBy("period")
    .orderBy("questionNumber")
    .limit(1)
    .get();

  if (questionsSnapshot.empty) {
    return null;
  }

  const doc = questionsSnapshot.docs[0];
  const data = doc.data();

  return {
    questionId: doc.id,
    questionText: (data as any).questionText || (data as any).text,
    choices: (data as any).choices,
    period: (data as any).period,
    questionNumber: (data as any).questionNumber,
    type: (data as any).type,
    correctAnswer: (data as any).correctAnswer,
    skipAttributes: (data as any).skipAttributes || [],
    deadline: (data as any).deadline,
  } as Question;
}
