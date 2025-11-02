/**
 * Game state service
 * Business logic for host game control and state management
 */

import { db, admin } from '../utils/firestore';
import { COLLECTIONS } from '../models/firestoreCollections';
import { GameActionInput } from '../models/validators';
import { GameState, GamePhase, GameResults } from '@allstars/types';
import { ValidationError, NotFoundError } from '../utils/errors';
import {
  getTop10CorrectAnswers,
  getWorst10IncorrectAnswers,
} from './answerService';
import { getGuestById } from './guestService';
import { getQuestionById } from './questionService';

const GAME_STATE_DOC_ID = 'live';

/**
 * Advance game state based on host action
 * Uses Firestore transaction to prevent race conditions
 */
export async function advanceGame(
  action: GameActionInput
): Promise<GameState> {
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
        phase: 'idle',
        activeQuestionId: null,
        isGongActive: false,
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
    const newState = await processAction(
      currentState,
      action,
      transaction
    );

    // Update game state in transaction
    transaction.set(gameStateRef, {
      phase: newState.phase,
      activeQuestionId: newState.activeQuestionId,
      isGongActive: newState.isGongActive,
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
  transaction: FirebaseFirestore.Transaction
): Promise<GameState> {
  switch (action.action) {
    case 'START_QUESTION':
      return handleStartQuestion(currentState, action);

    case 'TRIGGER_GONG':
      return handleTriggerGong(currentState);

    case 'SHOW_DISTRIBUTION':
      return handleShowDistribution(currentState);

    case 'SHOW_CORRECT_ANSWER':
      return handleShowCorrectAnswer(currentState);

    case 'SHOW_RESULTS':
      return await handleShowResults(currentState);

    case 'REVIVE_ALL':
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
    throw new ValidationError('questionId is required in payload', [
      { field: 'payload.questionId', message: 'Question ID is required' },
    ]);
  }

  // Verify question exists
  const question = await getQuestionById(questionId);
  if (!question) {
    throw new NotFoundError('Question not found', [
      { field: 'questionId', message: `No question found with ID "${questionId}"` },
    ]);
  }

  return {
    ...state,
    phase: 'accepting_answers',
    activeQuestionId: questionId,
    isGongActive: false,
    results: null,
  };
}

/**
 * TRIGGER_GONG: Activate gong sound effect
 */
function handleTriggerGong(state: GameState): GameState {
  return {
    ...state,
    isGongActive: true,
  };
}

/**
 * SHOW_DISTRIBUTION: Show answer distribution
 */
function handleShowDistribution(state: GameState): GameState {
  if (state.phase !== 'accepting_answers') {
    throw new ValidationError(
      'Cannot show distribution - no active question',
      [
        {
          field: 'phase',
          message: 'Must be in accepting_answers phase to show distribution',
        },
      ]
    );
  }

  return {
    ...state,
    phase: 'showing_distribution',
    isGongActive: false,
  };
}

/**
 * SHOW_CORRECT_ANSWER: Reveal the correct answer
 */
function handleShowCorrectAnswer(state: GameState): GameState {
  if (state.phase !== 'showing_distribution') {
    throw new ValidationError(
      'Cannot show correct answer - must show distribution first',
      [
        {
          field: 'phase',
          message: 'Must be in showing_distribution phase to show correct answer',
        },
      ]
    );
  }

  return {
    ...state,
    phase: 'showing_correct_answer',
  };
}

/**
 * SHOW_RESULTS: Calculate and show top/worst 10 with guest names
 * US3: Handles prize carryover when all guests answer incorrectly
 */
async function handleShowResults(state: GameState): Promise<GameState> {
  if (state.phase !== 'showing_correct_answer') {
    throw new ValidationError(
      'Cannot show results - must show correct answer first',
      [
        {
          field: 'phase',
          message: 'Must be in showing_correct_answer phase to show results',
        },
      ]
    );
  }

  if (!state.activeQuestionId) {
    throw new ValidationError('No active question', [
      { field: 'activeQuestionId', message: 'Active question ID is null' },
    ]);
  }

  // Get top 10 correct answers
  const top10Answers = await getTop10CorrectAnswers(state.activeQuestionId);

  // Get worst 10 incorrect answers
  const worst10Answers = await getWorst10IncorrectAnswers(
    state.activeQuestionId
  );

  // US3: Check if all guests answered incorrectly
  const allIncorrect = top10Answers.length === 0;

  // Base prize for each question
  const BASE_PRIZE = 10000;

  // US3: Calculate new prizeCarryover
  let newPrizeCarryover: number;
  let newPhase: GamePhase;

  if (allIncorrect) {
    // US3: All incorrect - add prize to carryover and set special phase
    newPrizeCarryover = state.prizeCarryover + BASE_PRIZE;
    newPhase = 'all_incorrect';
  } else {
    // US3: At least one correct - reset carryover to 0
    newPrizeCarryover = 0;
    newPhase = 'showing_results';
  }

  // Hydrate with guest names
  const top10 = await Promise.all(
    top10Answers.map(async (answer) => {
      const guest = await getGuestById(answer.guestId);
      return {
        guestId: answer.guestId,
        guestName: guest?.name || 'Unknown',
        responseTimeMs: answer.responseTimeMs,
      };
    })
  );

  const worst10 = await Promise.all(
    worst10Answers.map(async (answer) => {
      const guest = await getGuestById(answer.guestId);
      return {
        guestId: answer.guestId,
        guestName: guest?.name || 'Unknown',
        responseTimeMs: answer.responseTimeMs,
      };
    })
  );

  const results: GameResults = {
    top10,
    worst10,
  };

  return {
    ...state,
    phase: newPhase,
    results,
    prizeCarryover: newPrizeCarryover,
  };
}

/**
 * REVIVE_ALL: Revive all dropped guests
 */
async function handleReviveAll(state: GameState): Promise<GameState> {
  // Get all dropped guests
  const droppedSnapshot = await db
    .collection(COLLECTIONS.GUESTS)
    .where('status', '==', 'dropped')
    .get();

  if (!droppedSnapshot.empty) {
    // Use batch update
    const batch = db.batch();
    droppedSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'active' });
    });
    await batch.commit();
  }

  // State doesn't change, just return current state
  return state;
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
      phase: 'idle',
      activeQuestionId: null,
      isGongActive: false,
      results: null,
      prizeCarryover: 0,
    };
  }

  return {
    id: gameStateDoc.id,
    ...gameStateDoc.data(),
  } as GameState;
}
