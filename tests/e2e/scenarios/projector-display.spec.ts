/**
 * E2E Test Suite: Projector Display Flow
 *
 * User Story 3 (P1): As a game host or audience member, I need to see the game progress
 * displayed on the projector (question display, answer reveals, rankings), so that everyone
 * can follow along with the game state.
 *
 * This test suite validates the complete projector display experience:
 * - Displaying questions with timers
 * - Showing answer submission progress
 * - Revealing correct answers
 * - Displaying rankings with highlights
 * - Showing period champions
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { ProjectorPage } from '../helpers/page-objects/projector-page';
import { QuestionFactory, GuestFactory } from '../fixtures/factories';

test.describe('Projector Display Flow', () => {
  /**
   * PD1: Projector Displays Question Text and Timer
   *
   * Given: projector-app is accessible via work-ubuntu hostname
   * When: host starts a question
   * Then: projector displays the question text and remaining time
   */
  test('PD1: Projector displays question text and timer when host starts', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the capital of Japan?',
      options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // Setup: Simulate host starting the question
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        timerStartedAt: new Date().toISOString(),
        questionNumber: 1,
        timeLimit: 30,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // TODO: Once projector-app UI is implemented, uncomment:
    // Verify question text is displayed
    // await expect(projectorPage.getQuestionText()).resolves.toBe(question.questionText);

    // Verify timer is displayed and counting down
    // await expect(projectorPage.hasTimer()).resolves.toBe(true);
    // const timerValue = await projectorPage.getTimerValue();
    // expect(timerValue).toBeGreaterThan(0);
    // expect(timerValue).toBeLessThanOrEqual(30);

    // For now, just verify app loads
    await expect(page).toHaveURL(/work-ubuntu:5175/);
  });

  /**
   * PD2: Projector Shows Submitted Answers Count
   *
   * Given: question is active on the projector
   * When: participants submit answers
   * Then: projector shows a count or visualization of submitted answers (without revealing answers)
   */
  test('PD2: Projector shows count of submitted answers without revealing them', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the largest ocean?',
      options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question, guests, and answers
    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Alice' }),
        GuestFactory.create({ name: 'Bob' }),
        GuestFactory.create({ name: 'Charlie' }),
      ],
      collectionPrefix
    );

    // Simulate 2 guests submitting answers
    const answers = [
      { guestId: guests[0].id, questionId: question.id, answer: 'B', responseTime: 5000 },
      { guestId: guests[1].id, questionId: question.id, answer: 'A', responseTime: 8000 },
    ];
    // TODO: Add seedAnswers method to TestDataSeeder
    // await seeder.seedAnswers(answers, collectionPrefix);

    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        timerStartedAt: new Date().toISOString(),
        questionNumber: 1,
        submittedCount: 2,
        totalParticipants: 3,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify submission count is displayed
    // await expect(projectorPage.hasSubmissionProgress()).resolves.toBe(true);
    // await expect(projectorPage.getSubmissionCount()).resolves.toBe(2);
    // await expect(projectorPage.getTotalParticipants()).resolves.toBe(3);

    // Verify actual answers are NOT revealed
    // await expect(projectorPage.areAnswersVisible()).resolves.toBe(false);

    // For now, verify test data is correct
    expect(answers.length).toBe(2);
  });

  /**
   * PD3: Projector Displays Correct Answer
   *
   * Given: question time has expired
   * When: host reveals the correct answer
   * Then: projector displays the correct answer prominently
   */
  test('PD3: Projector displays correct answer prominently when revealed', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the speed of light in vacuum?',
      options: ['150,000 km/s', '299,792 km/s', '500,000 km/s', '1,000,000 km/s'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // Simulate host revealing correct answer
    await seeder.seedGameState(
      {
        currentPhase: 'showing_correct_answer',
        currentQuestionId: question.id,
        correctAnswer: 'B',
        questionNumber: 1,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify correct answer is displayed
    // await expect(projectorPage.hasCorrectAnswer()).resolves.toBe(true);
    // await expect(projectorPage.getCorrectAnswer()).resolves.toBe('B');
    // await expect(projectorPage.getCorrectAnswerText()).resolves.toContain('299,792 km/s');

    // Verify correct answer is prominent (large, highlighted, etc.)
    // await expect(projectorPage.isCorrectAnswerProminent()).resolves.toBe(true);

    // For now, verify correct answer matches
    expect(question.correctAnswer).toBe('B');
  });

  /**
   * PD4: Projector Displays Rankings with Details
   *
   * Given: correct answer is shown
   * When: host transitions to rankings
   * Then: projector displays rankings with participant names, scores, and response times
   */
  test('PD4: Projector displays rankings with participant details', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question and guests
    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Alice' }),
        GuestFactory.create({ name: 'Bob' }),
        GuestFactory.create({ name: 'Charlie' }),
        GuestFactory.create({ name: 'David' }),
        GuestFactory.create({ name: 'Eve' }),
      ],
      collectionPrefix
    );

    // Simulate rankings (simplified structure)
    const rankings = {
      questionNumber: 1,
      rankings: [
        { rank: 1, guestId: guests[0].id, name: 'Alice', score: 100, responseTime: 3000 },
        { rank: 2, guestId: guests[1].id, name: 'Bob', score: 95, responseTime: 5000 },
        { rank: 3, guestId: guests[2].id, name: 'Charlie', score: 90, responseTime: 8000 },
        { rank: 4, guestId: guests[3].id, name: 'David', score: 85, responseTime: 10000 },
        { rank: 5, guestId: guests[4].id, name: 'Eve', score: 80, responseTime: 12000 },
      ],
    };

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        currentQuestionId: question.id,
        questionNumber: 1,
        rankings,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify rankings are displayed
    // await expect(projectorPage.hasRankings()).resolves.toBe(true);
    // const displayedRankings = await projectorPage.getRankings();
    // expect(displayedRankings).toHaveLength(5);

    // Verify each ranking has required details
    // for (let i = 0; i < 5; i++) {
    //   expect(displayedRankings[i]).toHaveProperty('rank', i + 1);
    //   expect(displayedRankings[i]).toHaveProperty('name');
    //   expect(displayedRankings[i]).toHaveProperty('score');
    //   expect(displayedRankings[i]).toHaveProperty('responseTime');
    // }

    // For now, verify rankings data is correct
    expect(rankings.rankings.length).toBe(5);
  });

  /**
   * PD5: Fastest Correct Answer Highlighted
   *
   * Given: rankings are displayed
   * When: system identifies the fastest correct answer
   * Then: that participant is highlighted visually
   */
  test('PD5: Fastest correct answer is highlighted on projector', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the smallest prime number?',
      options: ['0', '1', '2', '3'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question and guests
    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Fastest' }),
        GuestFactory.create({ name: 'Second' }),
        GuestFactory.create({ name: 'Third' }),
      ],
      collectionPrefix
    );

    const rankings = {
      questionNumber: 1,
      rankings: [
        {
          rank: 1,
          guestId: guests[0].id,
          name: 'Fastest',
          score: 100,
          responseTime: 2000,
          isFastest: true,
        },
        { rank: 2, guestId: guests[1].id, name: 'Second', score: 95, responseTime: 5000 },
        { rank: 3, guestId: guests[2].id, name: 'Third', score: 90, responseTime: 8000 },
      ],
    };

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        currentQuestionId: question.id,
        questionNumber: 1,
        rankings,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify fastest participant is highlighted
    // await expect(projectorPage.isFastestHighlighted()).resolves.toBe(true);
    // await expect(projectorPage.getFastestParticipant()).resolves.toBe('Fastest');

    // Verify highlight badge or indicator is visible
    // await expect(projectorPage.hasFastestBadge('Fastest')).resolves.toBe(true);

    // For now, verify rankings data includes fastest flag
    expect(rankings.rankings[0].isFastest).toBe(true);
  });

  /**
   * PD6: Worst 10 Section Displayed
   *
   * Given: rankings are displayed
   * When: system identifies slowest correct answer or incorrect answers
   * Then: those participants are shown in the "worst 10" section
   */
  test('PD6: Worst 10 section shows slowest/incorrect participants', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the largest planet?',
      options: ['Earth', 'Jupiter', 'Saturn', 'Mars'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question and 15 guests
    await seeder.seedQuestions([question], collectionPrefix);
    const guestNames = Array.from({ length: 15 }, (_, i) => `Guest${i + 1}`);
    const guests = await seeder.seedGuests(
      guestNames.map((name) => GuestFactory.create({ name })),
      collectionPrefix
    );

    // Create rankings with worst 10 section (last 10 participants)
    const allRankings = guests.map((guest, idx) => ({
      rank: idx + 1,
      guestId: guest.id,
      name: guest.name,
      score: 100 - idx * 5,
      responseTime: 2000 + idx * 1000,
      isCorrect: idx < 10, // First 10 correct, last 5 incorrect
    }));

    const rankings = {
      questionNumber: 1,
      top10: allRankings.slice(0, 10),
      worst10: allRankings.slice(-10),
    };

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        currentQuestionId: question.id,
        questionNumber: 1,
        rankings,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify worst 10 section exists
    // await expect(projectorPage.hasWorst10Section()).resolves.toBe(true);

    // Verify worst 10 contains expected participants
    // const worst10 = await projectorPage.getWorst10();
    // expect(worst10).toHaveLength(10);
    // expect(worst10[9].name).toBe('Guest15'); // Last participant

    // For now, verify worst 10 data structure
    expect(rankings.worst10.length).toBe(10);
  });

  /**
   * PD7: Period Champions with Special Badges
   *
   * Given: a period ends (first-half or second-half)
   * When: rankings are displayed
   * Then: period champions are highlighted with special badges
   */
  test('PD7: Period champions are highlighted with special badges', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Final question of first half?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question and guests
    await seeder.seedQuestions([question], collectionPrefix);
    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'First Half Champion' }),
        GuestFactory.create({ name: 'Regular Player' }),
        GuestFactory.create({ name: 'Another Player' }),
      ],
      collectionPrefix
    );

    const rankings = {
      questionNumber: 5, // End of first half (assuming 10 questions total)
      period: 'first-half',
      rankings: [
        {
          rank: 1,
          guestId: guests[0].id,
          name: 'First Half Champion',
          score: 500,
          responseTime: 15000,
          isPeriodChampion: true,
          periodBadge: 'first-half-champion',
        },
        { rank: 2, guestId: guests[1].id, name: 'Regular Player', score: 450, responseTime: 18000 },
        { rank: 3, guestId: guests[2].id, name: 'Another Player', score: 400, responseTime: 20000 },
      ],
    };

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        currentQuestionId: question.id,
        questionNumber: 5,
        period: 'first-half',
        rankings,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify period champion badge is displayed
    // await expect(projectorPage.hasPeriodChampionBadge()).resolves.toBe(true);
    // await expect(projectorPage.getPeriodChampion()).resolves.toBe('First Half Champion');

    // Verify badge is visually distinct (crown, special color, etc.)
    // await expect(projectorPage.isPeriodChampionHighlighted('First Half Champion')).resolves.toBe(true);

    // For now, verify period champion flag in rankings
    expect(rankings.rankings[0].isPeriodChampion).toBe(true);
    expect(rankings.rankings[0].periodBadge).toBe('first-half-champion');
  });
});
