# Tasks: Ranking Display Logic

**Feature Branch**: `007-ranking-display-logic`
**Input**: Design documents from `/home/tisayama/allstars/specs/007-ranking-display-logic/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all complete)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. All tasks follow TDD approach: write tests first, verify failure, then implement.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label ([US1], [US2], [US3]) - only for user story tasks
- Include exact file paths in descriptions

---

## Phase 1: Setup & Dependencies

**Purpose**: Install required dependencies and configure project structure

- [X] T001 Install p-retry dependency in /home/tisayama/allstars/apps/api-server/package.json
- [X] T002 Verify TypeScript compilation configuration supports retry wrapper in /home/tisayama/allstars/apps/api-server/tsconfig.json

**Checkpoint**: Dependencies installed, project ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type extensions and utility functions that MUST be complete before ANY user story implementation

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend GameResults interface with periodChampions, period, rankingError fields in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T004 [P] Create RankedAnswer interface in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T005 [P] Add GamePeriod type export in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T006 [P] Create type guard isValidGameResults in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T007 [P] Create type guard hasRankingError in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T008 [P] Create type guard hasPeriodChampions in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T009 [P] Create helper function getDisplayRanking in /home/tisayama/allstars/packages/types/src/GameState.ts
- [X] T010 Rebuild packages/types module in /home/tisayama/allstars/packages/types/
- [X] T011 Create retry wrapper utility with p-retry in /home/tisayama/allstars/apps/api-server/src/utils/retry.ts
- [X] T012 Create Zod validation schemas (RankedAnswerSchema, GameResultsSchema) in /home/tisayama/allstars/apps/api-server/src/models/validators.ts

**Checkpoint**: Foundation ready - shared types and utilities available for all user stories

---

## Phase 3: User Story 1 - Display Worst 10 Ranking for Non-Final Questions (Priority: P1)

**Goal**: Display only the Worst 10 ranking (slowest 10 correct answers) after non-final questions, hide Top 10 ranking

**Independent Test**: Complete any non-final question with at least 10 correct answers, advance to results phase, verify only Worst 10 ranking (slowest correct answers) displays while Top 10 is hidden

### Tests for User Story 1 (TDD: Write FIRST, Verify FAIL)

- [X] T013 [P] [US1] Write unit test for getWorst10CorrectAnswers with 15 correct answers in /home/tisayama/allstars/apps/api-server/tests/unit/services/answerService.test.ts
- [X] T014 [P] [US1] Write unit test for getWorst10CorrectAnswers with 8 correct answers in /home/tisayama/allstars/apps/api-server/tests/unit/services/answerService.test.ts
- [X] T015 [P] [US1] Write unit test for getWorst10CorrectAnswers with tie at 10th position in /home/tisayama/allstars/apps/api-server/tests/unit/services/answerService.test.ts
- [X] T016 [P] [US1] Write integration test for non-final question showing only Worst 10 in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [X] T017 [US1] Run tests and verify all User Story 1 tests FAIL before implementation

### Implementation for User Story 1

- [X] T018 [US1] Rename getWorst10IncorrectAnswers to getWorst10CorrectAnswers in /home/tisayama/allstars/apps/api-server/src/services/answerService.ts
- [X] T019 [US1] Modify ranking filter from isCorrect === false to isCorrect === true in /home/tisayama/allstars/apps/api-server/src/services/answerService.ts
- [X] T020 [US1] Implement tie-handling logic (include all tied at 10th position) in /home/tisayama/allstars/apps/api-server/src/services/answerService.ts
- [X] T021 [US1] Add fewer-than-10 answers edge case handling in /home/tisayama/allstars/apps/api-server/src/services/answerService.ts
- [X] T022 [US1] Update all callers of getWorst10IncorrectAnswers to use new function name in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [X] T023 [US1] Run tests and verify all User Story 1 tests PASS after implementation

**Checkpoint**: ✅ User Story 1 COMPLETE - Worst 10 ranking displays correctly for non-final questions (all tests passing)

---

## Phase 4: User Story 2 - Display Top 10 Ranking for Period Final Questions (Priority: P1)

**Goal**: Display only the Top 10 ranking (fastest 10 correct answers) after period-final questions (isGongActive: true), designate period champion(s)

**Independent Test**: Complete a period-final question with at least 10 correct answers, advance to results phase, verify only Top 10 ranking (fastest correct answers) displays while Worst 10 is hidden

### Tests for User Story 2 (TDD: Write FIRST, Verify FAIL)

- [ ] T024 [P] [US2] Write unit test for period champion designation with single fastest in /home/tisayama/allstars/apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T025 [P] [US2] Write unit test for period champion designation with tied fastest in /home/tisayama/allstars/apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T026 [P] [US2] Write integration test for period-final question showing only Top 10 in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [ ] T027 [P] [US2] Write integration test for period field populated correctly in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [ ] T028 [US2] Run tests and verify all User Story 2 tests FAIL before implementation

### Implementation for User Story 2

- [ ] T029 [US2] Add period champion calculation logic in handleShowResults in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T030 [US2] Populate periodChampions field when isGongActive is true in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T031 [US2] Populate period field from currentQuestion.period when isGongActive is true in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T032 [US2] Handle tied fastest participants (all with same responseTimeMs as top10[0]) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T033 [US2] Ensure periodChampions and period are undefined for non-final questions in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T034 [US2] Run tests and verify all User Story 2 tests PASS after implementation

**Checkpoint**: User Story 2 fully functional and testable independently - Top 10 ranking displays correctly for period-final questions with champions designated

---

## Phase 5: User Story 3 - Correct Elimination Logic for Non-Final Questions (Priority: P1)

**Goal**: Eliminate the slowest correct answer participant(s) from non-final questions based on Worst 10 ranking

**Independent Test**: Submit answers to non-final question where multiple participants answer correctly, verify slowest correct answer participant is marked as eliminated

### Tests for User Story 3 (TDD: Write FIRST, Verify FAIL)

- [ ] T035 [P] [US3] Write unit test for elimination of single slowest correct answer in /home/tisayama/allstars/apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T036 [P] [US3] Write unit test for elimination of multiple tied slowest correct answers in /home/tisayama/allstars/apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T037 [P] [US3] Write unit test for no elimination when all answers incorrect in /home/tisayama/allstars/apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T038 [P] [US3] Write integration test for elimination logic on non-final question in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [ ] T039 [US3] Run tests and verify all User Story 3 tests FAIL before implementation

### Implementation for User Story 3

- [ ] T040 [US3] Update elimination logic to use Worst 10 correct answers in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T041 [US3] Identify slowest participant from worst10 array (index 0) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T042 [US3] Handle tied slowest participants (all with responseTimeMs === worst10[0].responseTimeMs) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T043 [US3] Ensure no elimination occurs for period-final questions in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T044 [US3] Preserve existing all-incorrect logic (no eliminations, prize carryover) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T045 [US3] Run tests and verify all User Story 3 tests PASS after implementation

**Checkpoint**: User Story 3 fully functional and testable independently - Elimination logic correctly identifies and eliminates slowest correct answer participants

---

## Phase 6: Error Handling & Retry Logic (Cross-Story Infrastructure)

**Purpose**: Add retry logic and graceful degradation for ranking calculation failures (applies to all user stories)

### Tests for Error Handling (TDD: Write FIRST, Verify FAIL)

- [ ] T046 [P] Write unit test for retry wrapper with successful retry on attempt 2 in /home/tisayama/allstars/apps/api-server/tests/unit/utils/retry.test.ts
- [ ] T047 [P] Write unit test for retry wrapper with all retries exhausted in /home/tisayama/allstars/apps/api-server/tests/unit/utils/retry.test.ts
- [ ] T048 [P] Write unit test for fail-fast on non-retryable errors in /home/tisayama/allstars/apps/api-server/tests/unit/utils/retry.test.ts
- [ ] T049 [P] Write integration test for graceful degradation with rankingError flag in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [ ] T050 Write integration test for game progression continues despite ranking error in /home/tisayama/allstars/apps/api-server/tests/integration/host.test.ts
- [ ] T051 Run tests and verify all error handling tests FAIL before implementation

### Implementation for Error Handling

- [ ] T052 Wrap ranking calculation in calculateRankingsWithRetry in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T053 Add try-catch block around ranking calculation in handleShowResults in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T054 Set rankingError: true and empty arrays on all retries exhausted in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T055 Add structured logging for retry attempts (onFailedAttempt callback) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T056 Add error logging with full context (questionId, error, timestamp) in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T057 Ensure game phase transitions to showing_results even with ranking error in /home/tisayama/allstars/apps/api-server/src/services/gameStateService.ts
- [ ] T058 Run tests and verify all error handling tests PASS after implementation

**Checkpoint**: Error handling complete - system retries 3 times and degrades gracefully with empty rankings on failure

---

## Phase 7: Frontend Display Logic

**Purpose**: Update all frontend applications to conditionally display rankings based on isGongActive flag

### Projector App

- [ ] T059 [P] Update RankingsDisplay component to conditionally render based on isGongActive in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx
- [ ] T060 [P] Hide Top 10 section when isGongActive is false in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx
- [ ] T061 [P] Hide Worst 10 section when isGongActive is true in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx
- [ ] T062 [P] Display period champion badge for periodChampions in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx
- [ ] T063 [P] Display error state UI when rankingError is true in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx
- [ ] T064 [P] Handle variable-length arrays (ties exceed 10) with dynamic UI in /home/tisayama/allstars/apps/projector-app/src/components/RankingsDisplay.tsx

### Participant App

- [ ] T065 [P] Update RankingsDisplay component to conditionally render based on isGongActive in /home/tisayama/allstars/apps/participant-app/src/components/RankingsDisplay.tsx
- [ ] T066 [P] Hide Top 10 section when isGongActive is false in /home/tisayama/allstars/apps/participant-app/src/components/RankingsDisplay.tsx
- [ ] T067 [P] Hide Worst 10 section when isGongActive is true in /home/tisayama/allstars/apps/participant-app/src/components/RankingsDisplay.tsx
- [ ] T068 [P] Display period champion indicator in /home/tisayama/allstars/apps/participant-app/src/components/RankingsDisplay.tsx
- [ ] T069 [P] Display error state UI when rankingError is true in /home/tisayama/allstars/apps/participant-app/src/components/RankingsDisplay.tsx

### Host App

- [ ] T070 [P] Update RankingsDisplay component to conditionally render based on isGongActive in /home/tisayama/allstars/apps/host-app/src/components/RankingsDisplay.tsx
- [ ] T071 [P] Hide Top 10 section when isGongActive is false in /home/tisayama/allstars/apps/host-app/src/components/RankingsDisplay.tsx
- [ ] T072 [P] Hide Worst 10 section when isGongActive is true in /home/tisayama/allstars/apps/host-app/src/components/RankingsDisplay.tsx
- [ ] T073 [P] Display period champion information in /home/tisayama/allstars/apps/host-app/src/components/RankingsDisplay.tsx
- [ ] T074 [P] Display error state UI when rankingError is true in /home/tisayama/allstars/apps/host-app/src/components/RankingsDisplay.tsx

**Checkpoint**: All frontend apps display correct rankings based on question type and handle error states gracefully

---

## Phase 8: Polish & Verification

**Purpose**: End-to-end testing, documentation, and final validation

- [ ] T075 [P] Run full unit test suite and verify all tests pass in /home/tisayama/allstars/apps/api-server/
- [ ] T076 [P] Run full integration test suite and verify all tests pass in /home/tisayama/allstars/apps/api-server/
- [ ] T077 [P] Run linting checks (npm run lint) in /home/tisayama/allstars/apps/api-server/
- [ ] T078 [P] Run formatting checks (npm run format:check) in /home/tisayama/allstars/apps/api-server/
- [ ] T079 Execute quickstart.md validation scenario for non-final questions in /home/tisayama/allstars/specs/007-ranking-display-logic/quickstart.md
- [ ] T080 Execute quickstart.md validation scenario for period-final questions in /home/tisayama/allstars/specs/007-ranking-display-logic/quickstart.md
- [ ] T081 Execute quickstart.md validation scenario for tie handling in /home/tisayama/allstars/specs/007-ranking-display-logic/quickstart.md
- [ ] T082 Execute quickstart.md validation scenario for error handling in /home/tisayama/allstars/specs/007-ranking-display-logic/quickstart.md
- [ ] T083 Manual verification against all acceptance scenarios in spec.md
- [ ] T084 Update CLAUDE.md with p-retry patterns and GameResults type extensions using .specify/scripts/bash/update-agent-context.sh
- [ ] T085 Review and update README if needed in /home/tisayama/allstars/

**Checkpoint**: Feature complete, all tests passing, all acceptance criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Phase 2 - No dependencies on other stories
  - User Story 2 (Phase 4): Can start after Phase 2 - No dependencies on other stories
  - User Story 3 (Phase 5): Can start after Phase 2 - No dependencies on other stories
  - All three user stories can proceed in parallel (if staffed) or sequentially by priority
- **Error Handling (Phase 6)**: Depends on Foundational (Phase 2) completion
- **Frontend (Phase 7)**: Depends on User Stories 1-3 completion (backend must emit correct GameResults)
- **Polish (Phase 8)**: Depends on all previous phases being complete

### Within Each User Story (TDD Approach)

1. Tests written FIRST (marked with [P] can run in parallel)
2. Verify tests FAIL before implementation
3. Implementation tasks (some marked [P] can run in parallel)
4. Verify tests PASS after implementation
5. Story complete and independently testable

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001 and T002 can run in parallel

**Phase 2 (Foundational)**:
- T003, T004, T005, T006, T007, T008, T009 can run in parallel (all editing GameState.ts - sequential recommended)
- T011, T012 can run in parallel with each other and with T010 completion

**Phase 3-5 (User Stories)**:
- All three user story phases (3, 4, 5) can proceed in parallel if team capacity allows
- Within each story, test tasks marked [P] can run in parallel
- Implementation tasks marked [P] can run in parallel

**Phase 6 (Error Handling)**:
- T046, T047, T048, T049 can run in parallel (different test files)

**Phase 7 (Frontend)**:
- All projector-app tasks (T059-T064) can run in parallel
- All participant-app tasks (T065-T069) can run in parallel
- All host-app tasks (T070-T074) can run in parallel
- All three apps (projector, participant, host) can be updated in parallel

**Phase 8 (Polish)**:
- T075, T076, T077, T078 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch type extensions together (careful - same file):
Task T003: "Extend GameResults interface in GameState.ts"
Task T004: "Create RankedAnswer interface in GameState.ts"
Task T005: "Add GamePeriod type export in GameState.ts"
# Recommend sequential for same-file edits

# Launch separate files in parallel:
Task T011: "Create retry wrapper in utils/retry.ts"
Task T012: "Create Zod schemas in models/validators.ts"
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T013: "Write unit test for getWorst10CorrectAnswers with 15 correct answers"
Task T014: "Write unit test for getWorst10CorrectAnswers with 8 correct answers"
Task T015: "Write unit test for getWorst10CorrectAnswers with tie at 10th position"
Task T016: "Write integration test for non-final question showing only Worst 10"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T012) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T013-T023)
4. **STOP and VALIDATE**: Test User Story 1 independently per quickstart.md
5. Deploy/demo if ready

**MVP Delivers**: Non-final questions display Worst 10 ranking (slowest correct answers) with proper elimination logic

### Incremental Delivery (All P1 User Stories)

1. Complete Setup + Foundational (Phase 1-2) - Foundation ready
2. Add User Story 1 (Phase 3) - Test independently - Deploy/Demo (MVP)
3. Add User Story 2 (Phase 4) - Test independently - Deploy/Demo
4. Add User Story 3 (Phase 5) - Test independently - Deploy/Demo
5. Add Error Handling (Phase 6) - Test with simulated failures
6. Update Frontend (Phase 7) - Test all apps
7. Polish & Verify (Phase 8) - Final validation

**Full Feature Delivers**: Complete ranking display logic with period champions, error resilience, and frontend updates

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phase 1-2)
2. Once Foundational is done:
   - Developer A: User Story 1 (Phase 3)
   - Developer B: User Story 2 (Phase 4)
   - Developer C: User Story 3 (Phase 5)
3. Developer A: Error Handling (Phase 6) after completing US1
4. Developers A, B, C: Frontend apps (Phase 7) in parallel
5. Team: Polish & Verification (Phase 8) together

---

## Task Count Summary

- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Foundational)**: 10 tasks (BLOCKS all user stories)
- **Phase 3 (User Story 1)**: 11 tasks (5 tests + 6 implementation)
- **Phase 4 (User Story 2)**: 11 tasks (5 tests + 6 implementation)
- **Phase 5 (User Story 3)**: 11 tasks (5 tests + 6 implementation)
- **Phase 6 (Error Handling)**: 13 tasks (6 tests + 7 implementation)
- **Phase 7 (Frontend)**: 16 tasks (6 projector + 5 participant + 5 host)
- **Phase 8 (Polish)**: 11 tasks

**Total**: 85 tasks

**Breakdown by Type**:
- Setup/Infrastructure: 12 tasks
- Tests (TDD): 31 tasks
- Backend Implementation: 19 tasks
- Frontend Implementation: 16 tasks
- Verification/Polish: 7 tasks

---

## Validation Checklist

- [x] ALL tasks have checkboxes `- [ ]`
- [x] ALL tasks have sequential IDs (T001-T085)
- [x] User story tasks have [US1], [US2], [US3] labels
- [x] Setup/Foundational/Error/Frontend/Polish tasks have NO story labels
- [x] Parallelizable tasks marked with [P]
- [x] ALL tasks include file paths
- [x] Test tasks before implementation tasks (TDD)
- [x] Each user story is independently testable
- [x] Breaking changes documented (getWorst10IncorrectAnswers renamed)
- [x] Foundational phase clearly marked as blocking

---

## Notes

- [P] tasks = different files, no shared dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD approach: Write tests first, verify FAIL, implement, verify PASS
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Breaking change: getWorst10IncorrectAnswers → getWorst10CorrectAnswers requires updating all callers
- Frontend updates require backend GameResults schema changes to be deployed first
