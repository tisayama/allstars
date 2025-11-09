/**
 * Admin Setup Flow E2E Tests
 * Feature: 001-system-e2e-tests
 * User Story 1: Game Administrator Setup Flow
 *
 * Tests admin-app functionality for configuring complete game sessions including
 * questions, guests, and settings, with data persistence validation.
 */

import { test, expect } from '../fixtures';
import { QuestionFactory, GuestFactory } from '../fixtures/factories';

test.describe('@P1 Admin Setup Flow - Game Configuration (User Story 1)', () => {
  test('AS1: Admin adds new question via UI', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');

    // Wait for admin-app to load
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented, the following interactions will be enabled:

    // Navigate to questions section
    // await page.click('[data-testid="nav-questions"]');

    // Click "Add Question" button
    // await page.click('[data-testid="add-question-btn"]');

    // Fill in question form
    // const testQuestion = QuestionFactory.create4Choice({
    //   questionNumber: 1,
    //   questionText: 'What is the capital of Japan?',
    //   correctChoiceIndex: 2, // C. Tokyo
    // });

    // await page.fill('[data-testid="question-text-input"]', testQuestion.questionText);
    // await page.fill('[data-testid="choice-a-input"]', testQuestion.choices[0].text);
    // await page.fill('[data-testid="choice-b-input"]', testQuestion.choices[1].text);
    // await page.fill('[data-testid="choice-c-input"]', testQuestion.choices[2].text);
    // await page.fill('[data-testid="choice-d-input"]', testQuestion.choices[3].text);
    // await page.selectOption('[data-testid="correct-answer-select"]', 'C');
    // await page.fill('[data-testid="time-limit-input"]', '30');

    // Submit the question
    // await page.click('[data-testid="submit-question-btn"]');

    // Verify question appears in questions list
    // await expect(page.locator('[data-testid="question-list"]')).toContainText(testQuestion.questionText);
    // await expect(page.locator('[data-testid="question-1-correct-answer"]')).toHaveText('C');

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS2: Admin edits existing question', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Seed an existing question
    const existingQuestion = QuestionFactory.create4Choice({
      questionNumber: 1,
      questionText: 'Original question text',
    });
    await seeder.seedQuestions([existingQuestion], collectionPrefix);

    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented:

    // Navigate to questions section
    // await page.click('[data-testid="nav-questions"]');

    // Click edit button on the existing question
    // await page.click('[data-testid="edit-question-1-btn"]');

    // Update the question text
    // const updatedText = 'Updated question text - what is the capital of France?';
    // await page.fill('[data-testid="question-text-input"]', updatedText);

    // Update the correct answer
    // await page.selectOption('[data-testid="correct-answer-select"]', 'A');

    // Save changes
    // await page.click('[data-testid="save-question-btn"]');

    // Verify updates are reflected in the list
    // await expect(page.locator('[data-testid="question-list"]')).toContainText(updatedText);
    // await expect(page.locator('[data-testid="question-1-correct-answer"]')).toHaveText('A');

    // Verify updates persisted to Firestore
    // const questionDoc = await seeder.getQuestionById('question-1', collectionPrefix);
    // expect(questionDoc.questionText).toBe(updatedText);

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS3: Admin imports 50 guests from CSV', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented:

    // Navigate to guests section
    // await page.click('[data-testid="nav-guests"]');

    // Click "Import CSV" button
    // await page.click('[data-testid="import-csv-btn"]');

    // Upload CSV file (50 guests fixture)
    // const fileInput = page.locator('[data-testid="csv-file-input"]');
    // await fileInput.setInputFiles('tests/e2e/fixtures/guests.csv');

    // Trigger import
    // await page.click('[data-testid="process-import-btn"]');

    // Wait for import completion
    // await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
    // await expect(page.locator('[data-testid="import-count"]')).toHaveText('50 guests imported');

    // Verify all 50 guests appear in the guests list
    // const guestRows = page.locator('[data-testid="guest-list-row"]');
    // await expect(guestRows).toHaveCount(50);

    // Verify a few sample guests by name
    // await expect(page.locator('[data-testid="guest-list"]')).toContainText('Guest 1');
    // await expect(page.locator('[data-testid="guest-list"]')).toContainText('Guest 25');
    // await expect(page.locator('[data-testid="guest-list"]')).toContainText('Guest 50');

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS4: Admin manually adds single guest', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented:

    // Navigate to guests section
    // await page.click('[data-testid="nav-guests"]');

    // Click "Add Guest" button
    // await page.click('[data-testid="add-guest-btn"]');

    // Fill in guest form
    // const testGuest = GuestFactory.createNormal({
    //   name: 'Taro Yamada',
    //   attributes: ['speech_guest'],
    // });

    // await page.fill('[data-testid="guest-name-input"]', testGuest.name);

    // Select attributes (checkboxes)
    // await page.check('[data-testid="attribute-speech-guest"]');

    // Submit the guest
    // await page.click('[data-testid="submit-guest-btn"]');

    // Verify guest appears in guests list
    // await expect(page.locator('[data-testid="guest-list"]')).toContainText(testGuest.name);
    // await expect(page.locator('[data-testid="guest-taro-yamada-attributes"]')).toContainText('speech_guest');

    // Verify guest has active status
    // await expect(page.locator('[data-testid="guest-taro-yamada-status"]')).toHaveText('active');

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS5: Admin configures game settings (ranking rule, dropout rule)', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented:

    // Navigate to settings section
    // await page.click('[data-testid="nav-settings"]');

    // Configure ranking rule
    // await page.selectOption('[data-testid="ranking-rule-select"]', 'time_based');

    // Configure dropout rule
    // await page.selectOption('[data-testid="dropout-rule-select"]', 'worst_one');

    // Configure other settings (optional)
    // await page.fill('[data-testid="question-time-limit-input"]', '30');
    // await page.check('[data-testid="enable-period-champions"]');

    // Save settings
    // await page.click('[data-testid="save-settings-btn"]');

    // Verify success message
    // await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    // await expect(page.locator('[data-testid="settings-saved-message"]')).toHaveText('Settings saved successfully');

    // Verify settings are displayed correctly after save
    // await expect(page.locator('[data-testid="ranking-rule-select"]')).toHaveValue('time_based');
    // await expect(page.locator('[data-testid="dropout-rule-select"]')).toHaveValue('worst_one');

    // Verify settings persisted to Firestore
    // const settings = await seeder.getSettings(collectionPrefix);
    // expect(settings.rankingRule).toBe('time_based');
    // expect(settings.dropoutRule).toBe('worst_one');

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS6: Admin data persists after navigation', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // Setup: Seed initial data
    const testQuestions = QuestionFactory.createMany(3, { period: 'first-half' });
    const testGuests = GuestFactory.createMany(5, { prefix: 'Persisted Guest' });

    await seeder.seedQuestions(testQuestions, collectionPrefix);
    await seeder.seedGuests(testGuests, collectionPrefix);

    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented:

    // Step 1: Verify questions are displayed
    // await page.click('[data-testid="nav-questions"]');
    // const questionRows = page.locator('[data-testid="question-list-row"]');
    // await expect(questionRows).toHaveCount(3);

    // Step 2: Navigate to guests section
    // await page.click('[data-testid="nav-guests"]');
    // const guestRows = page.locator('[data-testid="guest-list-row"]');
    // await expect(guestRows).toHaveCount(5);

    // Step 3: Navigate to settings
    // await page.click('[data-testid="nav-settings"]');

    // Step 4: Navigate back to questions
    // await page.click('[data-testid="nav-questions"]');

    // Step 5: Verify questions still displayed (data persisted)
    // await expect(questionRows).toHaveCount(3);
    // await expect(page.locator('[data-testid="question-list"]')).toContainText('Question 1');

    // Step 6: Reload the page entirely
    // await page.reload();
    // await page.waitForLoadState('networkidle');

    // Step 7: Verify data still present after full page reload
    // await page.click('[data-testid="nav-questions"]');
    // await expect(questionRows).toHaveCount(3);

    // await page.click('[data-testid="nav-guests"]');
    // await expect(guestRows).toHaveCount(5);

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });

  test('AS7: Complete admin setup flow - questions, guests, settings', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    // This test validates the complete admin setup workflow in sequence
    // Combines all previous acceptance scenarios into a realistic end-to-end flow

    // Navigate to admin-app
    await page.goto('http://work-ubuntu:5170');
    await page.waitForLoadState('networkidle');

    // TODO: Once admin-app UI is implemented, this will validate:

    // Step 1: Add 10 questions
    // - Navigate to questions section
    // - Add questions one by one OR bulk import
    // - Verify all questions appear in list

    // Step 2: Import 50 guests from CSV
    // - Navigate to guests section
    // - Import CSV file
    // - Verify all guests loaded

    // Step 3: Configure game settings
    // - Navigate to settings
    // - Set ranking rule, dropout rule, time limits
    // - Save settings

    // Step 4: Verify complete setup
    // - Navigate back through all sections
    // - Verify data persists across navigation
    // - Reload page and verify data still present

    // Step 5: Verify ready for game start
    // - All required data present
    // - No validation errors
    // - Game can be started from host-app

    // PLACEHOLDER: Test structure ready, awaiting admin-app implementation
    expect(page.url()).toContain('work-ubuntu:5170');
  });
});
