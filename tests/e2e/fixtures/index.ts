/**
 * Test fixture types and pre-defined test data
 * Feature: 008-e2e-playwright-tests
 */

import type { Question, GamePeriod } from '@allstars/types';
import type { Guest, GuestStatus } from '@allstars/types';
import type { GameState, GamePhase } from '@allstars/types';

/**
 * Test question fixture (extends production Question interface)
 */
export interface TestQuestion extends Omit<Question, 'questionId'> {
  /** Test-friendly identifier (e.g., "Q1_EASY_4CHOICE") */
  testId: string;
  /** Optional description for test readability */
  description?: string;
}

/**
 * Test guest fixture (extends production Guest interface)
 */
export interface TestGuest extends Omit<Guest, 'id'> {
  /** Test-friendly identifier (e.g., "GUEST_A") */
  testId: string;
  /** Optional description for test readability */
  description?: string;
}

/**
 * Test game state fixture (extends production GameState interface)
 */
export interface TestGameState extends Partial<GameState> {
  /** Test-friendly identifier (e.g., "STATE_READY_FOR_NEXT") */
  testId: string;
  /** Optional description for test readability */
  description?: string;
}

// Pre-defined test questions
export const QUESTION_4CHOICE_EASY: TestQuestion = {
  testId: 'Q1_EASY_4CHOICE',
  description: 'Easy 4-choice question for basic flow testing',
  questionText: 'What is the capital of France?',
  choices: [
    { index: 0, text: 'A. London' },
    { index: 1, text: 'B. Paris' },
    { index: 2, text: 'C. Berlin' },
    { index: 3, text: 'D. Madrid' },
  ],
  correctAnswer: 'B. Paris',
  period: 'first-half',
  questionNumber: 1,
  skipAttributes: [],
};

// Pre-defined test guests
export const GUEST_A: TestGuest = {
  testId: 'GUEST_A',
  description: 'Normal guest with no special attributes',
  name: 'Guest A',
  status: 'active',
  attributes: [],
  authMethod: 'anonymous',
};

export const GUEST_B: TestGuest = {
  testId: 'GUEST_B',
  description: 'Guest with age-under-20 attribute',
  name: 'Guest B',
  status: 'active',
  attributes: ['age-under-20'],
  authMethod: 'anonymous',
};

export const GUEST_C: TestGuest = {
  testId: 'GUEST_C',
  description: 'Guest with gender-male attribute',
  name: 'Guest C',
  status: 'active',
  attributes: ['gender-male'],
  authMethod: 'anonymous',
};

// Pre-defined game states
export const STATE_READY_FOR_NEXT: TestGameState = {
  testId: 'STATE_READY_FOR_NEXT',
  description: 'Initial state before any questions started',
  currentPhase: 'ready_for_next',
  currentQuestion: null,
};
