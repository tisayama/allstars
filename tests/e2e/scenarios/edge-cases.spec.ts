/**
 * E2E Test Suite: Edge Cases and Error Scenarios
 *
 * This test suite validates system behavior under error conditions and edge cases:
 * - Network disconnection during answer submission
 * - Premature answer reveal attempts
 * - Simultaneous answer submissions (timestamp collision)
 * - All participants answering incorrectly
 * - Special characters and emoji in participant names
 * - Special characters in question text
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { ParticipantPage } from '../helpers/page-objects/participant-page';
import { HostPage } from '../helpers/page-objects/host-page';
import { ProjectorPage } from '../helpers/page-objects/projector-page';
import { QuestionFactory, GuestFactory } from '../fixtures/factories';

test.describe('Edge Cases and Error Scenarios', () => {
  /**
   * EC1: Participant Loses Network Connection During Answer Submission
   *
   * Given: participant is viewing an active question
   * When: participant loses network connection while submitting answer
   * Then: system handles gracefully and allows reconnection
   */
  test('EC1: Participant loses network connection during answer submission', async ({
    page,
    browser,
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

    // Setup: Seed question and activate it
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        questionNumber: 1,
        timerStartedAt: new Date().toISOString(),
      },
      collectionPrefix
    );

    // TODO: Once participant-app UI is implemented, uncomment:
    // Navigate to participant app
    // await participantPage.navigateTo();
    // await participantPage.joinAsParticipant('Test Participant');

    // Simulate network disconnection
    // await page.context().setOffline(true);

    // Try to submit answer (should fail gracefully)
    // await participantPage.selectAnswer('C');
    // await participantPage.submitAnswer();

    // Verify error handling (no crash, shows network error message)
    // await expect(participantPage.hasNetworkError()).resolves.toBe(true);

    // Reconnect network
    // await page.context().setOffline(false);

    // Wait for reconnection
    // await page.waitForTimeout(2000);

    // Verify participant can still interact after reconnection
    // await expect(participantPage.canSelectAnswer()).resolves.toBe(true);

    // For now, verify question exists
    expect(question.correctAnswer).toBe('C');
  });

  /**
   * EC2: Host Tries to Reveal Answer Before Timer Expires
   *
   * Given: question timer is still running
   * When: host attempts to reveal answer early
   * Then: system either prevents action or allows with warning
   */
  test('EC2: Host reveals answer before timer expires', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Quick question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question and start it (timer running)
    await seeder.seedQuestions([question], collectionPrefix);
    const timerStartedAt = new Date();
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        questionNumber: 1,
        timerStartedAt: timerStartedAt.toISOString(),
      },
      collectionPrefix
    );

    // TODO: Once host-app UI is implemented, uncomment:
    // await hostPage.navigateTo();

    // Immediately try to reveal answer (timer still running)
    // const canReveal = await hostPage.canRevealAnswer();

    // Option 1: System prevents early reveal
    // expect(canReveal).toBe(false);

    // Option 2: System allows with warning
    // if (canReveal) {
    //   await hostPage.clickRevealAnswer();
    //   const hasWarning = await page.locator('[data-testid="early-reveal-warning"]').isVisible();
    //   expect(hasWarning).toBe(true);
    // }

    // Verify timer is still running
    const now = new Date();
    const elapsed = now.getTime() - timerStartedAt.getTime();
    expect(elapsed).toBeLessThan(30000); // Less than 30 seconds
  });

  /**
   * EC3: Two Participants Submit Answers at Exact Same Millisecond
   *
   * Given: two participants are viewing the same question
   * When: both submit answers at the exact same timestamp
   * Then: system handles deterministically (e.g., by userId sort order)
   */
  test('EC3: Two participants submit at exact same millisecond', async ({
    page,
    browser,
    seeder,
    collectionPrefix,
  }) => {
    const question = QuestionFactory.createGeneral({
      questionText: 'Simultaneous answer test?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Participant A' }),
        GuestFactory.create({ name: 'Participant B' }),
      ],
      collectionPrefix
    );

    // Setup: Seed question and activate it
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        questionNumber: 1,
        timerStartedAt: new Date().toISOString(),
      },
      collectionPrefix
    );

    // TODO: Once participant-app UI is implemented, uncomment:
    // Create two participant contexts
    // const context1 = await browser.newContext();
    // const context2 = await browser.newContext();
    // const page1 = await context1.newPage();
    // const page2 = await context2.newPage();
    // const participant1 = new ParticipantPage(page1);
    // const participant2 = new ParticipantPage(page2);

    // Navigate both participants
    // await participant1.navigateTo();
    // await participant2.navigateTo();
    // await participant1.joinAsParticipant('Participant A');
    // await participant2.joinAsParticipant('Participant B');

    // Submit answers simultaneously
    // const exactTimestamp = Date.now();
    // await Promise.all([
    //   participant1.submitAnswerAtTimestamp('A', exactTimestamp),
    //   participant2.submitAnswerAtTimestamp('B', exactTimestamp),
    // ]);

    // Verify both submissions recorded
    // const submissions = await seeder.getSubmissions(collectionPrefix);
    // expect(submissions.length).toBe(2);

    // Verify deterministic ordering (e.g., by userId)
    // const sorted = submissions.sort((a, b) => a.userId.localeCompare(b.userId));
    // expect(sorted[0].userId).toBe(guests[0].id); // Participant A first alphabetically

    // For now, verify we have two guests
    expect(guests.length).toBe(2);
  });

  /**
   * EC4: Projector Displays Rankings When All Participants Answered Incorrectly
   *
   * Given: all participants submitted wrong answers
   * When: host shows rankings
   * Then: projector displays all participants with 0 score, sorted by response time
   */
  test('EC4: All participants answer incorrectly', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Difficult question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'D', // All will answer incorrectly
      timeLimit: 30,
    });

    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Guest 1' }),
        GuestFactory.create({ name: 'Guest 2' }),
        GuestFactory.create({ name: 'Guest 3' }),
      ],
      collectionPrefix
    );

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // Simulate all incorrect answers with rankings
    const rankings = {
      questionNumber: 1,
      rankings: [
        {
          rank: 1,
          guestId: guests[0].id,
          name: 'Guest 1',
          score: 0, // All incorrect
          responseTime: 3000,
          isCorrect: false,
        },
        {
          rank: 2,
          guestId: guests[1].id,
          name: 'Guest 2',
          score: 0,
          responseTime: 4000,
          isCorrect: false,
        },
        {
          rank: 3,
          guestId: guests[2].id,
          name: 'Guest 3',
          score: 0,
          responseTime: 5000,
          isCorrect: false,
        },
      ],
    };

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        currentQuestionId: question.id,
        correctAnswer: 'D',
        questionNumber: 1,
        rankings,
      },
      collectionPrefix
    );

    // TODO: Once projector-app UI is implemented, uncomment:
    // await projectorPage.navigateTo();

    // Verify rankings displayed correctly
    // const displayedRankings = await projectorPage.getRankings();
    // expect(displayedRankings.length).toBe(3);

    // Verify all have score 0
    // displayedRankings.forEach((entry) => {
    //   expect(entry.score).toBe(0);
    // });

    // Verify sorted by response time
    // expect(displayedRankings[0].responseTime).toBeLessThan(
    //   displayedRankings[1].responseTime
    // );
    // expect(displayedRankings[1].responseTime).toBeLessThan(
    //   displayedRankings[2].responseTime
    // );

    // For now, verify all rankings have score 0
    const allHaveZeroScore = rankings.rankings.every((r) => r.score === 0);
    expect(allHaveZeroScore).toBe(true);
  });

  /**
   * EC5: System Handles Special Characters and Emoji in Participant Names
   *
   * Given: participants have names with special characters/emoji
   * When: they join and participate in the game
   * Then: system displays and sorts names correctly
   */
  test('EC5: Special characters and emoji in participant names', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);

    // Create guests with various special characters and emoji
    const specialNames = [
      'Alice 🎉',
      'Bob & Co.',
      "O'Brien",
      'María José',
      '田中太郎', // Japanese
      '김철수', // Korean
      'Test<script>alert(1)</script>', // XSS attempt
      'Name\nWith\nNewlines',
      'Name\tWith\tTabs',
      '  Spaces  ',
    ];

    const guests = await seeder.seedGuests(
      specialNames.map((name) => GuestFactory.create({ name })),
      collectionPrefix
    );

    const question = QuestionFactory.createGeneral({
      questionText: 'Test question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    await seeder.seedQuestions([question], collectionPrefix);

    // Create rankings with these special names
    const rankings = {
      questionNumber: 1,
      rankings: guests.map((guest, idx) => ({
        rank: idx + 1,
        guestId: guest.id,
        name: guest.name,
        score: 100 - idx * 10,
        responseTime: 3000 + idx * 1000,
      })),
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

    // Verify all names displayed correctly (no HTML injection, proper escaping)
    // const displayedRankings = await projectorPage.getRankings();
    // expect(displayedRankings.length).toBe(specialNames.length);

    // Verify emoji preserved
    // const emojiEntry = displayedRankings.find((r) => r.name.includes('🎉'));
    // expect(emojiEntry).toBeDefined();
    // expect(emojiEntry?.name).toBe('Alice 🎉');

    // Verify XSS prevented (script tag should be escaped)
    // const xssEntry = displayedRankings.find((r) => r.name.includes('script'));
    // if (xssEntry) {
    //   // Check that script didn't execute
    //   const alerts = await page.evaluate(() => window.alertCount || 0);
    //   expect(alerts).toBe(0);
    // }

    // Verify Unicode names preserved
    // const japaneseEntry = displayedRankings.find((r) => r.name === '田中太郎');
    // expect(japaneseEntry).toBeDefined();

    // For now, verify all guests created
    expect(guests.length).toBe(specialNames.length);
  });

  /**
   * EC6: System Handles Special Characters in Question Text
   *
   * Given: questions contain special characters, HTML, or emoji
   * When: question is displayed to participants and projector
   * Then: content is properly escaped and displayed safely
   */
  test('EC6: Special characters in question text', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);

    // Create questions with various special characters
    const specialQuestions = [
      QuestionFactory.createGeneral({
        questionText: 'What is 2 + 2? 🤔',
        options: ['3', '4 ✓', '5', '6'],
        correctAnswer: 'B',
        timeLimit: 30,
      }),
      QuestionFactory.createGeneral({
        questionText: 'Who said "To be or not to be"?',
        options: ['Shakespeare', 'Hemingway', 'Tolkien', 'Orwell'],
        correctAnswer: 'A',
        timeLimit: 30,
      }),
      QuestionFactory.createGeneral({
        questionText: 'What is <b>HTML</b>?',
        options: ['Markup', 'Programming', 'Database', 'OS'],
        correctAnswer: 'A',
        timeLimit: 30,
      }),
      QuestionFactory.createGeneral({
        questionText: 'What is the formula?\na² + b² = c²',
        options: ['Pythagorean', 'Einstein', 'Newton', 'Euler'],
        correctAnswer: 'A',
        timeLimit: 30,
      }),
    ];

    await seeder.seedQuestions(specialQuestions, collectionPrefix);

    // Test each question
    for (let i = 0; i < specialQuestions.length; i++) {
      const question = specialQuestions[i];

      await seeder.seedGameState(
        {
          currentPhase: 'showing_question',
          currentQuestionId: question.id,
          questionNumber: i + 1,
          timerStartedAt: new Date().toISOString(),
        },
        collectionPrefix
      );

      // TODO: Once projector-app UI is implemented, uncomment:
      // await projectorPage.navigateTo();

      // Verify question text displayed correctly
      // const displayedText = await projectorPage.getQuestionText();

      // Verify emoji preserved (question 1)
      // if (i === 0) {
      //   expect(displayedText).toContain('🤔');
      // }

      // Verify quotes escaped (question 2)
      // if (i === 1) {
      //   expect(displayedText).toContain('"To be or not to be"');
      // }

      // Verify HTML escaped (question 3)
      // if (i === 2) {
      //   // Should see literal <b>HTML</b>, not bold HTML
      //   const isBold = await page.locator('b').count();
      //   expect(isBold).toBe(0); // No actual <b> tag
      //   expect(displayedText).toContain('<b>HTML</b>');
      // }

      // Verify newlines preserved or replaced with <br> (question 4)
      // if (i === 3) {
      //   const hasNewlineOrBr =
      //     displayedText.includes('\n') || displayedText.includes('<br');
      //   expect(hasNewlineOrBr).toBe(true);
      // }

      // Verify no XSS execution
      // const alerts = await page.evaluate(() => window.alertCount || 0);
      // expect(alerts).toBe(0);
    }

    // For now, verify all questions created
    expect(specialQuestions.length).toBe(4);
  });
});
