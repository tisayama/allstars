# Tasks: Fix Firestore Game State Synchronization

**Input**: Design documents from `/specs/001-firestore-gamestate-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Following TDD approach (Constitution Principle II) - tests are written FIRST before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Monorepo structure:
- **Shared types**: `packages/types/src/`, `packages/types/tests/`
- **API server**: `apps/api-server/src/`, `apps/api-server/tests/`
- **Projector app**: `apps/projector-app/src/`, `apps/projector-app/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared validation infrastructure that all user stories will depend on

- [X] T001 Build packages/types to ensure latest shared types are available for all apps
- [X] T002 [P] Verify Firebase emulators are running and accessible at localhost:8080 (Firestore)
- [X] T003 [P] Verify existing retry utility in apps/api-server/src/utils/retry.ts is functional

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validation and logging infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Components (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] Write unit tests for GameState validation schema in packages/types/tests/validators/gameState.test.ts
- [X] T005 [P] Write unit tests for structured JSON logger in apps/api-server/tests/unit/utils/logger.test.ts

### Foundational Implementation

- [ ] T006 [P] Create GameState Zod validation schema in packages/types/src/validators/gameState.ts
- [ ] T007 [P] Create structured JSON logging utility in apps/api-server/src/utils/logger.ts
- [ ] T008 Export GameState validators from packages/types/src/index.ts
- [ ] T009 Build packages/types to publish validators to workspace
- [ ] T010 Run foundational tests to verify all pass (T004, T005)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Projector Display Shows Current Game State (Priority: P1) 🎯 MVP

**Goal**: Fix the core Firestore synchronization issue so projector app displays correct game state without "Unknown Phase" errors

**Independent Test**: Start quiz game through host app, verify projector app displays correct game phase (accepting_answers, showing_results, etc.) without errors. Projector updates within 1 second when host transitions phases.

**Refs**: FR-001, FR-002, FR-004, FR-006, SC-001, SC-002

### Tests for User Story 1 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] Write unit tests for gameStateService validation logic in apps/api-server/tests/unit/services/gameStateService.test.ts
- [ ] T012 [P] [US1] Write integration tests for Firestore sync in apps/api-server/tests/integration/firestore-sync.test.ts
- [ ] T013 [P] [US1] Write unit tests for useGameState hook error handling in apps/projector-app/tests/unit/hooks/useGameState.test.ts

### Implementation for User Story 1

- [ ] T014 [US1] Add validation before Firestore write in apps/api-server/src/services/gameStateService.ts (import validateGameStateSafe)
- [ ] T015 [US1] Change transaction.set() to use {merge: true} in apps/api-server/src/services/gameStateService.ts line ~108-116
- [ ] T016 [US1] Add structured JSON logging for validation failures in apps/api-server/src/services/gameStateService.ts
- [ ] T017 [US1] Ensure all 4 required fields (currentPhase, currentQuestion, isGongActive, lastUpdate) are written in apps/api-server/src/services/gameStateService.ts
- [ ] T018 [US1] Add defensive validation in projector-app Firestore listener in apps/projector-app/src/hooks/useGameState.ts line ~36-46
- [ ] T019 [US1] Add user-friendly error messages for validation failures in apps/projector-app/src/hooks/useGameState.ts
- [ ] T020 [US1] Run User Story 1 tests to verify all pass (T011, T012, T013)

**Checkpoint**: At this point, projector app should display correct game state with zero "Unknown Phase" errors (SC-001)

---

## Phase 4: User Story 2 - Game State Updates Persist Across System Restarts (Priority: P2)

**Goal**: Ensure game state is reliably persisted to Firestore with all required fields so components can restart and recover to correct state

**Independent Test**: Advance game to "showing_distribution" phase through host app, restart projector app, verify it immediately loads and displays current state (not stale/cached data).

**Refs**: FR-002, FR-005, FR-006, SC-003, SC-004

### Tests for User Story 2 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [P] [US2] Write integration tests for projector restart scenarios in apps/projector-app/tests/integration/firestore-listener.test.ts
- [ ] T022 [P] [US2] Write unit tests for Firestore document completeness in apps/api-server/tests/unit/services/gameStateService.test.ts

### Implementation for User Story 2

- [ ] T023 [US2] Add conditional spread operators for optional fields in apps/api-server/src/services/gameStateService.ts (participantCount, settings, timeRemaining)
- [ ] T024 [US2] Verify merge behavior preserves existing optional fields in apps/api-server/src/services/gameStateService.ts
- [ ] T025 [US2] Add validation for timestamp field in GameState schema in packages/types/src/validators/gameState.ts
- [ ] T026 [US2] Verify projector app loads gameState within 2 seconds on initial connection in apps/projector-app/src/hooks/useGameState.ts
- [ ] T027 [US2] Run User Story 2 tests to verify all pass (T021, T022)

**Checkpoint**: At this point, projector app should successfully load current game state on first attempt in 99% of startups (SC-003)

---

## Phase 5: User Story 3 - Graceful Error Handling for Data Issues (Priority: P3)

**Goal**: Provide clear, actionable error messages when synchronization issues occur, with detailed logging for operators

**Independent Test**: Simulate failure scenarios (missing fields, invalid data, network interruptions) and verify appropriate error messages are displayed with diagnostic information logged.

**Refs**: FR-007, FR-007a, FR-007b, FR-008, SC-005

### Tests for User Story 3 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T028 [P] [US3] Write tests for malformed gameState handling in apps/projector-app/tests/unit/hooks/useGameState.test.ts
- [ ] T029 [P] [US3] Write tests for structured logging format validation in apps/api-server/tests/unit/utils/logger.test.ts
- [ ] T030 [P] [US3] Write tests for Firestore transaction failure logging in apps/api-server/tests/unit/services/gameStateService.test.ts

### Implementation for User Story 3

- [ ] T031 [P] [US3] Add detailed validation error logging in apps/projector-app/src/hooks/useGameState.ts (console.error with field errors)
- [ ] T032 [P] [US3] Add structured JSON logging for transaction failures in apps/api-server/src/services/gameStateService.ts
- [ ] T033 [US3] Add error context logging (timestamp, component, error message, stack trace) in apps/api-server/src/utils/logger.ts
- [ ] T034 [US3] Verify error messages are user-friendly (no technical stack traces to end users) in apps/projector-app/src/hooks/useGameState.ts
- [ ] T035 [US3] Add logging for race conditions (timestamp validation conflicts) in apps/api-server/src/services/gameStateService.ts
- [ ] T036 [US3] Run User Story 3 tests to verify all pass (T028, T029, T030)

**Checkpoint**: All user stories should now be independently functional with comprehensive error handling and logging

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and verification across all user stories

- [ ] T037 [P] Run full test suite across all packages (pnpm test)
- [ ] T038 [P] Run type checking across all packages (pnpm run typecheck)
- [ ] T039 [P] Run linting across all packages (pnpm run lint)
- [ ] T040 [P] Run build process for all packages (pnpm run build)
- [ ] T041 Execute manual E2E test from quickstart.md (normal game flow scenario)
- [ ] T042 Execute manual E2E test from quickstart.md (projector restart scenario)
- [ ] T043 Execute manual E2E test from quickstart.md (malformed data negative test)
- [ ] T044 Verify all success criteria from spec.md are met (SC-001 through SC-005)
- [ ] T045 Document any configuration changes needed in quickstart.md (if applicable)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 error handling but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Validation logic before Firestore writes
- API server changes before projector app changes (data flows API → Firestore → Projector)
- Core implementation before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All tasks marked [P] (T002, T003)
- **Phase 2 Tests**: T004 and T005 can run in parallel
- **Phase 2 Implementation**: T006 and T007 can run in parallel
- **User Story 1 Tests**: T011, T012, T013 can run in parallel
- **User Story 2 Tests**: T021, T022 can run in parallel
- **User Story 3 Tests**: T028, T029, T030 can run in parallel
- **User Story 3 Implementation**: T031, T032 can run in parallel
- **Phase 6**: T037, T038, T039, T040 can run in parallel
- **Once Foundational completes**: US1, US2, US3 can all start in parallel (if team capacity allows)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together (TDD - write tests first):
Task T011: "Write unit tests for gameStateService validation logic"
Task T012: "Write integration tests for Firestore sync"
Task T013: "Write unit tests for useGameState hook error handling"
```

## Parallel Example: User Story 1 Implementation

```bash
# After tests are written and failing, these can be worked on independently:
Task T014: "Add validation before Firestore write" (api-server)
Task T018: "Add defensive validation in projector-app listener" (projector-app)
# Note: T014-T017 must be sequential as they modify same file
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Verify environment ready
2. Complete Phase 2: Foundational → Write tests, implement validation & logging (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 → Write tests FIRST, then implement Firestore sync fix
4. **STOP and VALIDATE**: Test User Story 1 independently - projector should show correct phase without errors
5. Run manual E2E test (T041) to verify fix works end-to-end
6. Deploy/demo if ready

**Time estimate**: 4-6 hours implementation + 2-3 hours testing

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (validation & logging infrastructure)
2. Add User Story 1 → Test independently → **MVP DEPLOYED** (fixes "Unknown Phase" errors)
3. Add User Story 2 → Test independently → Deploy (ensures data persistence)
4. Add User Story 3 → Test independently → Deploy (comprehensive error handling)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (highest priority - fixes projector display)
   - **Developer B**: User Story 2 (data persistence)
   - **Developer C**: User Story 3 (error handling & logging)
3. Stories complete and integrate independently
4. Final integration testing in Phase 6

**Recommended**: Start with MVP-first strategy (US1 only) to get projector working quickly, then add US2 and US3 incrementally.

---

## Task Statistics

- **Total Tasks**: 45
- **Setup Tasks**: 3 (Phase 1)
- **Foundational Tasks**: 7 (Phase 2)
- **User Story 1 Tasks**: 10 (Phase 3)
- **User Story 2 Tasks**: 7 (Phase 4)
- **User Story 3 Tasks**: 9 (Phase 5)
- **Polish Tasks**: 9 (Phase 6)
- **Parallel Opportunities**: 18 tasks marked [P]
- **Test Tasks**: 11 (following TDD approach)

---

## Success Criteria Validation Checklist

After completing all tasks, verify these success criteria from spec.md:

- [ ] **SC-001**: Projector app displays correct game state with zero "Unknown Phase" errors in 100% of normal operation scenarios
- [ ] **SC-002**: Game state updates propagate from API server to projector app display within 1 second (measured from API call completion to projector UI update)
- [ ] **SC-003**: Projector app successfully loads and displays game state on first attempt in 99% of startups (no refresh required)
- [ ] **SC-004**: System maintains game state consistency across all components with zero data loss during state transitions
- [ ] **SC-005**: Data synchronization failures are logged with actionable diagnostic information in 100% of failure cases using structured JSON format compatible with standard log aggregation tools

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD approach**: Write tests first (Constitution Principle II), verify they fail, then implement
- Verify tests pass after each user story phase
- Commit after each task or logical group using conventional commit format
- Stop at any checkpoint to validate story independently
- File paths are absolute within monorepo structure
- Use existing retry utility (apps/api-server/src/utils/retry.ts) - don't create new one
- No new API contracts needed - this is an internal Firestore sync fix
