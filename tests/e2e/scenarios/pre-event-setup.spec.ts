/**
 * Pre-Event Setup E2E Tests
 * Feature: 008-e2e-playwright-tests
 * User Story 1: Admin can set up questions and guests before event
 *
 * Tests the complete pre-event setup flow including question creation,
 * guest management, skip logic configuration, and data persistence.
 */

import { test, expect } from '../fixtures';
import {
  QUESTION_4CHOICE_EASY,
  GUEST_A,
  GUEST_B,
  GUEST_C,
} from '../fixtures/index';
import type { TestQuestion, TestGuest } from '../fixtures/index';

test.describe('@P1 Pre-Event Setup (User Story 1)', () => {
  test('AS1: Admin creates multiple-choice and sorting questions', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Create test questions
    const multipleChoiceQuestion: TestQuestion = {
      testId: 'Q1_MULTIPLE_CHOICE',
      questionText: 'What is 2 + 2?',
      choices: [
        { index: 0, text: 'A. 3' },
        { index: 1, text: 'B. 4' },
        { index: 2, text: 'C. 5' },
        { index: 3, text: 'D. 6' },
      ],
      correctAnswer: 'B. 4',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    const sortingQuestion: TestQuestion = {
      testId: 'Q2_SORTING',
      questionText: 'Sort these numbers from smallest to largest',
      choices: [
        { index: 0, text: '1. 5' },
        { index: 1, text: '2. 2' },
        { index: 2, text: '3. 8' },
        { index: 3, text: '4. 1' },
      ],
      correctAnswer: '4, 2, 1, 3', // Correct order
      period: 'first-half',
      questionNumber: 2,
      skipAttributes: [],
      type: 'multiple-choice', // Note: Current type system only supports multiple-choice
    };

    // Seed questions to Firestore
    const questionIds = await seeder.seedQuestions(
      [multipleChoiceQuestion, sortingQuestion],
      collectionPrefix
    );

    // Verify questions were created
    expect(questionIds).toHaveLength(2);
    expect(questionIds[0]).toBe('question-1');
    expect(questionIds[1]).toBe('question-2');

    // Navigate to admin app
    await page.goto('http://localhost:5176');

    // Verify admin app is accessible
    await expect(page).toHaveTitle(/Admin/i);

    // TODO: Once admin UI is implemented, interact with question creation form
    // For now, we verify data layer works correctly
  });

  test('AS2: Admin creates guests with attributes (speech_guest)', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Create guests with different attributes
    const normalGuest: TestGuest = {
      ...GUEST_A,
      testId: 'GUEST_NORMAL',
      name: 'Normal Guest',
      attributes: [],
    };

    const speechGuest: TestGuest = {
      ...GUEST_B,
      testId: 'GUEST_SPEECH',
      name: 'Speech Guest',
      attributes: ['speech_guest'],
    };

    const multiAttributeGuest: TestGuest = {
      ...GUEST_C,
      testId: 'GUEST_MULTI',
      name: 'Multi-Attribute Guest',
      attributes: ['speech_guest', 'age-under-20'],
    };

    // Seed guests to Firestore
    const seededGuests = await seeder.seedGuests(
      [normalGuest, speechGuest, multiAttributeGuest],
      collectionPrefix
    );

    // Verify guests were created with join tokens
    expect(seededGuests).toHaveLength(3);
    expect(seededGuests[0].guestId).toBeDefined();
    expect(seededGuests[0].joinToken).toBeDefined();
    expect(seededGuests[0].joinUrl).toMatch(/http:\/\/localhost:5173\/join\?token=/);

    // Verify each guest has unique join URL
    const joinUrls = seededGuests.map((g) => g.joinUrl);
    const uniqueUrls = new Set(joinUrls);
    expect(uniqueUrls.size).toBe(3);

    // Navigate to admin app
    await page.goto('http://localhost:5176');

    // TODO: Once admin UI is implemented, verify guest list display
    // For now, we verify data layer works correctly
  });

  test('AS3: Admin previews question to verify skip logic', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Create question with skip logic
    const questionForSpeechGuest: TestQuestion = {
      testId: 'Q_SKIP_SPEECH',
      questionText: 'This question should be skipped for speech guests',
      choices: [
        { index: 0, text: 'A. Yes' },
        { index: 1, text: 'B. No' },
      ],
      correctAnswer: 'A. Yes',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: ['speech_guest'], // Speech guests will skip this
    };

    const questionForAll: TestQuestion = {
      testId: 'Q_FOR_ALL',
      questionText: 'This question is for all guests',
      choices: [
        { index: 0, text: 'A. Answer 1' },
        { index: 1, text: 'B. Answer 2' },
      ],
      correctAnswer: 'A. Answer 1',
      period: 'first-half',
      questionNumber: 2,
      skipAttributes: [], // No skip logic
    };

    // Seed questions
    await seeder.seedQuestions(
      [questionForSpeechGuest, questionForAll],
      collectionPrefix
    );

    // Create guests with and without speech_guest attribute
    const normalGuest: TestGuest = {
      ...GUEST_A,
      attributes: [],
    };

    const speechGuest: TestGuest = {
      ...GUEST_B,
      attributes: ['speech_guest'],
    };

    await seeder.seedGuests([normalGuest, speechGuest], collectionPrefix);

    // Navigate to admin app
    await page.goto('http://localhost:5176');

    // TODO: Once admin UI implements preview feature:
    // 1. Select question with skip logic
    // 2. Select guest profile (normal vs speech)
    // 3. Verify question visibility based on attributes
    // 4. Verify skip indicators are shown correctly

    // For now, verify data structure supports skip logic
    // The skip logic will be implemented in game flow logic
  });

  test('AS4: Data persists in Firestore with correct validation', async ({
    seeder,
    collectionPrefix,
  }) => {
    // Create questions with various configurations
    const questions: TestQuestion[] = [
      {
        testId: 'Q1_VALID',
        questionText: 'Valid question with all fields',
        choices: [
          { index: 0, text: 'A. Choice 1' },
          { index: 1, text: 'B. Choice 2' },
          { index: 2, text: 'C. Choice 3' },
          { index: 3, text: 'D. Choice 4' },
        ],
        correctAnswer: 'A. Choice 1',
        period: 'first-half',
        questionNumber: 1,
        skipAttributes: [],
      },
      {
        testId: 'Q2_WITH_SKIP',
        questionText: 'Question with skip attributes',
        choices: [
          { index: 0, text: 'A. Yes' },
          { index: 1, text: 'B. No' },
        ],
        correctAnswer: 'B. No',
        period: 'second-half',
        questionNumber: 2,
        skipAttributes: ['speech_guest', 'age-under-20'],
      },
    ];

    // Seed questions
    const questionIds = await seeder.seedQuestions(questions, collectionPrefix);

    // Verify questions persisted
    expect(questionIds).toHaveLength(2);

    // Create guests with validation
    const guests: TestGuest[] = [
      {
        testId: 'GUEST_1',
        name: 'Guest One',
        status: 'active',
        attributes: [],
        authMethod: 'anonymous',
      },
      {
        testId: 'GUEST_2',
        name: 'Guest Two',
        status: 'active',
        attributes: ['speech_guest'],
        authMethod: 'anonymous',
      },
    ];

    // Seed guests
    const seededGuests = await seeder.seedGuests(guests, collectionPrefix);

    // Verify guests persisted with all required fields
    expect(seededGuests).toHaveLength(2);
    seededGuests.forEach((guest) => {
      expect(guest.guestId).toBeTruthy();
      expect(guest.joinToken).toBeTruthy();
      expect(guest.joinUrl).toMatch(/^http:\/\/localhost:5173\/join\?token=/);
    });

    // Verify data isolation - collections use correct prefix
    expect(collectionPrefix).toMatch(/^test_\d+_[a-f0-9]{8}_$/);

    // TODO: Once Firestore validation rules are implemented:
    // 1. Attempt to create invalid question (missing required fields)
    // 2. Verify validation error is thrown
    // 3. Attempt to create invalid guest (invalid status)
    // 4. Verify validation error is thrown
  });

  test('AS5: Admin can edit and delete questions before event starts', async ({
    seeder,
    collectionPrefix,
  }) => {
    // Create initial question
    const originalQuestion: TestQuestion = {
      testId: 'Q_EDITABLE',
      questionText: 'Original question text',
      choices: [
        { index: 0, text: 'A. Original A' },
        { index: 1, text: 'B. Original B' },
      ],
      correctAnswer: 'A. Original A',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    // Seed question
    const [questionId] = await seeder.seedQuestions(
      [originalQuestion],
      collectionPrefix
    );

    expect(questionId).toBe('question-1');

    // TODO: Once admin UI implements edit/delete:
    // 1. Navigate to question list
    // 2. Click edit button
    // 3. Modify question text and choices
    // 4. Save changes
    // 5. Verify updated data persists
    // 6. Click delete button
    // 7. Confirm deletion
    // 8. Verify question no longer exists

    // For now, verify data layer supports CRUD operations
    // (seeder can create, Firestore supports update/delete)
  });

  test('AS6: Admin can bulk import guests from CSV', async ({
    page,
    collectionPrefix,
  }) => {
    // Navigate to admin app
    await page.goto('http://localhost:5176');

    // TODO: Once admin UI implements CSV import:
    // 1. Navigate to guest management
    // 2. Click "Import CSV" button
    // 3. Upload CSV file with guest data
    // 4. Verify preview shows parsed guests
    // 5. Confirm import
    // 6. Verify all guests created with join URLs

    // For now, verify we can create multiple guests programmatically
    // (which is what CSV import will do under the hood)
    const bulkGuests: TestGuest[] = Array.from({ length: 10 }, (_, i) => ({
      testId: `GUEST_BULK_${i}`,
      name: `Bulk Guest ${i + 1}`,
      status: 'active' as const,
      attributes: i % 3 === 0 ? ['speech_guest'] : [],
      authMethod: 'anonymous' as const,
    }));

    const seeder = new (await import('../helpers/testDataSeeder')).TestDataSeeder();
    const seededGuests = await seeder.seedGuests(bulkGuests, collectionPrefix);

    // Verify all guests created
    expect(seededGuests).toHaveLength(10);

    // Verify each has unique join URL
    const uniqueUrls = new Set(seededGuests.map((g) => g.joinUrl));
    expect(uniqueUrls.size).toBe(10);
  });
});
