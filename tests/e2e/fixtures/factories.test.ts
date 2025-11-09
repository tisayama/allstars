/**
 * Unit tests for test data factories
 * Feature: 001-system-e2e-tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionFactory, GuestFactory, GameStateFactory, resetAllCounters } from './factories';

describe('QuestionFactory', () => {
  beforeEach(() => {
    QuestionFactory.resetCounter();
  });

  describe('create4Choice', () => {
    it('should create a question with 4 choices', () => {
      const question = QuestionFactory.create4Choice();

      expect(question).toBeDefined();
      expect(question.choices).toHaveLength(4);
      expect(question.choices[0].index).toBe(0);
      expect(question.choices[3].index).toBe(3);
    });

    it('should use correct answer from choices', () => {
      const question = QuestionFactory.create4Choice({ correctChoiceIndex: 2 });

      expect(question.correctAnswer).toContain('C');
    });

    it('should allow custom question text', () => {
      const question = QuestionFactory.create4Choice({
        questionText: 'Custom question?',
      });

      expect(question.questionText).toBe('Custom question?');
    });
  });

  describe('createMany', () => {
    it('should create multiple questions', () => {
      const questions = QuestionFactory.createMany(5);

      expect(questions).toHaveLength(5);
      expect(questions[0].questionNumber).toBe(1);
      expect(questions[4].questionNumber).toBe(5);
    });

    it('should vary correct answers across questions', () => {
      const questions = QuestionFactory.createMany(4);

      const correctAnswers = questions.map(q => q.correctAnswer);
      const uniqueAnswers = new Set(correctAnswers);

      // With 4 questions, we should have 4 different correct answers (A, B, C, D)
      expect(uniqueAnswers.size).toBe(4);
    });
  });

  describe('resetCounter', () => {
    it('should reset question numbering', () => {
      QuestionFactory.create4Choice();
      QuestionFactory.create4Choice();

      QuestionFactory.resetCounter();

      const question = QuestionFactory.create4Choice();
      expect(question.questionNumber).toBe(1);
    });
  });
});

describe('GuestFactory', () => {
  beforeEach(() => {
    GuestFactory.resetCounter();
  });

  describe('createNormal', () => {
    it('should create a guest with default values', () => {
      const guest = GuestFactory.createNormal();

      expect(guest).toBeDefined();
      expect(guest.status).toBe('active');
      expect(guest.authMethod).toBe('anonymous');
    });

    it('should allow custom name', () => {
      const guest = GuestFactory.createNormal({ name: 'Alice' });

      expect(guest.name).toBe('Alice');
    });

    it('should allow custom attributes', () => {
      const guest = GuestFactory.createNormal({
        attributes: ['speech_guest', 'age-under-20'],
      });

      expect(guest.attributes).toHaveLength(2);
      expect(guest.attributes).toContain('speech_guest');
    });
  });

  describe('createMany', () => {
    it('should create multiple guests', () => {
      const guests = GuestFactory.createMany(10);

      expect(guests).toHaveLength(10);
    });

    it('should create guests with unique names', () => {
      const guests = GuestFactory.createMany(5, { prefix: 'Participant' });

      const names = guests.map(g => g.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(5);
    });
  });

  describe('createDropped', () => {
    it('should create a dropped guest', () => {
      const guest = GuestFactory.createDropped();

      expect(guest.status).toBe('dropped');
    });
  });
});

describe('GameStateFactory', () => {
  describe('createReady', () => {
    it('should create ready state', () => {
      const state = GameStateFactory.createReady();

      expect(state.currentPhase).toBe('ready_for_next');
      expect(state.currentQuestion).toBeNull();
    });
  });

  describe('createAcceptingAnswers', () => {
    it('should create accepting answers state', () => {
      const question = QuestionFactory.create4Choice();
      const state = GameStateFactory.createAcceptingAnswers(question);

      expect(state.currentPhase).toBe('accepting_answers');
      expect(state.currentQuestion).not.toBeNull();
      expect(state.currentQuestion?.questionNumber).toBe(question.questionNumber);
    });
  });

  describe('createCustom', () => {
    it('should create custom state with specified phase', () => {
      const state = GameStateFactory.createCustom('showing_results');

      expect(state.currentPhase).toBe('showing_results');
    });
  });
});

describe('resetAllCounters', () => {
  it('should reset all factory counters', () => {
    QuestionFactory.create4Choice();
    GuestFactory.createNormal();

    resetAllCounters();

    const question = QuestionFactory.create4Choice();
    const guest = GuestFactory.createNormal();

    expect(question.questionNumber).toBe(1);
    expect(guest.name).toContain('Guest 1');
  });
});
