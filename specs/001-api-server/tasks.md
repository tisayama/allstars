# Tasks: API Server for Quiz Game System

**Input**: Design documents from `/specs/001-api-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-server-openapi.yaml

**Tests**: Following TDD principles from constitution - all tests written FIRST before implementation

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `apps/api-server/` for API server code
- **Shared types**: `packages/types/` for shared TypeScript types
- **Shared contracts**: `packages/openapi/` for OpenAPI specifications
- **Tests**: `apps/api-server/tests/` with unit/, integration/, contract/ subdirectories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create apps/api-server directory structure with src/, tests/, and configuration files
- [x] T002 Initialize apps/api-server/package.json with TypeScript 5.x, Node.js 18+, Express 4.x, Firebase Admin SDK 11.x, firebase-functions 4.x dependencies
- [x] T003 [P] Initialize packages/types/package.json for shared TypeScript types
- [x] T004 [P] Configure apps/api-server/tsconfig.json for Node.js 18 with ES modules and strict mode
- [x] T005 [P] Configure apps/api-server/.eslintrc.js with TypeScript rules and Prettier integration
- [x] T006 [P] Configure apps/api-server/jest.config.js for unit, integration, and contract tests
- [x] T007 [P] Create firebase.json in repository root with emulator configuration (Auth port 9099, Firestore port 8080, Functions port 5001)
- [x] T008 [P] Create apps/api-server/firestore.indexes.json with composite indexes from data-model.md
- [x] T009 [P] Copy contracts/api-server-openapi.yaml to packages/openapi/api-server.yaml
- [x] T010 [P] Create apps/api-server/.env.example with FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST variables
- [x] T011 Update monorepo root package.json to include apps/api-server and packages/types workspaces
- [x] T012 Run pnpm install from repository root to link workspace dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types Package

- [x] T013 [P] Create packages/types/src/Question.ts with Question interface (period, questionNumber, type, text, choices, correctAnswer, skipAttributes)
- [x] T014 [P] Create packages/types/src/GameState.ts with GameState interface (activeQuestionId, phase enum, isGongActive, results)
- [x] T015 [P] Create packages/types/src/Guest.ts with Guest interface (id, name, status enum, attributes, authMethod enum)
- [x] T016 [P] Create packages/types/src/Answer.ts with Answer interface (id, guestId, questionId, answer, responseTimeMs, isCorrect, submittedAt)
- [x] T017 [P] Create packages/types/src/ErrorResponse.ts with ErrorResponse interface (code, message, details array)
- [x] T018 Create packages/types/src/index.ts barrel export for all types

### Core Infrastructure

- [x] T019 Create apps/api-server/src/utils/firestore.ts to initialize Firestore client with emulator detection
- [x] T020 Create apps/api-server/src/utils/errors.ts with custom error classes (ValidationError, NotFoundError, UnauthorizedError, ForbiddenError)
- [x] T021 Create apps/api-server/src/models/firestoreCollections.ts with collection name constants (questions, guests, answers, gameState)
- [x] T022 [P] Create apps/api-server/src/middleware/errorHandler.ts to format errors per FR-029 (JSON with code, message, details)
- [x] T023 Create apps/api-server/src/index.ts Express app initialization with routes and error handler middleware

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - System Enforces Authentication & Authorization (Priority: P1) 🎯 FOUNDATIONAL

**Goal**: Implement Firebase Authentication token validation and role-based access control to secure all endpoints

**Why First**: This is a cross-cutting security concern that ALL other user stories depend on. Must be complete before any endpoint implementation.

**Independent Test**: Verify by attempting requests with missing tokens, invalid tokens, and wrong authorization levels (anonymous trying admin endpoint). All security scenarios must reject appropriately.

### Tests for User Story 4 (TDD - Write FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T024 [P] [US4] Unit test for auth middleware in apps/api-server/tests/unit/middleware/auth.test.ts (verify token validation, role extraction)
- [x] T025 [P] [US4] Unit test for roleGuard middleware in apps/api-server/tests/unit/middleware/roleGuard.test.ts (verify Google vs Anonymous enforcement)
- [x] T026 [P] [US4] Integration test for authentication failures in apps/api-server/tests/integration/auth.test.ts (401/403 scenarios)

### Implementation for User Story 4

- [x] T027 [US4] Implement apps/api-server/src/middleware/auth.ts to validate Firebase ID tokens and extract user claims (uid, email, sign_in_provider)
- [x] T028 [US4] Implement apps/api-server/src/middleware/roleGuard.ts to enforce role-based access (requireGoogleLogin, requireAnonymousLogin)
- [x] T029 [US4] Add auth and roleGuard middleware to apps/api-server/src/index.ts route registration
- [x] T030 [US4] Add error handling for Firebase Auth service unavailability (FR-033 logging requirement)

**Checkpoint**: Authentication system complete and independently testable. All endpoints now have security foundation.

---

## Phase 4: User Story 1 - Quiz Master Creates Game Content (Priority: P1) 🎯 MVP

**Goal**: Enable admins to create, view, and update quiz questions for game preparation

**Independent Test**: Authenticate as admin, create question with all fields, retrieve list, update question, verify duplicate period/questionNumber rejected

### Tests for User Story 1 (TDD - Write FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T031 [P] [US1] Contract test for POST /admin/quizzes in apps/api-server/tests/contract/admin.contract.test.ts (validate against OpenAPI spec)
- [ ] T032 [P] [US1] Contract test for GET /admin/quizzes in apps/api-server/tests/contract/admin.contract.test.ts
- [ ] T033 [P] [US1] Contract test for PUT /admin/quizzes/{questionId} in apps/api-server/tests/contract/admin.contract.test.ts
- [ ] T034 [P] [US1] Contract test for GET /admin/guests in apps/api-server/tests/contract/admin.contract.test.ts
- [ ] T035 [P] [US1] Integration test for admin quiz CRUD workflow in apps/api-server/tests/integration/admin.test.ts (create → list → update → verify duplicate rejection)
- [ ] T036 [P] [US1] Integration test for guest list retrieval in apps/api-server/tests/integration/admin.test.ts

### Implementation for User Story 1

- [ ] T037 [P] [US1] Create apps/api-server/src/models/validators.ts with Zod schemas (CreateQuestionSchema, UpdateQuestionSchema)
- [ ] T038 [US1] Implement apps/api-server/src/services/questionService.ts with createQuestion (period+questionNumber uniqueness check), listQuestions, updateQuestion functions
- [ ] T039 [US1] Implement apps/api-server/src/services/guestService.ts with listGuests function
- [ ] T040 [US1] Implement apps/api-server/src/routes/admin.ts with POST /admin/quizzes, GET /admin/quizzes, PUT /admin/quizzes/:questionId, GET /admin/guests
- [ ] T041 [US1] Add Zod validation error transformation to FR-029 error format in apps/api-server/src/middleware/errorHandler.ts
- [ ] T042 [US1] Add requireGoogleLogin middleware to all admin routes in apps/api-server/src/routes/admin.ts
- [ ] T043 [US1] Register admin routes in apps/api-server/src/index.ts Express app

**Checkpoint**: Admin quiz management complete. Can create, view, update questions. Duplicate prevention working. Guest list accessible.

---

## Phase 5: User Story 3 - Participant Submits Answers (Priority: P1)

**Goal**: Enable wedding guests to submit answers with time synchronization and duplicate prevention

**Independent Test**: Authenticate as participant, sync time, submit answer for active question, verify duplicate rejected, verify correctness validated

### Tests for User Story 3 (TDD - Write FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T044 [P] [US3] Contract test for GET /participant/time in apps/api-server/tests/contract/participant.contract.test.ts
- [ ] T045 [P] [US3] Contract test for POST /participant/answer in apps/api-server/tests/contract/participant.contract.test.ts
- [ ] T046 [P] [US3] Integration test for time synchronization in apps/api-server/tests/integration/participant.test.ts (verify <50ms variance target)
- [ ] T047 [P] [US3] Integration test for answer submission workflow in apps/api-server/tests/integration/participant.test.ts (submit → verify correctness → duplicate rejection)
- [ ] T048 [P] [US3] Unit test for duplicate answer detection in apps/api-server/tests/unit/services/answerService.test.ts

### Implementation for User Story 3

- [ ] T049 [P] [US3] Create apps/api-server/src/models/validators.ts SubmitAnswerSchema with Zod (questionId, answer, responseTimeMs validation)
- [ ] T050 [US3] Implement apps/api-server/src/services/answerService.ts with submitAnswer function (transaction-based duplicate check, correctness validation, Firestore write)
- [ ] T051 [US3] Implement apps/api-server/src/routes/participant.ts with GET /participant/time endpoint (Date.now() response)
- [ ] T052 [US3] Implement apps/api-server/src/routes/participant.ts with POST /participant/answer endpoint (extract guestId from auth token)
- [ ] T053 [US3] Add requireAnonymousLogin middleware to POST /participant/answer in apps/api-server/src/routes/participant.ts (GET /participant/time has no auth)
- [ ] T054 [US3] Register participant routes in apps/api-server/src/index.ts Express app
- [ ] T055 [US3] Add handling for invalid question ID and invalid answer choice errors in apps/api-server/src/services/answerService.ts

**Checkpoint**: Participant answer submission complete. Time sync working. Duplicate prevention enforced. Correctness validation accurate.

---

## Phase 6: User Story 2 - Host Controls Game Flow (Priority: P1)

**Goal**: Enable hosts to orchestrate game through phases (start question, trigger gong, show distribution/answer/results, revive guests)

**Independent Test**: Authenticate as host, start question (verify state → accepting_answers), trigger phase transitions, calculate top/worst 10, revive guests

### Tests for User Story 2 (TDD - Write FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T056 [P] [US2] Contract test for POST /host/game/advance in apps/api-server/tests/contract/host.contract.test.ts (all 6 action types)
- [ ] T057 [P] [US2] Integration test for game state transitions in apps/api-server/tests/integration/host.test.ts (START_QUESTION → SHOW_DISTRIBUTION → SHOW_CORRECT_ANSWER → SHOW_RESULTS flow)
- [ ] T058 [P] [US2] Integration test for TRIGGER_GONG action in apps/api-server/tests/integration/host.test.ts
- [ ] T059 [P] [US2] Integration test for REVIVE_ALL action in apps/api-server/tests/integration/host.test.ts
- [ ] T060 [P] [US2] Integration test for top/worst 10 calculation in apps/api-server/tests/integration/host.test.ts (verify sorting by isCorrect then responseTimeMs)
- [ ] T061 [P] [US2] Unit test for Firestore transaction logic in apps/api-server/tests/unit/services/gameStateService.test.ts (concurrent update handling)

### Implementation for User Story 2

- [ ] T062 [P] [US2] Create apps/api-server/src/models/validators.ts GameActionRequestSchema with Zod (action enum, payload validation per action type)
- [ ] T063 [US2] Implement apps/api-server/src/services/gameStateService.ts with advanceGame function using Firestore transactions (FR-013 requirement)
- [ ] T064 [US2] Implement state transition logic in apps/api-server/src/services/gameStateService.ts for all 6 actions (START_QUESTION, TRIGGER_GONG, SHOW_DISTRIBUTION, SHOW_CORRECT_ANSWER, SHOW_RESULTS, REVIVE_ALL)
- [ ] T065 [US2] Implement top/worst 10 calculation in apps/api-server/src/services/gameStateService.ts using Firestore queries with composite indexes (data-model.md pattern)
- [ ] T066 [US2] Implement guest name hydration for results denormalization in apps/api-server/src/services/gameStateService.ts
- [ ] T067 [US2] Implement apps/api-server/src/services/guestService.ts reviveAll function with Firestore batch update
- [ ] T068 [US2] Implement apps/api-server/src/routes/host.ts with POST /host/game/advance endpoint
- [ ] T069 [US2] Add requireGoogleLogin middleware to host routes in apps/api-server/src/routes/host.ts
- [ ] T070 [US2] Register host routes in apps/api-server/src/index.ts Express app
- [ ] T071 [US2] Add state transition validation in apps/api-server/src/services/gameStateService.ts (e.g., cannot SHOW_DISTRIBUTION from idle phase)
- [ ] T072 [US2] Add empty results handling for SHOW_RESULTS when no answers submitted (edge case from spec.md)

**Checkpoint**: Host game control complete. All 6 actions working. State transitions validated. Top/worst 10 calculation accurate. Guest revival functional.

---

## Phase 7: End-to-End Integration & Polish

**Purpose**: Verify all user stories work together and cross-cutting concerns are addressed

### End-to-End Integration Tests

- [ ] T073 [P] Integration test for complete game workflow in apps/api-server/tests/integration/e2e.test.ts (admin creates question → host starts question → participants answer → host shows results)
- [ ] T074 [P] Integration test for Firestore unavailability handling in apps/api-server/tests/integration/firestore-failure.test.ts (verify 503 with Retry-After header per FR-031)
- [ ] T075 [P] Integration test for concurrent answer submissions in apps/api-server/tests/integration/concurrency.test.ts (verify 500 simultaneous submissions per SC-007)
- [ ] T076 [P] Integration test for concurrent host actions in apps/api-server/tests/integration/concurrency.test.ts (verify transaction-based race condition prevention per FR-013)

### Error Handling & Edge Cases

- [ ] T077 [P] Add validation for invalid question ID in participant answer submission (return 404 with FR-029 error format)
- [ ] T078 [P] Add validation for invalid answer choice in apps/api-server/src/services/answerService.ts (e.g., choice "E" for four-choice question)
- [ ] T079 [P] Add validation for negative/excessive responseTimeMs in apps/api-server/src/models/validators.ts SubmitAnswerSchema
- [ ] T080 [P] Add Firestore unavailability detection and 503 response in apps/api-server/src/middleware/errorHandler.ts (FR-031 Retry-After header)
- [ ] T081 [P] Add Firebase Auth service failure handling with FR-033 logging in apps/api-server/src/middleware/auth.ts

### Documentation & Configuration

- [ ] T082 [P] Create apps/api-server/README.md with setup instructions, development workflow, and deployment guide
- [ ] T083 [P] Create apps/api-server/scripts/seed-data.ts for Firebase Emulator test data seeding (questions, guests, answers)
- [ ] T084 [P] Create apps/api-server/.gitignore for node_modules, lib/, .env, emulator-data
- [ ] T085 [P] Add package.json scripts for build (tsc), test (jest), lint (eslint), format (prettier), emulator (firebase emulators:start)
- [ ] T086 [P] Create apps/api-server/CHANGELOG.md documenting implementation decisions from research.md

### Performance & Quality

- [ ] T087 [P] Add performance logging for game state updates to verify <2s target (SC-004)
- [ ] T088 [P] Add performance logging for server time endpoint to verify <50ms variance (SC-005)
- [ ] T089 [P] Run ESLint and Prettier on all source files and fix violations
- [ ] T090 [P] Run Jest with coverage report and verify >80% coverage threshold
- [ ] T091 Validate OpenAPI contract with swagger-cli validate packages/openapi/api-server.yaml
- [ ] T092 Initialize gameState collection with singleton document (phase: idle, activeQuestionId: null) using Firebase Emulator

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - BLOCKS all other user stories (auth required for all endpoints)
- **User Stories 1, 2, 3 (Phases 4, 5, 6)**: All depend on US4 completion
  - US1 (Admin) can proceed independently after US4
  - US3 (Participant) can proceed independently after US4
  - US2 (Host) can proceed independently after US4 BUT benefits from US1 (needs questions) and US3 (needs answers for results)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 4 (P1)**: No dependencies - foundational security (MUST complete first)
- **User Story 1 (P1)**: Depends on US4 - No dependencies on other stories
- **User Story 3 (P1)**: Depends on US4 - Loosely coupled to US1 (needs questions to exist but can test with seeded data)
- **User Story 2 (P1)**: Depends on US4 - Integrates with US1 (reads questions) and US3 (reads answers) but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD principle)
- Models/validators before services
- Services before routes
- Routes registered in index.ts after implementation
- Middleware applied after route implementation
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T003-T010 can run in parallel
**Phase 2 (Foundational)**:
  - Shared types T013-T017 can run in parallel
  - T022 errorHandler can run parallel to T019-T021

**Phase 3 (US4)**:
  - Tests T024-T026 can run in parallel
  - T027-T028 can run in parallel (different files)

**Phase 4 (US1)**:
  - Tests T031-T036 can run in parallel
  - T037 validators can run parallel to T038-T039 services (different concerns)

**Phase 5 (US3)**:
  - Tests T044-T048 can run in parallel
  - T049 validators can run parallel to T050 service
  - T051-T052 routes can run in parallel (different endpoints)

**Phase 6 (US2)**:
  - Tests T056-T061 can run in parallel
  - T062 validators can run parallel to T063-T067 services

**Phase 7 (Polish)**:
  - All tasks T073-T092 can run in parallel (different files, no dependencies)

**Cross-Phase Parallelism**:
Once Phase 3 (US4) completes, Phases 4, 5, and 6 can proceed in parallel with separate team members working on US1, US2, and US3 simultaneously.

---

## Parallel Example: User Story 1 (Admin Quiz Management)

```bash
# Launch all contract tests for User Story 1 together:
Task: "[US1] Contract test for POST /admin/quizzes in apps/api-server/tests/contract/admin.contract.test.ts"
Task: "[US1] Contract test for GET /admin/quizzes in apps/api-server/tests/contract/admin.contract.test.ts"
Task: "[US1] Contract test for PUT /admin/quizzes/{questionId} in apps/api-server/tests/contract/admin.contract.test.ts"
Task: "[US1] Contract test for GET /admin/guests in apps/api-server/tests/contract/admin.contract.test.ts"

# Launch validators and services in parallel (different files):
Task: "[US1] Create apps/api-server/src/models/validators.ts with Zod schemas"
Task: "[US1] Implement apps/api-server/src/services/questionService.ts"
Task: "[US1] Implement apps/api-server/src/services/guestService.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 4 + 1 Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T023)
3. Complete Phase 3: User Story 4 - Authentication (T024-T030) [CRITICAL BLOCKER]
4. Complete Phase 4: User Story 1 - Admin Quiz Management (T031-T043)
5. **STOP and VALIDATE**: Test US1 independently with authenticated admin user
6. **Deliverable**: Admin can create, view, update questions. MVP ready for content preparation.

### Incremental Delivery (Add User Stories Sequentially)

1. Foundation (Phases 1-3) → Auth working, all endpoints secured
2. Add User Story 1 (Phase 4) → Test independently → **Deploy: Admin quiz management ready**
3. Add User Story 3 (Phase 5) → Test independently → **Deploy: Participants can answer**
4. Add User Story 2 (Phase 6) → Test independently → **Deploy: Host can run live game**
5. Polish (Phase 7) → **Deploy: Production-ready system**

Each deployment adds value without breaking previous functionality.

### Parallel Team Strategy (3 Developers)

With multiple developers after foundation complete:

1. **All Together**: Complete Setup (Phase 1) + Foundational (Phase 2) + US4 Authentication (Phase 3)
2. **Once US4 Done, Split Work**:
   - **Developer A**: User Story 1 (Admin Quiz Management) - Phases 4
   - **Developer B**: User Story 3 (Participant Answers) - Phase 5
   - **Developer C**: User Story 2 (Host Game Control) - Phase 6
3. **Integration**: Developer C coordinates integration since US2 depends on US1/US3 data
4. **All Together**: Phase 7 Polish and E2E testing

---

## Task Count Summary

- **Phase 1 (Setup)**: 12 tasks
- **Phase 2 (Foundational)**: 11 tasks
- **Phase 3 (US4 - Auth)**: 7 tasks (3 tests + 4 implementation)
- **Phase 4 (US1 - Admin)**: 13 tasks (6 tests + 7 implementation)
- **Phase 5 (US3 - Participant)**: 12 tasks (5 tests + 7 implementation)
- **Phase 6 (US2 - Host)**: 17 tasks (6 tests + 11 implementation)
- **Phase 7 (Polish)**: 20 tasks
- **TOTAL**: 92 tasks

**Test Coverage**: 20 test tasks enforcing TDD (22% of tasks are tests)
**Parallelizable**: 45 tasks marked [P] (49% can run in parallel)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after US4 (auth) completes
- TDD enforced: All tests written FIRST, must FAIL before implementation
- Verify tests fail (red), implement (green), refactor (clean)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Firebase Emulator Suite required for local development and testing
- OpenAPI contract tests validate implementation against specification
- Firestore composite indexes must be deployed before queries work
