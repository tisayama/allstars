/**
 * AdminPage Page Object Model
 * Feature: 001-system-e2e-tests
 * User Story 1: Game Administrator Setup Flow
 *
 * Provides reusable methods for interacting with admin-app UI elements.
 * Encapsulates selectors and common workflows to keep test scenarios clean.
 */

import type { Page, Locator } from '@playwright/test';
import type { TestQuestion, TestGuest } from '../../fixtures';

export interface QuestionFormData {
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  timeLimit?: number;
  period?: 'first-half' | 'second-half';
}

export interface GuestFormData {
  name: string;
  attributes?: string[];
  email?: string;
}

export interface GameSettingsData {
  rankingRule?: 'time_based' | 'accuracy_based';
  dropoutRule?: 'worst_one' | 'worst_two' | 'none';
  questionTimeLimit?: number;
  enablePeriodChampions?: boolean;
}

/**
 * Page Object Model for admin-app
 * Base URL: http://work-ubuntu:5176
 */
export class AdminPage {
  readonly page: Page;
  readonly baseUrl: string = 'http://work-ubuntu:5176';

  // Navigation selectors
  readonly navQuestions: Locator;
  readonly navGuests: Locator;
  readonly navSettings: Locator;

  // Question section selectors
  readonly addQuestionBtn: Locator;
  readonly questionList: Locator;
  readonly questionTextInput: Locator;
  readonly choiceAInput: Locator;
  readonly choiceBInput: Locator;
  readonly choiceCInput: Locator;
  readonly choiceDInput: Locator;
  readonly correctAnswerSelect: Locator;
  readonly timeLimitInput: Locator;
  readonly submitQuestionBtn: Locator;
  readonly saveQuestionBtn: Locator;

  // Guest section selectors
  readonly addGuestBtn: Locator;
  readonly importCsvBtn: Locator;
  readonly csvFileInput: Locator;
  readonly processImportBtn: Locator;
  readonly guestList: Locator;
  readonly guestNameInput: Locator;
  readonly submitGuestBtn: Locator;
  readonly importSuccessMessage: Locator;
  readonly importCount: Locator;

  // Settings section selectors
  readonly rankingRuleSelect: Locator;
  readonly dropoutRuleSelect: Locator;
  readonly questionTimeLimitInput: Locator;
  readonly enablePeriodChampionsCheckbox: Locator;
  readonly saveSettingsBtn: Locator;
  readonly settingsSavedMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation elements
    this.navQuestions = page.locator('[data-testid="nav-questions"]');
    this.navGuests = page.locator('[data-testid="nav-guests"]');
    this.navSettings = page.locator('[data-testid="nav-settings"]');

    // Question section elements
    this.addQuestionBtn = page.locator('[data-testid="add-question-btn"]');
    this.questionList = page.locator('[data-testid="question-list"]');
    this.questionTextInput = page.locator('[data-testid="question-text-input"]');
    this.choiceAInput = page.locator('[data-testid="choice-a-input"]');
    this.choiceBInput = page.locator('[data-testid="choice-b-input"]');
    this.choiceCInput = page.locator('[data-testid="choice-c-input"]');
    this.choiceDInput = page.locator('[data-testid="choice-d-input"]');
    this.correctAnswerSelect = page.locator('[data-testid="correct-answer-select"]');
    this.timeLimitInput = page.locator('[data-testid="time-limit-input"]');
    this.submitQuestionBtn = page.locator('[data-testid="submit-question-btn"]');
    this.saveQuestionBtn = page.locator('[data-testid="save-question-btn"]');

    // Guest section elements
    this.addGuestBtn = page.locator('[data-testid="add-guest-btn"]');
    this.importCsvBtn = page.locator('[data-testid="import-csv-btn"]');
    this.csvFileInput = page.locator('[data-testid="csv-file-input"]');
    this.processImportBtn = page.locator('[data-testid="process-import-btn"]');
    this.guestList = page.locator('[data-testid="guest-list"]');
    this.guestNameInput = page.locator('[data-testid="guest-name-input"]');
    this.submitGuestBtn = page.locator('[data-testid="submit-guest-btn"]');
    this.importSuccessMessage = page.locator('[data-testid="import-success-message"]');
    this.importCount = page.locator('[data-testid="import-count"]');

    // Settings section elements
    this.rankingRuleSelect = page.locator('[data-testid="ranking-rule-select"]');
    this.dropoutRuleSelect = page.locator('[data-testid="dropout-rule-select"]');
    this.questionTimeLimitInput = page.locator('[data-testid="question-time-limit-input"]');
    this.enablePeriodChampionsCheckbox = page.locator('[data-testid="enable-period-champions"]');
    this.saveSettingsBtn = page.locator('[data-testid="save-settings-btn"]');
    this.settingsSavedMessage = page.locator('[data-testid="settings-saved-message"]');
  }

  /**
   * Navigate to admin-app home page
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to questions section
   */
  async navigateToQuestions(): Promise<void> {
    await this.navQuestions.click();
  }

  /**
   * Navigate to guests section
   */
  async navigateToGuests(): Promise<void> {
    await this.navGuests.click();
  }

  /**
   * Navigate to settings section
   */
  async navigateToSettings(): Promise<void> {
    await this.navSettings.click();
  }

  /**
   * Add a new question via the form
   * @param question - Question form data
   */
  async addQuestion(question: QuestionFormData): Promise<void> {
    // Click add question button
    await this.addQuestionBtn.click();

    // Fill in question form
    await this.questionTextInput.fill(question.questionText);
    await this.choiceAInput.fill(question.choiceA);
    await this.choiceBInput.fill(question.choiceB);
    await this.choiceCInput.fill(question.choiceC);
    await this.choiceDInput.fill(question.choiceD);
    await this.correctAnswerSelect.selectOption(question.correctAnswer);

    if (question.timeLimit) {
      await this.timeLimitInput.fill(question.timeLimit.toString());
    }

    // Submit the form
    await this.submitQuestionBtn.click();
  }

  /**
   * Edit an existing question
   * @param questionNumber - Question number to edit
   * @param updates - Partial question data to update
   */
  async editQuestion(
    questionNumber: number,
    updates: Partial<QuestionFormData>
  ): Promise<void> {
    // Click edit button for specific question
    const editBtn = this.page.locator(`[data-testid="edit-question-${questionNumber}-btn"]`);
    await editBtn.click();

    // Update fields that are provided
    if (updates.questionText) {
      await this.questionTextInput.fill(updates.questionText);
    }
    if (updates.choiceA) {
      await this.choiceAInput.fill(updates.choiceA);
    }
    if (updates.choiceB) {
      await this.choiceBInput.fill(updates.choiceB);
    }
    if (updates.choiceC) {
      await this.choiceCInput.fill(updates.choiceC);
    }
    if (updates.choiceD) {
      await this.choiceDInput.fill(updates.choiceD);
    }
    if (updates.correctAnswer) {
      await this.correctAnswerSelect.selectOption(updates.correctAnswer);
    }
    if (updates.timeLimit) {
      await this.timeLimitInput.fill(updates.timeLimit.toString());
    }

    // Save changes
    await this.saveQuestionBtn.click();
  }

  /**
   * Delete a question
   * @param questionNumber - Question number to delete
   */
  async deleteQuestion(questionNumber: number): Promise<void> {
    const deleteBtn = this.page.locator(`[data-testid="delete-question-${questionNumber}-btn"]`);
    await deleteBtn.click();

    // Confirm deletion (if confirmation dialog exists)
    const confirmBtn = this.page.locator('[data-testid="confirm-delete-btn"]');
    if (await confirmBtn.isVisible({ timeout: 1000 })) {
      await confirmBtn.click();
    }
  }

  /**
   * Get question count from the list
   */
  async getQuestionCount(): Promise<number> {
    const rows = this.page.locator('[data-testid="question-list-row"]');
    return await rows.count();
  }

  /**
   * Import guests from CSV file
   * @param csvFilePath - Path to CSV file
   */
  async importGuestsFromCsv(csvFilePath: string): Promise<void> {
    // Click import CSV button
    await this.importCsvBtn.click();

    // Upload CSV file
    await this.csvFileInput.setInputFiles(csvFilePath);

    // Trigger import processing
    await this.processImportBtn.click();

    // Wait for success message
    await this.importSuccessMessage.waitFor({ state: 'visible' });
  }

  /**
   * Add a single guest manually
   * @param guest - Guest form data
   */
  async addGuest(guest: GuestFormData): Promise<void> {
    // Click add guest button
    await this.addGuestBtn.click();

    // Fill in guest name
    await this.guestNameInput.fill(guest.name);

    // Select attributes (if provided)
    if (guest.attributes && guest.attributes.length > 0) {
      for (const attribute of guest.attributes) {
        const checkbox = this.page.locator(`[data-testid="attribute-${attribute}"]`);
        await checkbox.check();
      }
    }

    // Submit the form
    await this.submitGuestBtn.click();
  }

  /**
   * Get guest count from the list
   */
  async getGuestCount(): Promise<number> {
    const rows = this.page.locator('[data-testid="guest-list-row"]');
    return await rows.count();
  }

  /**
   * Delete a guest
   * @param guestName - Guest name to delete (or guest ID)
   */
  async deleteGuest(guestIdentifier: string): Promise<void> {
    const deleteBtn = this.page.locator(`[data-testid="delete-guest-${guestIdentifier}-btn"]`);
    await deleteBtn.click();

    // Confirm deletion (if confirmation dialog exists)
    const confirmBtn = this.page.locator('[data-testid="confirm-delete-btn"]');
    if (await confirmBtn.isVisible({ timeout: 1000 })) {
      await confirmBtn.click();
    }
  }

  /**
   * Configure game settings
   * @param settings - Game settings data
   */
  async configureSettings(settings: GameSettingsData): Promise<void> {
    // Set ranking rule
    if (settings.rankingRule) {
      await this.rankingRuleSelect.selectOption(settings.rankingRule);
    }

    // Set dropout rule
    if (settings.dropoutRule) {
      await this.dropoutRuleSelect.selectOption(settings.dropoutRule);
    }

    // Set question time limit
    if (settings.questionTimeLimit) {
      await this.questionTimeLimitInput.fill(settings.questionTimeLimit.toString());
    }

    // Enable/disable period champions
    if (settings.enablePeriodChampions !== undefined) {
      if (settings.enablePeriodChampions) {
        await this.enablePeriodChampionsCheckbox.check();
      } else {
        await this.enablePeriodChampionsCheckbox.uncheck();
      }
    }

    // Save settings
    await this.saveSettingsBtn.click();

    // Wait for success message
    await this.settingsSavedMessage.waitFor({ state: 'visible' });
  }

  /**
   * Verify a question exists in the list by text
   * @param questionText - Question text to search for
   */
  async hasQuestion(questionText: string): Promise<boolean> {
    try {
      const questionElement = this.questionList.locator(`text="${questionText}"`);
      await questionElement.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify a guest exists in the list by name
   * @param guestName - Guest name to search for
   */
  async hasGuest(guestName: string): Promise<boolean> {
    try {
      const guestElement = this.guestList.locator(`text="${guestName}"`);
      await guestElement.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current settings values (for verification)
   */
  async getCurrentSettings(): Promise<GameSettingsData> {
    return {
      rankingRule: (await this.rankingRuleSelect.inputValue()) as 'time_based' | 'accuracy_based',
      dropoutRule: (await this.dropoutRuleSelect.inputValue()) as 'worst_one' | 'worst_two' | 'none',
      questionTimeLimit: parseInt(await this.questionTimeLimitInput.inputValue()),
      enablePeriodChampions: await this.enablePeriodChampionsCheckbox.isChecked(),
    };
  }

  /**
   * Wait for admin-app to be fully loaded
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Additional wait for app initialization if needed
    // await this.page.waitForSelector('[data-testid="app-ready"]', { state: 'visible' });
  }
}
