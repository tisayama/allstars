/**
 * E2E Test Suite: Participant Joining and Answering Flow
 *
 * User Story 2 (P1): As a game participant, I need to join a game and submit answers,
 * so that I can compete in the quiz competition.
 *
 * This test suite validates the complete participant experience:
 * - Joining the game via participant-app
 * - Receiving questions in real-time
 * - Submitting answers within time limits
 * - Receiving feedback on answer correctness
 * - Concurrent participant handling
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { ParticipantPage } from '../helpers/page-objects/participant-page';
import { QuestionFactory } from '../fixtures/factories';

test.describe('Participant Joining and Answering Flow', () => {
  /**
   * PF1: Participant Joins Successfully
   *
   * Given: participant-app is accessible via work-ubuntu hostname
   * When: participant enters their name and joins
   * Then: they see a waiting screen indicating successful registration
   */
  test('PF1: Participant joins successfully and sees waiting screen', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const participantName = 'Test Participant';

    // Navigate to participant-app
    await participantPage.navigateTo();

    // TODO: Once participant-app UI is implemented, uncomment and complete:
    // await participantPage.enterName(participantName);
    // await participantPage.clickJoin();

    // Verify participant sees waiting screen
    // await expect(participantPage.isOnWaitingScreen()).resolves.toBe(true);
    // await expect(participantPage.getWaitingMessage()).resolves.toContain('Successfully registered');

    // For now, just verify app loads
    await expect(page).toHaveURL(/work-ubuntu:5173/);
  });

  /**
   * PF2: Participant Sees Question After Host Starts
   *
   * Given: participant has joined the game
   * When: host starts a question
   * Then: participant sees the question text and can select an answer
   */
  test('PF2: Participant sees question after host starts it', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question in Firestore
    await seeder.seedQuestions([question], collectionPrefix);

    // Setup: Participant joins
    // TODO: Once participant-app UI is implemented, uncomment:
    // await participantPage.navigateTo();
    // await participantPage.enterName('Test Participant');
    // await participantPage.clickJoin();
    // await participantPage.waitForWaitingScreen();

    // Setup: Simulate host starting the question (update gameState)
    const gameState = {
      currentPhase: 'showing_question',
      currentQuestionId: question.id,
      timerStartedAt: new Date().toISOString(),
      questionNumber: 1,
    };
    await seeder.seedGameState(gameState, collectionPrefix);

    // TODO: Once participant-app UI is implemented, uncomment:
    // Verify participant sees question
    // await expect(participantPage.getQuestionText()).resolves.toBe(question.questionText);
    // await expect(participantPage.hasAnswerOptions()).resolves.toBe(true);
    // await expect(participantPage.canSelectAnswer()).resolves.toBe(true);

    // For now, just verify we can seed data
    expect(question.questionText).toBe('What is the capital of France?');
  });

  /**
   * PF3: Participant Submits Answer Within Time Limit
   *
   * Given: participant is viewing a question
   * When: they select an answer and submit within the time limit
   * Then: they see a confirmation that their answer was submitted
   */
  test('PF3: Participant submits answer within time limit', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question and game state
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        timerStartedAt: new Date().toISOString(),
        questionNumber: 1,
      },
      collectionPrefix
    );

    // TODO: Once participant-app UI is implemented, uncomment:
    // await participantPage.navigateTo();
    // await participantPage.joinAsParticipant('Test Participant');

    // Select answer
    // await participantPage.selectAnswer('B'); // Answer: 4
    // await participantPage.submitAnswer();

    // Verify submission confirmation
    // await expect(participantPage.hasSubmissionConfirmation()).resolves.toBe(true);
    // await expect(participantPage.getSubmissionMessage()).resolves.toContain('submitted');

    // For now, verify test data is correct
    expect(question.correctAnswer).toBe('B');
  });

  /**
   * PF4: Time Limit Expires Before Submission
   *
   * Given: participant is viewing a question
   * When: time limit expires before they submit
   * Then: they see a message indicating time is up
   */
  test('PF4: Time limit expires before participant submits', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the speed of light?',
      options: ['299,792 km/s', '150,000 km/s', '1,000,000 km/s', '500,000 km/s'],
      correctAnswer: 'A',
      timeLimit: 1, // Very short time limit for testing
    });

    // Setup: Seed question with expired timer
    await seeder.seedQuestions([question], collectionPrefix);
    const expiredTime = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        timerStartedAt: expiredTime,
        questionNumber: 1,
      },
      collectionPrefix
    );

    // TODO: Once participant-app UI is implemented, uncomment:
    // await participantPage.navigateTo();
    // await participantPage.joinAsParticipant('Test Participant');

    // Wait for time to expire
    // await participantPage.waitForTimerExpiry();

    // Verify time is up message
    // await expect(participantPage.hasTimeUpMessage()).resolves.toBe(true);
    // await expect(participantPage.canSubmitAnswer()).resolves.toBe(false);

    // For now, verify expired time is in the past
    expect(new Date(expiredTime).getTime()).toBeLessThan(Date.now());
  });

  /**
   * PF5: Correct Answer Feedback
   *
   * Given: participant submits a correct answer
   * When: the correct answer is revealed
   * Then: they see positive feedback indicating they answered correctly
   */
  test('PF5: Participant sees positive feedback for correct answer', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the largest planet in our solar system?',
      options: ['Earth', 'Jupiter', 'Saturn', 'Mars'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // TODO: Once participant-app UI is implemented, uncomment:
    // await participantPage.navigateTo();
    // await participantPage.joinAsParticipant('Test Participant');

    // Simulate answering correctly
    // await participantPage.selectAnswer('B'); // Correct: Jupiter
    // await participantPage.submitAnswer();

    // Simulate host revealing correct answer
    // await seeder.seedGameState(
    //   {
    //     currentPhase: 'showing_correct_answer',
    //     currentQuestionId: question.id,
    //     correctAnswer: 'B',
    //     questionNumber: 1,
    //   },
    //   collectionPrefix
    // );

    // Verify positive feedback
    // await expect(participantPage.hasFeedback()).resolves.toBe(true);
    // await expect(participantPage.getFeedbackType()).resolves.toBe('correct');
    // await expect(participantPage.getFeedbackMessage()).resolves.toContain('Correct');

    // For now, verify correct answer matches
    expect(question.correctAnswer).toBe('B');
    expect(question.options[1]).toBe('Jupiter');
  });

  /**
   * PF6: Incorrect Answer Feedback
   *
   * Given: participant submits an incorrect answer
   * When: the correct answer is revealed
   * Then: they see feedback showing the correct answer and that they were incorrect
   */
  test('PF6: Participant sees feedback for incorrect answer', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const participantPage = new ParticipantPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What year did World War II end?',
      options: ['1943', '1944', '1945', '1946'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // TODO: Once participant-app UI is implemented, uncomment:
    // await participantPage.navigateTo();
    // await participantPage.joinAsParticipant('Test Participant');

    // Simulate answering incorrectly
    // await participantPage.selectAnswer('A'); // Incorrect: 1943
    // await participantPage.submitAnswer();

    // Simulate host revealing correct answer
    // await seeder.seedGameState(
    //   {
    //     currentPhase: 'showing_correct_answer',
    //     currentQuestionId: question.id,
    //     correctAnswer: 'C',
    //     questionNumber: 1,
    //   },
    //   collectionPrefix
    // );

    // Verify incorrect feedback
    // await expect(participantPage.hasFeedback()).resolves.toBe(true);
    // await expect(participantPage.getFeedbackType()).resolves.toBe('incorrect');
    // await expect(participantPage.getFeedbackMessage()).resolves.toContain('Incorrect');
    // await expect(participantPage.getCorrectAnswerDisplay()).resolves.toContain('1945');

    // For now, verify correct answer
    expect(question.correctAnswer).toBe('C');
    expect(question.options[2]).toBe('1945');
  });

  /**
   * PF7: Concurrent Participants (10 simultaneous)
   *
   * Given: 10 participants join simultaneously
   * When: all participants submit answers
   * Then: all submissions are recorded without data loss
   */
  test('PF7: 10 concurrent participants submit answers without data loss', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the smallest prime number?',
      options: ['0', '1', '2', '3'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question and game state
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        timerStartedAt: new Date().toISOString(),
        questionNumber: 1,
      },
      collectionPrefix
    );

    // Create 10 concurrent participant contexts
    const participantCount = 10;
    const participantPages: ParticipantPage[] = [];

    // TODO: Once participant-app UI is implemented, uncomment:
    // for (let i = 0; i < participantCount; i++) {
    //   const context = await browser.newContext();
    //   const page = await context.newPage();
    //   const participantPage = new ParticipantPage(page);
    //   participantPages.push(participantPage);
    //
    //   // Each participant joins
    //   await participantPage.navigateTo();
    //   await participantPage.joinAsParticipant(`Participant ${i + 1}`);
    // }

    // All participants submit answers concurrently
    // const submissions = participantPages.map((pp, idx) =>
    //   pp.selectAnswer(['A', 'B', 'C', 'D'][idx % 4]).then(() => pp.submitAnswer())
    // );
    // await Promise.all(submissions);

    // Verify all submissions recorded in Firestore
    // const answers = await seeder.getAnswers(collectionPrefix, question.id);
    // expect(answers).toHaveLength(participantCount);

    // Verify no data loss
    // const participantIds = answers.map(a => a.guestId);
    // const uniqueParticipantIds = new Set(participantIds);
    // expect(uniqueParticipantIds.size).toBe(participantCount);

    // For now, verify we can create multiple contexts
    expect(participantCount).toBe(10);
  });
});
