# Feature Specification: Projector Authentication E2E Tests

**Feature Branch**: `001-projector-auth-e2e`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "Projector Anonymous AuthenticationのブラウザベースのEnd-to-End (E2E) テスト追加。Firebase Emulatorを使った実際のブラウザでの認証フロー検証、WebSocket再接続シナリオのテスト、デュアルチャネルフォールバックの動作確認を実装。既存の統合テスト (tests/integration/auth-startup.test.ts) を実行可能にするためのvitest設定修正も含む。前提条件：001-projector-anonymous-authの実装完了、ユニットテスト278個全て合格、Playwright環境利用可能。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browser-Based Authentication Flow Verification (Priority: P1)

As a QA engineer, I need to verify that the projector app successfully authenticates users through Firebase Anonymous Auth in a real browser environment, so that we can ensure the authentication flow works end-to-end as users will experience it.

**Why this priority**: This is the foundation of the entire authentication system. Without verified browser-based authentication, we cannot trust that the app will work in production. This test must pass before any other E2E tests can be meaningful.

**Independent Test**: Can be fully tested by launching the projector app in a browser connected to Firebase Auth Emulator, observing the authentication state changes, and verifying the app transitions from unauthenticated to authenticated state within 3 seconds. Delivers confidence that the core authentication mechanism works in real browsers.

**Acceptance Scenarios**:

1. **Given** Firebase Auth Emulator is running and projector app is loaded in a browser, **When** the app initializes, **Then** the app displays loading indicator and completes authentication within 3 seconds
2. **Given** projector app has successfully authenticated, **When** I inspect the Firebase user object, **Then** the user is marked as anonymous with a valid UID
3. **Given** projector app is authenticated, **When** I refresh the browser, **Then** the session is restored without re-authentication (session persistence)
4. **Given** projector app has an expired session (>24 hours old), **When** the app loads, **Then** the app re-authenticates automatically

---

### User Story 2 - Integration Test Execution (Priority: P1)

As a developer, I need the existing integration tests to run successfully in the CI/CD pipeline, so that we can catch regressions in the authentication flow before they reach production.

**Why this priority**: The integration tests already exist (`tests/integration/auth-startup.test.ts`) but cannot run due to vitest configuration. Enabling these tests immediately provides value by catching bugs in the authentication lifecycle without requiring new test code.

**Independent Test**: Can be fully tested by running `pnpm test:integration` and verifying all integration tests pass. Delivers immediate regression protection for authentication flows.

**Acceptance Scenarios**:

1. **Given** vitest configuration is updated to include integration tests, **When** I run `pnpm test:integration`, **Then** all tests in `tests/integration/auth-startup.test.ts` execute and pass
2. **Given** integration tests are configured, **When** tests run in CI/CD pipeline, **Then** test results are reported correctly and failures block deployments
3. **Given** integration tests use Firebase Emulator, **When** emulator is not running, **Then** tests fail with clear error message indicating emulator is required

---

### User Story 3 - WebSocket Reconnection Scenario Testing (Priority: P2)

As a QA engineer, I need to verify that the projector app automatically reconnects to the WebSocket server with exponential backoff after network disruptions, so that we can ensure the app remains functional during temporary connectivity issues.

**Why this priority**: WebSocket reconnection is critical for long-running projector displays (8+ hour events), but it's secondary to initial authentication. Users can tolerate brief disconnections if the app recovers automatically.

**Independent Test**: Can be fully tested by simulating network disconnect/reconnect cycles in a browser test and verifying the WebSocket connection recovers within the expected timeframe (10 seconds with exponential backoff). Delivers confidence that projectors will survive network hiccups.

**Acceptance Scenarios**:

1. **Given** projector app is connected to WebSocket server, **When** network connection is interrupted, **Then** the app attempts reconnection with exponential backoff (1s, 2s, 4s, 8s, up to 60s max)
2. **Given** WebSocket connection is lost, **When** connection is restored within 10 attempts, **Then** the app successfully reconnects and resumes receiving real-time updates
3. **Given** WebSocket reconnection is in progress, **When** I observe the connection status UI, **Then** the status shows "reconnecting" with attempt count
4. **Given** WebSocket fails to reconnect after 10 attempts, **When** I check the error state, **Then** the app displays "Failed to reconnect" message

---

### User Story 4 - Dual-Channel Fallback Verification (Priority: P2)

As a QA engineer, I need to verify that when WebSocket connection fails, the app seamlessly falls back to Firestore listeners without data loss, so that we can ensure projectors always display current game state.

**Why this priority**: Dual-channel reliability is important for production stability, but users won't notice if the fallback works smoothly. The app can function on Firestore alone, making this secondary to core authentication and reconnection logic.

**Independent Test**: Can be fully tested by disconnecting the WebSocket server while the app is running and verifying that game state updates continue to arrive via Firestore. Delivers assurance that projectors never go dark during WebSocket outages.

**Acceptance Scenarios**:

1. **Given** both WebSocket and Firestore channels are active, **When** WebSocket disconnects, **Then** game state updates continue via Firestore with <500ms latency
2. **Given** app is receiving updates via Firestore fallback, **When** WebSocket reconnects, **Then** the app resumes using WebSocket without duplicate updates (deduplication works)
3. **Given** both channels receive the same update, **When** the update arrives via both channels within 100ms, **Then** only one update is processed (no duplicate rendering)
4. **Given** Firestore connection fails, **When** WebSocket is still active, **Then** app continues operating normally via WebSocket only

---

### Edge Cases

- **What happens when** Firebase Auth Emulator is not running? The app should display clear error message and not silently fail.
- **How does system handle** concurrent updates from WebSocket and Firestore? Deduplication logic should prevent double-processing based on timestamps.
- **What happens when** browser is put to sleep/wake cycle? App should detect stale connections and refresh authentication if needed.
- **How does system handle** authentication during network outage? App should queue authentication requests and retry when network is restored.
- **What happens when** Firebase token expires mid-session? App should automatically refresh the token without user disruption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: E2E tests MUST verify projector app completes Firebase Anonymous Authentication in a real browser within 3 seconds
- **FR-002**: E2E tests MUST verify session persistence across browser refresh without re-authentication
- **FR-003**: E2E tests MUST verify WebSocket reconnection with exponential backoff (1s initial delay, 60s max delay, 10 attempts)
- **FR-004**: E2E tests MUST verify Firestore fallback when WebSocket connection fails
- **FR-005**: E2E tests MUST verify deduplication prevents duplicate updates when both channels are active
- **FR-006**: Integration test configuration MUST be updated to include `tests/integration/**/*.test.ts` files
- **FR-007**: Integration tests MUST run in CI/CD pipeline alongside unit tests
- **FR-008**: E2E tests MUST use Playwright for browser automation
- **FR-009**: E2E tests MUST connect to Firebase Auth Emulator (localhost:9099) instead of production Firebase
- **FR-010**: E2E tests MUST connect to Firestore Emulator (localhost:8080) for game state updates
- **FR-011**: E2E tests MUST simulate network disconnection and reconnection scenarios
- **FR-012**: Test suite MUST provide clear error messages when Firebase Emulators are not running
- **FR-013**: E2E tests MUST verify authentication state transitions (unauthenticated → authenticating → authenticated)
- **FR-014**: E2E tests MUST verify error handling when authentication fails
- **FR-015**: E2E tests MUST clean up test data after each test run to prevent test pollution

### Key Entities

- **E2E Test Suite**: Collection of Playwright tests that verify authentication flow in real browser environment
- **Integration Test Configuration**: Vitest configuration updates to enable running integration tests
- **Firebase Emulator Setup**: Configuration for Auth and Firestore emulators used in testing
- **Network Simulation**: Test helpers that simulate network disruptions (disconnect/reconnect)
- **Test Data Seeder**: Utility to populate Firestore emulator with test game state data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: E2E tests verify authentication completes in under 3 seconds in real browser (measured from page load to authenticated state)
- **SC-002**: Integration test suite runs successfully via `pnpm test:integration` command with 100% pass rate
- **SC-003**: E2E tests verify WebSocket reconnection succeeds within 10 seconds after network restoration
- **SC-004**: E2E tests verify Firestore fallback delivers game state updates with <500ms latency when WebSocket is disconnected
- **SC-005**: Test suite runs in CI/CD pipeline and completes within 5 minutes for full E2E + integration test execution
- **SC-006**: E2E tests verify zero duplicate updates when both WebSocket and Firestore channels are active (deduplication rate: 100%)
- **SC-007**: Test suite provides actionable error messages with 100% accuracy when Firebase Emulators are not running
- **SC-008**: E2E tests achieve 100% coverage of authentication state transitions (unauthenticated → authenticating → authenticated → error states)

## Assumptions *(mandatory)*

### Technical Assumptions

- Playwright is already installed and configured in the project (mentioned as "Playwright環境利用可能" in input)
- Firebase Emulators can be started programmatically or via npm script before test execution
- projector-app runs on localhost:5175 during E2E tests (based on existing E2E test file at `/home/tisayama/allstars/tests/e2e/verify-projector-app.spec.ts`)
- Firebase Auth Emulator runs on localhost:9099 (standard Firebase Emulator port)
- Firestore Emulator runs on localhost:8080 (standard Firebase Emulator port)
- Existing unit tests (278 passing) provide sufficient coverage for individual components; E2E tests focus on integration points
- CI/CD pipeline has environment variables configured for Firebase Emulator hosts

### Business Assumptions

- E2E tests will run in development and CI/CD environments, not in production
- Test execution time of <5 minutes is acceptable for full test suite
- Manual testing is still required for visual verification (E2E tests focus on functional correctness)
- Test data cleanup is acceptable to perform after each test (no persistent test state needed)

### Dependencies

- **001-projector-anonymous-auth**: Must be fully implemented and deployed before E2E tests can run
- **Firebase Emulators**: Must be installed and runnable locally and in CI/CD
- **Playwright**: Must be configured with browser binaries installed
- **Network simulation tools**: May require Playwright's network interception APIs or external proxy tools

## Constraints

- E2E tests must not connect to production Firebase (must use emulators only)
- Test execution must not interfere with development environment (isolated test data)
- E2E tests must be deterministic (no flaky tests due to timing issues)
- Test suite must work in headless browser mode for CI/CD execution
- Integration tests must work with existing vitest configuration with minimal changes
