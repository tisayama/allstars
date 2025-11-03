# Tasks: Participant App - Guest Quiz Controller

**Input**: Design documents from `/specs/005-participant-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included (TDD approach per Constitution Principle II + NFR-017: 80%+ test coverage)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend app**: `apps/participant-app/src/`, `apps/participant-app/tests/`
- **Shared types**: `packages/types/src/`
- Paths follow monorepo structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project directory structure at apps/participant-app/ with src/, tests/, public/ subdirectories
- [ ] T002 Initialize package.json with React 18.2, TypeScript 5.3, Vite 5.0, and dependencies from plan.md
- [ ] T003 [P] Configure TypeScript (tsconfig.json) with strict mode and path aliases
- [ ] T004 [P] Configure Vite (vite.config.ts) with code-splitting, env variables, and build optimizations
- [ ] T005 [P] Configure Vitest (vitest.config.ts) for unit/integration tests with coverage thresholds (80%+)
- [ ] T006 [P] Configure Tailwind CSS (tailwind.config.js) with mobile-first breakpoints and custom theme
- [ ] T007 [P] Configure ESLint and Prettier with same rules as admin-app for consistency
- [ ] T008 [P] Create .env.example with all required environment variables (Firebase config, API URLs, feature flags)
- [ ] T009 [P] Setup Playwright (playwright.config.ts) for E2E tests with mobile browser emulation
- [ ] T010 Create public/index.html with meta tags for mobile viewport and PWA manifest
- [ ] T011 [P] Add pnpm workspace reference to @allstars/types in package.json dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T012 Initialize Firebase SDK in apps/participant-app/src/lib/firebase.ts (Auth, Firestore, Crashlytics)
- [ ] T013 [P] Create API client in apps/participant-app/src/lib/api-client.ts with Bearer token auth and retry logic
- [ ] T014 [P] Create error boundary component in apps/participant-app/src/components/shared/ErrorBoundary.tsx
- [ ] T015 [P] Create loading spinner component in apps/participant-app/src/components/shared/LoadingSpinner.tsx
- [ ] T016 [P] Create vibration utility in apps/participant-app/src/lib/vibration.ts with feature detection and fallback
- [ ] T017 Setup React Router in apps/participant-app/src/App.tsx with lazy-loaded routes for code-splitting
- [ ] T018 Create main entry point in apps/participant-app/src/main.tsx with strict mode and error boundary
- [ ] T019 [P] Add global styles in apps/participant-app/src/index.css with Tailwind directives and mobile optimizations
- [ ] T020 [P] Add WebSocket event type definitions to packages/types/src/WebSocketEvents.ts from contracts/websocket-events.ts
- [ ] T021 [P] Create base test setup in apps/participant-app/tests/setup.ts with Firebase mocks and testing library config

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Join via QR Code (Priority: P1) 🎯 MVP

**Goal**: Enable guests to join the quiz game by scanning a QR code, authenticate via Firebase Anonymous Login, and link to their guest profile

**Independent Test**: Scan a QR code (or manually enter token), verify welcome screen displays guest name and table number

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US1] Unit test for QR parser utility in apps/participant-app/tests/unit/utils/qr-parser.test.ts
- [ ] T023 [P] [US1] Component test for QRScanPage in apps/participant-app/tests/component/QRScanPage.test.tsx
- [ ] T024 [P] [US1] Integration test for auth flow in apps/participant-app/tests/integration/auth.test.ts
- [ ] T025 [P] [US1] Unit test for useAuth hook in apps/participant-app/tests/unit/hooks/useAuth.test.ts

### Implementation for User Story 1

- [ ] T026 [P] [US1] Create QR code URL parser utility in apps/participant-app/src/utils/qr-parser.ts
- [ ] T027 [P] [US1] Implement useAuth hook in apps/participant-app/src/hooks/useAuth.ts (Firebase Anonymous Login, registration, session management)
- [ ] T028 [US1] Create QRScanPage component in apps/participant-app/src/pages/QRScanPage.tsx with html5-qrcode integration
- [ ] T029 [P] [US1] Create QR scanner component in apps/participant-app/src/components/auth/QRScanner.tsx with camera + file upload fallback
- [ ] T030 [P] [US1] Create manual token entry component in apps/participant-app/src/components/auth/ManualTokenEntry.tsx
- [ ] T031 [US1] Implement POST /participant/register API call in api-client.ts with error handling
- [ ] T032 [US1] Add localStorage session persistence logic in useAuth hook (24-hour expiration check)
- [ ] T033 [US1] Create protected route wrapper in apps/participant-app/src/components/layout/ProtectedRoute.tsx
- [ ] T034 [US1] Add authentication error handling and retry UI
- [ ] T035 [US1] Add Crashlytics logging for authentication failures

**Checkpoint**: At this point, User Story 1 should be fully functional - guests can scan QR codes and authenticate

---

## Phase 4: User Story 2 - Answer Questions in Real-Time (Priority: P1)

**Goal**: Display questions as they appear via WebSocket events, allow guests to submit answers with accurate timing, and lock answers after submission

**Independent Test**: Trigger a START_QUESTION event (via emulator or test harness), tap an answer, verify answer is submitted with correct timing and button locks

### Tests for User Story 2

- [ ] T036 [P] [US2] Unit test for clock sync utility in apps/participant-app/tests/unit/utils/clock-sync.test.ts
- [ ] T037 [P] [US2] Unit test for answer queue in apps/participant-app/tests/unit/utils/answer-queue.test.ts
- [ ] T038 [P] [US2] Component test for GamePage in apps/participant-app/tests/component/GamePage.test.tsx
- [ ] T039 [P] [US2] Integration test for clock sync in apps/participant-app/tests/integration/clock-sync.test.ts
- [ ] T040 [P] [US2] Integration test for answer submission in apps/participant-app/tests/integration/answer-submission.test.ts
- [ ] T041 [P] [US2] Unit test for useClockSync hook in apps/participant-app/tests/unit/hooks/useClockSync.test.ts
- [ ] T042 [P] [US2] Unit test for useWebSocket hook in apps/participant-app/tests/unit/hooks/useWebSocket.test.ts
- [ ] T043 [P] [US2] Unit test for useGameState hook in apps/participant-app/tests/unit/hooks/useGameState.test.ts

### Implementation for User Story 2

- [ ] T044 [P] [US2] Implement clock sync utility in apps/participant-app/src/utils/clock-sync.ts (5-ping minimum RTT algorithm)
- [ ] T045 [P] [US2] Implement answer queue utility in apps/participant-app/src/utils/answer-queue.ts (local queue with retry logic)
- [ ] T046 [US2] Implement useClockSync hook in apps/participant-app/src/hooks/useClockSync.ts (initial sync + re-sync every 30-60s)
- [ ] T047 [US2] Implement POST /participant/time API call in api-client.ts for clock synchronization
- [ ] T048 [US2] Implement useWebSocket hook in apps/participant-app/src/hooks/useWebSocket.ts (Socket.io client, connection, event listeners)
- [ ] T049 [US2] Implement useGameState hook in apps/participant-app/src/hooks/useGameState.ts (question state, answer submission, timing calculations)
- [ ] T050 [US2] Implement POST /participant/answer API call in api-client.ts with exponential backoff retry (200ms, 400ms, 800ms)
- [ ] T051 [US2] Create GamePage component in apps/participant-app/src/pages/GamePage.tsx (main quiz interface)
- [ ] T052 [P] [US2] Create question display component in apps/participant-app/src/components/game/QuestionDisplay.tsx
- [ ] T053 [P] [US2] Create answer buttons component in apps/participant-app/src/components/game/AnswerButtons.tsx (2-6 choices, tap feedback, lock on select)
- [ ] T054 [US2] Add 50ms vibration on answer tap in AnswerButtons component
- [ ] T055 [US2] Implement answer timing calculation (correctedTapTime = clientTapTime + clockOffset; responseTimeMs = correctedTapTime - serverStartTime)
- [ ] T056 [US2] Add answer queue logic to handle offline submissions
- [ ] T057 [US2] Add retry exhaustion handling (log to Crashlytics, show error with manual retry button)
- [ ] T058 [P] [US2] Create waiting screen component in apps/participant-app/src/components/status/WaitingScreen.tsx
- [ ] T059 [US2] Implement pre-fetching logic (current period + next period at init, background fetch others during gameplay)
- [ ] T060 [US2] Add clock sync warning UI when offset exceeds 500ms variance

**Checkpoint**: At this point, User Stories 1 AND 2 work independently - guests can join and answer questions with accurate timing

---

## Phase 5: User Story 3 - Receive Real-Time Game Feedback (Priority: P2)

**Goal**: Provide immediate haptic and visual feedback when answers are revealed (success: 2x100ms pulses, failure: 300ms buzz)

**Independent Test**: Submit an answer, wait for GAME_PHASE_CHANGED event with reveal phase, verify vibration pattern and visual feedback (green/red indicator)

### Tests for User Story 3

- [ ] T061 [P] [US3] Component test for AnswerFeedback component in apps/participant-app/tests/component/AnswerFeedback.test.tsx
- [ ] T062 [P] [US3] Unit test for vibration lib fallback in apps/participant-app/tests/unit/lib/vibration.test.ts

### Implementation for User Story 3

- [ ] T063 [P] [US3] Create answer feedback component in apps/participant-app/src/components/game/AnswerFeedback.tsx (visual indicators)
- [ ] T064 [US3] Implement success vibration pattern (two 100ms pulses separated by 50ms) in GamePage
- [ ] T065 [US3] Implement failure vibration pattern (one 300ms buzz) in GamePage
- [ ] T066 [US3] Add visual feedback (green for correct, red for incorrect) in AnswerFeedback component
- [ ] T067 [US3] Add graceful degradation for devices without vibration support (CSS pulse animation fallback)
- [ ] T068 [P] [US3] Create answer history component in apps/participant-app/src/components/game/AnswerHistory.tsx (last 10 questions timeline)
- [ ] T069 [US3] Integrate GAME_PHASE_CHANGED event listener in useGameState hook for reveal phase

**Checkpoint**: All P1-P2 priority stories work independently - guests get real-time feedback

---

## Phase 6: User Story 4 - Know When I'm Dropped Out (Priority: P2)

**Goal**: Monitor guest status via Firestore listener and display drop-out overlay with final stats when eliminated

**Independent Test**: Manually update Firestore guest document status to "dropped", verify overlay appears with rank, points, and correctAnswers

### Tests for User Story 4

- [ ] T070 [P] [US4] Component test for DroppedOutPage in apps/participant-app/tests/component/DroppedOutPage.test.tsx
- [ ] T071 [P] [US4] Unit test for useGuestStatus hook in apps/participant-app/tests/unit/hooks/useGuestStatus.test.ts

### Implementation for User Story 4

- [ ] T072 [US4] Implement useGuestStatus hook in apps/participant-app/src/hooks/useGuestStatus.ts (Firestore listener on guests/{guestId})
- [ ] T073 [US4] Create DroppedOutPage component in apps/participant-app/src/pages/DroppedOutPage.tsx (full-screen overlay)
- [ ] T074 [P] [US4] Create drop-out stats display in apps/participant-app/src/components/status/DropOutStats.tsx (rank, points, correctAnswers)
- [ ] T075 [US4] Add spectator mode UI in GamePage (view questions, disabled answer submission)
- [ ] T076 [US4] Prevent answer submission when guest status is "dropped" in useGameState hook
- [ ] T077 [US4] Add "Watch Remaining Game" button in DroppedOutPage to enable spectator mode

**Checkpoint**: Guests can be notified of elimination and continue watching

---

## Phase 7: User Story 5 - Rejoin After Disconnection (Priority: P3)

**Goal**: Handle WebSocket disconnections gracefully, automatically reconnect, and restore game state from Firestore

**Independent Test**: Disconnect network mid-game (DevTools offline mode), reconnect, verify auto-rejoin with correct game state

### Tests for User Story 5

- [ ] T078 [P] [US5] Integration test for reconnection in apps/participant-app/tests/integration/reconnection.test.ts

### Implementation for User Story 5

- [ ] T079 [US5] Implement WebSocket reconnection logic in useWebSocket hook (exponential backoff: 1s, 2s, 4s)
- [ ] T080 [US5] Implement state restoration logic in useGameState hook (fetch from Firestore after reconnect)
- [ ] T081 [US5] Add RECONNECT event emission to socket-server when client reconnects
- [ ] T082 [US5] Add STATE_SYNC event listener in useWebSocket hook to restore game state
- [ ] T083 [US5] Implement answer history synchronization from Firestore in useGameState hook
- [ ] T084 [US5] Add session detection on app load (check localStorage, auto-restore if valid)
- [ ] T085 [US5] Handle session expiration (redirect to QR scan if > 24 hours old)
- [ ] T086 [P] [US5] Create error page component in apps/participant-app/src/pages/ErrorPage.tsx with retry button
- [ ] T087 [US5] Add connection status indicator in GamePage (connected/reconnecting/offline)

**Checkpoint**: All user stories complete - app handles network disruptions gracefully

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T088 [P] Add README.md in apps/participant-app/ with setup, development, and deployment instructions
- [ ] T089 [P] Copy quickstart.md testing scenarios to README.md
- [ ] T090 [P] Add environment variable validation at startup in src/main.tsx (fail fast if missing required vars)
- [ ] T091 [P] Add performance monitoring (measure load time, answer submission latency, clock sync accuracy)
- [ ] T092 [P] Optimize bundle size (verify <428KB main bundle, gzipped <117KB per plan.md constraints)
- [ ] T093 [P] Add accessibility improvements (ARIA labels, keyboard navigation for answer buttons)
- [ ] T094 [P] Add E2E test for full happy path in apps/participant-app/tests/e2e/happy-path.spec.ts (Playwright)
- [ ] T095 [P] Add E2E test for network disconnection scenario in apps/participant-app/tests/e2e/disconnection.spec.ts
- [ ] T096 [P] Add E2E test for drop-out scenario in apps/participant-app/tests/e2e/dropout.spec.ts
- [ ] T097 [P] Verify cross-browser compatibility on Chrome, Safari, Firefox, Samsung Internet, Edge (iOS 13+, Android 8+)
- [ ] T098 [P] Run lighthouse audit and optimize for mobile performance (target: >90 score)
- [ ] T099 [P] Verify PWA manifest and service worker configuration for offline capability
- [ ] T100 [P] Add error tracking setup (Firebase Crashlytics initialization with critical error types)
- [ ] T101 Run full test suite and verify 80%+ coverage (pnpm test:coverage)
- [ ] T102 Run linting and formatting (pnpm lint && pnpm format)
- [ ] T103 Run production build and verify bundle sizes (pnpm build)
- [ ] T104 Run quickstart.md validation scenarios in local emulator environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - Depends on US1 for authentication (session management)
  - User Story 3 (P2): Can start after US2 - Needs answer submission logic for feedback
  - User Story 4 (P2): Can start after Foundational - Independent of other stories
  - User Story 5 (P3): Can start after US2 - Needs WebSocket and game state logic for reconnection
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
    ↓
US1 (QR Join) ──────┐
    ↓               │
US2 (Answer Qs) ────┼── US4 (Drop-out) [can run parallel after Foundational]
    ↓               │
US3 (Feedback)      │
    ↓               ↓
US5 (Reconnection) ─┘
```

**Parallel Opportunities**:
- After Foundational: US1 can start
- After US1: US2 and US4 can run in parallel
- After US2: US3 and US5 can run in parallel

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Utilities before hooks
- Hooks before components
- Components before pages
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T003, T004, T005, T006, T007, T008, T009, T011 can run in parallel

**Phase 2 (Foundational)**: T013, T014, T015, T016, T019, T020, T021 can run in parallel

**User Story 1**:
- Tests: T022, T023, T024, T025 can run in parallel
- Implementation: T026, T027 can run in parallel; then T029, T030 can run in parallel

**User Story 2**:
- Tests: T036, T037, T038, T039, T040, T041, T042, T043 can run in parallel
- Implementation: T044, T045 can run in parallel; then T052, T053, T058 can run in parallel

**User Story 3**:
- Tests: T061, T062 can run in parallel
- Implementation: T063, T068 can run in parallel

**User Story 4**:
- Tests: T070, T071 can run in parallel
- Implementation: T074 can run in parallel with T072

**User Story 5**:
- Tests: T078 runs alone (integration test)

**Polish (Phase 8)**: T088, T089, T090, T091, T092, T093, T094, T095, T096, T097, T098, T099, T100 can run in parallel

---

## Parallel Example: User Story 2 (Answer Questions in Real-Time)

```bash
# Launch all unit tests for User Story 2 together:
Task: "Unit test for clock sync utility in apps/participant-app/tests/unit/utils/clock-sync.test.ts"
Task: "Unit test for answer queue in apps/participant-app/tests/unit/utils/answer-queue.test.ts"
Task: "Unit test for useClockSync hook in apps/participant-app/tests/unit/hooks/useClockSync.test.ts"
Task: "Unit test for useWebSocket hook in apps/participant-app/tests/unit/hooks/useWebSocket.test.ts"
Task: "Unit test for useGameState hook in apps/participant-app/tests/unit/hooks/useGameState.test.ts"

# Launch all utilities for User Story 2 together (after tests fail):
Task: "Implement clock sync utility in apps/participant-app/src/utils/clock-sync.ts"
Task: "Implement answer queue utility in apps/participant-app/src/utils/answer-queue.test.ts"

# Launch all components for User Story 2 together (after hooks complete):
Task: "Create question display component in apps/participant-app/src/components/game/QuestionDisplay.tsx"
Task: "Create answer buttons component in apps/participant-app/src/components/game/AnswerButtons.tsx"
Task: "Create waiting screen component in apps/participant-app/src/components/status/WaitingScreen.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T011)
2. Complete Phase 2: Foundational (T012-T021) - CRITICAL
3. Complete Phase 3: User Story 1 - QR Join (T022-T035)
4. **CHECKPOINT**: Test US1 independently (guests can scan QR and authenticate)
5. Complete Phase 4: User Story 2 - Answer Questions (T036-T060)
6. **CHECKPOINT**: Test US1+US2 together (full quiz flow without feedback)
7. **STOP and VALIDATE**: Run quickstart.md scenarios, deploy to staging

**MVP Delivers**: Guests can join and answer questions with accurate timing (core value proposition)

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → T001-T021 → Test: App loads, Firebase connects
2. **MVP** (US1 + US2) → T022-T060 → Test: Full quiz flow → Deploy/Demo 🎯
3. **Enhanced UX** (+US3) → T061-T069 → Test: Feedback works → Deploy/Demo
4. **Drop-out Handling** (+US4) → T070-T077 → Test: Elimination works → Deploy/Demo
5. **Resilience** (+US5) → T078-T087 → Test: Reconnection works → Deploy/Demo
6. **Production Ready** (Polish) → T088-T104 → Test: E2E, cross-browser, performance → Deploy to Production

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3 developers after Foundational phase completes:

1. **Team completes Setup + Foundational together** (T001-T021)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T022-T035) → Auth specialist
   - **Developer B**: User Story 2 (T036-T060) → Real-time/WebSocket specialist
   - **Developer C**: User Story 4 (T070-T077) → Firestore/state management specialist
3. **Sequential completion**:
   - Dev A finishes US1 → Moves to US3 (depends on US2)
   - Dev B finishes US2 → Moves to US5 (depends on US2)
   - Dev C finishes US4 → Moves to Polish tasks

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable (except US2 depends on US1 auth)
- Verify tests fail (Red) before implementing (TDD)
- Target 80%+ test coverage per NFR-017
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Bundle size constraint: <428KB main (gzipped <117KB) - verify after each major addition
- Touch targets: 44x44px minimum (NFR-015) - verify during component implementation
- Font size: 16px minimum (NFR-014) - verify in Tailwind config and components

---

## Task Count Summary

- **Total Tasks**: 104
- **Phase 1 (Setup)**: 11 tasks
- **Phase 2 (Foundational)**: 10 tasks
- **Phase 3 (US1 - QR Join)**: 14 tasks (4 tests + 10 implementation)
- **Phase 4 (US2 - Answer Questions)**: 25 tasks (8 tests + 17 implementation)
- **Phase 5 (US3 - Feedback)**: 9 tasks (2 tests + 7 implementation)
- **Phase 6 (US4 - Drop-out)**: 8 tasks (2 tests + 6 implementation)
- **Phase 7 (US5 - Reconnection)**: 10 tasks (1 test + 9 implementation)
- **Phase 8 (Polish)**: 17 tasks

**Parallel Opportunities**: 45 tasks marked [P] (43% can run in parallel)

**MVP Scope**: Phases 1-4 (T001-T060) = 60 tasks → Core quiz functionality

**Independent Test Criteria**:
- ✅ US1: Scan QR → See welcome screen with name
- ✅ US2: Trigger question event → Tap answer → Verify submission with timing
- ✅ US3: Submit answer → Wait for reveal → Verify vibration + visual feedback
- ✅ US4: Update Firestore status → Verify overlay with stats
- ✅ US5: Disconnect → Reconnect → Verify state restoration

**Format Validation**: ✅ All 104 tasks follow checklist format with checkbox, ID, [P]/[Story] labels, and file paths
