/**
 * Game Flow E2E Tests
 * Feature: 008-e2e-playwright-tests
 * User Story 2: Multi-app coordination during live game
 *
 * Tests real-time synchronization between host, projector, and participant apps
 * via WebSocket connections and Firestore state updates.
 */

import { test, expect } from '../fixtures';
import { QUESTION_4CHOICE_EASY, GUEST_A, GUEST_B, GUEST_C, STATE_READY_FOR_NEXT } from '../fixtures/index';
import type { TestQuestion, TestGuest } from '../fixtures/index';

test.describe('@P1 Game Flow - Multi-App Coordination (User Story 2)', () => {
  test('AS1: Host starts question → Projector and participants see it in real-time', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Seed question and guests
    const question: TestQuestion = {
      ...QUESTION_4CHOICE_EASY,
      questionNumber: 1,
    };

    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests([GUEST_A, GUEST_B], collectionPrefix);

    // Setup: Initialize game state
    await seeder.seedGameState(STATE_READY_FOR_NEXT, collectionPrefix);

    // Create browser contexts for each app
    const projectorContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const hostContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const guest1Context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12 Pro
    });

    const guest2Context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });

    // Navigate each app
    const projectorPage = await projectorContext.newPage();
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();

    await projectorPage.goto('http://localhost:5175'); // projector-app
    await hostPage.goto('http://localhost:5174'); // host-app
    await guest1Page.goto(guests[0].joinUrl); // participant-app with join token
    await guest2Page.goto(guests[1].joinUrl);

    // Verify initial state - all apps show "ready for next question"
    // TODO: Once UI implements state display:
    // await expect(projectorPage.locator('[data-testid="game-phase"]')).toHaveText('ready_for_next');
    // await expect(hostPage.locator('[data-testid="game-phase"]')).toHaveText('ready_for_next');

    // Host action: Start question
    // TODO: Once host UI implements question start:
    // await hostPage.click('[data-testid="start-question-btn"]');

    // Verify projector updates (WebSocket sync)
    // TODO: Verify projector shows question text and choices
    // await expect(projectorPage.locator('[data-testid="question-text"]')).toHaveText(question.questionText);
    // await expect(projectorPage.locator('[data-testid="choice-A"]')).toBeVisible();

    // Verify participants can answer (WebSocket sync)
    // TODO: Verify answer buttons are enabled
    // await expect(guest1Page.locator('[data-testid="answer-button-A"]')).toBeEnabled();
    // await expect(guest2Page.locator('[data-testid="answer-button-B"]')).toBeEnabled();

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
    await guest1Context.close();
    await guest2Context.close();
  });

  test('AS2: Guests submit answers → Host sees real-time answer count', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Seed question and 3 guests
    const question: TestQuestion = {
      ...QUESTION_4CHOICE_EASY,
      questionNumber: 1,
    };

    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests([GUEST_A, GUEST_B, GUEST_C], collectionPrefix);

    // Create contexts
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    const guest3Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    const guest3Page = await guest3Context.newPage();

    // Navigate
    await hostPage.goto('http://localhost:5174');
    await guest1Page.goto(guests[0].joinUrl);
    await guest2Page.goto(guests[1].joinUrl);
    await guest3Page.goto(guests[2].joinUrl);

    // TODO: Once UI is implemented:
    // 1. Host starts question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. Guests submit answers sequentially
    // await guest1Page.click('[data-testid="answer-button-A"]');
    // Wait for WebSocket sync
    // await expect(hostPage.locator('[data-testid="answer-count"]')).toHaveText('1 / 3');

    // await guest2Page.click('[data-testid="answer-button-B"]');
    // await expect(hostPage.locator('[data-testid="answer-count"]')).toHaveText('2 / 3');

    // await guest3Page.click('[data-testid="answer-button-A"]');
    // await expect(hostPage.locator('[data-testid="answer-count"]')).toHaveText('3 / 3');

    // 3. Verify host can proceed after all answers received
    // await expect(hostPage.locator('[data-testid="show-results-btn"]')).toBeEnabled();

    // Cleanup
    await hostContext.close();
    await guest1Context.close();
    await guest2Context.close();
    await guest3Context.close();
  });

  test('AS3: Host shows distribution → Projector displays answer breakdown', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      ...QUESTION_4CHOICE_EASY,
      questionNumber: 1,
    };

    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGuests([GUEST_A, GUEST_B, GUEST_C], collectionPrefix);

    // Create contexts
    const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostContext = await browser.newContext();

    const projectorPage = await projectorContext.newPage();
    const hostPage = await hostContext.newPage();

    await projectorPage.goto('http://localhost:5175');
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host clicks "Show Distribution"
    // await hostPage.click('[data-testid="show-distribution-btn"]');

    // 2. Verify projector shows answer distribution chart
    // await expect(projectorPage.locator('[data-testid="distribution-chart"]')).toBeVisible();

    // 3. Verify percentages displayed (e.g., "A: 66%, B: 33%")
    // const choiceA = projectorPage.locator('[data-testid="choice-A-percentage"]');
    // await expect(choiceA).toHaveText('66%'); // 2 out of 3 answered A

    // 4. Verify correct answer NOT revealed yet
    // await expect(projectorPage.locator('[data-testid="correct-indicator"]')).not.toBeVisible();

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
  });

  test('AS4: Host reveals correct answer → Projector highlights correct choice', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const question: TestQuestion = {
      testId: 'Q_CORRECT_REVEAL',
      questionText: 'What is the correct answer?',
      choices: [
        { index: 0, text: 'A. Wrong' },
        { index: 1, text: 'B. Correct' }, // This is correct
        { index: 2, text: 'C. Wrong' },
        { index: 3, text: 'D. Wrong' },
      ],
      correctAnswer: 'B. Correct',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question], collectionPrefix);

    // Create contexts
    const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostContext = await browser.newContext();

    const projectorPage = await projectorContext.newPage();
    const hostPage = await hostContext.newPage();

    await projectorPage.goto('http://localhost:5175');
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host clicks "Show Correct Answer"
    // await hostPage.click('[data-testid="show-correct-answer-btn"]');

    // 2. Verify projector highlights correct choice (B)
    // const choiceB = projectorPage.locator('[data-testid="choice-B"]');
    // await expect(choiceB).toHaveClass(/correct/);
    // await expect(choiceB).toHaveCSS('background-color', 'rgb(34, 197, 94)'); // green

    // 3. Verify incorrect choices are dimmed
    // const choiceA = projectorPage.locator('[data-testid="choice-A"]');
    // await expect(choiceA).toHaveClass(/incorrect/);

    // 4. Verify correct answer indicator shown
    // await expect(projectorPage.locator('[data-testid="correct-indicator"]')).toBeVisible();

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
  });

  test('AS5: WebSocket reconnection after network interruption', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    await seeder.seedQuestions([QUESTION_4CHOICE_EASY], collectionPrefix);
    const guests = await seeder.seedGuests([GUEST_A], collectionPrefix);

    // Create context
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto(guests[0].joinUrl);

    // TODO: Once WebSocket connection is implemented:
    // 1. Verify initial connection
    // await expect(guestPage.locator('[data-testid="connection-status"]')).toHaveText('Connected');

    // 2. Simulate network interruption (go offline)
    // await guestContext.setOffline(true);

    // 3. Verify disconnection indicator
    // await expect(guestPage.locator('[data-testid="connection-status"]')).toHaveText('Disconnected');

    // 4. Restore network (go online)
    // await guestContext.setOffline(false);

    // 5. Verify automatic reconnection
    // await expect(guestPage.locator('[data-testid="connection-status"]')).toHaveText('Connected', {
    //   timeout: 10000, // Allow time for reconnection
    // });

    // 6. Verify state is still in sync after reconnection
    // (Guest should see current question if game is in progress)

    // Cleanup
    await guestContext.close();
  });

  test('AS6: Concurrent question flow with multiple guests', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create 10 guests to simulate real event load
    const bulkGuests = Array.from({ length: 10 }, (_, i) => ({
      testId: `GUEST_${i}`,
      name: `Guest ${i + 1}`,
      status: 'active' as const,
      attributes: [],
      authMethod: 'anonymous' as const,
    }));

    await seeder.seedQuestions([QUESTION_4CHOICE_EASY], collectionPrefix);
    const seededGuests = await seeder.seedGuests(bulkGuests, collectionPrefix);

    // Create contexts for all guests
    const guestContexts = await Promise.all(
      seededGuests.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
    );

    const guestPages = await Promise.all(
      guestContexts.map((ctx, i) =>
        ctx.newPage().then((page) => page.goto(seededGuests[i].joinUrl).then(() => page))
      )
    );

    // TODO: Once UI is implemented:
    // 1. All guests submit answers concurrently
    // const answerPromises = guestPages.map((page, i) => {
    //   const choice = ['A', 'B', 'C', 'D'][i % 4]; // Distribute answers
    //   return page.click(`[data-testid="answer-button-${choice}"]`);
    // });
    // await Promise.all(answerPromises);

    // 2. Verify all answers recorded
    // (Check via Firestore or host UI answer count)

    // 3. Verify no race conditions or dropped answers

    // Cleanup
    await Promise.all(guestContexts.map((ctx) => ctx.close()));
  });
});
