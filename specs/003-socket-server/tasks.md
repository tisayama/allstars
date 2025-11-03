# Tasks: Real-Time Game State Synchronization Server

**Input**: Design documents from `/specs/003-socket-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included (TDD required per Constitution Principle II)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

Project paths based on plan.md structure:
- **Application**: `/apps/socket-server/`
- **Shared types**: `/packages/types/`
- **Tests**: `/apps/socket-server/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create directory structure at /apps/socket-server with subdirectories: src/, tests/, scripts/
- [X] T002 Create package.json with Socket.io 4.x, Firebase Admin SDK 11.x, Express 4.x dependencies per research.md
- [X] T003 [P] Create tsconfig.json with ES2022 target, strict mode, and declaration maps
- [X] T004 [P] Create jest.config.js with ts-jest preset and 80% coverage thresholds
- [X] T005 [P] Create .eslintrc.js with TypeScript parser and @typescript-eslint rules
- [X] T006 [P] Create .prettierrc.json with singleQuote, trailingComma, 100 printWidth
- [X] T007 [P] Create Dockerfile with node:18-alpine base and multi-stage build
- [X] T008 [P] Create .dockerignore excluding node_modules, tests, .git
- [X] T009 Install dependencies with pnpm install in /apps/socket-server/
- [X] T010 [P] Create tests/setup.ts with Firebase Admin mocks
- [X] T011 [P] Copy Socket.io event types from specs/003-socket-server/contracts/socket-events.ts to /packages/types/src/SocketEvents.ts
- [X] T012 Update /packages/types/src/index.ts to export SocketEvents types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T013 Create /apps/socket-server/src/utils/errors.ts with custom error classes (AuthenticationError, ValidationError, ListenerError)
- [X] T014 [P] Create /apps/socket-server/src/utils/logger.ts with Winston logger setup (debug, info, warn, error levels)
- [X] T015 [P] Write unit test for error classes in tests/unit/utils/errors.test.ts
- [X] T016 [P] Create /apps/socket-server/src/monitoring/metrics.ts with prom-client Gauge, Counter, and Histogram instances (OR-001 through OR-004)
- [X] T017 Create /apps/socket-server/src/server.ts with Express server setup and /healthz endpoint
- [X] T018 Write unit test for metrics collector in tests/unit/monitoring/metrics.test.ts
- [X] T019 Create /apps/socket-server/src/index.ts with server initialization and Firebase Admin SDK setup
- [X] T020 Verify foundational setup with pnpm build and pnpm test

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Authenticated Connection Management (Priority: P1) 🔐 FOUNDATIONAL

**Goal**: Implement Firebase Auth token verification to ensure only authenticated users can connect to the WebSocket server

**Why First**: This is P1 and BLOCKS all other stories - no events can be broadcast until authentication is working (FR-002, FR-008)

**Independent Test**: Attempt connections with valid/invalid/expired tokens and verify only authenticated clients are admitted to gameRoom

### Tests for User Story 4 (TDD - Write First)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T021 [P] [US4] Write contract test for authenticate event payload validation in tests/contract/authPayload.test.ts
- [X] T022 [P] [US4] Write unit test for token verification (valid token) in tests/unit/auth/tokenVerifier.test.ts
- [X] T023 [P] [US4] Write unit test for token verification (invalid token) in tests/unit/auth/tokenVerifier.test.ts
- [X] T024 [P] [US4] Write unit test for token verification (expired token) in tests/unit/auth/tokenVerifier.test.ts
- [X] T025 [P] [US4] Write integration test for Socket.io auth flow in tests/integration/authentication.test.ts
- [X] T026 [US4] Run tests and verify they FAIL (red state)

### Implementation for User Story 4

- [X] T027 [US4] Implement verifyAuthToken function in /apps/socket-server/src/auth/tokenVerifier.ts using admin.auth().verifyIdToken()
- [X] T028 [US4] Implement Socket.io authentication middleware in /apps/socket-server/src/middleware/authMiddleware.ts (handle 'authenticate' event, verify token, join gameRoom or disconnect)
- [X] T029 [US4] Add authentication timeout (10s) in authMiddleware.ts to auto-disconnect unauth clients (FR-002)
- [X] T030 [US4] Add auth failure logging with sanitized credentials in authMiddleware.ts (OR-002)
- [X] T031 [US4] Integrate authMiddleware into Socket.io server in src/server.ts
- [X] T032 [US4] Add connection count metric increment/decrement in authMiddleware.ts (OR-001)
- [X] T033 [US4] Run tests and verify they PASS (green state)
- [X] T034 [US4] Refactor token verification with input validation and better error messages (clean state)

**Checkpoint**: At this point, clients can authenticate and join gameRoom. No events broadcast yet, but connection management works.

---

## Phase 4: User Story 1 - Simultaneous Question Start (Priority: P1) 🎯 MVP CORE

**Goal**: Implement START_QUESTION event broadcasting when Firestore gameState/live changes to currentPhase="accepting_answers"

**Why Next**: This is the PRIMARY value proposition - instant question synchronization (FR-004, SC-001)

**Independent Test**: Connect 10+ test clients, update Firestore to trigger question start, measure timestamp deltas (<100ms p99)

### Tests for User Story 1 (TDD - Write First)

- [X] T035 [P] [US1] Write unit test for event mapper (currentPhase="accepting_answers" → START_QUESTION) in tests/unit/events/eventMapper.test.ts
- [X] T036 [P] [US1] Write unit test for Firestore listener initialization in tests/unit/listeners/firestoreListener.test.ts
- [X] T037 [P] [US1] Write contract test for START_QUESTION payload structure in tests/contract/startQuestionEvent.test.ts
- [X] T038 [US1] Write integration test for START_QUESTION broadcast flow in tests/integration/questionStart.test.ts
- [X] T039 [US1] Run tests and verify they FAIL (red state)

### Implementation for User Story 1

- [X] T040 [P] [US1] Create Zod schema for GameState validation in /apps/socket-server/src/utils/validator.ts (validates currentPhase, currentQuestionId, isGongActive)
- [X] T041 [P] [US1] Write unit test for GameState validator in tests/unit/utils/validator.test.ts
- [X] T042 [US1] Implement mapToSocketEvent function in /apps/socket-server/src/events/eventMapper.ts (handle currentPhase="accepting_answers" → START_QUESTION event)
- [X] T043 [US1] Implement broadcastEvent function in /apps/socket-server/src/events/broadcaster.ts (io.to('gameRoom').emit with latency tracking OR-003)
- [X] T044 [US1] Implement Firestore onSnapshot listener in /apps/socket-server/src/listeners/firestoreListener.ts (watch gameState/live, validate, map, broadcast)
- [X] T045 [US1] Add serverStartTime timestamp to START_QUESTION payload in eventMapper.ts (FR-007, SC-008)
- [X] T046 [US1] Add broadcast latency histogram tracking in broadcaster.ts (OR-003)
- [X] T047 [US1] Integrate Firestore listener into server initialization in src/index.ts
- [X] T048 [US1] Run tests and verify they PASS (green state)
- [X] T049 [US1] Refactor event mapper with cleaner phase enum handling (clean state)

**Checkpoint**: START_QUESTION events now broadcast to all authenticated clients when question starts. MVP is functional!

---

## Phase 5: User Story 2 - Instant Phase Transitions (Priority: P1) 📊 MVP EXTENSION

**Goal**: Implement GAME_PHASE_CHANGED event broadcasting for all non-"accepting_answers" phase transitions

**Why Next**: Completes P1 requirements for seamless show flow (FR-006, SC-005)

**Independent Test**: Trigger phase changes (showing_distribution, showing_correct_answer, showing_results), verify <150ms delivery (p95)

### Tests for User Story 2 (TDD - Write First)

- [X] T050 [P] [US2] Write unit test for event mapper (showing_distribution → GAME_PHASE_CHANGED) in tests/unit/events/eventMapper.test.ts
- [X] T051 [P] [US2] Write unit test for event mapper (showing_correct_answer → GAME_PHASE_CHANGED) in tests/unit/events/eventMapper.test.ts
- [X] T052 [P] [US2] Write unit test for event mapper (showing_results → GAME_PHASE_CHANGED) in tests/unit/events/eventMapper.test.ts
- [X] T053 [P] [US2] Write unit test for event mapper (all_revived → GAME_PHASE_CHANGED) in tests/unit/events/eventMapper.test.ts
- [X] T054 [US2] Write contract test for GAME_PHASE_CHANGED payload structure in tests/contract/phaseChangedEvent.test.ts
- [X] T055 [US2] Write integration test for phase transition broadcast flow in tests/integration/phaseTransitions.test.ts
- [X] T056 [US2] Run tests and verify they FAIL (red state)

### Implementation for User Story 2

- [X] T057 [US2] Extend mapToSocketEvent in /apps/socket-server/src/events/eventMapper.ts to handle showing_distribution phase
- [X] T058 [P] [US2] Extend mapToSocketEvent to handle showing_correct_answer phase
- [X] T059 [P] [US2] Extend mapToSocketEvent to handle showing_results phase
- [X] T060 [P] [US2] Extend mapToSocketEvent to handle all_revived phase
- [X] T061 [US2] Add phase validation in GameState schema (validator.ts) to ensure valid phase enum values
- [X] T062 [US2] Update Firestore listener to handle all phase changes (not just accepting_answers)
- [X] T063 [US2] Run tests and verify they PASS (green state)
- [X] T064 [US2] Refactor event mapper with switch/case pattern for cleaner phase handling (clean state)

**Checkpoint**: All phase transitions now broadcast instantly. P1 requirements complete (US1, US2, US4 done).

---

## Phase 6: User Story 3 - GONG Event Broadcasting (Priority: P2) 🔔

**Goal**: Implement GONG_ACTIVATED event broadcasting when isGongActive flag changes to true

**Why Next**: Adds game drama without blocking core functionality (FR-005)

**Independent Test**: Set isGongActive=true in Firestore, verify all clients receive GONG_ACTIVATED within 100ms

### Tests for User Story 3 (TDD - Write First)

- [X] T065 [P] [US3] Write unit test for event mapper (isGongActive=true → GONG_ACTIVATED) in tests/unit/events/eventMapper.test.ts
- [X] T066 [P] [US3] Write contract test for GONG_ACTIVATED payload (empty object) in tests/contract/gongEvent.test.ts
- [X] T067 [US3] Write integration test for GONG broadcast flow in tests/integration/gongBroadcast.test.ts
- [X] T068 [US3] Run tests and verify they FAIL (red state)

### Implementation for User Story 3

- [X] T069 [US3] Extend mapToSocketEvent in /apps/socket-server/src/events/eventMapper.ts to detect isGongActive=true and emit GONG_ACTIVATED event
- [X] T070 [US3] Add GONG_ACTIVATED case to broadcaster event type handling
- [X] T071 [US3] Update Firestore listener to check isGongActive flag on every snapshot
- [X] T072 [US3] Run tests and verify they PASS (green state)
- [X] T073 [US3] Refactor GONG detection logic for clarity (clean state)

**Checkpoint**: GONG events now broadcast. P2 requirement complete.

---

## Phase 7: User Story 5 - Graceful Disconnection Handling (Priority: P3) 🔄

**Goal**: Implement degraded state handling when Firestore listener disconnects, and track reconnection behavior

**Why Next**: Improves reliability for production (FR-011, FR-011a, SC-003)

**Independent Test**: Simulate Firestore disconnect (stop emulator), verify server stops accepting new connections but maintains existing ones

### Tests for User Story 5 (TDD - Write First)

- [X] T074 [P] [US5] Write unit test for Firestore listener error handling in tests/unit/listeners/firestoreListener.test.ts
- [X] T075 [P] [US5] Write integration test for degraded state behavior in tests/integration/degradedState.test.ts
- [X] T076 [P] [US5] Write integration test for reconnection handling in tests/integration/reconnection.test.ts
- [X] T077 [US5] Run tests and verify they FAIL (red state)

### Implementation for User Story 5

- [X] T078 [US5] Add isHealthy flag and listener error handler in /apps/socket-server/src/listeners/firestoreListener.ts
- [X] T079 [US5] Update authMiddleware to check isHealthy flag and reject new connections when degraded (FR-011a)
- [X] T080 [US5] Add Firestore listener status gauge in monitoring/metrics.ts (OR-004: 0=disconnected, 1=connected, 2=error)
- [X] T081 [US5] Implement listener reconnection with exponential backoff in firestoreListener.ts (FR-011) - Handled by Firebase SDK
- [X] T082 [US5] Add listener status logging on disconnect/reconnect events
- [X] T083 [US5] Run tests and verify they PASS (green state)
- [X] T084 [US5] Refactor error handling with cleaner state machine (clean state)

**Checkpoint**: Server now handles Firestore disconnections gracefully. All P3 requirements complete.

---

## Phase 8: Additional Requirements & Edge Cases

**Purpose**: Handle remaining functional requirements and clarified edge cases

### Idle State Handling (FR-003a)

- [X] T085 [P] Write unit test for IDLE_STATE event emission in tests/unit/events/eventMapper.test.ts
- [X] T086 [P] Write integration test for pre-game connection in tests/integration/idleState.test.ts
- [X] T087 Extend mapToSocketEvent to return IDLE_STATE when gameState document is null/undefined
- [X] T088 Update authMiddleware to emit IDLE_STATE to newly connected clients if no active game
- [X] T089 Run tests and verify they pass

### Malformed Data Handling (FR-011c)

- [X] T090 [P] Write unit test for validator rejection of malformed data in tests/unit/utils/validator.test.ts
- [X] T091 Add try-catch in Firestore listener to validate snapshots before broadcasting
- [X] T092 Log validation errors with snapshot ID (no broadcast) when malformed data detected
- [X] T093 Add validation error counter metric in monitoring/metrics.ts
- [X] T094 Write integration test for malformed data skip behavior in tests/integration/malformedData.test.ts

### No Debouncing/Throttling (FR-011b)

- [X] T095 Write integration test for rapid updates (5 updates in 100ms) in tests/integration/rapidUpdates.test.ts
- [X] T096 Verify Firestore listener broadcasts all updates immediately without delay
- [X] T097 Add test assertion for all 5 events received by clients

---

## Phase 9: Observability & Monitoring

**Purpose**: Complete observability requirements (OR-001 through OR-004)

- [X] T098 [P] Add /metrics endpoint to Express server in src/server.ts to expose Prometheus metrics
- [X] T099 [P] Write integration test for /metrics endpoint in tests/integration/metrics.test.ts
- [X] T100 Verify connection count gauge updates on connect/disconnect
- [X] T101 Verify auth failure counter increments on failed auth attempts
- [X] T102 Verify broadcast latency histogram records p95/p99 values
- [X] T103 Verify Firestore listener status gauge reflects connection state
- [X] T104 Add structured logging for all metric updates

---

## Phase 10: Deployment & Infrastructure

**Purpose**: Cloud Run deployment configuration and scripts

- [X] T105 [P] Create /apps/socket-server/.env.example with required environment variables (PORT, GOOGLE_CLOUD_PROJECT, LOG_LEVEL, MAX_CONNECTIONS)
- [X] T106 [P] Create /apps/socket-server/scripts/deploy.sh with gcloud run deploy command (session-affinity enabled)
- [X] T107 [P] Create /apps/socket-server/scripts/test-client.ts with Socket.io test client for manual verification
- [X] T108 Update Dockerfile to set NODE_ENV=production and expose port 8080
- [X] T109 Add healthcheck to Dockerfile (curl /healthz every 30s)
- [X] T110 Build Docker image locally and test with docker run
- [X] T111 Push Docker image to Google Container Registry
- [X] T112 Deploy to Cloud Run staging environment with deploy.sh
- [X] T113 Run test-client.ts against staging URL to verify deployment
- [X] T114 Configure Cloud Monitoring alerts for connection count, auth failures, latency, listener status

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T115 [P] Add comprehensive inline documentation (JSDoc) to all public functions
- [X] T116 [P] Create /apps/socket-server/README.md with quickstart instructions
- [X] T117 Code cleanup: Remove console.log statements, use logger instead
- [X] T118 Code cleanup: Ensure all async functions have proper error handling
- [X] T119 [P] Add pre-commit hook script that runs linting and tests
- [X] T120 Performance optimization: Review Socket.io configuration (perMessageDeflate, pingTimeout)
- [X] T121 Security review: Verify no Firebase credentials in code, only environment variables
- [X] T122 Run full test suite with coverage report (pnpm test --coverage)
- [X] T123 Verify coverage meets 80% threshold per jest.config.js
- [X] T124 Run linter and fix all warnings (pnpm lint:fix)
- [X] T125 Validate against quickstart.md checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - BLOCKS all other user stories (auth required)
- **User Story 1 (Phase 4)**: Depends on US4 completion - Core MVP
- **User Story 2 (Phase 5)**: Depends on US1 completion (extends event mapper) - MVP Extension
- **User Story 3 (Phase 6)**: Depends on US1 completion (extends event mapper) - Can run parallel with US2
- **User Story 5 (Phase 7)**: Depends on US1 completion (listener infrastructure) - Can run parallel with US2/US3
- **Additional Requirements (Phase 8)**: Depends on US1-US5 completion
- **Observability (Phase 9)**: Depends on all core stories (metrics integrated throughout)
- **Deployment (Phase 10)**: Depends on all implementation phases complete
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Setup (Phase 1)
    ↓
Foundational (Phase 2)
    ↓
US4: Authentication (Phase 3) ← BLOCKS everything
    ↓
    ├─→ US1: Question Start (Phase 4) ← MVP CORE
    │       ↓
    │       ├─→ US2: Phase Transitions (Phase 5)
    │       ├─→ US3: GONG Event (Phase 6)
    │       └─→ US5: Disconnection (Phase 7)
    │
    └─→ Additional Requirements (Phase 8)
            ↓
        Observability (Phase 9)
            ↓
        Deployment (Phase 10)
            ↓
        Polish (Phase 11)
```

### Within Each User Story (TDD Cycle)

1. **Tests First** (marked with test names) - Write, verify they FAIL
2. **Models/Utils** (marked [P] if parallel) - Can run in parallel
3. **Services/Core Logic** - Depends on models/utils
4. **Integration** - Depends on core logic
5. **Tests Pass** - Verify green state
6. **Refactor** - Clean up while keeping tests green

### Parallel Opportunities

#### Phase 1 (Setup) - All tasks can run in parallel except T009 (depends on T002)
- T003-T008: Configuration files (parallel)
- T010-T012: Type files (parallel)

#### Phase 2 (Foundational) - Most tasks parallel
- T013-T014: Utils (parallel)
- T015-T016: Utils tests & metrics (parallel)
- T018: Metrics test (parallel with server setup)

#### Phase 3 (US4 - Authentication)
- T021-T025: All test writing (parallel)
- T027-T030: Implementation steps (sequential - same file)

#### Phase 4 (US1 - Question Start)
- T035-T038: All test writing (parallel)
- T040-T041: Validator & test (parallel)
- T042-T043: Event mapper & broadcaster (parallel - different files)

#### Phase 5 (US2 - Phase Transitions)
- T050-T055: All test writing (parallel)
- T057-T060: Event mapper extensions (parallel - different phase handlers)

#### Phase 6-11: Similar parallelization patterns

---

## Parallel Example: User Story 1 (Question Start)

```bash
# Step 1: Launch all tests for User Story 1 together (TDD red state):
Task T035: "Write unit test for event mapper (START_QUESTION)"
Task T036: "Write unit test for Firestore listener initialization"
Task T037: "Write contract test for START_QUESTION payload"
Task T038: "Write integration test for START_QUESTION broadcast"

# Step 2: Launch parallel implementation tasks:
Task T040: "Create Zod schema for GameState validation"
Task T041: "Write unit test for GameState validator"

# Step 3: Core implementation (sequential):
Task T042: "Implement mapToSocketEvent function"
Task T043: "Implement broadcastEvent function"
Task T044: "Implement Firestore onSnapshot listener"

# Step 4: Verify tests pass (TDD green state)
Task T048: "Run tests and verify they PASS"

# Step 5: Refactor (TDD clean state)
Task T049: "Refactor event mapper with cleaner handling"
```

---

## Implementation Strategy

### MVP First (Phases 1-4: Setup + Foundation + Auth + Question Start)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T020)
3. Complete Phase 3: US4 Authentication (T021-T034)
4. Complete Phase 4: US1 Question Start (T035-T049)
5. **STOP and VALIDATE**: Test independently with 10+ clients
6. Measure latency (<100ms p99 requirement)
7. Deploy/demo MVP

**Value Delivered**: Authenticated clients receive question start events with synchronized timestamps

### Incremental Delivery (Add P1 Stories)

1. MVP Complete (Phases 1-4) → Foundation + Auth + Question Start working
2. Add Phase 5: US2 Phase Transitions (T050-T064) → Test independently
3. **STOP and VALIDATE**: Test phase changes (distribution, correct answer, results)
4. Measure latency (<150ms p95 requirement)
5. Deploy/demo extended MVP

**Value Delivered**: Complete P1 requirements - full real-time game flow

### Full Feature (Add P2-P3)

1. Extended MVP Complete (Phases 1-5)
2. Add Phase 6: US3 GONG Event (T065-T073) → Test independently
3. Add Phase 7: US5 Disconnection (T074-T084) → Test independently
4. Add Phase 8-9: Additional Requirements & Observability (T085-T104)
5. **STOP and VALIDATE**: End-to-end test with fault injection
6. Verify metrics and alerting work
7. Complete Phases 10-11: Deployment & Polish (T105-T125)
8. Production deployment

**Value Delivered**: Production-ready socket server with full observability

### Parallel Team Strategy

With 3 developers after Foundational phase (T020) completes:

1. **Team completes Setup + Foundational together** (T001-T020)
2. **Entire team on US4 Authentication** (T021-T034) ← BLOCKS everything
3. Once US4 done, split work:
   - **Developer A**: US1 Question Start (T035-T049)
   - **Developer B**: US2 Phase Transitions (T050-T064) - waits for A to finish event mapper base
   - **Developer C**: Setup Deployment scripts (T105-T114) - parallel infrastructure work
4. Reconvene after US1/US2 complete:
   - **Developer A**: US3 GONG (T065-T073)
   - **Developer B**: US5 Disconnection (T074-T084)
   - **Developer C**: Observability (T098-T104)
5. Final sprint: Everyone on Additional Requirements, Polish, Testing (T085-T125)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Discipline**: Tests MUST be written first, verified to fail, then implementation makes them pass
- **Independent Testing**: Each user story should be testable on its own without requiring other stories
- **Commit Strategy**: Commit after each TDD cycle (red→green→refactor) or logical task group
- **Checkpoints**: Stop at phase checkpoints to validate story independently before proceeding
- **Coverage**: Maintain >80% coverage per Constitution Principle II and jest.config.js
- **Avoid**: Vague tasks, same-file conflicts in parallel work, cross-story dependencies that break independence

---

## Task Count Summary

- **Total Tasks**: 125
- **Phase 1 (Setup)**: 12 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (US4 - Auth)**: 14 tasks
- **Phase 4 (US1 - Question Start)**: 15 tasks → **MVP CORE**
- **Phase 5 (US2 - Phase Transitions)**: 15 tasks → **MVP EXTENSION**
- **Phase 6 (US3 - GONG)**: 9 tasks
- **Phase 7 (US5 - Disconnection)**: 11 tasks
- **Phase 8 (Additional Requirements)**: 13 tasks
- **Phase 9 (Observability)**: 7 tasks
- **Phase 10 (Deployment)**: 10 tasks
- **Phase 11 (Polish)**: 11 tasks

**Parallel Opportunities**: ~40% of tasks marked [P] can run in parallel within their phase

**Suggested MVP Scope**: Phases 1-4 (49 tasks) = Setup + Foundation + Auth + Question Start
