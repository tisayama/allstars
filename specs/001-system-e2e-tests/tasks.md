# Tasks: System-Wide E2E Testing Infrastructure

**Input**: Design documents from `/specs/001-system-e2e-tests/`
**Prerequisites**: plan.md, spec.md (5 user stories), research.md (Playwright selected), data-model.md (test data structures), contracts/ (e2e-environment.yaml), quickstart.md

**Tests**: E2E test scenarios ARE the deliverable for this feature. Test infrastructure code (helpers, orchestration) will have unit tests as required by TDD constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each test scenario.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to repository root `/home/tisayama/allstars/`:
- E2E tests: `tests/e2e/`
- Configuration: `playwright.config.ts` (root), `tests/e2e/config/`
- Helper utilities: `tests/e2e/helpers/`
- Test scenarios: `tests/e2e/scenarios/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic E2E test structure

- [X] T001 Create root E2E test directory structure: tests/e2e/{setup,helpers,fixtures,scenarios,config}
- [X] T002 Install Playwright Test 1.56.1+ as dev dependency in root package.json
- [X] T003 [P] Install Playwright Chromium browser via pnpm exec playwright install chromium
- [X] T004 [P] Configure /etc/hosts entry for work-ubuntu hostname: echo "127.0.0.1 work-ubuntu" | sudo tee -a /etc/hosts
- [X] T005 [P] Create Playwright config at playwright.config.ts with baseURL http://work-ubuntu, timeout 30s
- [X] T006 [P] Add pnpm scripts to root package.json: e2e, e2e:setup, e2e:teardown, e2e:debug
- [X] T007 [P] Create test fixtures directory structure: tests/e2e/fixtures/{questions.json,guests.csv,settings.json}

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY test scenario can be implemented

**⚠️ CRITICAL**: No test scenario work can begin until this phase is complete

- [X] T008 Implement EmulatorManager class in tests/e2e/setup/emulator-manager.ts with start(), stop(), clearData()
- [X] T009 [P] Implement AppLauncher class in tests/e2e/setup/app-launcher.ts with launchApp(), stopApp(), launchAllApps()
- [X] T010 [P] Implement HealthChecker utility in tests/e2e/helpers/health-checker.ts with checkHealth(), waitForReady()
- [X] T011 [P] Implement FirestoreInit utility in tests/e2e/setup/firestore-init.ts with clearAllData(), seedInitialState()
- [X] T012 [P] Implement HostnameConfig utility in tests/e2e/setup/hostname-config.ts with verifyHostname(), getAppUrl()
- [X] T013 Implement TestDataSeeder class in tests/e2e/helpers/test-data-seeder.ts with seedQuestions(), seedGuests(), seedGameState(), seedSettings(), seedAnswers(), clearCollections()
- [X] T014 [P] Create test data factory functions in tests/e2e/fixtures/factories.ts: createTestQuestion(), createTestGuest(), createGameState(), createSettings()
- [X] T015 [P] Implement CollectionPrefix utility in tests/e2e/helpers/collection-prefix.ts with generatePrefix(), clearPrefixedCollections()
- [X] T016 [P] Create browser helper utilities in tests/e2e/helpers/browser-helpers.ts: createMultiContext(), navigateWithRetry(), waitForSocketConnection()
- [X] T017 [P] Create wait helper utilities in tests/e2e/helpers/wait-helpers.ts: waitForGameState(), waitForParticipantJoin(), waitForQuestionDisplay()
- [X] T018 Implement globalSetup in tests/e2e/globalSetup.ts: start emulators, wait for ready, clear data, launch all apps, verify health
- [X] T019 Implement globalTeardown in tests/e2e/globalTeardown.ts: stop apps, stop emulators with timeout
- [X] T020 [P] Create custom Playwright fixtures in tests/e2e/fixtures.ts: seeder fixture, collectionPrefix fixture, browser context fixtures
- [X] T021 [P] Add sample test data to tests/e2e/fixtures/questions.json (10 general knowledge questions, 2 final questions)
- [X] T022 [P] Add sample guest data to tests/e2e/fixtures/guests.csv (50 guest names with emails)
- [X] T023 [P] Add settings configurations to tests/e2e/fixtures/settings.json (time_based, accuracy_based, tournament_mode)
- [X] T024 Write unit tests for EmulatorManager in tests/e2e/setup/emulator-manager.test.ts
- [X] T025 [P] Write unit tests for AppLauncher in tests/e2e/setup/app-launcher.test.ts
- [X] T026 [P] Write unit tests for TestDataSeeder in tests/e2e/helpers/test-data-seeder.test.ts
- [X] T027 [P] Write unit tests for test data factories in tests/e2e/fixtures/factories.test.ts
- [X] T028 Run unit tests for test infrastructure: pnpm test tests/e2e/**/*.test.ts
- [ ] T029 Verify globalSetup/globalTeardown work: pnpm exec playwright test --debug (should start/stop cleanly)

**Checkpoint**: Foundation ready - test scenario implementation can now begin in parallel

---

## Phase 3: User Story 1 - Game Administrator Setup Flow (Priority: P1) 🎯 MVP

**Goal**: Validate that administrators can configure complete game session (questions, guests, settings) and all data persists correctly

**Independent Test**: Create complete game setup via admin-app, reload page, verify all data still present

### E2E Test Scenarios for User Story 1

> **NOTE: These E2E tests validate existing functionality. Write test FIRST, ensure it FAILS if functionality broken**

- [X] T030 [US1] E2E test scenario: Admin adds new question via UI - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 1)
- [X] T031 [P] [US1] E2E test scenario: Admin edits existing question - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 2)
- [X] T032 [P] [US1] E2E test scenario: Admin imports 50 guests from CSV - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 3)
- [X] T033 [P] [US1] E2E test scenario: Admin manually adds single guest - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 4)
- [X] T034 [P] [US1] E2E test scenario: Admin configures game settings (ranking rule, dropout rule) - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 5)
- [X] T035 [P] [US1] E2E test scenario: Admin data persists after navigation - tests/e2e/scenarios/admin-setup.spec.ts (Acceptance 6)

### Implementation Support for User Story 1

- [X] T036 [US1] Create admin app page object model in tests/e2e/helpers/page-objects/admin-page.ts: addQuestion(), editQuestion(), importGuests(), addGuest(), configureSettings()
- [X] T037 [US1] Run all User Story 1 scenarios: pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts
- [X] T038 [US1] Verify screenshots/videos captured on failure in test-results/
- [X] T039 [US1] Generate HTML report and validate: pnpm exec playwright show-report

**Checkpoint**: At this point, User Story 1 E2E tests should pass, validating admin setup flows work correctly

---

## Phase 4: User Story 2 - Participant Joining and Answering Flow (Priority: P1)

**Goal**: Validate that participants can join game sessions and submit answers with correct feedback

**Independent Test**: Simulate 10 participants joining and answering, verify all submissions recorded without data loss

### E2E Test Scenarios for User Story 2

- [ ] T040 [US2] E2E test scenario: Participant enters name and joins successfully - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 1)
- [ ] T041 [P] [US2] E2E test scenario: Participant sees question when host starts - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 2)
- [ ] T042 [P] [US2] E2E test scenario: Participant submits answer within time limit - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 3)
- [ ] T043 [P] [US2] E2E test scenario: Participant times out before submitting - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 4)
- [ ] T044 [P] [US2] E2E test scenario: Participant receives correct answer feedback - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 5)
- [ ] T045 [P] [US2] E2E test scenario: Participant receives incorrect answer feedback - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 6)
- [ ] T046 [P] [US2] E2E test scenario: 10 participants submit answers concurrently without data loss - tests/e2e/scenarios/participant-flow.spec.ts (Acceptance 7)

### Implementation Support for User Story 2

- [ ] T047 [US2] Create participant app page object model in tests/e2e/helpers/page-objects/participant-page.ts: join(), selectAnswer(), submitAnswer(), waitForFeedback()
- [ ] T048 [US2] Create concurrent participant helper in tests/e2e/helpers/concurrent-participants.ts: simulateParticipants(), submitConcurrentAnswers()
- [ ] T049 [US2] Run all User Story 2 scenarios: pnpm exec playwright test tests/e2e/scenarios/participant-flow.spec.ts
- [ ] T050 [US2] Verify concurrent submission data integrity in Firestore emulator

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently - admin can setup, participants can join and answer

---

## Phase 5: User Story 3 - Projector Display Flow (Priority: P1)

**Goal**: Validate that projector app displays correct game state, questions, answers, and rankings in real-time

**Independent Test**: Trigger all game phases (question, answer reveal, rankings) and verify each phase renders correctly on projector

### E2E Test Scenarios for User Story 3

- [ ] T051 [US3] E2E test scenario: Projector displays question text and timer when host starts - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 1)
- [ ] T052 [P] [US3] E2E test scenario: Projector shows answer submission count during question - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 2)
- [ ] T053 [P] [US3] E2E test scenario: Projector displays correct answer prominently on reveal - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 3)
- [ ] T054 [P] [US3] E2E test scenario: Projector shows rankings with names, scores, response times - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 4)
- [ ] T055 [P] [US3] E2E test scenario: Projector highlights fastest correct answer - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 5)
- [ ] T056 [P] [US3] E2E test scenario: Projector shows worst 10 participants correctly - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 6)
- [ ] T057 [P] [US3] E2E test scenario: Projector displays period champions with badges - tests/e2e/scenarios/projector-display.spec.ts (Acceptance 7)

### Implementation Support for User Story 3

- [ ] T058 [US3] Create projector app page object model in tests/e2e/helpers/page-objects/projector-page.ts: waitForQuestion(), verifyCorrectAnswer(), getRankings(), getHighlightedEntries()
- [ ] T059 [US3] Create ranking verification helper in tests/e2e/helpers/ranking-verifier.ts: verifyRankingOrder(), verifyBadges(), verifyTop10(), verifyWorst10()
- [ ] T060 [US3] Run all User Story 3 scenarios: pnpm exec playwright test tests/e2e/scenarios/projector-display.spec.ts
- [ ] T061 [US3] Verify real-time state propagation <500ms (measure with performance.now() in tests)

**Checkpoint**: All three P1 stories now work independently - admin setup, participant interaction, projector display all validated

---

## Phase 6: User Story 4 - Host Control Flow (Priority: P2)

**Goal**: Validate that host app can control all game progressions, transitions, and special events

**Independent Test**: Host triggers all game phases (start question, reveal answer, show rankings, final question, revive all) and verify state transitions propagate to all apps

### E2E Test Scenarios for User Story 4

- [ ] T062 [US4] E2E test scenario: Host starts question and all apps update - tests/e2e/scenarios/host-control.spec.ts (Acceptance 1)
- [ ] T063 [P] [US4] E2E test scenario: Host reveals correct answer and projector updates - tests/e2e/scenarios/host-control.spec.ts (Acceptance 2)
- [ ] T064 [P] [US4] E2E test scenario: Host shows rankings and projector displays them - tests/e2e/scenarios/host-control.spec.ts (Acceptance 3)
- [ ] T065 [P] [US4] E2E test scenario: Host marks question as final and gong activates - tests/e2e/scenarios/host-control.spec.ts (Acceptance 4)
- [ ] T066 [P] [US4] E2E test scenario: Host revives all eliminated participants - tests/e2e/scenarios/host-control.spec.ts (Acceptance 5)
- [ ] T067 [P] [US4] E2E test scenario: Host transitions to next phase and all apps sync - tests/e2e/scenarios/host-control.spec.ts (Acceptance 6)
- [ ] T068 [P] [US4] E2E test scenario: Multiple hosts see same state updates - tests/e2e/scenarios/host-control.spec.ts (Acceptance 7)

### Implementation Support for User Story 4

- [ ] T069 [US4] Create host app page object model in tests/e2e/helpers/page-objects/host-page.ts: startQuestion(), revealAnswer(), showRankings(), markFinalQuestion(), reviveAll(), transitionPhase()
- [ ] T070 [US4] Create multi-host helper in tests/e2e/helpers/multi-host.ts: createMultipleHosts(), verifyStateSyncAcrossHosts()
- [ ] T071 [US4] Run all User Story 4 scenarios: pnpm exec playwright test tests/e2e/scenarios/host-control.spec.ts
- [ ] T072 [US4] Verify all game phase transitions covered (ready_for_next, accepting_answers, showing_distribution, showing_correct_answer, showing_results, all_revived, all_incorrect)

**Checkpoint**: All P1 + P2 stories work - complete game control and display validated end-to-end

---

## Phase 7: User Story 5 - Test Infrastructure and Automation (Priority: P2)

**Goal**: Validate that entire E2E test suite can run with single command including emulator setup and teardown

**Independent Test**: Run `pnpm run e2e` on clean machine, verify all tests pass without manual setup

### E2E Test Scenarios for User Story 5

- [ ] T073 [US5] E2E infrastructure test: Firebase Emulator Suite starts automatically - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 1)
- [ ] T074 [P] [US5] E2E infrastructure test: All 4 apps start on work-ubuntu hostname - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 2)
- [ ] T075 [P] [US5] E2E infrastructure test: Tests interact with apps using work-ubuntu (not localhost) - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 3)
- [ ] T076 [P] [US5] E2E infrastructure test: Emulators and apps shut down automatically after tests - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 4)
- [ ] T077 [P] [US5] E2E infrastructure test: Clear pass/fail status shown in HTML report - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 5)
- [ ] T078 [P] [US5] E2E infrastructure test: Screenshots and logs available for failures - tests/e2e/scenarios/infrastructure.spec.ts (Acceptance 6)

### Implementation Support for User Story 5

- [ ] T079 [US5] Create shell script wrapper at scripts/run-e2e-tests.sh: start emulators, launch apps, run tests, cleanup
- [ ] T080 [US5] Add timeout mechanisms to all shell commands per constitution (timeout 60 for emulators, timeout 30 for apps, timeout 300 for tests)
- [ ] T081 [US5] Verify pnpm run e2e command works end-to-end: manual test from clean state
- [ ] T082 [US5] Document e2e command in root README.md with quickstart instructions
- [ ] T083 [US5] Run full test suite and verify execution time <5 minutes: pnpm run e2e (measure with time command)

**Checkpoint**: All user stories complete - full E2E testing infrastructure operational with single-command execution

---

## Phase 8: Full Game Flow Integration Test

**Purpose**: Comprehensive end-to-end test validating complete game session across all 4 apps

- [ ] T084 Create comprehensive full game flow test in tests/e2e/scenarios/full-game-flow.spec.ts:
  - Admin sets up 10 questions, 50 guests, settings
  - 50 participants join via participant-app
  - Host starts first question via host-app
  - Participants submit answers with varying response times
  - Projector displays question, answer, rankings
  - Host progresses through all 10 questions
  - Host triggers final question with gong
  - Rankings show period champions
  - Host revives eliminated participants
  - Verify all game phases covered
  - Verify 50+ concurrent participants handled without data loss
  - Verify state propagation <500ms between apps
- [ ] T085 Run full game flow test: pnpm exec playwright test tests/e2e/scenarios/full-game-flow.spec.ts --timeout=300000
- [ ] T086 Verify test completes in <5 minutes total execution time
- [ ] T087 Verify Firestore data isolation (test prefix cleanup working correctly)

---

## Phase 9: Edge Cases and Error Scenarios

**Purpose**: Validate system behavior under error conditions and edge cases

- [ ] T088 [P] E2E test: Participant loses network connection during answer submission - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T089 [P] E2E test: Host tries to reveal answer before question timer expires - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T090 [P] E2E test: Two participants submit answers at exact same millisecond - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T091 [P] E2E test: Projector handles displaying rankings when all participants answered incorrectly - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T092 [P] E2E test: System handles special characters and emoji in participant names - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T093 [P] E2E test: System handles special characters in question text - tests/e2e/scenarios/edge-cases.spec.ts
- [ ] T094 Run edge case tests: pnpm exec playwright test tests/e2e/scenarios/edge-cases.spec.ts

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple test scenarios and overall quality

- [ ] T095 [P] Add test retries configuration for flaky test resilience in playwright.config.ts (retries: CI ? 2 : 1)
- [ ] T096 [P] Add test parallelization config in playwright.config.ts (workers: CI ? 2 : undefined)
- [ ] T097 [P] Configure trace viewer settings in playwright.config.ts (trace: 'on-first-retry')
- [ ] T098 [P] Add CI/CD GitHub Actions workflow at .github/workflows/e2e-tests.yml with artifact upload
- [ ] T099 [P] Update CLAUDE.md with E2E testing patterns and best practices
- [ ] T100 [P] Create troubleshooting guide at docs/e2e-troubleshooting.md (based on quickstart.md)
- [ ] T101 Verify all test scenarios pass: pnpm run e2e (full suite)
- [ ] T102 Verify HTML report generation: pnpm exec playwright show-report
- [ ] T103 Verify work-ubuntu hostname used (grep for localhost, ensure zero matches in test files)
- [ ] T104 Verify shell command timeouts present (grep for "timeout" in setup scripts, verify all present)
- [ ] T105 Perform security review of test data (ensure no real credentials, tokens, or secrets in fixtures)
- [ ] T106 [P] Code cleanup: Remove debug console.log statements, commented code, TODOs from test files
- [ ] T107 Run linting: pnpm run lint -- tests/e2e/ (fix any issues)
- [ ] T108 Run formatting: pnpm run format tests/e2e/ (standardize code style)
- [ ] T109 Update quickstart.md validation: Follow steps in specs/001-system-e2e-tests/quickstart.md and verify accuracy
- [ ] T110 Performance optimization: Review slow tests in HTML report, optimize wait times and selectors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all test scenarios
- **User Story 1 (Phase 3)**: Depends on Foundational completion (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational completion (Phase 2) - Can run parallel with US1 if team capacity allows
- **User Story 3 (Phase 5)**: Depends on Foundational completion (Phase 2) - Can run parallel with US1/US2
- **User Story 4 (Phase 6)**: Depends on Foundational completion (Phase 2) - Can run parallel with US1/US2/US3
- **User Story 5 (Phase 7)**: Depends on Foundational completion (Phase 2) - Should run early to validate infrastructure
- **Full Game Flow (Phase 8)**: Depends on ALL user stories (US1-US4) being complete
- **Edge Cases (Phase 9)**: Depends on user stories being complete - Can run in parallel with Phase 8
- **Polish (Phase 10)**: Depends on all test scenarios complete

### User Story Dependencies

- **User Story 1 (Admin Setup - P1)**: No dependencies on other stories after Foundational phase complete
- **User Story 2 (Participant Flow - P1)**: No dependencies on other stories after Foundational phase complete
- **User Story 3 (Projector Display - P1)**: No dependencies on other stories after Foundational phase complete
- **User Story 4 (Host Control - P2)**: No dependencies on other stories after Foundational phase complete
- **User Story 5 (Test Infrastructure - P2)**: No dependencies on other stories after Foundational phase complete

**All user stories are independently testable and can be implemented in parallel after Foundational phase**

### Within Each User Story

- E2E test scenarios should be written first
- Tests should initially FAIL (verify functionality missing or broken)
- Page object models and helpers created to support tests
- Tests run and verified to pass
- Checkpoints validate story independently before moving on

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T003, T004, T005, T006, T007 can run in parallel

**Phase 2 (Foundational)**: Tasks T009-T012, T014-T017, T020-T023, T024-T027 can run in parallel (within their dependency groups)

**Phase 3 (User Story 1)**: Tasks T031-T035 (all test scenarios) can run in parallel after T030 complete

**Phase 4 (User Story 2)**: Tasks T041-T046 (all test scenarios) can run in parallel after T040 complete

**Phase 5 (User Story 3)**: Tasks T052-T057 (all test scenarios) can run in parallel after T051 complete

**Phase 6 (User Story 4)**: Tasks T063-T068 (all test scenarios) can run in parallel after T062 complete

**Phase 7 (User Story 5)**: Tasks T074-T078 (all test scenarios) can run in parallel after T073 complete

**Phase 9 (Edge Cases)**: Tasks T088-T093 (all edge case tests) can run in parallel

**Phase 10 (Polish)**: Tasks T095-T100, T106-T108 can run in parallel

**User Stories After Foundational**: All of Phase 3, 4, 5, 6, 7 can proceed in parallel if team capacity allows

---

## Parallel Example: User Story 1 (Admin Setup Flow)

```bash
# After T030 creates the test file, launch all remaining test scenarios together:

# Terminal 1:
"E2E test scenario: Admin edits existing question" (T031)

# Terminal 2:
"E2E test scenario: Admin imports 50 guests from CSV" (T032)

# Terminal 3:
"E2E test scenario: Admin manually adds single guest" (T033)

# Terminal 4:
"E2E test scenario: Admin configures game settings" (T034)

# Terminal 5:
"E2E test scenario: Admin data persists after navigation" (T035)

# All 5 scenarios can be written simultaneously in different parts of admin-setup.spec.ts
```

---

## Parallel Example: User Story 2 (Participant Flow)

```bash
# After T040 creates the test file, launch all remaining test scenarios together:

# Terminal 1:
"E2E test scenario: Participant sees question when host starts" (T041)

# Terminal 2:
"E2E test scenario: Participant submits answer within time limit" (T042)

# Terminal 3:
"E2E test scenario: Participant times out before submitting" (T043)

# Terminal 4:
"E2E test scenario: Participant receives correct answer feedback" (T044)

# Terminal 5:
"E2E test scenario: Participant receives incorrect answer feedback" (T045)

# Terminal 6:
"E2E test scenario: 10 participants submit answers concurrently" (T046)

# All 6 scenarios can be written simultaneously
```

---

## Implementation Strategy

### MVP First (Foundation + User Story 5 Only)

**Goal**: Get single-command E2E execution working first

1. Complete Phase 1: Setup → Basic structure exists
2. Complete Phase 2: Foundational (CRITICAL - blocks everything) → Test infrastructure ready
3. Complete Phase 7: User Story 5 → `pnpm run e2e` command works
4. **STOP and VALIDATE**: Run `pnpm run e2e`, verify emulators start/stop cleanly
5. Now ready to add actual test scenarios

**Why US5 First**: Infrastructure automation (US5) validates the test execution pipeline before writing test scenarios. This ensures the foundation is solid.

### Incremental Delivery (Add Test Coverage Progressively)

1. **Foundation + US5** → `pnpm run e2e` works (MVP!)
2. **+ User Story 1** → Admin setup flows validated
3. **+ User Story 2** → Participant flows validated
4. **+ User Story 3** → Projector display validated
5. **+ User Story 4** → Host control validated
6. **+ Phase 8** → Full game flow integration validated
7. **+ Phase 9** → Edge cases validated
8. **+ Phase 10** → Polish and optimization

Each increment adds test coverage without breaking existing tests.

### Parallel Team Strategy

With multiple developers after Foundational (Phase 2) complete:

**Scenario A: 3 Developers**
- Developer A: User Story 1 (Admin Setup) + User Story 4 (Host Control)
- Developer B: User Story 2 (Participant Flow) + User Story 5 (Infrastructure)
- Developer C: User Story 3 (Projector Display) + Phase 8 (Full Game Flow)

**Scenario B: 5 Developers**
- Developer A: User Story 1 (Admin Setup)
- Developer B: User Story 2 (Participant Flow)
- Developer C: User Story 3 (Projector Display)
- Developer D: User Story 4 (Host Control)
- Developer E: User Story 5 (Infrastructure) + Phase 8 (Full Game Flow)

**Scenario C: Solo Developer** (Recommended Order)
1. Phase 1 + Phase 2 (Setup + Foundation)
2. Phase 7 (US5 - Infrastructure) - Get automation working first
3. Phase 3 (US1 - Admin Setup) - Simplest test scenarios
4. Phase 4 (US2 - Participant Flow) - Core user interaction
5. Phase 5 (US3 - Projector Display) - Visual validation
6. Phase 6 (US4 - Host Control) - Control flow validation
7. Phase 8 (Full Game Flow) - Integration test
8. Phase 9 (Edge Cases) - Error handling
9. Phase 10 (Polish) - Final improvements

---

## Notes

- **[P] tasks**: Different files or independent components, no dependencies within same phase
- **[Story] label**: Maps task to specific user story for traceability (US1-US5)
- **Each user story is independently testable**: Any story can be validated without others
- **TDD for infrastructure code**: Test helpers, emulator managers, data seeders need unit tests
- **E2E tests are the deliverable**: Actual test scenarios validate existing app functionality
- **Constitution compliance**: All shell commands use timeout mechanisms (emulators: 60s, apps: 30s, tests: 300s)
- **work-ubuntu hostname**: All apps communicate via work-ubuntu (NO localhost references)
- **Clean Firestore state**: Each test run starts with empty emulator via globalSetup
- **Collection prefix isolation**: Parallel tests use unique prefixes to prevent data conflicts
- **Commit strategy**: Commit after each task or logical group (e.g., all models for a story)
- **Checkpoints**: Stop at any checkpoint to validate story independently before proceeding
- **Performance target**: Full E2E suite completes in <5 minutes (SC-002)
- **Concurrent participants**: System handles 50+ participants without data loss (SC-003)
- **State propagation**: Real-time updates propagate within 500ms (SC-004)

---

## Task Count Summary

- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 22 tasks (includes unit tests for infrastructure)
- **Phase 3 (US1 - Admin Setup)**: 10 tasks (6 E2E scenarios + 4 support)
- **Phase 4 (US2 - Participant Flow)**: 11 tasks (7 E2E scenarios + 4 support)
- **Phase 5 (US3 - Projector Display)**: 11 tasks (7 E2E scenarios + 4 support)
- **Phase 6 (US4 - Host Control)**: 11 tasks (7 E2E scenarios + 4 support)
- **Phase 7 (US5 - Infrastructure)**: 11 tasks (6 E2E scenarios + 5 support)
- **Phase 8 (Full Game Flow)**: 4 tasks
- **Phase 9 (Edge Cases)**: 7 tasks
- **Phase 10 (Polish)**: 16 tasks

**Total**: 110 tasks

**Parallel Opportunities**: 45+ tasks marked [P] can execute in parallel

**Independent Test Criteria**:
- US1: Create game setup, reload, verify data persists
- US2: 10 participants join and answer, verify all recorded
- US3: Trigger all phases, verify projector renders correctly
- US4: Host controls all transitions, verify state sync
- US5: Run `pnpm run e2e` clean, verify passes

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 7 (US5) = Infrastructure working with single-command execution

**Format Validation**: ✅ All 110 tasks follow checklist format (- [ ] [TaskID] [P?] [Story?] Description with file path)
