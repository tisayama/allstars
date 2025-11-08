/**
 * Test data factories for dynamic test data generation
 * Feature: 008-e2e-playwright-tests
 *
 * Provides factory functions to generate test questions, guests, and game states
 * with sensible defaults and easy customization.
 */

import type { TestQuestion, TestGuest, TestGameState } from './index';
import type { GamePeriod, GamePhase } from '@allstars/types';

/**
 * Question factory - generates test questions dynamically
 */
export class QuestionFactory {
  private static counter = 0;

  /**
   * Create a general question with custom options
   * This is the most flexible factory method
   */
  static createGeneral(options: {
    questionText: string;
    options: string[]; // Array of choice letters like ['A', 'B', 'C', 'D']
    correctAnswer: string; // Letter of correct answer like 'A' or 'B'
    questionNumber?: number;
    period?: GamePeriod;
    skipAttributes?: string[];
  }): TestQuestion {
    const {
      questionText,
      options: choiceLetters,
      correctAnswer,
      questionNumber = ++this.counter,
      period = 'first-half',
      skipAttributes = [],
    } = options;

    // Build choices from the provided letters
    const choices = choiceLetters.map((letter, index) => ({
      index,
      text: `${letter}. Choice ${letter}`,
    }));

    // Find the correct choice based on the letter
    const correctChoiceText = choices.find(
      (choice) => choice.text.startsWith(correctAnswer)
    )?.text || `${correctAnswer}. Choice ${correctAnswer}`;

    return {
      testId: `Q${questionNumber}_GENERAL`,
      questionText,
      choices,
      correctAnswer: correctChoiceText,
      period,
      questionNumber,
      skipAttributes,
    };
  }

  /**
   * Create a 4-choice question with specified parameters
   */
  static create4Choice(options: {
    questionNumber?: number;
    period?: GamePeriod;
    correctChoiceIndex?: number; // 0-3
    skipAttributes?: string[];
    questionText?: string;
  } = {}): TestQuestion {
    const {
      questionNumber = ++this.counter,
      period = 'first-half',
      correctChoiceIndex = 1, // Default: B is correct
      skipAttributes = [],
      questionText = `Question ${questionNumber}?`,
    } = options;

    const choices = [
      { index: 0, text: 'A. Choice A' },
      { index: 1, text: 'B. Choice B' },
      { index: 2, text: 'C. Choice C' },
      { index: 3, text: 'D. Choice D' },
    ];

    const correctChoice = choices[correctChoiceIndex];

    return {
      testId: `Q${questionNumber}_FACTORY`,
      questionText,
      choices,
      correctAnswer: correctChoice.text,
      period,
      questionNumber,
      skipAttributes,
    };
  }

  /**
   * Create multiple questions in sequence
   */
  static createMany(count: number, options: {
    period?: GamePeriod;
    startNumber?: number;
    skipAttributes?: string[];
  } = {}): TestQuestion[] {
    const { period = 'first-half', startNumber = 1, skipAttributes = [] } = options;

    return Array.from({ length: count }, (_, i) =>
      this.create4Choice({
        questionNumber: startNumber + i,
        period,
        skipAttributes,
        correctChoiceIndex: i % 4, // Vary correct answers
      })
    );
  }

  /**
   * Create a period-final question (for gong mechanics)
   */
  static createPeriodFinal(options: {
    period?: GamePeriod;
    questionNumber?: number;
  } = {}): TestQuestion {
    const { period = 'first-half', questionNumber = 5 } = options;

    return this.create4Choice({
      questionNumber,
      period,
      questionText: `Period-final question for ${period}`,
      correctChoiceIndex: 0,
    });
  }

  /**
   * Create a question where all choices are "wrong" (for all-incorrect flow)
   */
  static createAllWrong(options: {
    questionNumber?: number;
    period?: GamePeriod;
  } = {}): TestQuestion {
    const { questionNumber = ++this.counter, period = 'first-half' } = options;

    return {
      testId: `Q${questionNumber}_ALL_WRONG`,
      questionText: `Question ${questionNumber} - all choices wrong`,
      choices: [
        { index: 0, text: 'A. Wrong' },
        { index: 1, text: 'B. Wrong' },
        { index: 2, text: 'C. Wrong' },
        { index: 3, text: 'D. Correct (but guests will answer A/B/C)' },
      ],
      correctAnswer: 'D. Correct (but guests will answer A/B/C)',
      period,
      questionNumber,
      skipAttributes: [],
    };
  }

  /**
   * Create a question with skip logic for specific attributes
   */
  static createWithSkipLogic(options: {
    questionNumber?: number;
    skipAttributes: string[];
  }): TestQuestion {
    const { questionNumber = ++this.counter, skipAttributes } = options;

    return this.create4Choice({
      questionNumber,
      questionText: `Question ${questionNumber} - skip for: ${skipAttributes.join(', ')}`,
      skipAttributes,
    });
  }

  /**
   * Reset counter (useful for test isolation)
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}

/**
 * Guest factory - generates test guests dynamically
 */
export class GuestFactory {
  private static counter = 0;

  /**
   * Create a normal active guest
   */
  static createNormal(options: {
    name?: string;
    attributes?: string[];
  } = {}): TestGuest {
    const { name = `Guest ${++this.counter}`, attributes = [] } = options;

    return {
      testId: `GUEST_${this.counter}_FACTORY`,
      name,
      status: 'active',
      attributes,
      authMethod: 'anonymous',
    };
  }

  /**
   * Create a guest with specific attributes
   */
  static createWithAttributes(attributes: string[], name?: string): TestGuest {
    return this.createNormal({
      name: name || `Guest with ${attributes.join(', ')}`,
      attributes,
    });
  }

  /**
   * Create a dropped guest
   */
  static createDropped(name?: string): TestGuest {
    return {
      testId: `GUEST_${++this.counter}_DROPPED`,
      name: name || `Dropped Guest ${this.counter}`,
      status: 'dropped',
      attributes: [],
      authMethod: 'anonymous',
    };
  }

  /**
   * Create multiple guests with sequential names
   */
  static createMany(count: number, options: {
    prefix?: string;
    attributes?: string[];
  } = {}): TestGuest[] {
    const { prefix = 'Guest', attributes = [] } = options;

    return Array.from({ length: count }, (_, i) =>
      this.createNormal({
        name: `${prefix} ${i + 1}`,
        attributes,
      })
    );
  }

  /**
   * Create a speech guest (common use case)
   */
  static createSpeechGuest(name?: string): TestGuest {
    return this.createWithAttributes(['speech_guest'], name);
  }

  /**
   * Create a mix of guests with different attributes
   */
  static createMixed(count: number): TestGuest[] {
    const attributeOptions = [
      [],
      ['speech_guest'],
      ['age-under-20'],
      ['gender-male'],
      ['speech_guest', 'age-under-20'],
    ];

    return Array.from({ length: count }, (_, i) =>
      this.createNormal({
        name: `Mixed Guest ${i + 1}`,
        attributes: attributeOptions[i % attributeOptions.length],
      })
    );
  }

  /**
   * Reset counter (useful for test isolation)
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}

/**
 * Game state factory - generates test game states dynamically
 */
export class GameStateFactory {
  /**
   * Create initial ready state
   */
  static createReady(): TestGameState {
    return {
      testId: 'STATE_READY',
      currentPhase: 'ready_for_next',
      currentQuestion: null,
    };
  }

  /**
   * Create accepting answers state
   */
  static createAcceptingAnswers(question: TestQuestion): TestGameState {
    return {
      testId: 'STATE_ACCEPTING',
      currentPhase: 'accepting_answers',
      currentQuestion: {
        questionId: `question-${question.questionNumber}`,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        period: question.period,
        questionNumber: question.questionNumber,
        skipAttributes: question.skipAttributes || [],
      },
    };
  }

  /**
   * Create showing distribution state
   */
  static createShowingDistribution(question: TestQuestion): TestGameState {
    return {
      testId: 'STATE_DISTRIBUTION',
      currentPhase: 'showing_distribution',
      currentQuestion: {
        questionId: `question-${question.questionNumber}`,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        period: question.period,
        questionNumber: question.questionNumber,
        skipAttributes: question.skipAttributes || [],
      },
    };
  }

  /**
   * Create showing correct answer state
   */
  static createShowingCorrect(question: TestQuestion): TestGameState {
    return {
      testId: 'STATE_CORRECT',
      currentPhase: 'showing_correct_answer',
      currentQuestion: {
        questionId: `question-${question.questionNumber}`,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        period: question.period,
        questionNumber: question.questionNumber,
        skipAttributes: question.skipAttributes || [],
      },
    };
  }

  /**
   * Create all incorrect state
   */
  static createAllIncorrect(question: TestQuestion): TestGameState {
    return {
      testId: 'STATE_ALL_INCORRECT',
      currentPhase: 'all_incorrect',
      currentQuestion: {
        questionId: `question-${question.questionNumber}`,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        period: question.period,
        questionNumber: question.questionNumber,
        skipAttributes: question.skipAttributes || [],
      },
    };
  }

  /**
   * Create custom state with specific phase
   */
  static createCustom(phase: GamePhase, question?: TestQuestion): TestGameState {
    return {
      testId: `STATE_${phase.toUpperCase()}`,
      currentPhase: phase,
      currentQuestion: question ? {
        questionId: `question-${question.questionNumber}`,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        period: question.period,
        questionNumber: question.questionNumber,
        skipAttributes: question.skipAttributes || [],
      } : null,
    };
  }
}

/**
 * Convenience function to reset all factory counters
 */
export function resetAllCounters(): void {
  QuestionFactory.resetCounter();
  GuestFactory.resetCounter();
}
