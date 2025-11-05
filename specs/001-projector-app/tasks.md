# Task Breakdown: Projector App (001-projector-app)

**Feature**: Broadcast Display Client for Wedding Quiz Game
**Branch**: `001-projector-app`
**Date**: 2025-11-04
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Task Format

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- **TaskID**: T001, T002, T003... (sequential)
- **[P]**: Parallelizable (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3], [US4] for user story phases ONLY
- **File paths**: Exact paths from repository root

---

## Phase 1: Setup and Project Initialization

**Goal**: Bootstrap projector-app with Vite, React, TypeScript, and monorepo configuration.

**Tasks**:

- [ ] T001 [P] Create projector-app directory structure at `apps/projector-app/`
- [ ] T002 [P] Initialize package.json with dependencies: React 18.2, Vite 5.0, TypeScript 5.3, Firebase SDK 10.x, socket.io-client 4.x
- [ ] T003 [P] Configure TypeScript with tsconfig.json (module: ESNext, moduleResolution: bundler, path aliases @/*)
- [ ] T004 [P] Configure Vite with vite.config.ts (port 5175, path aliases, React plugin)
- [ ] T005 [P] Configure Vitest with vitest.config.ts (test environment: jsdom, coverage setup)
- [ ] T006 [P] Add ESLint configuration for React + TypeScript
- [ ] T007 [P] Add Prettier configuration (align with project standards)
- [ ] T008 [P] Create .env.development with Firebase emulator configuration (VITE_USE_EMULATORS=true, VITE_SOCKET_SERVER_URL=http://localhost:3001)
- [ ] T009 [P] Create .env.production.example with production placeholders
- [ ] T010 [P] Add workspace dependency to @allstars/types in package.json
- [ ] T011 Install dependencies with `pnpm install` from repository root
- [ ] T012 Verify build succeeds with `pnpm --filter @allstars/projector-app build`
- [ ] T013 Verify dev server starts with `pnpm --filter @allstars/projector-app dev`

---

## Phase 2: Foundational Infrastructure

**Goal**: Establish core libraries for Firebase, WebSocket, and audio management that all user stories depend on.

**Tasks**:

### Firebase Initialization

- [ ] T014 [P] Write tests for Firebase initialization at `apps/projector-app/tests/unit/lib/firebase.test.ts`
- [ ] T015 [P] Implement Firebase singleton with emulator detection at `apps/projector-app/src/lib/firebase.ts`
- [ ] T016 Verify Firebase initialization tests pass

### WebSocket Infrastructure

- [ ] T017 [P] Write tests for WebSocket hook at `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`
- [ ] T018 [P] Define WebSocket event types at `apps/projector-app/src/types/socket-events.ts` (ServerToClientEvents, TriggerGongPayload, SyncTimerPayload)
- [ ] T019 [P] Implement useWebSocket hook at `apps/projector-app/src/hooks/useWebSocket.ts`
- [ ] T020 Verify WebSocket hook tests pass

### Audio Engine Foundation

- [ ] T021 [P] Write tests for AudioManager class at `apps/projector-app/tests/unit/lib/audioManager.test.ts`
- [ ] T022 [P] Implement AudioManager singleton at `apps/projector-app/src/lib/audioManager.ts` (AudioContext, pre-loading, equal power crossfading)
- [ ] T023 Verify AudioManager tests pass

### Shared Types

- [ ] T024 [P] Create type re-exports at `apps/projector-app/src/types/index.ts` (re-export from @allstars/types)
- [ ] T025 [P] Define local types at `apps/projector-app/src/types/index.ts` (ConnectionStatus, AudioAsset, PhaseConfig)
- [ ] T026 Verify type imports resolve correctly with `tsc --noEmit`

### Root App Structure

- [ ] T027 [P] Write test for App component at `apps/projector-app/tests/unit/App.test.tsx`
- [ ] T028 [P] Create main entry point at `apps/projector-app/src/main.tsx`
- [ ] T029 [P] Create App component skeleton at `apps/projector-app/src/App.tsx` (phase router logic)
- [ ] T030 [P] Create base HTML template at `apps/projector-app/index.html`
- [ ] T031 Verify App component test passes

---

## Phase 3: User Story 1 (Priority: P1) - Display Game State Transitions

**Goal**: Display reactive game state changes from Firestore `gameState/live` with distinct UI screens for all 7 phases.

**Independent Test**: Update `gameState/live` document in Firestore console and observe immediate phase transitions on projector screen.

**Tasks**:

### Tests (TDD - Write First)

- [ ] T032 [P] [US1] Write test for useGameState hook at `apps/projector-app/tests/unit/hooks/useGameState.test.ts` (validate data structure, error handling, cleanup)
- [ ] T033 [P] [US1] Write test for ReadyForNextPhase component at `apps/projector-app/tests/unit/components/phases/ReadyForNextPhase.test.tsx`
- [ ] T034 [P] [US1] Write test for AcceptingAnswersPhase component at `apps/projector-app/tests/unit/components/phases/AcceptingAnswersPhase.test.tsx`
- [ ] T035 [P] [US1] Write test for ShowingDistributionPhase component at `apps/projector-app/tests/unit/components/phases/ShowingDistributionPhase.test.tsx`
- [ ] T036 [P] [US1] Write test for ShowingCorrectAnswerPhase component at `apps/projector-app/tests/unit/components/phases/ShowingCorrectAnswerPhase.test.tsx`
- [ ] T037 [P] [US1] Write test for ShowingResultsPhase component at `apps/projector-app/tests/unit/components/phases/ShowingResultsPhase.test.tsx`
- [ ] T038 [P] [US1] Write test for AllRevivedPhase component at `apps/projector-app/tests/unit/components/phases/AllRevivedPhase.test.tsx`
- [ ] T039 [P] [US1] Write test for AllIncorrectPhase component at `apps/projector-app/tests/unit/components/phases/AllIncorrectPhase.test.tsx`
- [ ] T040 [P] [US1] Write integration test for Firestore listener at `apps/projector-app/tests/integration/firestore.test.ts`
- [ ] T041 [P] [US1] Write E2E test for phase transitions at `apps/projector-app/tests/e2e/phase-transitions.spec.ts`

### Implementation

- [ ] T042 [US1] Implement useGameState hook at `apps/projector-app/src/hooks/useGameState.ts` (onSnapshot listener, validation, cleanup)
- [ ] T043 [P] [US1] Implement ReadyForNextPhase component at `apps/projector-app/src/components/phases/ReadyForNextPhase.tsx` (idle screen)
- [ ] T044 [P] [US1] Implement AcceptingAnswersPhase component at `apps/projector-app/src/components/phases/AcceptingAnswersPhase.tsx` (question display, countdown timer)
- [ ] T045 [P] [US1] Implement ShowingDistributionPhase component at `apps/projector-app/src/components/phases/ShowingDistributionPhase.tsx` (text-based answer count list: A: 15, B: 8, etc.)
- [ ] T046 [P] [US1] Implement ShowingCorrectAnswerPhase component at `apps/projector-app/src/components/phases/ShowingCorrectAnswerPhase.tsx` (highlight correct answer)
- [ ] T047 [P] [US1] Implement ShowingResultsPhase component at `apps/projector-app/src/components/phases/ShowingResultsPhase.tsx` (top 10 + worst 10 rankings, period champions)
- [ ] T048 [P] [US1] Implement AllRevivedPhase component at `apps/projector-app/src/components/phases/AllRevivedPhase.tsx` (revival ceremony screen)
- [ ] T049 [P] [US1] Implement AllIncorrectPhase component at `apps/projector-app/src/components/phases/AllIncorrectPhase.tsx` (prize carryover notification)
- [ ] T050 [US1] Update App component at `apps/projector-app/src/App.tsx` to integrate useGameState and render phase components conditionally

### Verification

- [ ] T051 [US1] Run unit tests and verify all US1 tests pass: `pnpm test -- hooks/useGameState`
- [ ] T052 [US1] Run component tests and verify all phase component tests pass: `pnpm test -- components/phases`
- [ ] T053 [US1] Run integration test and verify Firestore listener works: `pnpm test -- integration/firestore`
- [ ] T054 [US1] Run E2E test and verify phase transitions work end-to-end: `pnpm test:e2e`
- [ ] T055 [US1] Manual test: Start Firebase emulator, update gameState/live document, observe projector screen updates within 500ms
- [ ] T056 [US1] Manual test: Transition through all 7 phases and verify each screen displays correctly

---

## Phase 4: User Story 2 (Priority: P2) - Real-Time Answer Count Updates

**Goal**: Display live incrementing answer count during `accepting_answers` phase using dynamic Firestore listener.

**Independent Test**: Start a question (phase = `accepting_answers`), add answer documents to `questions/{questionId}/answers`, observe counter incrementing in real-time.

**Tasks**:

### Tests (TDD - Write First)

- [ ] T057 [P] [US2] Write test for useAnswerCount hook at `apps/projector-app/tests/unit/hooks/useAnswerCount.test.ts` (dynamic listener attach/detach, cleanup, count updates)
- [ ] T058 [P] [US2] Write test for AnswerCounter component at `apps/projector-app/tests/unit/components/AnswerCounter.test.tsx`
- [ ] T059 [P] [US2] Write integration test for answer count listener at `apps/projector-app/tests/integration/answer-count.test.ts`

### Implementation

- [ ] T060 [US2] Implement useAnswerCount hook at `apps/projector-app/src/hooks/useAnswerCount.ts` (onSnapshot on questions/{id}/answers collection, cleanup on questionId change)
- [ ] T061 [US2] Create AnswerCounter component at `apps/projector-app/src/components/AnswerCounter.tsx` (display incrementing count with styling)
- [ ] T062 [US2] Integrate AnswerCounter into AcceptingAnswersPhase component at `apps/projector-app/src/components/phases/AcceptingAnswersPhase.tsx`

### Verification

- [ ] T063 [US2] Run useAnswerCount hook tests and verify pass: `pnpm test -- hooks/useAnswerCount`
- [ ] T064 [US2] Run AnswerCounter component test and verify pass: `pnpm test -- components/AnswerCounter`
- [ ] T065 [US2] Run integration test and verify answer count listener works: `pnpm test -- integration/answer-count`
- [ ] T066 [US2] Manual test: Start question, add 10 answers via Firestore console, observe counter increment from 0→10 in real-time (<1s latency)
- [ ] T067 [US2] Manual test: Transition from `accepting_answers` to `showing_distribution`, verify listener cleanup (no console errors)

---

## Phase 5: User Story 3 (Priority: P3) - Background Music and Sound Effects

**Goal**: Pre-load audio assets from Firebase Storage and play appropriate BGM loops + sound effects synchronized with game phases.

**Independent Test**: Transition through phases and verify: (1) BGM loops seamlessly, (2) crossfades occur smoothly, (3) sound effects trigger on events.

**Tasks**:

### Tests (TDD - Write First)

- [ ] T068 [P] [US3] Write test for useAudioEngine hook at `apps/projector-app/tests/unit/hooks/useAudioEngine.test.ts` (pre-loading, progress tracking, error handling)
- [ ] T069 [P] [US3] Write test for usePhaseAudio hook at `apps/projector-app/tests/unit/hooks/usePhaseAudio.test.ts` (BGM switching, crossfading)
- [ ] T070 [P] [US3] Write test for LoadingIndicator component at `apps/projector-app/tests/unit/components/LoadingIndicator.test.tsx`

### Implementation

- [ ] T071 [US3] Define audio asset manifest at `apps/projector-app/src/lib/audioAssets.ts` (list of BGM + SFX with Firebase Storage paths)
- [ ] T072 [US3] Implement useAudioEngine hook at `apps/projector-app/src/hooks/useAudioEngine.ts` (fetch from Firebase Storage, decode audio data, track loading progress)
- [ ] T073 [US3] Implement usePhaseAudio hook at `apps/projector-app/src/hooks/usePhaseAudio.ts` (map currentPhase to BGM, trigger crossfades, play SFX on phase transitions)
- [ ] T074 [US3] Create LoadingIndicator component at `apps/projector-app/src/components/LoadingIndicator.tsx` (display audio loading progress)
- [ ] T075 [US3] Integrate useAudioEngine into App component at `apps/projector-app/src/App.tsx` (show LoadingIndicator until assets loaded)
- [ ] T076 [US3] Integrate usePhaseAudio into App component at `apps/projector-app/src/App.tsx` (pass currentPhase, handle audio lifecycle)

### Verification

- [ ] T077 [US3] Run useAudioEngine hook tests and verify pass: `pnpm test -- hooks/useAudioEngine`
- [ ] T078 [US3] Run usePhaseAudio hook tests and verify pass: `pnpm test -- hooks/usePhaseAudio`
- [ ] T079 [US3] Run LoadingIndicator component test and verify pass: `pnpm test -- components/LoadingIndicator`
- [ ] T080 [US3] Manual test: Start projector-app, verify LoadingIndicator shows progress 0-100% within 10 seconds
- [ ] T081 [US3] Manual test: Transition from `ready_for_next` to `accepting_answers`, verify BGM crossfades smoothly (no clicks/pops)
- [ ] T082 [US3] Manual test: Transition to `showing_correct_answer`, verify reveal sound effect plays immediately (<100ms)
- [ ] T083 [US3] Manual test: Verify BGM loops seamlessly without gaps during `ready_for_next` phase (4+ minute test)
- [ ] T084 [US3] Manual test: Play multiple sound effects simultaneously (e.g., reveal + gong), verify layering works without cutoff

---

## Phase 6: User Story 4 (Priority: P2) - WebSocket Event Synchronization

**Goal**: Synchronize time-sensitive events (gong sound, timer sync) across all clients via WebSocket connection to socket-server.

**Independent Test**: Send TRIGGER_GONG event from socket-server, observe projector plays gong sound within 50ms of other clients.

**Tasks**:

### Tests (TDD - Write First)

- [ ] T085 [P] [US4] Write integration test for WebSocket connection lifecycle at `apps/projector-app/tests/integration/websocket.test.ts` (connect, disconnect, reconnect, error handling)
- [ ] T086 [P] [US4] Write test for TRIGGER_GONG event handler at `apps/projector-app/tests/integration/websocket-gong.test.ts`
- [ ] T087 [P] [US4] Write test for SYNC_TIMER event handler at `apps/projector-app/tests/integration/websocket-timer.test.ts`
- [ ] T088 [P] [US4] Write test for useCountdown hook at `apps/projector-app/tests/unit/hooks/useCountdown.test.ts` (server time sync, clock offset)

### Implementation

- [ ] T089 [US4] Implement useCountdown hook at `apps/projector-app/src/hooks/useCountdown.ts` (requestAnimationFrame loop, clock offset handling)
- [ ] T090 [US4] Integrate WebSocket event handlers into App component at `apps/projector-app/src/App.tsx` (TRIGGER_GONG → play gong SFX, SYNC_TIMER → update countdown)
- [ ] T091 [US4] Update AcceptingAnswersPhase component at `apps/projector-app/src/components/phases/AcceptingAnswersPhase.tsx` to use useCountdown hook with server-synchronized deadline
- [ ] T092 [US4] Create ConnectionStatus component at `apps/projector-app/src/components/ConnectionStatus.tsx` (display Firestore + WebSocket connection indicators)
- [ ] T093 [US4] Integrate ConnectionStatus component into App component at `apps/projector-app/src/App.tsx`

### Verification

- [ ] T094 [US4] Run WebSocket integration tests and verify pass: `pnpm test -- integration/websocket`
- [ ] T095 [US4] Run useCountdown hook tests and verify pass: `pnpm test -- hooks/useCountdown`
- [ ] T096 [US4] Manual test: Start socket-server, verify projector connects and displays "WebSocket: Connected" in status indicator
- [ ] T097 [US4] Manual test: Stop socket-server, verify projector shows "WebSocket: Disconnected" warning and attempts reconnection
- [ ] T098 [US4] Manual test: Emit TRIGGER_GONG event from socket-server, verify gong plays on projector within 50ms (compare with participant-app)
- [ ] T099 [US4] Manual test: Emit SYNC_TIMER event, verify countdown timer synchronizes with server time (drift <100ms over 60s)
- [ ] T100 [US4] Manual test: Disconnect WebSocket but keep Firestore connected, verify projector continues displaying phase transitions (degraded mode)

---

## Phase 7: Polish and Cross-Cutting Concerns

**Goal**: Implement error handling, edge case handling, performance optimizations, and deployment readiness.

**Tasks**:

### Error Handling

- [ ] T101 [P] Write test for ErrorScreen component at `apps/projector-app/tests/unit/components/ErrorScreen.test.tsx`
- [ ] T102 [P] Implement ErrorScreen component at `apps/projector-app/src/components/ErrorScreen.tsx` (display connection errors, malformed data errors)
- [ ] T103 [P] Implement React Error Boundary at `apps/projector-app/src/components/ErrorBoundary.tsx` (catch rendering errors)
- [ ] T104 Integrate ErrorScreen into App component for Firestore/WebSocket connection failures
- [ ] T105 Wrap App component with ErrorBoundary in main.tsx

### Edge Case Handling

- [ ] T106 [P] Add validation for gameState data structure in useGameState hook (check required fields, log malformed data)
- [ ] T107 [P] Add validation for WebSocket event payloads in event handlers (timestamp format, required fields)
- [ ] T108 [P] Handle rapid phase transitions in App component (queue transitions, prevent UI flickering)
- [ ] T109 [P] Handle mid-game cold start scenario (load gameState on mount, display current phase immediately)
- [ ] T110 Add retry logic for failed audio asset loading in useAudioEngine hook

### Performance Optimization

- [ ] T111 [P] Add React.memo to phase components to prevent unnecessary re-renders
- [ ] T112 [P] Optimize AcceptingAnswersPhase countdown rendering (debounce if needed)
- [ ] T113 [P] Add memory profiling test to verify no leaks after 100+ phase transitions
- [ ] T114 Test audio pre-loading completes within 10 seconds on standard broadband

### Logging and Monitoring

- [ ] T115 [P] Add structured console logging for all state transitions (phase changes, connection events, audio playback)
- [ ] T116 [P] Add performance logging for latency metrics (Firestore update latency, audio playback latency, WebSocket propagation latency)
- [ ] T117 Create logging configuration at `apps/projector-app/src/lib/logger.ts` (enable/disable via environment variable)

### Documentation

- [ ] T118 [P] Create README.md at `apps/projector-app/README.md` (setup instructions, development workflow, environment variables)
- [ ] T119 [P] Create quickstart guide at `specs/001-projector-app/quickstart.md` (Firebase emulator setup, audio asset upload, testing phase transitions)
- [ ] T120 [P] Document environment variables in .env.production.example

### Deployment Readiness

- [ ] T121 [P] Configure production Firebase config (remove emulator settings)
- [ ] T122 [P] Configure production socket-server URL via VITE_SOCKET_SERVER_URL
- [ ] T123 [P] Add build optimization settings to vite.config.ts (minification, tree-shaking, code splitting)
- [ ] T124 Test production build with `pnpm build` and verify output in `dist/`
- [ ] T125 Test production preview server with `pnpm preview` and verify functionality

### Quality Gates

- [ ] T126 Run all unit tests and verify 100% pass: `pnpm test`
- [ ] T127 Run all integration tests and verify 100% pass: `pnpm test -- integration`
- [ ] T128 Run all E2E tests and verify 100% pass: `pnpm test:e2e`
- [ ] T129 Run ESLint and verify no errors: `pnpm lint`
- [ ] T130 Run TypeScript compiler and verify no errors: `pnpm type-check`
- [ ] T131 Verify test coverage meets threshold: `pnpm test -- --coverage` (minimum 80% coverage)

### Final Manual Testing

- [ ] T132 Manual test: 4+ hour continuous operation test (verify stable Firestore + WebSocket connections, no memory leaks)
- [ ] T133 Manual test: All 8 game phases transition correctly with accurate visual content (screenshot comparison)
- [ ] T134 Manual test: Audio crossfades occur smoothly without audible artifacts (waveform analysis)
- [ ] T135 Manual test: Answer count updates display in real-time with sub-1-second latency
- [ ] T136 Manual test: WebSocket synchronization achieves sub-50ms timing differences (measure with server-side timestamps)

---

## Dependencies and Execution Order

### Phase Dependencies

1. **Phase 1 (Setup)** → Blocks all other phases (must complete first)
2. **Phase 2 (Foundational)** → Blocks all user story phases (US1-US4)
3. **Phase 3 (US1)** → Blocks US2, US3, US4 (US1 is P1, foundation for display)
4. **Phase 4 (US2)** → Can run in parallel with US3 after US1 completes
5. **Phase 5 (US3)** → Can run in parallel with US2 after US1 completes
6. **Phase 6 (US4)** → Requires US3 complete (audio engine needed for TRIGGER_GONG)
7. **Phase 7 (Polish)** → Requires all user stories complete

### Parallel Execution Examples

**Within Phase 1 (Setup)**: T001-T010 can all run in parallel (marked [P])

**Within Phase 2 (Foundational)**:
- Firebase tests (T014) || WebSocket tests (T017) || Audio tests (T021) || Type definitions (T024-T025)
- Firebase implementation (T015) || WebSocket types (T018) || Local types (T025)

**Within Phase 3 (US1) Tests**:
- T032-T041 can all run in parallel (all test file creation)

**Within Phase 3 (US1) Implementation**:
- T043-T049 can all run in parallel (different phase component files)

**Within Phase 4 (US2) Tests**:
- T057-T059 can all run in parallel

**Within Phase 5 (US3) Tests**:
- T068-T070 can all run in parallel

**Within Phase 6 (US4) Tests**:
- T085-T088 can all run in parallel

**Within Phase 7 (Polish)**:
- T101-T103 can run in parallel (different files)
- T106-T110 can run in parallel (different files)
- T111-T114 can run in parallel (different concerns)
- T115-T117 can run in parallel (logging setup)
- T118-T120 can run in parallel (documentation)
- T121-T125 can run in parallel (deployment config)

---

## MVP Definition

**Minimum Viable Product = User Story 1 Only**

If time is constrained, deliver US1 (Phase 3) as MVP:
- ✅ Display all 7 game phases reactively from Firestore
- ✅ Countdown timer during accepting_answers phase
- ✅ Top 10 + worst 10 rankings display
- ❌ No real-time answer count (US2)
- ❌ No audio (US3)
- ❌ No WebSocket synchronization (US4)

**MVP Task Range**: T001-T056 (56 tasks)

---

## Implementation Strategy

### TDD Discipline (Red-Green-Refactor)

For each user story phase:
1. **Write ALL tests first** (Red phase)
2. **Implement to pass tests** (Green phase)
3. **Refactor for quality** (Refactor phase)
4. **Verify all tests pass** (Verification tasks)

### Verification Checkpoints

Each phase ends with verification tasks:
- Unit tests pass
- Integration tests pass
- E2E tests pass (where applicable)
- Manual testing confirms expected behavior

### Time Estimates

- **Phase 1 (Setup)**: 2-3 hours
- **Phase 2 (Foundational)**: 4-6 hours
- **Phase 3 (US1)**: 10-12 hours
- **Phase 4 (US2)**: 4-6 hours
- **Phase 5 (US3)**: 8-10 hours
- **Phase 6 (US4)**: 6-8 hours
- **Phase 7 (Polish)**: 6-8 hours

**Total Estimated Time**: 40-53 hours

---

## Success Criteria Mapping

- **SC-001** (500ms Firestore latency): Verified in T055, T132
- **SC-002** (100ms audio latency): Verified in T082, T116
- **SC-003** (50ms WebSocket sync): Verified in T098, T136
- **SC-004** (10s audio pre-load): Verified in T080, T114
- **SC-005** (4+ hour uptime): Verified in T132
- **SC-006** (1s answer count latency): Verified in T066, T135
- **SC-007** (2s cold start): Verified in T109, T132
- **SC-008** (smooth audio crossfades): Verified in T081, T134
- **SC-009** (8 game phases display): Verified in T133
- **SC-010** (zero memory leaks): Verified in T113, T132

---

## File Path Quick Reference

### Source Files

- `apps/projector-app/src/main.tsx` - Entry point
- `apps/projector-app/src/App.tsx` - Root component with phase router
- `apps/projector-app/src/lib/firebase.ts` - Firebase initialization
- `apps/projector-app/src/lib/audioManager.ts` - Web Audio API wrapper
- `apps/projector-app/src/lib/audioAssets.ts` - Audio asset manifest
- `apps/projector-app/src/lib/config.ts` - Environment configuration
- `apps/projector-app/src/lib/logger.ts` - Logging utilities
- `apps/projector-app/src/hooks/useGameState.ts` - Firestore gameState/live listener
- `apps/projector-app/src/hooks/useWebSocket.ts` - Socket-server connection
- `apps/projector-app/src/hooks/useAnswerCount.ts` - Dynamic answer count listener
- `apps/projector-app/src/hooks/useAudioEngine.ts` - Audio pre-loading
- `apps/projector-app/src/hooks/usePhaseAudio.ts` - Phase-based audio control
- `apps/projector-app/src/hooks/useCountdown.ts` - Countdown timer with sync
- `apps/projector-app/src/components/phases/ReadyForNextPhase.tsx` - Idle screen
- `apps/projector-app/src/components/phases/AcceptingAnswersPhase.tsx` - Question display
- `apps/projector-app/src/components/phases/ShowingDistributionPhase.tsx` - Answer distribution
- `apps/projector-app/src/components/phases/ShowingCorrectAnswerPhase.tsx` - Correct answer reveal
- `apps/projector-app/src/components/phases/ShowingResultsPhase.tsx` - Rankings display
- `apps/projector-app/src/components/phases/AllRevivedPhase.tsx` - Revival ceremony
- `apps/projector-app/src/components/phases/AllIncorrectPhase.tsx` - Prize carryover
- `apps/projector-app/src/components/ConnectionStatus.tsx` - Connection indicators
- `apps/projector-app/src/components/ErrorScreen.tsx` - Error display
- `apps/projector-app/src/components/LoadingIndicator.tsx` - Audio loading progress
- `apps/projector-app/src/components/ErrorBoundary.tsx` - React error boundary
- `apps/projector-app/src/components/AnswerCounter.tsx` - Real-time answer count
- `apps/projector-app/src/types/index.ts` - Type definitions
- `apps/projector-app/src/types/socket-events.ts` - WebSocket event types

### Test Files

- `apps/projector-app/tests/unit/lib/firebase.test.ts`
- `apps/projector-app/tests/unit/lib/audioManager.test.ts`
- `apps/projector-app/tests/unit/hooks/useGameState.test.ts`
- `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`
- `apps/projector-app/tests/unit/hooks/useAnswerCount.test.ts`
- `apps/projector-app/tests/unit/hooks/useAudioEngine.test.ts`
- `apps/projector-app/tests/unit/hooks/usePhaseAudio.test.ts`
- `apps/projector-app/tests/unit/hooks/useCountdown.test.ts`
- `apps/projector-app/tests/unit/components/phases/*.test.tsx` (7 files)
- `apps/projector-app/tests/unit/components/AnswerCounter.test.tsx`
- `apps/projector-app/tests/unit/components/LoadingIndicator.test.tsx`
- `apps/projector-app/tests/unit/components/ErrorScreen.test.tsx`
- `apps/projector-app/tests/integration/firestore.test.ts`
- `apps/projector-app/tests/integration/websocket.test.ts`
- `apps/projector-app/tests/integration/websocket-gong.test.ts`
- `apps/projector-app/tests/integration/websocket-timer.test.ts`
- `apps/projector-app/tests/integration/answer-count.test.ts`
- `apps/projector-app/tests/e2e/phase-transitions.spec.ts`

### Configuration Files

- `apps/projector-app/package.json`
- `apps/projector-app/tsconfig.json`
- `apps/projector-app/vite.config.ts`
- `apps/projector-app/vitest.config.ts`
- `apps/projector-app/.env.development`
- `apps/projector-app/.env.production.example`
- `apps/projector-app/README.md`

---

**End of Task Breakdown**

**Next Step**: Execute tasks sequentially by phase, following TDD discipline (Red-Green-Refactor). Begin with Phase 1 (Setup).
