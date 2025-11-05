# Tasks: End-to-End Testing Infrastructure with Playwright

**Input**: Design documents from `/specs/008-e2e-playwright-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/test-helper-api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This feature follows TDD for helper utilities (tests first), then E2E tests are written to validate the 6-app system.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

E2E tests at **monorepo root**:
- Test infrastructure: `tests/e2e/`
- Configuration: `playwright.config.ts` (root level)
- Package dependencies: `package.json` (root level)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Playwright configuration

- [ ] T001 Install Playwright Test and Firebase Admin SDK dependencies in root package.json
- [ ] T002 Create Playwright configuration file at playwright.config.ts with retry, timeout, and reporter settings
- [ ] T003 [P] Create test directory structure at tests/e2e/ with subdirectories: fixtures/, helpers/, scenarios/
- [ ] T004 [P] Configure ESLint and Prettier for TypeScript test files

**Checkpoint**: Basic test infrastructure in place, ready for helper development

---

## Phase 2: Foundational (Test Helper Infrastructure)

**Purpose**: Core test utilities that ALL user stories depend on (TDD: write unit tests FIRST)

**⚠️ CRITICAL**: No E2E test scenarios can be written until this phase is complete

### Unit Tests for Helpers (Write FIRST, ensure they FAIL)

- [ ] T005 [P] Write unit tests for CollectionPrefixGenerator in tests/e2e/helpers.test.ts
- [ ] T006 [P] Write unit tests for HealthChecker in tests/e2e/helpers.test.ts
- [ ] T007 [P] Write unit tests for EmulatorManager in tests/e2e/helpers.test.ts
- [ ] T008 [P] Write unit tests for AppLauncher in tests/e2e/helpers.test.ts
- [ ] T009 [P] Write unit tests for TestDataSeeder in tests/e2e/helpers.test.ts

### Helper Implementation (Make tests PASS)

- [ ] T010 [P] Implement CollectionPrefixGenerator in tests/e2e/helpers/collectionPrefix.ts (make T005 pass)
- [ ] T011 [P] Implement HealthChecker in tests/e2e/helpers/healthChecker.ts (make T006 pass)
- [ ] T012 Implement EmulatorManager in tests/e2e/helpers/emulatorManager.ts (make T007 pass)
- [ ] T013 Implement AppLauncher in tests/e2e/helpers/appLauncher.ts (make T008 pass, depends on T011)
- [ ] T014 Implement TestDataSeeder in tests/e2e/helpers/testDataSeeder.ts (make T009 pass, depends on T010)

### Test Fixtures (No unit tests needed - just data)

- [ ] T015 [P] Create question fixtures in tests/e2e/fixtures/questions.ts (4-choice, sorting, unanswerable)
- [ ] T016 [P] Create guest fixtures in tests/e2e/fixtures/guests.ts (normal, with attributes, dropped)
- [ ] T017 [P] Create game state fixtures in tests/e2e/fixtures/gameState.ts (all phases)

### Global Setup/Teardown

- [ ] T018 Implement global-setup.ts with emulator start, data clear, app launch, and health checks (depends on T012, T013)
- [ ] T019 Implement global-teardown.ts with app shutdown and emulator stop (depends on T012, T013)

### Playwright Fixtures

- [ ] T020 Create Playwright fixture for collectionPrefix in tests/e2e/fixtures.ts (depends on T010)
- [ ] T021 Create Playwright fixture for browser contexts (projector, host, 3 guests) in tests/e2e/fixtures.ts

**Checkpoint**: Foundation ready - all helpers tested and working. E2E test scenarios can now be written.

---

## Phase 3: User Story 1 - Pre-Event Setup and Quiz Configuration (Priority: P1) 🎯 MVP

**Goal**: Validate that admin can set up quizzes and guest profiles before an event

**Independent Test**: Run `pnpm test:e2e scenarios/pre-event-setup.spec.ts` → Admin can create questions and guests, data persists in Firestore, join URLs generated

### E2E Tests for User Story 1

- [ ] T022 [P] [US1] Write E2E test AS1: Admin creates 4-choice and sorting questions in tests/e2e/scenarios/pre-event-setup.spec.ts
- [ ] T023 [P] [US1] Write E2E test AS2: Admin creates guests with speech_guest attribute in tests/e2e/scenarios/pre-event-setup.spec.ts
- [ ] T024 [P] [US1] Write E2E test AS3: Admin configures skip attributes for question in tests/e2e/scenarios/pre-event-setup.spec.ts
- [ ] T025 [P] [US1] Write E2E test AS4: Admin views guest join URLs for QR codes in tests/e2e/scenarios/pre-event-setup.spec.ts

**Checkpoint**: User Story 1 complete. Admin setup workflow validated. MVP ready for testing existing admin-app functionality.

---

## Phase 4: User Story 2 - Game Flow and Multi-App Coordination (Priority: P1)

**Goal**: Validate that all 6 applications work together seamlessly during a live game

**Independent Test**: Run `pnpm test:e2e scenarios/game-flow.spec.ts` → All apps synchronize, questions display, answers submit, results show, guests drop

### E2E Tests for User Story 2

- [ ] T026 [P] [US2] Write E2E test AS1: Question starts, all apps display correct states in tests/e2e/scenarios/game-flow.spec.ts
- [ ] T027 [P] [US2] Write E2E test AS2: Guests submit answers with correct/incorrect flags in tests/e2e/scenarios/game-flow.spec.ts
- [ ] T028 [P] [US2] Write E2E test AS3: Host advances through phases, apps update accordingly in tests/e2e/scenarios/game-flow.spec.ts
- [ ] T029 [P] [US2] Write E2E test AS4: Dropped guest status persists and displays correctly in tests/e2e/scenarios/game-flow.spec.ts

**Checkpoint**: User Story 2 complete. Core game flow validated across all 6 apps.

---

## Phase 5: User Story 3 - Period Finals and Champion Designation (Priority: P1)

**Goal**: Validate that gong mechanism correctly converts question to period-final and identifies champion

**Independent Test**: Run `pnpm test:e2e scenarios/period-finals.spec.ts` → Gong triggers, Top 10 calculated, champion designated, no eliminations

### E2E Tests for User Story 3

- [ ] T030 [P] [US3] Write E2E test AS1: Gong triggers mid-question and plays sound effect in tests/e2e/scenarios/period-finals.spec.ts
- [ ] T031 [P] [US3] Write E2E test AS2: Period-final calculates Top 10 and designates champion in tests/e2e/scenarios/period-finals.spec.ts
- [ ] T032 [P] [US3] Write E2E test AS3: Dropped guests cannot participate in period-final in tests/e2e/scenarios/period-finals.spec.ts
- [ ] T033 [P] [US3] Write E2E test AS4: Gong deactivates after period-final concludes in tests/e2e/scenarios/period-finals.spec.ts
- [ ] T034 [P] [US3] Write E2E test for gong undo mechanism (host can undo before results) in tests/e2e/scenarios/period-finals.spec.ts

**Checkpoint**: User Story 3 complete. Period-final mechanics and gong undo validated.

---

## Phase 6: User Story 4 - Guest Lifecycle and Exception Handling (Priority: P2)

**Goal**: Validate that guest status changes (dropping, reviving, reconnecting) work correctly

**Independent Test**: Run `pnpm test:e2e scenarios/guest-lifecycle.spec.ts` → Guests drop/revive, reconnect mid-game, all-incorrect handling works

### E2E Tests for User Story 4

- [ ] T035 [P] [US4] Write E2E test AS1: Revive All action resets dropped guests to active in tests/e2e/scenarios/guest-lifecycle.spec.ts
- [ ] T036 [P] [US4] Write E2E test AS2: All-incorrect triggers prize carryover and revive animation in tests/e2e/scenarios/guest-lifecycle.spec.ts
- [ ] T037 [P] [US4] Write E2E test AS3: Guest reconnects after disconnection and rejoins active question in tests/e2e/scenarios/guest-lifecycle.spec.ts
- [ ] T038 [P] [US4] Write E2E test AS4: Period start resets all dropped guests to active in tests/e2e/scenarios/guest-lifecycle.spec.ts

**Checkpoint**: User Story 4 complete. Guest lifecycle edge cases validated.

---

## Phase 7: User Story 5 - Test Environment Setup and Automation (Priority: P2)

**Goal**: Validate that E2E test suite runs reliably in local environment with emulators

**Independent Test**: Run `pnpm test:e2e scenarios/test-automation.spec.ts` → Infrastructure self-validates, parallel execution works, reporting accurate

### E2E Tests for User Story 5

- [ ] T039 [P] [US5] Write E2E test AS1: Tests connect to emulators, not production Firebase in tests/e2e/scenarios/test-automation.spec.ts
- [ ] T040 [P] [US5] Write E2E test AS2: Separate browser contexts maintain independent session state in tests/e2e/scenarios/test-automation.spec.ts
- [ ] T041 [P] [US5] Write E2E test AS3: Test data seeding and cleanup works correctly in tests/e2e/scenarios/test-automation.spec.ts
- [ ] T042 [P] [US5] Write E2E test AS4: Test reports include pass/fail, screenshots, error logs in tests/e2e/scenarios/test-automation.spec.ts

**Checkpoint**: User Story 5 complete. Test infrastructure self-validated.

---

## Phase 8: Health Check Endpoints (Prerequisite for Testing)

**Purpose**: Add /health endpoints to all apps to enable AppLauncher health checks

**⚠️ NOTE**: These tasks modify existing apps, not test code

- [ ] T043 [P] Add /health endpoint to apps/admin-app (returns HTTP 200 when ready)
- [ ] T044 [P] Add /health endpoint to apps/host-app (returns HTTP 200 when ready)
- [ ] T045 [P] Add /health endpoint to apps/projector-app (returns HTTP 200 when ready)
- [ ] T046 [P] Add /health endpoint to apps/participant-app (returns HTTP 200 when ready)
- [ ] T047 [P] Add /health endpoint to apps/api-server (returns HTTP 200 when ready)
- [ ] T048 [P] Add /health endpoint to apps/socket-server (returns HTTP 200 when ready)

**Checkpoint**: All apps expose health endpoints for automated readiness detection

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 [P] Add pnpm test:e2e script to root package.json
- [ ] T050 [P] Add pnpm test:e2e:headed and test:e2e:debug scripts to package.json
- [ ] T051 Document test execution in quickstart.md with examples (already created, verify accuracy)
- [ ] T052 Add GitHub Actions workflow for E2E tests in CI at .github/workflows/e2e-tests.yml
- [ ] T053 Configure Playwright HTML reporter and screenshot-on-failure in playwright.config.ts
- [ ] T054 Add .gitignore entries for playwright-report/, test-results/
- [ ] T055 Verify all tests follow TDD principles (helpers have unit tests, E2E tests validate apps)
- [ ] T056 Run full E2E suite and verify <10 minute execution time (SC-001)
- [ ] T057 Run full E2E suite and verify <5% flaky failure rate with retry (SC-003)

**Checkpoint**: All polish complete. Feature ready for production use.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all E2E test scenarios
- **Health Endpoints (Phase 8)**: Can be done in parallel with Foundational - needed before global-setup testing
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1: US1, US2, US3 → P2: US4, US5)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent of US1/US2/US3
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independent of all other stories

### Within Each Phase

**Foundational Phase (TDD Workflow)**:
1. Write unit tests for helpers (T005-T009) - ALL can run in parallel
2. Implement helpers to make tests pass (T010-T014) - Respects dependencies
3. Create fixtures (T015-T017) - ALL can run in parallel
4. Implement global setup/teardown (T018-T019) - Sequential
5. Create Playwright fixtures (T020-T021) - Sequential after T010

**User Story Phases**:
- All E2E tests within a story marked [P] can be written in parallel
- Each test file is independent and can be developed separately

**Health Endpoints Phase**:
- All health endpoint tasks can run in parallel across all 6 apps

### Parallel Opportunities

- All Setup tasks (T001-T004) marked [P] can run in parallel
- All unit test tasks (T005-T009) can run in parallel
- All helper implementations (T010, T011) that don't depend on each other can run in parallel
- All fixture creation tasks (T015-T017) can run in parallel
- All E2E tests within a user story can be written in parallel
- All user stories (Phase 3-7) can be worked on in parallel after Foundational completes
- All health endpoint tasks (T043-T048) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all unit tests together (parallel):
Task: "Write unit tests for CollectionPrefixGenerator"
Task: "Write unit tests for HealthChecker"
Task: "Write unit tests for EmulatorManager"
Task: "Write unit tests for AppLauncher"
Task: "Write unit tests for TestDataSeeder"

# Launch independent helper implementations together:
Task: "Implement CollectionPrefixGenerator"
Task: "Implement HealthChecker"

# Launch all fixture creation together (parallel):
Task: "Create question fixtures"
Task: "Create guest fixtures"
Task: "Create game state fixtures"
```

## Parallel Example: User Story 1

```bash
# Launch all E2E tests for User Story 1 together (parallel):
Task: "Write E2E test AS1: Admin creates questions"
Task: "Write E2E test AS2: Admin creates guests"
Task: "Write E2E test AS3: Admin configures skip attributes"
Task: "Write E2E test AS4: Admin views join URLs"
```

## Parallel Example: User Stories Across Team

```bash
# With 3 developers, after Foundational phase completes:
Developer A: Phase 3 (User Story 1 - Pre-Event Setup)
Developer B: Phase 4 (User Story 2 - Game Flow)
Developer C: Phase 5 (User Story 3 - Period Finals)

# All stories complete independently and can be tested in isolation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 8: Health Endpoints (needed for app orchestration)
4. Complete Phase 3: User Story 1
5. **STOP and VALIDATE**: Run `pnpm test:e2e scenarios/pre-event-setup.spec.ts`
6. Verify admin setup workflow works with tests

**MVP Delivers**: Automated testing of admin pre-event setup workflow

### Incremental Delivery

1. Complete Setup + Foundational + Health Endpoints → Test infrastructure ready
2. Add User Story 1 → Test admin-app independently → Validate (MVP!)
3. Add User Story 2 → Test 6-app coordination → Validate
4. Add User Story 3 → Test period-final mechanics → Validate
5. Add User Story 4 → Test guest lifecycle edge cases → Validate
6. Add User Story 5 → Test infrastructure self-validation → Validate
7. Each story adds test coverage without breaking previous tests

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. One developer adds Health Endpoints to all 6 apps
3. Once Foundational + Health Endpoints done:
   - Developer A: User Story 1 (Pre-Event Setup)
   - Developer B: User Story 2 (Game Flow)
   - Developer C: User Story 3 (Period Finals)
   - Developer D: User Story 4 (Guest Lifecycle)
   - Developer E: User Story 5 (Test Automation)
4. Stories complete and integrate independently

---

## Validation Checklist

After completing all tasks:

- [ ] All helper unit tests pass (T005-T009)
- [ ] All helpers implemented and unit tests green (T010-T014)
- [ ] All fixtures created and typed correctly (T015-T017)
- [ ] Global setup/teardown works (emulators + apps launch) (T018-T019)
- [ ] All 6 apps expose /health endpoints (T043-T048)
- [ ] User Story 1 E2E tests pass independently (T022-T025)
- [ ] User Story 2 E2E tests pass independently (T026-T029)
- [ ] User Story 3 E2E tests pass independently (T030-T034)
- [ ] User Story 4 E2E tests pass independently (T035-T038)
- [ ] User Story 5 E2E tests pass independently (T039-T042)
- [ ] Full suite runs in <10 minutes (SC-001)
- [ ] Flaky test rate <5% after retry (SC-003)
- [ ] Test reports include screenshots and logs (SC-004)
- [ ] Tests run against emulators only, not production (SC-002)

---

## Notes

- **TDD for Helpers**: Write unit tests FIRST (T005-T009), then implement to make them pass (T010-T014)
- **E2E Tests**: Written AFTER helpers are ready, validate real 6-app system behavior
- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Independently completable and testable
- **Constitution compliance**: All shell commands use explicit timeouts, helpers have unit tests
- **Commit strategy**: Commit after each task or logical group
- **Stop at checkpoints**: Validate each phase/story independently before proceeding

---

## Task Count Summary

- **Total Tasks**: 57
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 17 tasks (TDD workflow)
- **Phase 3 (User Story 1 - P1)**: 4 tasks
- **Phase 4 (User Story 2 - P1)**: 4 tasks
- **Phase 5 (User Story 3 - P1)**: 5 tasks
- **Phase 6 (User Story 4 - P2)**: 4 tasks
- **Phase 7 (User Story 5 - P2)**: 4 tasks
- **Phase 8 (Health Endpoints)**: 6 tasks
- **Phase 9 (Polish)**: 9 tasks
- **Parallel Opportunities**: 38 tasks can run in parallel (within constraints)
