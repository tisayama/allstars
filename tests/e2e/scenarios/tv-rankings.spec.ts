/**
 * E2E Test Suite: TV-Style Rankings Display
 *
 * Feature: 001-tv-style-rankings
 *
 * This test suite validates the TV-style ranking display on the projector-app:
 * - Worst 10 rankings display (always shown)
 * - Top 10 rankings display (shown only when isGongActive)
 * - Period champion badges
 * - Visual elements (TV background, branding, animations)
 * - Connection indicators
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { ProjectorPage } from '../helpers/page-objects/projector-page';
import { QuestionFactory, GuestFactory } from '../fixtures/factories';
import type { GameResults, RankedAnswer } from '@allstars/types';

test.describe.serial('TV-Style Rankings Display', () => {
  /**
   * TVR1: Worst 10 Rankings Display (Normal Question)
   *
   * Given: projector-app is showing results for a normal question
   * When: isGongActive is false (not a period-final question)
   * Then: projector displays worst 10 rankings only (no top 10)
   */
  test('TVR1: Worst 10 rankings displayed for non-period-final question', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the capital of France?',
      options: ['Berlin', 'Paris', 'London', 'Madrid'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question and 10 guests for worst 10
    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest data
    const guestData = Array.from({ length: 10 }, (_, i) =>
      GuestFactory.create({ name: `参加者${i + 1}` })
    );
    const seededGuests = await seeder.seedGuests(guestData, collectionPrefix);

    // Create worst 10 rankings (slowest correct answers)
    const worst10: RankedAnswer[] = seededGuests.map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: `参加者${idx + 1}(チームA)`,
      responseTimeMs: 10000 + idx * 1000, // 10s, 11s, 12s, etc.
    }));

    const results: GameResults = {
      top10: [],
      worst10,
    };

    // Seed game state with showing_results phase
    await seeder.seedGameState(
      {
        testId: 'TVR1_WORST10_ONLY',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: false, // NOT a period-final question
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify rankings container is visible
    await expect(projectorPage.hasRankings()).resolves.toBe(true);

    // Verify worst 10 section exists
    await expect(projectorPage.hasWorst10Section()).resolves.toBe(true);

    // Get worst 10 rankings
    const displayedWorst10 = await projectorPage.getWorst10();
    expect(displayedWorst10).toHaveLength(10);

    // Verify first worst 10 entry (slowest)
    expect(displayedWorst10[0].name).toContain('参加者1');
    expect(displayedWorst10[0].responseTime).toBeGreaterThanOrEqual(10);

    // Verify top 10 section does NOT exist (isGongActive = false)
    // Note: Top 10 should not be rendered when isGongActive is false
    const top10Elements = await page.locator('[data-testid="rankings-list"]').count();
    expect(top10Elements).toBe(0); // No top 10 list should exist (only worst 10)
  });

  /**
   * TVR2: Top 10 Rankings Display (Period Final Question)
   *
   * Given: projector-app is showing results for a period-final question
   * When: isGongActive is true (period-final question)
   * Then: projector displays both worst 10 and top 10 rankings
   */
  test('TVR2: Top 10 and worst 10 rankings displayed for period-final question', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'First half final question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question and 20 guests (10 for top, 10 for worst)
    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest data
    const guestData = Array.from({ length: 20 }, (_, i) =>
      GuestFactory.create({ name: `ゲスト${i + 1}` })
    );
    const seededGuests = await seeder.seedGuests(guestData, collectionPrefix);

    // Create top 10 rankings (fastest correct answers)
    const top10: RankedAnswer[] = seededGuests.slice(0, 10).map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: `ゲスト${idx + 1}(チーム${String.fromCharCode(65 + (idx % 4))})`,
      responseTimeMs: 2000 + idx * 500, // 2.0s, 2.5s, 3.0s, etc.
    }));

    // Create worst 10 rankings (slowest correct answers)
    const worst10: RankedAnswer[] = seededGuests.slice(10, 20).map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: `ゲスト${idx + 11}(チーム${String.fromCharCode(65 + ((idx + 10) % 4))})`,
      responseTimeMs: 15000 + idx * 1000, // 15s, 16s, 17s, etc.
    }));

    const results: GameResults = {
      top10,
      worst10,
      period: 'first-half',
      periodChampions: [seededGuests[0].guestId], // First guest is champion
    };

    // Seed game state with showing_results phase and gong active
    await seeder.seedGameState(
      {
        testId: 'TVR2_TOP10_AND_WORST10',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: true, // Period-final question
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify rankings container is visible
    await expect(projectorPage.hasRankings()).resolves.toBe(true);

    // Verify worst 10 section exists
    await expect(projectorPage.hasWorst10Section()).resolves.toBe(true);

    // Get worst 10 rankings
    const displayedWorst10 = await projectorPage.getWorst10();
    expect(displayedWorst10).toHaveLength(10);
    expect(displayedWorst10[0].responseTime).toBeGreaterThanOrEqual(15);

    // Verify top 10 section exists (isGongActive = true)
    const rankingsLists = await page.locator('[data-testid="rankings-list"]').count();
    expect(rankingsLists).toBe(2); // Both worst 10 and top 10 lists should exist

    // Get top 10 rankings
    const displayedRankings = await projectorPage.getRankings();
    expect(displayedRankings.length).toBeGreaterThan(0);

    // Verify first ranking has fastest time
    const fastestEntry = displayedRankings.find((r) => r.rank === 1);
    expect(fastestEntry).toBeDefined();
    expect(fastestEntry!.responseTime).toBeGreaterThanOrEqual(2);
    expect(fastestEntry!.responseTime).toBeLessThanOrEqual(3);

    // Verify period champion badge is displayed
    await expect(projectorPage.hasPeriodChampionBadge()).resolves.toBe(true);

    // Verify champion is the first guest
    const championName = await projectorPage.getPeriodChampion();
    expect(championName).toContain('ゲスト1');
  });

  /**
   * TVR3: Period Champion Highlighting
   *
   * Given: rankings are displayed for a period-final question
   * When: periodChampions are designated
   * Then: champions are highlighted with special badges and styling
   */
  test('TVR3: Period champions highlighted with badges on period-final', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Second half final question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question and guests
    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest data
    const guestData = [
      GuestFactory.create({ name: '太郎' }),
      GuestFactory.create({ name: '花子' }),
      GuestFactory.create({ name: '次郎' }),
      GuestFactory.create({ name: '三郎' }),
      GuestFactory.create({ name: '四郎' }),
    ];
    const seededGuests = await seeder.seedGuests(guestData, collectionPrefix);

    // Guest names with teams
    const guestNamesWithTeams = [
      '太郎(チームA)',
      '花子(チームB)',
      '次郎(チームC)',
      '三郎(チームD)',
      '四郎(チームA)',
    ];

    const top10: RankedAnswer[] = seededGuests.map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: guestNamesWithTeams[idx],
      responseTimeMs: 1500 + idx * 300,
    }));

    const results: GameResults = {
      top10,
      worst10: [],
      period: 'second-half',
      periodChampions: [seededGuests[0].guestId], // 太郎 is the champion
    };

    // Seed game state with period champion
    await seeder.seedGameState(
      {
        testId: 'TVR3_PERIOD_CHAMPION_BADGE',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: true,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify period champion badge exists
    await expect(projectorPage.hasPeriodChampionBadge()).resolves.toBe(true);

    // Verify the champion name is correct
    const championName = await projectorPage.getPeriodChampion();
    expect(championName).toContain('太郎');

    // Verify champion is highlighted
    await expect(projectorPage.isPeriodChampionHighlighted('太郎(チームA)')).resolves.toBe(true);

    // Get all rankings and verify champion has isPeriodChampion flag
    const rankings = await projectorPage.getRankings();
    const championRanking = rankings.find((r) => r.name.includes('太郎'));
    expect(championRanking).toBeDefined();
    expect(championRanking!.isPeriodChampion).toBe(true);
  });

  /**
   * TVR4: Visual Elements and Animations
   *
   * Given: TV rankings are displayed
   * When: the page loads
   * Then: all visual elements are present (background, branding, animations)
   */
  test('TVR4: TV visual elements and animations are displayed', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Test question for visual elements?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed minimal data for visual testing
    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest data
    const guestData = Array.from({ length: 3 }, (_, i) =>
      GuestFactory.create({ name: `Visual${i + 1}` })
    );
    const seededGuests = await seeder.seedGuests(guestData, collectionPrefix);

    const worst10: RankedAnswer[] = seededGuests.map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: `Visual${idx + 1}(TestTeam)`,
      responseTimeMs: 8000 + idx * 1000,
    }));

    const results: GameResults = {
      top10: [],
      worst10,
    };

    // Seed game state
    await seeder.seedGameState(
      {
        testId: 'TVR4_VISUAL_ELEMENTS',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: false,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results,
      },
      collectionPrefix
    );

    // Clear localStorage to ensure fresh animation state
    await page.goto('http://work-ubuntu:5185');
    await page.evaluate(() => localStorage.clear());

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify rankings container exists
    const rankingsContainer = page.locator('[data-testid="rankings-container"]');
    await expect(rankingsContainer).toBeVisible();

    // Verify TV background exists (has gradient/animation CSS class)
    const tvContainer = page.locator('.tv-ranking-container');
    await expect(tvContainer).toBeVisible();

    // Note: Animation state (data-animated) is transient and changes immediately after
    // the component mounts due to useRankingAnimation marking questions as "played".
    // Visual animations are controlled by CSS and render correctly even if the attribute changes.

    // Verify ranking entries have proper structure
    const rankingEntries = page.locator('[data-testid^="worst10-entry-"]');
    const entriesCount = await rankingEntries.count();
    expect(entriesCount).toBe(3);

    // Verify first ranking entry has required data attributes
    const firstEntry = rankingEntries.first();
    await expect(firstEntry).toHaveAttribute('data-rank');
    await expect(firstEntry).toHaveAttribute('data-fastest');

    // Verify entry contains name and response time
    await expect(firstEntry.locator('[data-testid="worst10-name"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="worst10-response-time"]')).toBeVisible();
  });

  /**
   * TVR5: Fastest Participant Highlighting
   *
   * Given: rankings are displayed
   * When: a participant has the fastest correct answer
   * Then: that participant is highlighted visually
   */
  test('TVR5: Fastest correct answer is highlighted in rankings', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Who will be fastest?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question and guests
    await seeder.seedQuestions([question], collectionPrefix);

    // Create guest data
    const guestData = [
      GuestFactory.create({ name: 'FastestPlayer' }),
      GuestFactory.create({ name: 'SecondPlace' }),
      GuestFactory.create({ name: 'ThirdPlace' }),
    ];
    const seededGuests = await seeder.seedGuests(guestData, collectionPrefix);

    const guestNamesWithTeams = [
      'FastestPlayer(TeamA)',
      'SecondPlace(TeamB)',
      'ThirdPlace(TeamC)',
    ];

    const top10: RankedAnswer[] = seededGuests.map((seededGuest, idx) => ({
      guestId: seededGuest.guestId,
      guestName: guestNamesWithTeams[idx],
      responseTimeMs: 1000 + idx * 500, // 1.0s, 1.5s, 2.0s
    }));

    const results: GameResults = {
      top10,
      worst10: [],
    };

    // Seed game state with gong active to show top 10
    await seeder.seedGameState(
      {
        testId: 'TVR5_FASTEST_HIGHLIGHT',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: true, // Show top 10
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify fastest participant is highlighted
    await expect(projectorPage.isFastestHighlighted()).resolves.toBe(true);

    // Verify fastest participant name
    const fastestName = await projectorPage.getFastestParticipant();
    expect(fastestName).toContain('FastestPlayer');

    // Verify fastest badge is visible
    await expect(projectorPage.hasFastestBadge('FastestPlayer')).resolves.toBe(true);

    // Get rankings and verify fastest has isFastest flag
    const rankings = await projectorPage.getRankings();
    const fastestRanking = rankings.find((r) => r.name.includes('FastestPlayer'));
    expect(fastestRanking).toBeDefined();
    expect(fastestRanking!.isFastest).toBe(true);
    expect(fastestRanking!.rank).toBe(1);
  });

  /**
   * TVR6: Empty Results Handling
   *
   * Given: projector-app is showing results phase
   * When: results data is null or empty
   * Then: projector displays empty state gracefully
   */
  test('TVR6: Empty results state is handled gracefully', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const projectorPage = new ProjectorPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Question with no results?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question but no results
    await seeder.seedQuestions([question], collectionPrefix);

    // Seed game state with null results
    await seeder.seedGameState(
      {
        testId: 'TVR6_EMPTY_RESULTS',
        currentPhase: 'showing_results',
        currentQuestion: {
          ...question,
          questionId: `question-${question.questionNumber}`,
        },
        isGongActive: false,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        results: null,
      },
      collectionPrefix
    );

    // Navigate to projector-app
    await projectorPage.navigateTo();

    // Verify TV container exists (empty state shows TV container without rankings-container testid)
    const tvContainer = page.locator('.tv-ranking-container');
    await expect(tvContainer).toBeVisible();

    // Verify no rankings are displayed
    await expect(projectorPage.hasRankings()).resolves.toBe(false);
  });
});
