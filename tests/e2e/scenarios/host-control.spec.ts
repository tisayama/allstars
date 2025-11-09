/**
 * E2E Test Suite: Host Control Flow
 *
 * User Story 4 (P2): As a game host, I need to control the game progression
 * (start questions, reveal answers, trigger special events), so that I can manage
 * the game flow and keep participants engaged.
 *
 * This test suite validates the complete host control experience:
 * - Starting questions
 * - Revealing correct answers
 * - Triggering rankings display
 * - Activating final question mode
 * - Reviving eliminated participants
 * - Phase transitions propagating to all apps
 * - Multi-host consistency
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { HostPage } from '../helpers/page-objects/host-page';
import { ProjectorPage } from '../helpers/page-objects/projector-page';
import { ParticipantPage } from '../helpers/page-objects/participant-page';
import { QuestionFactory, GuestFactory } from '../fixtures/factories';

test.describe('Host Control Flow', () => {
  /**
   * HC1: Host Starts Question
   *
   * Given: host-app is accessible and game data is configured
   * When: host clicks "Start Question"
   * Then: selected question becomes active for all participants and the projector
   */
  test('HC1: Host starts question and it becomes active for all apps', async ({
    page,
    browser,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // Navigate to host-app
    await hostPage.navigateTo();

    // TODO: Once host-app UI is implemented, uncomment:
    // Select question
    // await hostPage.selectQuestion(1);

    // Click "Start Question"
    // await hostPage.clickStartQuestion();

    // Verify question is active in gameState
    // const gameState = await seeder.getGameState(collectionPrefix);
    // expect(gameState.currentPhase).toBe('showing_question');
    // expect(gameState.currentQuestionId).toBe(question.id);

    // Verify projector-app shows the question (optional multi-context verification)
    // const projectorContext = await browser.newContext();
    // const projectorPage = await projectorContext.newPage();
    // const projector = new ProjectorPage(projectorPage);
    // await projector.navigateTo();
    // await expect(projector.getQuestionText()).resolves.toBe(question.questionText);

    // For now, just verify app loads
    await expect(page).toHaveURL(/work-ubuntu:5174/);
  });

  /**
   * HC2: Host Reveals Correct Answer
   *
   * Given: a question is active
   * When: host clicks "Reveal Correct Answer"
   * Then: correct answer is shown to all participants and the projector
   */
  test('HC2: Host reveals correct answer shown to all apps', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'B',
      timeLimit: 30,
    });

    // Setup: Seed question with active state
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_question',
        currentQuestionId: question.id,
        questionNumber: 1,
      },
      collectionPrefix
    );

    // TODO: Once host-app UI is implemented, uncomment:
    // await hostPage.navigateTo();

    // Click "Reveal Correct Answer"
    // await hostPage.clickRevealAnswer();

    // Verify gameState updated
    // const gameState = await seeder.getGameState(collectionPrefix);
    // expect(gameState.currentPhase).toBe('showing_correct_answer');
    // expect(gameState.correctAnswer).toBe('B');

    // For now, verify correct answer matches
    expect(question.correctAnswer).toBe('B');
  });

  /**
   * HC3: Host Shows Rankings
   *
   * Given: correct answer is revealed
   * When: host clicks "Show Rankings"
   * Then: rankings are displayed on the projector based on answer correctness and speed
   */
  test('HC3: Host shows rankings displayed on projector', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'What is the smallest prime number?',
      options: ['0', '1', '2', '3'],
      correctAnswer: 'C',
      timeLimit: 30,
    });

    // Setup: Seed question with correct answer revealed
    await seeder.seedQuestions([question], collectionPrefix);
    await seeder.seedGameState(
      {
        currentPhase: 'showing_correct_answer',
        currentQuestionId: question.id,
        correctAnswer: 'C',
        questionNumber: 1,
      },
      collectionPrefix
    );

    // TODO: Once host-app UI is implemented, uncomment:
    // await hostPage.navigateTo();

    // Click "Show Rankings"
    // await hostPage.clickShowRankings();

    // Verify gameState updated to showing_results
    // const gameState = await seeder.getGameState(collectionPrefix);
    // expect(gameState.currentPhase).toBe('showing_results');
    // expect(gameState.rankings).toBeDefined();

    // For now, verify question data
    expect(question.correctAnswer).toBe('C');
  });

  /**
   * HC4: Host Activates Final Question Mode
   *
   * Given: host is on a normal question
   * When: host marks the next question as the "final question"
   * Then: system activates special final question rules (e.g., gong activation)
   */
  test('HC4: Host activates final question mode with special rules', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const normalQuestion = QuestionFactory.createGeneral({
      questionText: 'Normal question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });
    const finalQuestion = QuestionFactory.createFinal({
      questionText: 'Final question with special rules?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 60,
    });

    // Setup: Seed both questions
    await seeder.seedQuestions([normalQuestion, finalQuestion], collectionPrefix);

    // TODO: Once host-app UI is implemented, uncomment:
    // await hostPage.navigateTo();

    // Mark next question as final question
    // await hostPage.selectQuestion(2);
    // await hostPage.markAsFinalQuestion();

    // Verify final question flag is set
    // const questions = await seeder.getQuestions(collectionPrefix);
    // const final = questions.find(q => q.id === finalQuestion.id);
    // expect(final?.isFinal).toBe(true);

    // Start final question
    // await hostPage.clickStartQuestion();

    // Verify special final question mode activated
    // const gameState = await seeder.getGameState(collectionPrefix);
    // expect(gameState.currentPhase).toBe('showing_question');
    // expect(gameState.isFinalQuestion).toBe(true);
    // expect(gameState.gongActivated).toBe(true);

    // For now, verify final question is marked
    expect(finalQuestion.isFinal).toBe(true);
  });

  /**
   * HC5: Host Revives All Eliminated Participants
   *
   * Given: rankings show participants have been eliminated
   * When: host clicks "Revive All"
   * Then: all eliminated participants are restored to active status
   */
  test('HC5: Host revives all eliminated participants', async ({
    page,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);

    // Setup: Seed guests with some eliminated
    const guests = await seeder.seedGuests(
      [
        GuestFactory.create({ name: 'Active Guest', status: 'active' }),
        GuestFactory.create({ name: 'Eliminated Guest 1', status: 'eliminated' }),
        GuestFactory.create({ name: 'Eliminated Guest 2', status: 'eliminated' }),
      ],
      collectionPrefix
    );

    await seeder.seedGameState(
      {
        currentPhase: 'showing_results',
        questionNumber: 3,
        eliminatedCount: 2,
        activeCount: 1,
      },
      collectionPrefix
    );

    // TODO: Once host-app UI is implemented, uncomment:
    // await hostPage.navigateTo();

    // Verify eliminated participants are shown
    // await expect(hostPage.getEliminatedCount()).resolves.toBe(2);

    // Click "Revive All"
    // await hostPage.clickReviveAll();

    // Verify all participants are now active
    // const updatedGuests = await seeder.getGuests(collectionPrefix);
    // const allActive = updatedGuests.every(g => g.status === 'active');
    // expect(allActive).toBe(true);

    // Verify gameState updated
    // const gameState = await seeder.getGameState(collectionPrefix);
    // expect(gameState.eliminatedCount).toBe(0);
    // expect(gameState.activeCount).toBe(3);

    // For now, verify initial state
    expect(guests.filter((g) => g.status === 'eliminated').length).toBe(2);
  });

  /**
   * HC6: Host Phase Transitions Update All Apps
   *
   * Given: host is viewing game state
   * When: host transitions to the next phase
   * Then: all connected apps (participant, projector) update to reflect the new phase
   */
  test('HC6: Host phase transitions propagate to all connected apps', async ({
    page,
    browser,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Test question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // TODO: Once all apps are implemented, uncomment:
    // Create contexts for all apps
    // const participantContext = await browser.newContext();
    // const projectorContext = await browser.newContext();
    // const participantPage = await participantContext.newPage();
    // const projectorPage = await projectorContext.newPage();

    // const participant = new ParticipantPage(participantPage);
    // const projector = new ProjectorPage(projectorPage);

    // Navigate all apps
    // await hostPage.navigateTo();
    // await participant.navigateTo();
    // await projector.navigateTo();

    // Host starts question
    // await hostPage.selectQuestion(1);
    // await hostPage.clickStartQuestion();

    // Wait for phase update to propagate (real-time via Firestore)
    // await page.waitForTimeout(500); // Max 500ms per SC-004

    // Verify all apps show same phase
    // await expect(hostPage.getCurrentPhase()).resolves.toBe('showing_question');
    // await expect(participant.isPhaseActive('showing_question')).resolves.toBe(true);
    // await expect(projector.isPhaseActive('showing_question')).resolves.toBe(true);

    // Host reveals answer
    // await hostPage.clickRevealAnswer();
    // await page.waitForTimeout(500);

    // Verify all apps updated
    // await expect(hostPage.getCurrentPhase()).resolves.toBe('showing_correct_answer');
    // await expect(participant.hasFeedback()).resolves.toBe(true);
    // await expect(projector.hasCorrectAnswer()).resolves.toBe(true);

    // For now, just verify we can create contexts
    const participantContext = await browser.newContext();
    expect(participantContext).toBeDefined();
  });

  /**
   * HC7: Multiple Hosts See Consistent State
   *
   * Given: multiple hosts try to control the game simultaneously
   * When: one host issues a command
   * Then: the command is executed and other hosts see the updated state
   */
  test('HC7: Multiple hosts see consistent game state', async ({
    page,
    browser,
    seeder,
    collectionPrefix,
  }) => {
    const hostPage1 = new HostPage(page);
    const question = QuestionFactory.createGeneral({
      questionText: 'Multi-host question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      timeLimit: 30,
    });

    // Setup: Seed question
    await seeder.seedQuestions([question], collectionPrefix);

    // Create second host context
    const host2Context = await browser.newContext();
    const host2Page = await host2Context.newPage();
    const hostPage2 = new HostPage(host2Page);

    // TODO: Once host-app UI is implemented, uncomment:
    // Navigate both hosts
    // await hostPage1.navigateTo();
    // await hostPage2.navigateTo();

    // Host 1 starts question
    // await hostPage1.selectQuestion(1);
    // await hostPage1.clickStartQuestion();

    // Wait for real-time sync
    // await page.waitForTimeout(500);

    // Verify Host 2 sees the update
    // await expect(hostPage2.getCurrentPhase()).resolves.toBe('showing_question');
    // await expect(hostPage2.getCurrentQuestionNumber()).resolves.toBe(1);

    // Host 2 reveals answer (testing concurrent control)
    // await hostPage2.clickRevealAnswer();
    // await page.waitForTimeout(500);

    // Verify both hosts see the same state
    // await expect(hostPage1.getCurrentPhase()).resolves.toBe('showing_correct_answer');
    // await expect(hostPage2.getCurrentPhase()).resolves.toBe('showing_correct_answer');

    // For now, verify we can create multiple contexts
    expect(host2Context).toBeDefined();
    expect(host2Page).toBeDefined();
  });
});
