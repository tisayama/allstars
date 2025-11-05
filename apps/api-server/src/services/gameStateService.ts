/**
 * Game state service
 * Business logic for host game control and state management
 */

import { db, admin } from "../utils/firestore";
import { COLLECTIONS } from "../models/firestoreCollections";
import { GameActionInput } from "../models/validators";
import {
  GameState,
  GamePhase,
  GameResults,
  GamePeriod,
  Answer,
} from "@allstars/types";
import { ValidationError, NotFoundError } from "../utils/errors";
import {
  getTop10CorrectAnswers,
  getWorst10CorrectAnswers,
} from "./answerService";
import { Timestamp } from "firebase-admin/firestore";
import { getGuestById } from "./guestService";
import { getQuestionById } from "./questionService";
import { withRetry } from "../utils/retry";

const GAME_STATE_DOC_ID = "live";

/**
 * Calculate rankings with retry logic for fault tolerance
 * T052: Wraps ranking calculation in retry wrapper with exponential backoff
 * T053-T054: Handles failures gracefully with rankingError flag
 */
async function calculateRankingsWithRetry(questionId: string): Promise<{
  top10Answers: Answer[];
  worst10Answers: Answer[];
  rankingError?: boolean;
}> {
  try {
    // T052: Wrap in retry with 3 attempts
    const { top10Answers, worst10Answers } = await withRetry(
      async () => {
        const top10 = await getTop10CorrectAnswers(questionId);
        const worst10 = await getWorst10CorrectAnswers(questionId);
        return { top10Answers: top10, worst10Answers: worst10 };
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
      }
    );

    return { top10Answers, worst10Answers };
  } catch (error) {
    // T054: All retries exhausted - set rankingError and empty arrays
    // T056: Log error with full context
    console.error("[Ranking Calculation Error]", {
      questionId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      top10Answers: [],
      worst10Answers: [],
      rankingError: true,
    };
  }
}

/**
 * Advance game state based on host action
 * Uses Firestore transaction to prevent race conditions
 */
export async function advanceGame(action: GameActionInput): Promise<GameState> {
  const result = await db.runTransaction(async (transaction) => {
    // Get current game state
    const gameStateRef = db
      .collection(COLLECTIONS.GAME_STATE)
      .doc(GAME_STATE_DOC_ID);
    const gameStateDoc = await transaction.get(gameStateRef);

    let currentState: GameState;

    if (!gameStateDoc.exists) {
      // Initialize game state if it doesn't exist
      currentState = {
        id: GAME_STATE_DOC_ID,
        currentPhase: "ready_for_next",
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: Timestamp.now(),
        results: null,
        prizeCarryover: 0,
      };
    } else {
      currentState = {
        id: gameStateDoc.id,
        ...gameStateDoc.data(),
      } as GameState;
    }

    // Process action and calculate new state
    const newState = await processAction(currentState, action, transaction);

    // Update game state in transaction
    transaction.set(gameStateRef, {
      currentPhase: newState.currentPhase,
      currentQuestion: newState.currentQuestion,
      isGongActive: newState.isGongActive,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      results: newState.results,
      prizeCarryover: newState.prizeCarryover,
    });

    return newState;
  });

  return result;
}

/**
 * Process game action and return new state
 */
async function processAction(
  currentState: GameState,
  action: GameActionInput,
  _transaction: FirebaseFirestore.Transaction
): Promise<GameState> {
  switch (action.action) {
    case "START_QUESTION":
      return handleStartQuestion(currentState, action);

    case "TRIGGER_GONG":
      return handleTriggerGong(currentState);

    case "SHOW_DISTRIBUTION":
      return handleShowDistribution(currentState);

    case "SHOW_CORRECT_ANSWER":
      return handleShowCorrectAnswer(currentState);

    case "SHOW_RESULTS":
      return await handleShowResults(currentState);

    case "REVIVE_ALL":
      return await handleReviveAll(currentState);

    default:
      throw new ValidationError(`Unknown action: ${action.action}`, []);
  }
}

/**
 * START_QUESTION: Start accepting answers for a question
 */
async function handleStartQuestion(
  state: GameState,
  action: GameActionInput
): Promise<GameState> {
  const questionId = action.payload?.questionId;

  if (!questionId) {
    throw new ValidationError("questionId is required in payload", [
      { field: "payload.questionId", message: "Question ID is required" },
    ]);
  }

  // Verify question exists and get full question object
  const question = await getQuestionById(questionId);
  if (!question) {
    throw new NotFoundError("Question not found", [
      {
        field: "questionId",
        message: `No question found with ID "${questionId}"`,
      },
    ]);
  }

  return {
    ...state,
    currentPhase: "accepting_answers",
    currentQuestion: question,
    isGongActive: false,
    results: null,
  };
}

/**
 * TRIGGER_GONG: Activate gong sound effect
 * US4: Validates that gong is still active/available
 */
function handleTriggerGong(state: GameState): GameState {
  // US4: Validate gong is still active (not already consumed/deactivated)
  if (!state.isGongActive) {
    throw new ValidationError("Gong is no longer active", [
      {
        field: "isGongActive",
        message: "Gong has been deactivated and cannot be triggered",
      },
    ]);
  }

  // Gong is active, keep it active (idempotent trigger for sound effect)
  return {
    ...state,
    isGongActive: true,
  };
}

/**
 * SHOW_DISTRIBUTION: Show answer distribution
 */
function handleShowDistribution(state: GameState): GameState {
  if (state.currentPhase !== "accepting_answers") {
    throw new ValidationError("Cannot show distribution - no active question", [
      {
        field: "currentPhase",
        message: "Must be in accepting_answers phase to show distribution",
      },
    ]);
  }

  return {
    ...state,
    currentPhase: "showing_distribution",
    isGongActive: false,
  };
}

/**
 * SHOW_CORRECT_ANSWER: Reveal the correct answer
 */
function handleShowCorrectAnswer(state: GameState): GameState {
  if (state.currentPhase !== "showing_distribution") {
    throw new ValidationError(
      "Cannot show correct answer - must show distribution first",
      [
        {
          field: "currentPhase",
          message:
            "Must be in showing_distribution phase to show correct answer",
        },
      ]
    );
  }

  return {
    ...state,
    currentPhase: "showing_correct_answer",
  };
}

/**
 * SHOW_RESULTS: Calculate and show top/worst 10 with guest names
 * US3: Handles prize carryover when all guests answer incorrectly
 * US4: Handles gong trigger elimination of worst performer(s)
 */
async function handleShowResults(state: GameState): Promise<GameState> {
  if (state.currentPhase !== "showing_correct_answer") {
    throw new ValidationError(
      "Cannot show results - must show correct answer first",
      [
        {
          field: "currentPhase",
          message: "Must be in showing_correct_answer phase to show results",
        },
      ]
    );
  }

  if (!state.currentQuestion) {
    throw new ValidationError("No active question", [
      { field: "currentQuestion", message: "Current question is null" },
    ]);
  }

  // T053: Calculate rankings with retry logic
  const { top10Answers, worst10Answers, rankingError } =
    await calculateRankingsWithRetry(state.currentQuestion.questionId);

  // US3: Check if all guests answered incorrectly
  const allIncorrect = top10Answers.length === 0;
  const allCorrect = worst10Answers.length === 0;
  const mixedAnswers = !allIncorrect && !allCorrect;

  // Base prize for each question
  const BASE_PRIZE = 10000;

  // US3: Calculate new prizeCarryover
  let newPrizeCarryover: number;
  let newPhase: GamePhase;

  if (allIncorrect) {
    // US3: All incorrect - add prize to carryover and set special phase
    newPrizeCarryover = (state.prizeCarryover || 0) + BASE_PRIZE;
    newPhase = "all_incorrect";
  } else {
    // US3: At least one correct - reset carryover to 0
    newPrizeCarryover = 0;
    newPhase = "showing_results";
  }

  // US4: Handle gong elimination (period-final questions only)
  if (state.isGongActive && mixedAnswers && worst10Answers.length > 0) {
    // Find the worst performer(s) - highest responseTimeMs among incorrect answers
    const worstTime = worst10Answers[0].responseTimeMs; // worst10 is sorted desc
    const worstPerformers = worst10Answers.filter(
      (answer) => answer.responseTimeMs === worstTime
    );

    // Drop worst performer(s) using batch update
    if (worstPerformers.length > 0) {
      const batch = db.batch();
      worstPerformers.forEach((answer) => {
        const guestRef = db.collection(COLLECTIONS.GUESTS).doc(answer.guestId);
        batch.update(guestRef, { status: "dropped" });
      });
      await batch.commit();
    }
  }

  // US3: Handle elimination for non-final questions (slowest correct answer participants)
  // T040-T044: Only eliminate on non-final questions, preserve all-incorrect logic
  if (!state.isGongActive && !allIncorrect && worst10Answers.length > 0) {
    // T041: Identify slowest participant from worst10 array (index 0)
    const slowestTime = worst10Answers[0].responseTimeMs; // worst10 is sorted desc

    // T042: Handle tied slowest participants (all with matching slowest time)
    const slowestPerformers = worst10Answers.filter(
      (answer) => answer.responseTimeMs === slowestTime
    );

    // Drop slowest performer(s) using batch update
    if (slowestPerformers.length > 0) {
      const batch = db.batch();
      slowestPerformers.forEach((answer) => {
        const guestRef = db.collection(COLLECTIONS.GUESTS).doc(answer.guestId);
        batch.update(guestRef, { status: "dropped" });
      });
      await batch.commit();
    }
  }

  // Hydrate with guest names
  const top10 = await Promise.all(
    top10Answers.map(async (answer) => {
      const guest = await getGuestById(answer.guestId);
      return {
        guestId: answer.guestId,
        guestName: guest?.name || "Unknown",
        responseTimeMs: answer.responseTimeMs,
      };
    })
  );

  const worst10 = await Promise.all(
    worst10Answers.map(async (answer) => {
      const guest = await getGuestById(answer.guestId);
      return {
        guestId: answer.guestId,
        guestName: guest?.name || "Unknown",
        responseTimeMs: answer.responseTimeMs,
      };
    })
  );

  // US2: Period Champion Designation
  // Only populate periodChampions and period for period-final questions (isGongActive: true)
  let periodChampions: string[] | undefined = undefined;
  let period: GamePeriod | undefined = undefined;

  if (state.isGongActive && top10Answers.length > 0) {
    // T030-T032: Get fastest correct answer time and find all participants with that time (handle ties)
    const fastestTime = top10Answers[0].responseTimeMs; // top10 is sorted ascending
    const champions = top10Answers.filter(
      (answer) => answer.responseTimeMs === fastestTime
    );

    // Populate periodChampions with guestIds
    periodChampions = champions.map((answer) => answer.guestId);

    // T031: Populate period field from currentQuestion.period
    period = state.currentQuestion.period;
  }

  const results: GameResults = {
    top10,
    worst10,
    ...(periodChampions && { periodChampions }), // T033: Only include if defined
    ...(period && { period }), // T033: Only include if defined
    ...(rankingError && { rankingError }), // T054: Include rankingError flag when present
  };

  // T057: Ensure game phase transitions to showing_results even with ranking error
  // If there was a ranking error but phase would be all_incorrect, keep showing_results for consistency
  const finalPhase = rankingError ? "showing_results" : newPhase;

  // US4: Deactivate gong after showing results (if it was active)
  const newIsGongActive = state.isGongActive ? false : state.isGongActive;

  return {
    ...state,
    currentPhase: finalPhase,
    results,
    prizeCarryover: newPrizeCarryover,
    isGongActive: newIsGongActive,
  };
}

/**
 * REVIVE_ALL: Revive all dropped guests
 * US5: Sets all dropped guests to active and transitions phase to all_revived
 */
async function handleReviveAll(state: GameState): Promise<GameState> {
  // Get all dropped guests
  const droppedSnapshot = await db
    .collection(COLLECTIONS.GUESTS)
    .where("status", "==", "dropped")
    .get();

  if (!droppedSnapshot.empty) {
    // Use batch update
    const batch = db.batch();
    droppedSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "active" });
    });
    await batch.commit();
  }

  // US5: Transition to all_revived phase
  return {
    ...state,
    currentPhase: "all_revived",
  };
}

/**
 * Get current game state
 */
export async function getCurrentGameState(): Promise<GameState> {
  const gameStateDoc = await db
    .collection(COLLECTIONS.GAME_STATE)
    .doc(GAME_STATE_DOC_ID)
    .get();

  if (!gameStateDoc.exists) {
    // Return default initial state
    return {
      id: GAME_STATE_DOC_ID,
      currentPhase: "ready_for_next",
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: Timestamp.now(),
      results: null,
      prizeCarryover: 0,
    };
  }

  return {
    id: gameStateDoc.id,
    ...gameStateDoc.data(),
  } as GameState;
}
