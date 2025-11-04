/**
 * Answer service
 * Business logic for participant answer submission
 */

import { db, admin } from "../utils/firestore";
import { COLLECTIONS } from "../models/firestoreCollections";
import { SubmitAnswerInput } from "../models/validators";
import { Answer } from "@allstars/types";
import {
  DuplicateError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../utils/errors";
import { getQuestionById } from "./questionService";
import { getGuestById } from "./guestService";
import { getCurrentGameState } from "./gameStateService";

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
    throw new NotFoundError("Question not found", [
      {
        field: "questionId",
        message: `No question found with ID "${data.questionId}"`,
      },
    ]);
  }

  // Validate that the answer is one of the valid choices
  if (!question.choices.some((choice) => choice.text === data.answer)) {
    throw new ValidationError("Invalid answer choice", [
      {
        field: "answer",
        message: `"${
          data.answer
        }" is not a valid choice. Valid choices are: ${question.choices.join(
          ", "
        )}`,
      },
    ]);
  }

  // US2: Validate guest status (must be active)
  const guest = await getGuestById(guestId);
  if (!guest) {
    throw new NotFoundError("Guest not found", [
      {
        field: "guestId",
        message: `No guest found with ID "${guestId}"`,
      },
    ]);
  }

  if (guest.status !== "active") {
    throw new ForbiddenError("Guest is no longer active", [
      {
        field: "guestId",
        message: "Only active guests can submit answers",
      },
    ]);
  }

  // US2: Validate game phase (must be accepting_answers)
  const gameState = await getCurrentGameState();
  if (gameState.currentPhase !== "accepting_answers") {
    throw new ValidationError("Not accepting answers in current phase", [
      {
        field: "phase",
        message: `Current game phase is "${gameState.currentPhase}". Answers can only be submitted during "accepting_answers" phase.`,
      },
    ]);
  }

  // US2: Validate deadline (must not be past)
  if (question.deadline) {
    const now = new Date();
    const deadline = question.deadline.toDate();
    if (now > deadline) {
      throw new ValidationError("Answer deadline has passed", [
        {
          field: "deadline",
          message: `Deadline was ${deadline.toISOString()}. Current time is ${now.toISOString()}.`,
        },
      ]);
    }
  }

  // Use transaction to check for duplicates and create answer atomically
  const result = await db.runTransaction(async (transaction) => {
    // Check for existing answer from this guest for this question
    // Using sub-collection path: questions/{questionId}/answers/{guestId}
    const answerRef = db
      .collection(COLLECTIONS.QUESTIONS)
      .doc(data.questionId)
      .collection("answers")
      .doc(guestId);

    const existingAnswer = await transaction.get(answerRef);

    if (existingAnswer.exists) {
      throw new DuplicateError(
        "You have already submitted an answer for this question",
        [
          {
            field: "questionId",
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
    .collection("answers")
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
    .collection("answers")
    .where("isCorrect", "==", true)
    .orderBy("responseTimeMs", "asc")
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
 * Get worst 10 slowest correct answers for a question
 * Reads from sub-collection: questions/{questionId}/answers
 * Handles ties: includes all participants with same response time as 10th position
 */
export async function getWorst10CorrectAnswers(
  questionId: string
): Promise<Answer[]> {
  // Fetch all correct answers (to handle ties and fewer-than-10 cases)
  const snapshot = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId)
    .collection("answers")
    .where("isCorrect", "==", true)
    .orderBy("responseTimeMs", "desc")
    .get();

  const allCorrectAnswers = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      submittedAt:
        data.submittedAt?.toDate?.() || data.submittedAt || new Date(),
    } as Answer;
  });

  // T021: Handle fewer than 10 correct answers - return all
  if (allCorrectAnswers.length <= 10) {
    return allCorrectAnswers;
  }

  // T020: Handle ties at 10th position
  // Get the response time of the 10th slowest answer (index 9)
  const tenthSlowTime = allCorrectAnswers[9].responseTimeMs;

  // Include all answers with response time >= 10th position time (handles ties)
  const worst10WithTies = allCorrectAnswers.filter(
    (answer) => answer.responseTimeMs >= tenthSlowTime
  );

  return worst10WithTies;
}
