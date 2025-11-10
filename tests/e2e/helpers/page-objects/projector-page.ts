/**
 * Page Object Model: ProjectorPage
 *
 * Encapsulates all interactions with the projector-app UI.
 * Uses data-testid attributes for reliable element selection.
 *
 * URL: http://work-ubuntu:5185
 *
 * Key Responsibilities:
 * - Displaying questions with timers
 * - Showing answer submission progress
 * - Revealing correct answers
 * - Displaying rankings with highlights
 * - Showing period champions
 */

import { Page, Locator } from '@playwright/test';

/**
 * Ranking entry interface
 */
export interface RankingEntry {
  rank: number;
  name: string;
  score: number;
  responseTime: number;
  isFastest?: boolean;
  isPeriodChampion?: boolean;
}

export class ProjectorPage {
  // Page reference
  private page: Page;

  // Base URL (work-ubuntu hostname)
  private readonly baseUrl = 'http://work-ubuntu:5185';

  // Locators (using data-testid for reliability)
  private readonly questionContainer: Locator;
  private readonly questionText: Locator;
  private readonly timerDisplay: Locator;
  private readonly submissionProgress: Locator;
  private readonly submissionCount: Locator;
  private readonly totalParticipants: Locator;
  private readonly answerRevealContainer: Locator;
  private readonly correctAnswerContainer: Locator;
  private readonly correctAnswerLetter: Locator;
  private readonly correctAnswerText: Locator;
  private readonly rankingsContainer: Locator;
  private readonly rankingsList: Locator;
  private readonly worst10Container: Locator;
  private readonly worst10List: Locator;
  private readonly periodChampionBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.questionContainer = page.locator('[data-testid="question-container"]');
    this.questionText = page.locator('[data-testid="question-text"]');
    this.timerDisplay = page.locator('[data-testid="timer-display"]');
    this.submissionProgress = page.locator('[data-testid="submission-progress"]');
    this.submissionCount = page.locator('[data-testid="submission-count"]');
    this.totalParticipants = page.locator('[data-testid="total-participants"]');
    this.answerRevealContainer = page.locator('[data-testid="answer-reveal-container"]');
    this.correctAnswerContainer = page.locator('[data-testid="correct-answer-container"]');
    this.correctAnswerLetter = page.locator('[data-testid="correct-answer-letter"]');
    this.correctAnswerText = page.locator('[data-testid="correct-answer-text"]');
    this.rankingsContainer = page.locator('[data-testid="rankings-container"]');
    this.rankingsList = page.locator('[data-testid="rankings-list"]');
    this.worst10Container = page.locator('[data-testid="worst10-container"]');
    this.worst10List = page.locator('[data-testid="worst10-list"]');
    this.periodChampionBadge = page.locator('[data-testid="period-champion-badge"]');
  }

  /**
   * Navigate to projector-app
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.waitForReady();
  }

  /**
   * Get the displayed question text
   */
  async getQuestionText(): Promise<string> {
    await this.questionText.waitFor({ state: 'visible' });
    return await this.questionText.textContent() || '';
  }

  /**
   * Check if timer is displayed
   */
  async hasTimer(): Promise<boolean> {
    try {
      await this.timerDisplay.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current timer value
   */
  async getTimerValue(): Promise<number> {
    await this.timerDisplay.waitFor({ state: 'visible' });
    const timerText = await this.timerDisplay.textContent() || '0';
    return parseInt(timerText.replace(/\D/g, ''), 10);
  }

  /**
   * Check if submission progress is displayed
   */
  async hasSubmissionProgress(): Promise<boolean> {
    try {
      await this.submissionProgress.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of submitted answers
   */
  async getSubmissionCount(): Promise<number> {
    await this.submissionCount.waitFor({ state: 'visible' });
    const countText = await this.submissionCount.textContent() || '0';
    return parseInt(countText, 10);
  }

  /**
   * Get the total number of participants
   */
  async getTotalParticipants(): Promise<number> {
    await this.totalParticipants.waitFor({ state: 'visible' });
    const totalText = await this.totalParticipants.textContent() || '0';
    return parseInt(totalText, 10);
  }

  /**
   * Check if individual answers are visible (they shouldn't be during question phase)
   */
  async areAnswersVisible(): Promise<boolean> {
    const answerElements = await this.page.locator('[data-testid^="participant-answer-"]').count();
    return answerElements > 0;
  }

  /**
   * Check if correct answer is displayed
   */
  async hasCorrectAnswer(): Promise<boolean> {
    try {
      await this.correctAnswerContainer.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the correct answer letter (A, B, C, or D)
   */
  async getCorrectAnswer(): Promise<string> {
    await this.correctAnswerLetter.waitFor({ state: 'visible' });
    return await this.correctAnswerLetter.textContent() || '';
  }

  /**
   * Get the correct answer text
   */
  async getCorrectAnswerText(): Promise<string> {
    await this.correctAnswerText.waitFor({ state: 'visible' });
    return await this.correctAnswerText.textContent() || '';
  }

  /**
   * Check if correct answer is prominently displayed (large, highlighted, etc.)
   */
  async isCorrectAnswerProminent(): Promise<boolean> {
    await this.correctAnswerContainer.waitFor({ state: 'visible' });
    const isProminent = await this.correctAnswerContainer.getAttribute('data-prominent');
    return isProminent === 'true';
  }

  /**
   * Check if rankings are displayed
   */
  async hasRankings(): Promise<boolean> {
    try {
      await this.rankingsContainer.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all rankings data
   */
  async getRankings(): Promise<RankingEntry[]> {
    await this.rankingsList.waitFor({ state: 'visible' });
    const rankingElements = await this.page.locator('[data-testid^="ranking-entry-"]').all();

    const rankings: RankingEntry[] = [];

    for (const element of rankingElements) {
      const rank = parseInt(await element.getAttribute('data-rank') || '0', 10);
      const name = await element.locator('[data-testid="ranking-name"]').textContent() || '';
      const scoreText = await element.locator('[data-testid="ranking-score"]').textContent() || '0';
      const score = parseInt(scoreText, 10);
      const timeText =
        await element.locator('[data-testid="ranking-response-time"]').textContent() || '0';
      const responseTime = parseInt(timeText, 10);
      const isFastest = await element.getAttribute('data-fastest') === 'true';
      const isPeriodChampion = await element.getAttribute('data-period-champion') === 'true';

      rankings.push({
        rank,
        name,
        score,
        responseTime,
        isFastest,
        isPeriodChampion,
      });
    }

    return rankings;
  }

  /**
   * Check if fastest participant is highlighted
   */
  async isFastestHighlighted(): Promise<boolean> {
    try {
      const fastestElement = this.page.locator('[data-testid^="ranking-entry-"][data-fastest="true"]');
      await fastestElement.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the name of the fastest participant
   */
  async getFastestParticipant(): Promise<string> {
    const fastestElement = this.page.locator('[data-testid^="ranking-entry-"][data-fastest="true"]');
    await fastestElement.waitFor({ state: 'visible' });
    return await fastestElement.locator('[data-testid="ranking-name"]').textContent() || '';
  }

  /**
   * Check if a specific participant has the fastest badge
   */
  async hasFastestBadge(participantName: string): Promise<boolean> {
    try {
      const badge = this.page.locator(
        `[data-testid="ranking-name"]:has-text("${participantName}") >> xpath=.. >> [data-testid="fastest-badge"]`
      );
      await badge.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if worst 10 section exists
   */
  async hasWorst10Section(): Promise<boolean> {
    try {
      await this.worst10Container.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get worst 10 rankings
   */
  async getWorst10(): Promise<RankingEntry[]> {
    await this.worst10List.waitFor({ state: 'visible' });
    const worst10Elements = await this.worst10List
      .locator('[data-testid^="worst10-entry-"]')
      .all();

    const worst10: RankingEntry[] = [];

    for (const element of worst10Elements) {
      const rank = parseInt(await element.getAttribute('data-rank') || '0', 10);
      const name = await element.locator('[data-testid="worst10-name"]').textContent() || '';
      const scoreText = await element.locator('[data-testid="worst10-score"]').textContent() || '0';
      const score = parseInt(scoreText, 10);
      const timeText =
        await element.locator('[data-testid="worst10-response-time"]').textContent() || '0';
      const responseTime = parseInt(timeText, 10);

      worst10.push({
        rank,
        name,
        score,
        responseTime,
      });
    }

    return worst10;
  }

  /**
   * Check if period champion badge is displayed
   */
  async hasPeriodChampionBadge(): Promise<boolean> {
    try {
      await this.periodChampionBadge.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the name of the period champion
   */
  async getPeriodChampion(): Promise<string> {
    const championElement = this.page.locator(
      '[data-testid^="ranking-entry-"][data-period-champion="true"]'
    );
    await championElement.waitFor({ state: 'visible' });
    return await championElement.locator('[data-testid="ranking-name"]').textContent() || '';
  }

  /**
   * Check if a specific participant is highlighted as period champion
   */
  async isPeriodChampionHighlighted(participantName: string): Promise<boolean> {
    try {
      const championElement = this.page.locator(
        `[data-testid="ranking-name"]:has-text("${participantName}") >> xpath=.. >> [data-period-champion="true"]`
      );
      await championElement.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for projector-app to be ready
   */
  async waitForReady(): Promise<void> {
    // Wait for the app container to be visible
    await this.page.waitForSelector('[data-testid="app-container"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Utility: Get the current game phase displayed
   */
  async getCurrentPhase(): Promise<string> {
    const phaseElement = this.page.locator('[data-testid="current-phase"]');
    await phaseElement.waitFor({ state: 'visible' });
    return await phaseElement.getAttribute('data-phase') || '';
  }

  /**
   * Utility: Check if a specific phase is active
   */
  async isPhaseActive(phase: string): Promise<boolean> {
    try {
      const currentPhase = await this.getCurrentPhase();
      return currentPhase === phase;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Get question number
   */
  async getQuestionNumber(): Promise<number> {
    const questionNumberElement = this.page.locator('[data-testid="question-number"]');
    await questionNumberElement.waitFor({ state: 'visible' });
    const numberText = await questionNumberElement.textContent() || '0';
    return parseInt(numberText, 10);
  }

  /**
   * Utility: Check if rankings have animated in
   */
  async haveRankingsAnimatedIn(): Promise<boolean> {
    await this.rankingsContainer.waitFor({ state: 'visible' });
    const isAnimated = await this.rankingsContainer.getAttribute('data-animated');
    return isAnimated === 'true';
  }
}
