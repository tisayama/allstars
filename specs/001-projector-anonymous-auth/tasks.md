# Tasks: Projector Anonymous Authentication

**Feature**: 001-projector-anonymous-auth
**Branch**: `001-projector-anonymous-auth`
**Generated**: 2025-11-16
**Input Documents**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [research.md](./research.md)

## Overview

This tasks file implements Firebase Anonymous Authentication for projector-app following **strict Test-Driven Development (TDD)**. All tests MUST be written BEFORE implementation, fail initially (red), then pass after implementation (green).

**Key TDD Rules**:
- Write test FIRST (red) → Implement feature (green) → Refactor
- Tests tasks marked `[P]` can be run in parallel with other test tasks
- Implementation tasks MUST wait for tests to exist first (never parallel with test tasks)
- All tests must fail initially, then pass after implementation

**Dependencies**:
- User Stories 2, 3 depend on US1 (auth must work first)
- User Story 4 depends on US2 + US3 (needs both channels operational)
- User Story 5 is independent (can be parallel to US4)

---

## Phase 1: Setup & Dependencies

**Goal**: Prepare development environment and install required dependencies

### Tasks

- [ ] T001: Verify Firebase SDK version in `apps/projector-app/package.json` is 10.x (currently 10.13.0)
- [ ] T002: Verify Socket.io Client version in `apps/projector-app/package.json` is 4.x (currently 4.7.0)
- [ ] T003: Create test directory structure: `apps/projector-app/tests/unit/hooks/`, `apps/projector-app/tests/unit/services/`, `apps/projector-app/tests/integration/`
- [ ] T004: Verify Firebase emulator configuration in root `firebase.json` includes auth emulator on port 9099
- [ ] T005: Document testing commands in `apps/projector-app/package.json`: ensure `test`, `test:watch`, `test:integration`, `test:e2e` scripts exist

**Completion Criteria**: All dependencies verified, test directories created, no missing packages

---

## Phase 2: Foundational Types & Utilities

**Goal**: Define shared TypeScript types and utility functions needed across all user stories

### Tasks

- [ ] T006: [P] Define `ProjectorAuthState` type in `apps/projector-app/src/types/index.ts` (fields: `user`, `isAuthenticated`, `isLoading`, `error`)
- [ ] T007: [P] Define `ConnectionStatus` type in `apps/projector-app/src/types/index.ts` (fields: `firebaseAuthState`, `websocketState`, `firestoreListenerState`, `lastError`, `lastUpdateTimestamp`, `reconnectAttempts`)
- [ ] T008: [P] Define `UpdateEvent` type in `apps/projector-app/src/types/index.ts` (fields: `source`, `eventType`, `payload`, `timestamp`, `receivedAt`)
- [ ] T009: [P] Define `DeduplicationMap` type in `apps/projector-app/src/types/index.ts` (maps `eventType` to last processed `timestamp`)
- [ ] T010: Add Firebase auth state enum values to `apps/projector-app/src/types/index.ts`: `'unauthenticated' | 'authenticating' | 'authenticated' | 'error'`
- [ ] T011: Add WebSocket state enum values to `apps/projector-app/src/types/index.ts`: `'disconnected' | 'connecting' | 'connected' | 'error'`
- [ ] T012: Add Firestore listener state enum values to `apps/projector-app/src/types/index.ts`: `'inactive' | 'active' | 'error'`

**Completion Criteria**: All types defined, TypeScript compilation passes with no type errors

---

## Phase 3: User Story 1 - Automatic Authentication on App Launch (P1)

**Goal**: Implement automatic Firebase Anonymous Authentication without user interaction

**Success Criteria**:
- Authentication completes within 3 seconds of app launch
- Session persists across app restarts (localStorage)
- Expired sessions (>24 hours) automatically re-authenticate

### Unit Tests (Write FIRST - Red)

- [ ] T013: [P] Write test for `useProjectorAuth` hook initial state in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: verify `isLoading=true`, `user=null`, `isAuthenticated=false`
- [ ] T014: [P] Write test for successful anonymous authentication in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: mock Firebase `signInAnonymously()` to return user, verify state updates to `isAuthenticated=true`, `user` populated
- [ ] T015: [P] Write test for session persistence in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: mock `onAuthStateChanged` to return existing user, verify no `signInAnonymously()` call (session restored)
- [ ] T016: [P] Write test for expired session handling in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: mock session with `createdAt` older than 24 hours, verify `signInAnonymously()` called to re-authenticate
- [ ] T017: [P] Write test for authentication error handling in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: mock `signInAnonymously()` to throw error, verify `error` state populated, `isLoading=false`
- [ ] T018: [P] Write test for automatic token refresh in `apps/projector-app/tests/unit/hooks/useProjectorAuth.test.ts`: verify Firebase SDK's `onAuthStateChanged` listener remains active for token refresh notifications

### Implementation (After Tests - Green)

- [ ] T019: Create `apps/projector-app/src/hooks/useProjectorAuth.ts` hook skeleton (imports, empty hook function returning initial state)
- [ ] T020: Implement `signInAnonymously()` call in `useProjectorAuth` when `onAuthStateChanged` returns null user
- [ ] T021: Implement `onAuthStateChanged` listener in `useProjectorAuth` to track Firebase auth state changes
- [ ] T022: Implement session persistence check in `useProjectorAuth`: restore existing Firebase session from localStorage (Firebase SDK automatic)
- [ ] T023: Implement error handling in `useProjectorAuth`: catch authentication failures, update `error` state with message
- [ ] T024: Add TypeScript types to `useProjectorAuth` hook: return type `ProjectorAuthState`, User type from Firebase SDK
- [ ] T025: Run unit tests for `useProjectorAuth` - verify all tests pass (green)

### Integration Tests

- [ ] T026: Write integration test in `apps/projector-app/tests/integration/auth-startup.test.ts`: verify full authentication flow from app initialization to authenticated state using Firebase emulator
- [ ] T027: Write integration test in `apps/projector-app/tests/integration/auth-startup.test.ts`: verify session restoration works across simulated app restarts (unmount/remount component)
- [ ] T028: Run integration tests - verify all tests pass

**Completion Criteria**: All unit tests pass, integration tests pass, authentication completes <3 seconds in manual testing

---

## Phase 4: User Story 2 - Read-Only Access to Game State (P1)

**Goal**: Enable authenticated projector to read Firestore gameState (read-only)

**Success Criteria**:
- Projector can read `gameState/live` document after authentication
- Write operations fail with permission denied error
- Firestore security rules differentiate anonymous users

**Dependencies**: Requires US1 complete (authentication must work first)

### Unit Tests (Write FIRST - Red)

- [ ] T029: [P] Write test for Firestore service initialization in `apps/projector-app/tests/unit/services/firestoreService.test.ts`: verify `getGameStateRef()` returns DocumentReference for `gameState/live`
- [ ] T030: [P] Write test for successful read operation in `apps/projector-app/tests/unit/services/firestoreService.test.ts`: mock authenticated user, call `readGameState()`, verify Firestore `getDoc()` called with correct ref
- [ ] T031: [P] Write test for unauthenticated read failure in `apps/projector-app/tests/unit/services/firestoreService.test.ts`: mock null user, call `readGameState()`, verify error thrown with "Not authenticated" message
- [ ] T032: [P] Write test for Firestore read error handling in `apps/projector-app/tests/unit/services/firestoreService.test.ts`: mock Firestore `getDoc()` to throw permission error, verify error caught and returned

### Implementation (After Tests - Green)

- [ ] T033: Create `apps/projector-app/src/services/firestoreService.ts` with `getGameStateRef()` function returning `doc(db, 'gameState/live')`
- [ ] T034: Implement `readGameState()` function in `firestoreService.ts`: check authentication, call Firestore `getDoc()`, return document data
- [ ] T035: Add error handling to `readGameState()`: catch Firestore errors, log with context, throw descriptive error
- [ ] T036: Add TypeScript types to `firestoreService.ts`: return type `GameState` from `@allstars/types`, error types
- [ ] T037: Run unit tests for `firestoreService` - verify all tests pass (green)

### Integration Tests

- [ ] T038: Write integration test in `apps/projector-app/tests/integration/firestore-read.test.ts`: verify authenticated anonymous user can read `gameState/live` from Firestore emulator
- [ ] T039: Write integration test in `apps/projector-app/tests/integration/firestore-read.test.ts`: seed test data in Firestore emulator, verify `readGameState()` returns correct data
- [ ] T040: Write integration test in `apps/projector-app/tests/integration/firestore-write-denied.test.ts`: verify write operations fail with "permission-denied" error for anonymous users
- [ ] T041: Run integration tests - verify all tests pass

### Firestore Security Rules Update

- [ ] T042: Review existing Firestore security rules in `firestore.rules`: verify anonymous users (`request.auth != null && request.auth.token.email_verified == false`) have read access to `gameState`, `questions`, `guests` collections
- [ ] T043: Update Firestore security rules if needed: add anonymous read access rules, deny write access for anonymous users
- [ ] T044: Deploy updated security rules to emulator: run `firebase deploy --only firestore:rules` (emulator auto-loads from `firestore.rules`)
- [ ] T045: Test security rules in emulator: verify anonymous user can read but not write using `@firebase/rules-unit-testing`

**Completion Criteria**: All tests pass, Firestore security rules enforce read-only access for anonymous users

---

## Phase 5: User Story 3 - WebSocket Connection for Real-Time Updates (P1)

**Goal**: Establish WebSocket connection using Firebase ID token for authentication

**Success Criteria**:
- WebSocket connection established within 3 seconds of authentication
- Connection uses Firebase ID token for auth handshake
- Projector receives real-time game events within 500ms

**Dependencies**: Requires US1 complete (must have Firebase ID token)

### Unit Tests (Write FIRST - Red)

- [ ] T046: [P] Write test for `useWebSocket` hook with Firebase auth in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts` (MODIFY existing test file): verify `getIdToken()` called on user object when connecting
- [ ] T047: [P] Write test for WebSocket auth handshake in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: mock Socket.IO `emit('authenticate', { token })`, verify token sent to server
- [ ] T048: [P] Write test for successful auth in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: mock server response `AUTH_SUCCESS` event, verify connection status updated to `connected`
- [ ] T049: [P] Write test for auth failure in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: mock server response `AUTH_FAILED` event, verify error state updated, connection status `error`
- [ ] T050: [P] Write test for event subscription in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: verify `socket.on(eventType, callback)` called for subscribed event types

### Implementation (After Tests - Green)

- [ ] T051: Modify `apps/projector-app/src/hooks/useWebSocket.ts`: add `user` parameter to hook (from `useProjectorAuth`)
- [ ] T052: Implement Firebase ID token retrieval in `useWebSocket`: call `user.getIdToken()` when user available
- [ ] T053: Implement WebSocket authentication in `useWebSocket`: emit `authenticate` event with Firebase ID token
- [ ] T054: Implement auth response handlers in `useWebSocket`: handle `AUTH_SUCCESS` and `AUTH_FAILED` events from server
- [ ] T055: Update connection status tracking in `useWebSocket`: track `connecting`, `connected`, `error` states
- [ ] T056: Run unit tests for `useWebSocket` - verify all tests pass (green)

### Integration Tests

- [ ] T057: Write integration test in `apps/projector-app/tests/integration/auth-websocket.test.ts`: verify full auth + WebSocket connection flow using Firebase emulator + Socket server
- [ ] T058: Write integration test in `apps/projector-app/tests/integration/auth-websocket.test.ts`: seed game event in Firestore, verify WebSocket delivers event to projector within 500ms
- [ ] T059: Write integration test in `apps/projector-app/tests/integration/auth-websocket.test.ts`: verify time synchronization event (`TIME_SYNC`) received and processed
- [ ] T060: Run integration tests - verify all tests pass

**Completion Criteria**: WebSocket connection established with Firebase token, events received within 500ms

---

## Phase 6: User Story 4 - Dual Update Channel Redundancy (P2)

**Goal**: Receive updates via both WebSocket and Firestore with deduplication

**Success Criteria**:
- Updates received via WebSocket (primary) OR Firestore (backup) within 500ms
- Duplicate updates automatically deduplicated via timestamp comparison
- Both channels operate independently (one can fail while other continues)

**Dependencies**: Requires US2 + US3 complete (both channels must work independently first)

### Unit Tests (Write FIRST - Red)

- [ ] T061: [P] Write test for deduplication logic in `apps/projector-app/tests/unit/services/updateDeduplicator.test.ts` (NEW file): verify first update processed, second duplicate ignored
- [ ] T062: [P] Write test for timestamp comparison in `apps/projector-app/tests/unit/services/updateDeduplicator.test.ts`: verify newer timestamp always accepted, older timestamp always rejected
- [ ] T063: [P] Write test for WebSocket update handling in `apps/projector-app/tests/unit/hooks/useDualChannelUpdates.test.ts` (NEW file): verify WebSocket update processed, Firestore duplicate ignored
- [ ] T064: [P] Write test for Firestore update handling in `apps/projector-app/tests/unit/hooks/useDualChannelUpdates.test.ts`: verify Firestore update processed when WebSocket slow/disconnected
- [ ] T065: [P] Write test for concurrent updates in `apps/projector-app/tests/unit/hooks/useDualChannelUpdates.test.ts`: verify both channels delivering simultaneously, first-wins strategy works

### Implementation (After Tests - Green)

- [ ] T066: Create `apps/projector-app/src/services/updateDeduplicator.ts`: implement `DeduplicationMap` state management, `shouldProcessUpdate(eventType, timestamp)` function
- [ ] T067: Create `apps/projector-app/src/hooks/useDualChannelUpdates.ts`: combine WebSocket + Firestore listeners, route updates through deduplicator
- [ ] T068: Implement Firestore snapshot listener in `useDualChannelUpdates`: listen to `gameState/live` document changes
- [ ] T069: Implement update merger in `useDualChannelUpdates`: process updates from either channel, deduplicate based on timestamp
- [ ] T070: Add logging to `useDualChannelUpdates`: log which channel delivered update (WebSocket vs Firestore), log duplicate rejections
- [ ] T071: Run unit tests for deduplication and dual channels - verify all tests pass (green)

### Integration Tests

- [ ] T072: Write integration test in `apps/projector-app/tests/integration/dual-channel.test.ts`: verify update received via WebSocket when both channels active
- [ ] T073: Write integration test in `apps/projector-app/tests/integration/dual-channel.test.ts`: disconnect WebSocket, verify update received via Firestore listener
- [ ] T074: Write integration test in `apps/projector-app/tests/integration/dual-channel.test.ts`: send duplicate update via both channels, verify only one processed
- [ ] T075: Write integration test in `apps/projector-app/tests/integration/dual-channel.test.ts`: verify update propagation latency <500ms for both channels
- [ ] T076: Run integration tests - verify all tests pass

**Completion Criteria**: Dual channels operational, deduplication working, failover to backup channel verified

---

## Phase 7: User Story 5 - Automatic Reconnection on Network Issues (P2)

**Goal**: Automatically reconnect and re-authenticate after network disruptions

**Success Criteria**:
- WebSocket reconnects with exponential backoff (1s to 60s max, ±50% jitter)
- Firebase auth session persists through network disruptions
- Firestore listener auto-reconnects (handled by Firebase SDK)
- Full reconnection within 10 seconds of network restoration

**Dependencies**: Independent of US4 (can be developed in parallel)

### Unit Tests (Write FIRST - Red)

- [ ] T077: [P] Write test for exponential backoff configuration in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: verify Socket.IO options include `reconnectionDelay=1000`, `reconnectionDelayMax=60000`, `randomizationFactor=0.5`
- [ ] T078: [P] Write test for infinite reconnection attempts in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: verify `reconnectionAttempts=Infinity`
- [ ] T079: [P] Write test for reconnection event tracking in `apps/projector-app/tests/unit/hooks/useWebSocket.test.ts`: verify `reconnect_attempt`, `reconnect`, `reconnect_failed` events handled
- [ ] T080: [P] Write test for connection status during reconnection in `apps/projector-app/tests/unit/hooks/useConnectionStatus.test.ts` (MODIFY existing): verify status shows `websocket: 'connecting'` during reconnection attempts
- [ ] T081: [P] Write test for 2-second delay before showing disconnect indicator in `apps/projector-app/tests/unit/hooks/useConnectionStatus.test.ts`: verify indicator not shown immediately, shown after 2000ms delay

### Implementation (After Tests - Green)

- [ ] T082: Update Socket.IO configuration in `apps/projector-app/src/hooks/useWebSocket.ts`: add `reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 60000`, `randomizationFactor: 0.5`
- [ ] T083: Implement reconnection event handlers in `useWebSocket`: listen to `reconnect_attempt`, `reconnect`, `reconnect_failed` events
- [ ] T084: Add reconnection attempt counter in `useWebSocket`: track attempt number, log to console
- [ ] T085: Update connection status logic in `useConnectionStatus` hook: implement 2-second debounce for disconnect indicator
- [ ] T086: Add immediate indicator hide on reconnection in `useConnectionStatus`: clear timeout when connection restored
- [ ] T087: Run unit tests for reconnection logic - verify all tests pass (green)

### Integration Tests

- [ ] T088: Write integration test in `apps/projector-app/tests/integration/reconnection.test.ts`: simulate network disconnect, verify WebSocket reconnects automatically within 10 seconds
- [ ] T089: Write integration test in `apps/projector-app/tests/integration/reconnection.test.ts`: verify exponential backoff timing (1s, 2s, 4s delays) during reconnection attempts
- [ ] T090: Write integration test in `apps/projector-app/tests/integration/reconnection.test.ts`: verify Firebase auth session persists through network disruption (no re-authentication needed)
- [ ] T091: Write integration test in `apps/projector-app/tests/integration/reconnection.test.ts`: verify Firestore listener resumes after network restoration
- [ ] T092: Run integration tests - verify all tests pass

**Completion Criteria**: Reconnection works within 10 seconds, exponential backoff verified, all connection layers recover

---

## Phase 8: UI Integration

**Goal**: Integrate authentication and connection status into App.tsx and ConnectionStatus component

**Dependencies**: Requires US1, US3, US5 complete

### Unit Tests (Write FIRST - Red)

- [ ] T093: [P] Write test for `App.tsx` integration in `apps/projector-app/tests/unit/App.test.tsx` (NEW file): verify `useProjectorAuth` hook called, loading state rendered during authentication
- [ ] T094: [P] Write test for authenticated app state in `apps/projector-app/tests/unit/App.test.tsx`: mock authenticated user, verify main app content rendered (not loading screen)
- [ ] T095: [P] Write test for ConnectionStatus component with Firebase auth in `apps/projector-app/tests/unit/components/ConnectionStatus.test.tsx` (MODIFY existing): verify auth state displayed correctly (`authenticated`, `authenticating`, `error`)
- [ ] T096: [P] Write test for multi-layer connection status in `apps/projector-app/tests/unit/components/ConnectionStatus.test.tsx`: verify all three layers (Firebase, WebSocket, Firestore) displayed independently

### Implementation (After Tests - Green)

- [ ] T097: Modify `apps/projector-app/src/App.tsx`: import and call `useProjectorAuth` hook at top of component
- [ ] T098: Add authentication loading state to `App.tsx`: render `<LoadingIndicator />` while `isLoading=true`
- [ ] T099: Add authentication error handling to `App.tsx`: render `<ErrorScreen />` if `error` state populated
- [ ] T100: Pass authenticated user to `useWebSocket` hook in `App.tsx`: enable WebSocket authentication with Firebase token
- [ ] T101: Modify `apps/projector-app/src/components/ConnectionStatus.tsx`: add Firebase auth state indicator alongside WebSocket and Firestore indicators
- [ ] T102: Update ConnectionStatus styling: differentiate connected (green), connecting (yellow), error (red) states for all three layers
- [ ] T103: Run unit tests for App and ConnectionStatus - verify all tests pass (green)

### Integration Tests

- [ ] T104: Write integration test in `apps/projector-app/tests/integration/ui-integration.test.ts`: verify full app startup flow (auth → WebSocket → Firestore → main UI rendered)
- [ ] T105: Write integration test in `apps/projector-app/tests/integration/ui-integration.test.ts`: verify connection status component reflects actual connection states during startup
- [ ] T106: Run integration tests - verify all tests pass

**Completion Criteria**: App.tsx fully integrated, ConnectionStatus displays all three connection layers

---

## Phase 9: End-to-End Testing

**Goal**: Verify complete user stories work end-to-end in browser environment

**Dependencies**: Requires all previous phases complete

### E2E Tests

- [ ] T107: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-startup.spec.ts` (NEW file): verify projector app loads, authenticates automatically, connects to WebSocket within 3 seconds
- [ ] T108: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-startup.spec.ts`: verify session restoration works across page reloads (no re-authentication)
- [ ] T109: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-gamestate-read.spec.ts` (NEW file): verify projector reads `gameState/live` document and displays content
- [ ] T110: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-realtime-updates.spec.ts` (NEW file): seed game state change in Firestore, verify projector receives update via WebSocket OR Firestore within 500ms
- [ ] T111: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-reconnection.spec.ts` (NEW file): simulate network disconnect via Playwright, verify auto-reconnection within 10 seconds
- [ ] T112: [P] Write E2E test in `apps/projector-app/tests/e2e/projector-connection-status.spec.ts` (NEW file): verify connection status indicators show correct states during disconnect/reconnect cycle
- [ ] T113: Run all E2E tests with Playwright - verify all tests pass
- [ ] T114: Run E2E tests against localhost:5175 (projector-app dev server) - verify no failures
- [ ] T115: Run E2E tests against production build (vite preview) - verify no failures

**Completion Criteria**: All E2E tests pass, full user stories verified in browser environment

---

## Phase 10: Polish & Finalization

**Goal**: Code quality, documentation, and final verification before PR

### Linting & Formatting

- [ ] T116: Run ESLint on projector-app: `cd apps/projector-app && pnpm run lint`
- [ ] T117: Fix all ESLint errors and warnings: `pnpm run lint:fix`
- [ ] T118: Run Prettier on projector-app: `pnpm run format:check`
- [ ] T119: Fix all Prettier formatting issues: `pnpm run format`
- [ ] T120: Run TypeScript type checking: `pnpm run typecheck` - verify no type errors

### Testing Verification

- [ ] T121: Run all unit tests: `pnpm run test` - verify 100% pass rate
- [ ] T122: Run all integration tests: `pnpm run test:integration` - verify 100% pass rate
- [ ] T123: Run all E2E tests: `pnpm run test:e2e` - verify 100% pass rate
- [ ] T124: Generate test coverage report: `pnpm run test -- --coverage` - verify >80% coverage for new files
- [ ] T125: Review test coverage gaps: identify untested edge cases, add tests if needed

### Build Verification

- [ ] T126: Run production build: `pnpm run build` - verify no build errors
- [ ] T127: Start preview server: `pnpm run preview` - verify app starts successfully
- [ ] T128: Manually test authentication flow in preview build: verify auto sign-in works
- [ ] T129: Manually test WebSocket connection in preview build: verify connection establishes
- [ ] T130: Manually test connection status indicators in preview build: verify all states display correctly

### Documentation

- [ ] T131: Review `apps/projector-app/README.md`: add authentication setup instructions if README exists
- [ ] T132: Add JSDoc comments to `useProjectorAuth` hook: document parameters, return values, behavior
- [ ] T133: Add JSDoc comments to `firestoreService.ts`: document functions, error cases
- [ ] T134: Add JSDoc comments to `updateDeduplicator.ts`: document deduplication algorithm
- [ ] T135: Add JSDoc comments to `useDualChannelUpdates.ts`: document dual-channel logic

### Final Verification

- [ ] T136: Run all tests end-to-end in CI/CD pipeline simulation: `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build`
- [ ] T137: Manually test 8+ hour continuous operation: leave projector running overnight, verify no authentication errors or disconnections
- [ ] T138: Manually test network disconnection recovery: disable network for 30 seconds, re-enable, verify auto-reconnection within 10 seconds
- [ ] T139: Manually test session persistence: close and reopen browser, verify no re-authentication delay
- [ ] T140: Review all modified files: ensure no debug console.logs, no commented-out code, no TODOs left

### Git & Pull Request Preparation

- [ ] T141: Stage all changes: `git add apps/projector-app/src apps/projector-app/tests`
- [ ] T142: Commit with descriptive message following convention: `git commit -m "feat(projector-app): implement Firebase anonymous authentication with dual-channel updates"`
- [ ] T143: Push feature branch: `git push -u origin 001-projector-anonymous-auth`
- [ ] T144: Create GitHub Pull Request: title "Projector Anonymous Authentication (001)", link to spec.md, list all user stories completed
- [ ] T145: Fill PR description: summarize implementation, list test results, add screenshots of connection status UI, note any manual testing performed
- [ ] T146: Self-review PR: check diff for accidental commits (node_modules, .env, IDE files), verify all files relevant
- [ ] T147: Request review: assign reviewers, add labels `feature`, `authentication`, `projector-app`
- [ ] T148: Wait for CI/CD checks: verify GitHub Actions pass (linting, tests, build)
- [ ] T149: Address review feedback: make requested changes, push commits, re-request review
- [ ] T150: Merge PR after approval: use "Squash and merge" strategy, delete feature branch after merge

**Completion Criteria**: All quality gates pass, PR approved and merged, feature branch cleaned up

---

## Task Summary

**Total Tasks**: 150
**Phases**: 10
**User Stories Covered**: 5 (US1-US5)
**TDD Discipline**: All tests written before implementation, fail first (red), then pass (green)

### Task Breakdown by Phase

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Setup | T001-T005 | Environment and dependency verification |
| 2. Foundational | T006-T012 | TypeScript types and shared utilities |
| 3. US1 (P1) | T013-T028 | Automatic authentication on app launch |
| 4. US2 (P1) | T029-T045 | Read-only Firestore access |
| 5. US3 (P1) | T046-T060 | WebSocket connection with Firebase token |
| 6. US4 (P2) | T061-T076 | Dual-channel updates with deduplication |
| 7. US5 (P2) | T077-T092 | Automatic reconnection with exponential backoff |
| 8. UI Integration | T093-T106 | App.tsx and ConnectionStatus component updates |
| 9. E2E Testing | T107-T115 | End-to-end browser testing |
| 10. Polish | T116-T150 | Linting, formatting, documentation, PR creation |

### Parallel Task Opportunities

Tasks marked `[P]` can be executed in parallel:
- **Phase 2**: T006-T012 (all type definitions - different files)
- **Phase 3 (US1)**: T013-T018 (all unit tests - same file, but independent test cases)
- **Phase 4 (US2)**: T029-T032 (all unit tests - same file, independent cases)
- **Phase 5 (US3)**: T046-T050 (all unit tests - same file, independent cases)
- **Phase 6 (US4)**: T061-T065 (all unit tests - different files)
- **Phase 7 (US5)**: T077-T081 (all unit tests - different files)
- **Phase 8 (UI)**: T093-T096 (all unit tests - different files)
- **Phase 9 (E2E)**: T107-T112 (all E2E tests - different spec files)

**Implementation tasks NEVER parallelizable with test tasks** (must wait for tests to exist first per TDD)

### Critical Dependencies

1. **US1 → US2, US3**: Authentication must work before Firestore/WebSocket can use tokens
2. **US2 + US3 → US4**: Both channels must work independently before dual-channel logic
3. **US1 + US3 + US5 → Phase 8**: UI integration needs auth + WebSocket + reconnection complete
4. **All Phases → Phase 9**: E2E tests require all features implemented
5. **Phase 9 → Phase 10**: Final polish requires all tests passing

### Success Metrics (from spec.md)

- **SC-001**: Authentication completes <3 seconds (verified in T107, T137)
- **SC-002**: 8+ hour continuous operation (verified in T137)
- **SC-003**: Updates received <500ms (verified in T058, T075, T110)
- **SC-004**: Recovery <10 seconds after network restoration (verified in T088, T111, T138)
- **SC-005**: Connection status updates <1 second (verified in T112)
- **SC-006**: 100% duplicate handling (verified in T073, T074)
- **SC-007**: Full wedding reception duration without errors (verified in T137)

---

## Notes for Implementation

### TDD Reminders

- Always write the test FIRST, watch it FAIL (red)
- Then implement the feature to make the test PASS (green)
- Only then refactor for code quality
- Never skip the red phase (proves test is actually testing something)

### Testing Strategy

- **Unit tests**: Fast, isolated, mock all external dependencies (Firebase, Socket.IO)
- **Integration tests**: Use Firebase emulator + local socket server, test multi-component flows
- **E2E tests**: Full browser testing with Playwright, test complete user stories

### Firebase Emulator Usage

All integration tests should use Firebase emulator:
```bash
# Start emulator for auth + Firestore
firebase emulators:start --only auth,firestore

# Set environment variable in tests
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
```

### Code Quality Standards

- All functions must have TypeScript type annotations
- All hooks must return typed objects
- All errors must be caught and logged with context
- All async operations must handle Promise rejection
- No `any` types allowed (use `unknown` and type guards instead)

### Manual Testing Checklist (Phase 10)

After all automated tests pass, manually verify:
- [ ] Projector auto-authenticates on fresh browser (no localStorage)
- [ ] Projector restores session on page reload (localStorage persists)
- [ ] Projector shows connection status for all three layers
- [ ] Projector reconnects automatically after network disruption
- [ ] Projector receives game events via WebSocket within 500ms
- [ ] Projector receives game events via Firestore when WebSocket disconnected
- [ ] Projector operates for 8+ hours without errors (overnight test)
