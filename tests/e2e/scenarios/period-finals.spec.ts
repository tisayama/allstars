/**
 * Period Finals and Gong Mechanics E2E Tests
 * Feature: 008-e2e-playwright-tests
 * User Story 3: Period finals with gong mechanics and prize carryover
 *
 * Tests the gong button functionality, period champion calculation,
 * and prize carryover between periods.
 */

import { test, expect } from '../fixtures';
import type { TestQuestion, TestGuest } from '../fixtures/index';

test.describe('@P1 Period Finals - Gong Mechanics (User Story 3)', () => {
  test('AS1: Host triggers gong during period-final question → All guests dropped except correct answerers', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create period-final question (first-half period)
    const periodFinalQuestion: TestQuestion = {
      testId: 'Q_PERIOD_FINAL',
      questionText: 'Period final question - gong will be triggered',
      choices: [
        { index: 0, text: 'A. Correct' },
        { index: 1, text: 'B. Wrong' },
        { index: 2, text: 'C. Wrong' },
        { index: 3, text: 'D. Wrong' },
      ],
      correctAnswer: 'A. Correct',
      period: 'first-half',
      questionNumber: 5, // Assume this is the period-final question
      skipAttributes: [],
    };

    await seeder.seedQuestions([periodFinalQuestion], collectionPrefix);

    // Create 4 guests
    const guests: TestGuest[] = Array.from({ length: 4 }, (_, i) => ({
      testId: `GUEST_${i}`,
      name: `Guest ${i + 1}`,
      status: 'active' as const,
      attributes: [],
      authMethod: 'anonymous' as const,
    }));

    const seededGuests = await seeder.seedGuests(guests, collectionPrefix);

    // Create contexts
    const hostContext = await browser.newContext();
    const guestContexts = await Promise.all(
      seededGuests.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
    );

    const hostPage = await hostContext.newPage();
    const guestPages = await Promise.all(
      guestContexts.map((ctx, i) =>
        ctx.newPage().then((page) => page.goto(seededGuests[i].joinUrl).then(() => page))
      )
    );

    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host starts period-final question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. Guests submit answers (2 correct, 2 wrong)
    // await guestPages[0].click('[data-testid="answer-button-A"]'); // Correct
    // await guestPages[1].click('[data-testid="answer-button-A"]'); // Correct
    // await guestPages[2].click('[data-testid="answer-button-B"]'); // Wrong
    // await guestPages[3].click('[data-testid="answer-button-C"]'); // Wrong

    // 3. Host triggers gong BEFORE showing results
    // await hostPage.click('[data-testid="gong-button"]');
    // await expect(hostPage.locator('[data-testid="gong-active-indicator"]')).toBeVisible();

    // 4. Host shows results
    // await hostPage.click('[data-testid="show-results-btn"]');

    // 5. Verify gong effect: Only guests with correct answers remain active
    // Guests 0 and 1 should be active, Guests 2 and 3 should be dropped
    // await expect(hostPage.locator('[data-testid="active-guests-count"]')).toHaveText('2');
    // await expect(hostPage.locator('[data-testid="dropped-guests-count"]')).toHaveText('2');

    // 6. Verify dropped guests see "You've been eliminated" message
    // await expect(guestPages[2].locator('[data-testid="elimination-message"]')).toBeVisible();
    // await expect(guestPages[3].locator('[data-testid="elimination-message"]')).toBeVisible();

    // Cleanup
    await hostContext.close();
    await Promise.all(guestContexts.map((ctx) => ctx.close()));
  });

  test('AS2: Host can undo gong activation before showing results', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup
    const periodFinalQuestion: TestQuestion = {
      testId: 'Q_PERIOD_FINAL_UNDO',
      questionText: 'Period final with gong undo',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 5,
      skipAttributes: [],
    };

    await seeder.seedQuestions([periodFinalQuestion], collectionPrefix);

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host starts period-final question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. Host triggers gong
    // await hostPage.click('[data-testid="gong-button"]');
    // await expect(hostPage.locator('[data-testid="gong-active-indicator"]')).toBeVisible();

    // 3. Host clicks "Undo Gong" before showing results
    // await hostPage.click('[data-testid="undo-gong-button"]');

    // 4. Verify gong is deactivated
    // await expect(hostPage.locator('[data-testid="gong-active-indicator"]')).not.toBeVisible();
    // await expect(hostPage.locator('[data-testid="gong-button"]')).toBeEnabled();

    // 5. Verify state returned to "distribution shown" (before gong)
    // await expect(hostPage.locator('[data-testid="game-phase"]')).toHaveText('showing_distribution');

    // Cleanup
    await hostContext.close();
  });

  test('AS3: Gong cannot be activated on non-period-final questions', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create regular question (not period-final)
    const regularQuestion: TestQuestion = {
      testId: 'Q_REGULAR',
      questionText: 'Regular question - gong should be disabled',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 3, // Not a period-final question
      skipAttributes: [],
    };

    await seeder.seedQuestions([regularQuestion], collectionPrefix);

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // 1. Host starts regular question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. Verify gong button is disabled or hidden
    // const gongButton = hostPage.locator('[data-testid="gong-button"]');
    // await expect(gongButton).toBeDisabled();
    // OR
    // await expect(gongButton).not.toBeVisible();

    // 3. Verify tooltip or message explains why gong is unavailable
    // await gongButton.hover();
    // await expect(hostPage.locator('[data-testid="gong-disabled-tooltip"]'))
    //   .toHaveText('Gong only available for period-final questions');

    // Cleanup
    await hostContext.close();
  });

  test('AS4: Period champion identified from period-final question (fastest correct)', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create period-final question
    const periodFinalQuestion: TestQuestion = {
      testId: 'Q_PERIOD_CHAMPION',
      questionText: 'Period final - determine champion',
      choices: [
        { index: 0, text: 'A. Correct' },
        { index: 1, text: 'B. Wrong' },
      ],
      correctAnswer: 'A. Correct',
      period: 'first-half',
      questionNumber: 5,
      skipAttributes: [],
    };

    await seeder.seedQuestions([periodFinalQuestion], collectionPrefix);

    // Create 3 guests
    const guests: TestGuest[] = Array.from({ length: 3 }, (_, i) => ({
      testId: `GUEST_${i}`,
      name: `Guest ${i + 1}`,
      status: 'active' as const,
      attributes: [],
      authMethod: 'anonymous' as const,
    }));

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
    // 1. Host starts period-final question
    // await hostPage.click('[data-testid="start-question-btn"]');

    // 2. Guests submit correct answers with different response times
    // (Guest 1 fastest, Guest 2 second, Guest 3 slowest)
    // await guestPages[0].click('[data-testid="answer-button-A"]'); // First (fastest)
    // await page.waitForTimeout(100);
    // await guestPages[1].click('[data-testid="answer-button-A"]'); // Second
    // await page.waitForTimeout(100);
    // await guestPages[2].click('[data-testid="answer-button-A"]'); // Third (slowest)

    // 3. Host shows results
    // await hostPage.click('[data-testid="show-results-btn"]');

    // 4. Verify projector shows "Period Champion: Guest 1"
    // await expect(projectorPage.locator('[data-testid="period-champion"]'))
    //   .toHaveText('Guest 1');

    // 5. Verify champion indicator/crown displayed
    // await expect(projectorPage.locator('[data-testid="champion-crown"]')).toBeVisible();

    // 6. Verify response times displayed
    // const guest1Time = projectorPage.locator('[data-testid="guest-1-response-time"]');
    // const guest2Time = projectorPage.locator('[data-testid="guest-2-response-time"]');
    // expect(parseFloat(await guest1Time.textContent() || '0'))
    //   .toBeLessThan(parseFloat(await guest2Time.textContent() || '0'));

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
    await Promise.all(guestContexts.map((ctx) => ctx.close()));
  });

  test('AS5: Prize carryover when all guests answer incorrectly', async ({
    browser,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create two questions with known prize amounts
    const question1: TestQuestion = {
      testId: 'Q1_ALL_WRONG',
      questionText: 'Question 1 - all will answer wrong',
      choices: [
        { index: 0, text: 'A. Wrong' },
        { index: 1, text: 'B. Wrong' },
        { index: 2, text: 'C. Correct' },
      ],
      correctAnswer: 'C. Correct',
      period: 'first-half',
      questionNumber: 1,
      skipAttributes: [],
    };

    const question2: TestQuestion = {
      testId: 'Q2_CARRYOVER',
      questionText: 'Question 2 - prize includes carryover',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 2,
      skipAttributes: [],
    };

    await seeder.seedQuestions([question1, question2], collectionPrefix);

    // Create guests
    const guests: TestGuest[] = Array.from({ length: 2 }, (_, i) => ({
      testId: `GUEST_${i}`,
      name: `Guest ${i + 1}`,
      status: 'active' as const,
      attributes: [],
      authMethod: 'anonymous' as const,
    }));

    const seededGuests = await seeder.seedGuests(guests, collectionPrefix);

    // Create contexts
    const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostContext = await browser.newContext();

    const projectorPage = await projectorContext.newPage();
    const hostPage = await hostContext.newPage();

    await projectorPage.goto('http://localhost:5175');
    await hostPage.goto('http://localhost:5174');

    // TODO: Once UI is implemented:
    // === Question 1 (all answer wrong) ===
    // 1. Host starts Q1 with base prize 10,000
    // await hostPage.click('[data-testid="start-question-btn"]');
    // await expect(projectorPage.locator('[data-testid="current-prize"]')).toHaveText('¥10,000');

    // 2. All guests answer incorrectly (A or B, not C)
    // (simulate via API calls or guest page interactions)

    // 3. Host shows results - verify "All Incorrect" state
    // await hostPage.click('[data-testid="show-results-btn"]');
    // await expect(projectorPage.locator('[data-testid="all-incorrect-message"]')).toBeVisible();

    // 4. Verify prize carryover message
    // await expect(projectorPage.locator('[data-testid="carryover-message"]'))
    //   .toHaveText('¥10,000 will be added to next question');

    // === Question 2 (with carryover) ===
    // 5. Host starts Q2 with base prize 10,000
    // await hostPage.click('[data-testid="start-next-question-btn"]');

    // 6. Verify prize displayed includes carryover
    // await expect(projectorPage.locator('[data-testid="current-prize"]'))
    //   .toHaveText('¥20,000'); // 10,000 base + 10,000 carryover

    // 7. Verify carryover breakdown shown
    // await expect(projectorPage.locator('[data-testid="prize-breakdown"]'))
    //   .toContainText('Base: ¥10,000 + Carryover: ¥10,000');

    // Cleanup
    await projectorContext.close();
    await hostContext.close();
  });

  test('AS6: Multiple period-final questions across different periods', async ({
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Create period-final questions for each period
    const firstHalfFinal: TestQuestion = {
      testId: 'Q_FIRST_HALF_FINAL',
      questionText: 'First half period-final',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'first-half',
      questionNumber: 5,
      skipAttributes: [],
    };

    const secondHalfFinal: TestQuestion = {
      testId: 'Q_SECOND_HALF_FINAL',
      questionText: 'Second half period-final',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'B. Answer',
      period: 'second-half',
      questionNumber: 10,
      skipAttributes: [],
    };

    const overtimeFinal: TestQuestion = {
      testId: 'Q_OVERTIME_FINAL',
      questionText: 'Overtime period-final',
      choices: [
        { index: 0, text: 'A. Answer' },
        { index: 1, text: 'B. Answer' },
      ],
      correctAnswer: 'A. Answer',
      period: 'overtime',
      questionNumber: 12,
      skipAttributes: [],
    };

    // Seed all period-final questions
    const questionIds = await seeder.seedQuestions(
      [firstHalfFinal, secondHalfFinal, overtimeFinal],
      collectionPrefix
    );

    // Verify all created
    expect(questionIds).toHaveLength(3);

    // TODO: Once game flow logic is implemented:
    // 1. Play through first-half, verify gong available on Q5
    // 2. Play through second-half, verify gong available on Q10
    // 3. Play through overtime, verify gong available on Q12
    // 4. Verify different period champions can be declared
    // 5. Verify prize carryover resets between periods
  });
});
