import type { GameState, Question, Guest } from '@allstars/types';

/**
 * Reusable test data templates for E2E tests
 *
 * Provides pre-configured test data objects for common scenarios
 * to ensure consistency across tests.
 */
export const TEST_DATA = {
  /**
   * Minimal game state for app initialization
   */
  INITIAL_GAME_STATE: {
    currentPhase: 'waiting' as const,
    isActive: false,
    currentQuestionId: null,
    currentPeriod: 1,
    currentRound: null,
    timeRemaining: null,
    gongActivatedAt: null,
    activeGuests: [],
    roundHistory: []
  } as GameState,

  /**
   * Active question state for testing question display
   */
  ACTIVE_QUESTION_STATE: {
    currentPhase: 'showing_question' as const,
    isActive: true,
    currentQuestionId: 'q001',
    currentPeriod: 1,
    currentRound: 1,
    timeRemaining: 10,
    gongActivatedAt: null,
    activeGuests: ['guest-001', 'guest-002'],
    roundHistory: []
  } as GameState,

  /**
   * Distribution phase state for testing answer distribution
   */
  DISTRIBUTION_STATE: {
    currentPhase: 'showing_distribution' as const,
    isActive: true,
    currentQuestionId: 'q001',
    currentPeriod: 1,
    currentRound: 1,
    timeRemaining: null,
    gongActivatedAt: null,
    activeGuests: ['guest-001', 'guest-002'],
    roundHistory: []
  } as GameState,

  /**
   * Results phase state for testing results display
   */
  RESULTS_STATE: {
    currentPhase: 'showing_results' as const,
    isActive: true,
    currentQuestionId: 'q001',
    currentPeriod: 1,
    currentRound: 1,
    timeRemaining: null,
    gongActivatedAt: null,
    activeGuests: ['guest-001', 'guest-002'],
    roundHistory: []
  } as GameState,

  /**
   * Sample question for testing
   */
  SAMPLE_QUESTION: {
    id: 'q001',
    text: '日本の首都はどこですか？',
    choices: {
      A: '東京',
      B: '大阪',
      C: '京都',
      D: '名古屋'
    },
    correctAnswer: 'A',
    category: 'geography',
    difficulty: 'easy',
    points: 10,
    period: 1
  } as Question,

  /**
   * Alternative sample question for multi-question scenarios
   */
  SAMPLE_QUESTION_2: {
    id: 'q002',
    text: '日本の最高峰は何ですか？',
    choices: {
      A: '富士山',
      B: '北岳',
      C: '槍ヶ岳',
      D: '穂高岳'
    },
    correctAnswer: 'A',
    category: 'geography',
    difficulty: 'medium',
    points: 15,
    period: 1
  } as Question,

  /**
   * Sample guest for testing
   */
  SAMPLE_GUEST: {
    id: 'guest-001',
    name: 'テストゲスト1',
    status: 'active' as const,
    currentScore: 0,
    answers: [],
    joinedAt: Date.now()
  } as Guest,

  /**
   * Second sample guest for multi-guest scenarios
   */
  SAMPLE_GUEST_2: {
    id: 'guest-002',
    name: 'テストゲスト2',
    status: 'active' as const,
    currentScore: 50,
    answers: [],
    joinedAt: Date.now()
  } as Guest,

  /**
   * Guest with answers for testing score calculation
   */
  GUEST_WITH_ANSWERS: {
    id: 'guest-003',
    name: 'テストゲスト3',
    status: 'active' as const,
    currentScore: 100,
    answers: [
      { questionId: 'q001', answer: 'A', isCorrect: true, points: 10 }
    ],
    joinedAt: Date.now()
  } as Guest
};
