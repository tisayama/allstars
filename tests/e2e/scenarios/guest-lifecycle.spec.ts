/**
 * Guest Lifecycle E2E Tests
 * Feature: 008-e2e-playwright-tests
 * User Story 4: Guest drop, revive, and reconnection flows
 *
 * Tests guest lifecycle management including elimination, revival,
 * reconnection after disconnection, and waiting room management.
 */

import { test, expect } from '../fixtures';
import type { TestQuestion, TestGuest } from '../fixtures/index';

test.describe('@P2 Guest Lifecycle Management (User Story 4)', () => {
  test('AS1: Dropped guest can view game progress but cannot answer', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_DROPPED_GUEST',
      questionText: 'Question after guest is dropped',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest with dropped status
    const droppedGuest: TestGuest = {
      testId: 'GUEST_DROPPED',
      name: 'Dropped Guest',
      status: 'dropped', // Already dropped
      attributes: [],
      authMethod: 'anonymous',
    };

    const [seededGuest] = await seeder.seedGuests([droppedGuest], collectionPrefix);

    // Create contexts
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(seededGuest.joinUrl);

    // TODO: Once UI is implemented:
    // 1. Verify guest sees "eliminated" status
    // await expect(guestPage.locator('[data-testid="elimination-status"]')).toBeVisible();
    // await expect(guestPage.locator('[data-testid="elimination-status"]'))
    //   .toHaveText('You have been eliminated');

    // 2. Verify guest can still see question text
    // await expect(guestPage.locator('[data-testid="question-text"]')).toBeVisible();

    // 3. Verify answer buttons are disabled
    // await expect(guestPage.locator('[data-testid="answer-button-A"]')).toBeDisabled();
    // await expect(guestPage.locator('[data-testid="answer-button-B"]')).toBeDisabled();

    // 4. Verify guest can see correct answer when revealed
    // (after host shows results)

    // 5. Verify guest sees remaining active guests count
    // await expect(guestPage.locator('[data-testid="active-guests-count"]')).toBeVisible();

    // Cleanup
    await guestContext.close();
  });

  test('AS2: Host revives dropped guest → Guest becomes active and can answer', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_REVIVE_GUEST',
      questionText: 'Question after guest is revived',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'second-half',
      questionNumber: 6,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    // Create dropped guest
    const droppedGuest: TestGuest = {
      testId: 'GUEST_TO_REVIVE',
      name: 'Guest To Revive',
      status: 'dropped',
      attributes: [],
      authMethod: 'anonymous',
    };

    const [seededGuest] = await seeder.seedGuests([droppedGuest], collectionPrefix);

    // Create contexts
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await hostPage.goto('http://localhost:5174');
    await guestPage.goto(seededGuest.joinUrl);

    // TODO: Once UI is implemented:
    // 1. Verify guest initially shows "eliminated" status
    // await expect(guestPage.locator('[data-testid="elimination-status"]')).toBeVisible();

    // 2. Host navigates to guest management
    // await hostPage.click('[data-testid="manage-guests-btn"]');

    // 3. Host clicks "Revive" button for the dropped guest
    // await hostPage.click('[data-testid="revive-guest-Guest To Revive"]');

    // 4. Verify guest status updates to "active" (via WebSocket)
    // await expect(guestPage.locator('[data-testid="elimination-status"]')).not.toBeVisible();
    // await expect(guestPage.locator('[data-testid="active-status"]')).toBeVisible();

    // 5. Host starts next question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 6. Verify guest can now answer
    // await expect(guestPage.locator('[data-testid="answer-button-A"]')).toBeEnabled();
    // await guestPage.click('[data-testid="answer-button-A"]');

    // 7. Verify answer is recorded
    // await expect(guestPage.locator('[data-testid="answer-locked"]')).toBeVisible();

    // Cleanup
    await hostContext.close();
    await guestContext.close();
  });

  test('AS3: Guest reconnects after network interruption and resumes game', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_RECONNECT',
      questionText: 'Question during reconnection test',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 3,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    const guest: TestGuest = {
      testId: 'GUEST_RECONNECT',
      name: 'Reconnecting Guest',
      status: 'active',
      attributes: [],
      authMethod: 'anonymous',
    };

    const [seededGuest] = await seeder.seedGuests([guest], collectionPrefix);

    // Create context
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(seededGuest.joinUrl);

    // TODO: Once UI is implemented:
    // 1. Verify initial connection
    // await expect(guestPage.locator('[data-testid="connection-status"]')).toHaveText('Connected');

    // 2. Question is active
    // await expect(guestPage.locator('[data-testid="question-text"]')).toBeVisible();

    // 3. Simulate network interruption
    // await guestContext.setOffline(true);

    // 4. Verify disconnection indicator appears
    // await expect(guestPage.locator('[data-testid="connection-status"]'))
    //   .toHaveText('Disconnected', { timeout: 5000 });
    // await expect(guestPage.locator('[data-testid="reconnecting-message"]')).toBeVisible();

    // 5. Restore network
    // await guestContext.setOffline(false);

    // 6. Verify automatic reconnection
    // await expect(guestPage.locator('[data-testid="connection-status"]'))
    //   .toHaveText('Connected', { timeout: 10000 });

    // 7. Verify game state is synchronized after reconnection
    // await expect(guestPage.locator('[data-testid="question-text"]')).toBeVisible();
    // await expect(guestPage.locator('[data-testid="question-text"]'))
    //   .toHaveText(question.questionText);

    // 8. Verify guest can submit answer after reconnection
    // await expect(guestPage.locator('[data-testid="answer-button-A"]')).toBeEnabled();

    // Cleanup
    await guestContext.close();
  });

  test('AS4: Guest reconnects with same join token → Previous session restored', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_SESSION_RESTORE',
      questionText: 'Question for session restoration test',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 2,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    const guest: TestGuest = {
      testId: 'GUEST_SESSION',
      name: 'Session Test Guest',
      status: 'active',
      attributes: [],
      authMethod: 'anonymous',
    };

    const [seededGuest] = await seeder.seedGuests([guest], collectionPrefix);

    // First session: Guest connects and answers
    const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const firstPage = await firstContext.newPage();

    await firstPage.goto(seededGuest.joinUrl);

    // TODO: Once UI is implemented:
    // 1. Guest submits answer in first session
    // await firstPage.click('[data-testid="answer-button-A"]');
    // await expect(firstPage.locator('[data-testid="answer-locked"]')).toBeVisible();

    // 2. Close first session (simulate browser close)
    await firstContext.close();

    // Second session: Guest reconnects with same join token
    const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const secondPage = await secondContext.newPage();

    await secondPage.goto(seededGuest.joinUrl); // Same join URL

    // 3. Verify guest identity restored
    // await expect(secondPage.locator('[data-testid="guest-name"]'))
    //   .toHaveText('Session Test Guest');

    // 4. Verify previous answer is shown as locked
    // await expect(secondPage.locator('[data-testid="answer-locked"]')).toBeVisible();
    // await expect(secondPage.locator('[data-testid="selected-answer"]')).toHaveText('A');

    // 5. Verify guest cannot submit different answer
    // await expect(secondPage.locator('[data-testid="answer-button-B"]')).toBeDisabled();

    // Cleanup
    await secondContext.close();
  });

  test('AS5: All guests revived at once when all answered incorrectly', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create question
    const question: TestQuestion = {
      testId: 'Q_ALL_REVIVE',
      questionText: 'Question where all answer incorrectly',
      choices: [
        { index: 0, text: 'A. Wrong' },
        { index: 1, text: 'B. Wrong' },
        { index: 2, text: 'C. Correct' },
      ],
      correctAnswer: 'C. Correct',
      period: 'first-half',
      questionNumber: 4,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    // Create 3 guests (mix of active and dropped)
    const guests: TestGuest[] = [
      {
        testId: 'GUEST_1',
        name: 'Guest 1',
        status: 'active',
        attributes: [],
        authMethod: 'anonymous',
      },
      {
        testId: 'GUEST_2',
        name: 'Guest 2',
        status: 'active',
        attributes: [],
        authMethod: 'anonymous',
      },
      {
        testId: 'GUEST_3_DROPPED',
        name: 'Guest 3',
        status: 'dropped', // Already dropped from previous question
        attributes: [],
        authMethod: 'anonymous',
      },
    ];

    const seededGuests = await seeder.seedGuests(guests, collectionPrefix);

    // Create contexts
    const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostContext = await browser.newContext();
    const guestContexts = await Promise.all(
      seededGuests.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
    );

    const projectorPage = await projectorContext.newPage();
    const hostPage = await hostContext.newPage();
    const guestPages = await Promise.all(
      guestContexts.map((ctx, i) =>
        ctx.newPage().then((page) => page.goto(seededGuests[i].joinUrl).then(() => page))
      )
    );

    await projectorPage.goto('http://localhost:5175');
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host starts question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. All ACTIVE guests answer incorrectly (A or B, not C)
    // await guestPages[0].click('[data-testid="answer-button-A"]');
    // await guestPages[1].click('[data-testid="answer-button-B"]');
    // (Guest 3 is dropped, cannot answer)

    // 3. Host shows results
    // await hostPage.click('[data-testid="show-results-btn"]');

    // 4. Verify "All Incorrect" state triggered
    // await expect(projectorPage.locator('[data-testid="all-incorrect-message"]')).toBeVisible();

    // 5. Verify ALL guests (including previously dropped) are revived
    // await expect(projectorPage.locator('[data-testid="all-revived-message"]')).toBeVisible();

    // 6. Verify all guests show active status
    // await expect(guestPages[0].locator('[data-testid="active-status"]')).toBeVisible();
    // await expect(guestPages[1].locator('[data-testid="active-status"]')).toBeVisible();
    // await expect(guestPages[2].locator('[data-testid="active-status"]')).toBeVisible();

    // 7. Verify all can answer next question
    // (Move to next question and verify answer buttons enabled)

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
    await Promise.all(guestContexts.map((ctx) => ctx.close()));
  });

  test('AS6: Waiting room displays for guests who join after game starts', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_LATE_JOIN',
      questionText: 'Question already in progress',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    // Setup initial game state: game already started
    await seeder.seedGameState(
      {
        testId: 'STATE_GAME_IN_PROGRESS',
        currentPhase: 'accepting_answers',
        currentQuestion: {
          questionId: 'question-1',
          questionText: question.questionText,
          choices: question.choices,
          correctAnswer: question.correctAnswer,
          period: question.period,
          questionNumber: question.questionNumber,
          skipAttributes: question.skipAttributes || [],
        },
      },
      collectionPrefix
    );

    // Create late-joining guest
    const lateGuest: TestGuest = {
      testId: 'GUEST_LATE',
      name: 'Late Arriving Guest',
      status: 'active',
      attributes: [],
      authMethod: 'anonymous',
    };

    const [seededGuest] = await seeder.seedGuests([lateGuest], collectionPrefix);

    // Create context
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(seededGuest.joinUrl);

    // TODO: Once UI is implemented:
    // 1. Verify guest sees waiting room message
    // await expect(guestPage.locator('[data-testid="waiting-room"]')).toBeVisible();
    // await expect(guestPage.locator('[data-testid="waiting-room-message"]'))
    //   .toHaveText('Game in progress. You will join at the next question.');

    // 2. Verify guest can see current question (read-only)
    // await expect(guestPage.locator('[data-testid="question-preview"]')).toBeVisible();

    // 3. Verify answer buttons are disabled
    // await expect(guestPage.locator('[data-testid="answer-button-A"]')).toBeDisabled();

    // 4. Verify "Waiting to join..." indicator
    // await expect(guestPage.locator('[data-testid="waiting-indicator"]')).toBeVisible();

    // 5. When host moves to next question, verify guest becomes active
    // (Simulate host clicking "Next Question")
    // await expect(guestPage.locator('[data-testid="waiting-room"]')).not.toBeVisible();
    // await expect(guestPage.locator('[data-testid="answer-button-A"]')).toBeEnabled();

    // Cleanup
    await guestContext.close();
  });
});
