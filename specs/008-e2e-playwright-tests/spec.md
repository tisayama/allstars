# Feature Specification: End-to-End Testing Infrastructure with Playwright

**Feature Branch**: `008-e2e-playwright-tests`
**Created**: 2025-01-04
**Status**: Draft
**Input**: User description: "we should have e2e test using playwright. Here is a comprehensive set of End-to-End (E2E) test scenarios. These tests are designed to be executed in a local development environment (using Firebase Emulators and locally-run apps) to simulate the entire real-world game flow from start to finish. They cover the interactions between all 6 applications and validate all critical game logic."

## Clarifications

### Session 2025-01-04

- Q: How should the E2E test suite handle starting/stopping Firebase Emulators and the 6 application instances? → A: Managed by test suite - Test suite's global setup starts emulators and apps, runs tests, then tears down in global teardown. Single command execution.
- Q: How should the test suite ensure data isolation when multiple E2E test runs execute concurrently (e.g., parallel CI jobs, multiple developers)? → A: Unique collection prefixes per test run - Each test run uses prefixed collections (e.g., `test_${runId}_guests`, `test_${runId}_questions`). Fast, scalable, compatible with emulators.
- Q: How should the test suite handle corrupted or invalid Firebase Emulator data discovered during testing? → A: Auto-reset on test suite start - Global setup always clears all emulator data before starting tests. Clean slate every run. No recovery needed during execution.
- Q: How should the test suite verify that all 6 applications are ready to accept requests after launching them? → A: Health check with timeout - Poll each app's health endpoint until responsive or timeout (30s). Fast when apps start quickly, safe when they start slowly.
- Q: How should the test suite handle test failures that might be caused by transient timing or environmental issues (flaky tests)? → A: Automatic retry with limit - Failed tests automatically retry up to 2-3 times before reporting failure. Industry standard for E2E tests. Reduces flaky test noise.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-Event Setup and Quiz Configuration (Priority: P1)

As a system tester, I need to validate that the admin can set up quizzes and guest profiles before an event, so that the game can be properly configured and ready for participants to join.

**Why this priority**: This is the foundation of the entire game system. Without proper pre-event setup, no game can be conducted. This validates the critical admin workflow that must work before any live event.

**Independent Test**: Can be fully tested by simulating admin login, creating questions and guest profiles through the admin-app interface, and verifying the data is correctly stored in Firestore. Delivers immediate value by ensuring the setup phase works correctly.

**Acceptance Scenarios**:

1. **Given** the admin is logged into the admin-app, **When** they create a 4-choice question (Q1) and a sorting question (Q2), **Then** both questions are stored in Firestore with correct structure and attributes
2. **Given** the admin has created questions, **When** they create three guest profiles (Guest A, Guest B, Guest C) and assign the "speech_guest" attribute to Guest B, **Then** all guests are stored with correct attributes and unique join tokens are generated
3. **Given** Guest B has the "speech_guest" attribute, **When** the admin sets Q1's "Skip Attributes" to "speech_guest", **Then** the question configuration correctly excludes Guest B from participating in Q1
4. **Given** guests have been created, **When** the admin views the guest management page, **Then** unique join URLs are displayed for each guest for QR code generation

---

### User Story 2 - Game Flow and Multi-App Coordination (Priority: P1)

As a system tester, I need to validate that all 6 applications (admin-app, host-app, projector-app, 3 participant-apps, socket-server, api-server) work together seamlessly during a live game, so that the real-world game experience is reliable and synchronized.

**Why this priority**: This validates the core game mechanics and real-time synchronization that are essential for the live event. Without this working, the game cannot be conducted at all.

**Independent Test**: Can be fully tested by launching all apps in separate browser contexts, simulating a complete question lifecycle (start, answer, results), and verifying all apps receive and display correct state updates. Delivers the essential game flow functionality.

**Acceptance Scenarios**:

1. **Given** all apps are running, **When** the host starts Q1, **Then** the projector displays the question with timer and BGM, Guest A and C see answer buttons with vibration, and Guest B sees "This question is skipped"
2. **Given** Q1 is active, **When** Guest A selects the correct answer and Guest C selects an incorrect answer, **Then** both phones vibrate on lock-in, answers are submitted to api-server with correct isCorrect flags and responseTimeMs, and the host can proceed to answer check
3. **Given** answers are submitted, **When** the host advances through answer check, correct answer reveal, and results phases, **Then** the projector shows answer distribution, highlights correct answer, plays appropriate sound effects, and displays the worst performer (Guest C) to be dropped
4. **Given** results are showing Guest C as dropped, **When** the game state updates, **Then** Guest C's phone displays "You have been dropped" and their Firestore status is set to "dropped"

---

### User Story 3 - Period Finals and Champion Designation (Priority: P1)

As a system tester, I need to validate that the gong mechanism correctly converts a question to a period-final question and identifies the period champion, so that the climactic moment of each period works correctly.

**Why this priority**: The gong and period champion are key dramatic elements of the game show. This ensures the special final question mechanics work correctly and provide the intended experience.

**Independent Test**: Can be fully tested by starting a question, triggering the gong mid-question, having guests submit answers, and verifying the system switches from "Worst 10" elimination logic to "Top 10" champion logic. Delivers the special period-ending functionality.

**Acceptance Scenarios**:

1. **Given** Q2 is active and guests are answering, **When** the host taps the "Make Final Question (Gong)" button, **Then** the projector plays the gong sound effect and gameState.isGongActive is set to true
2. **Given** the gong has been triggered for Q2, **When** Guest A and Guest B submit their answers and the host advances to show results, **Then** the system calculates Top 10 (fastest correct) instead of Worst 10, displays the fastest guest as Period Champion, and does not eliminate any guests
3. **Given** Guest C was dropped in Q1, **When** Q2 (period-final) has concluded, **Then** Guest C remains dropped and cannot participate in Q2 as expected
4. **Given** a period-final question has concluded with a champion, **When** the gameState.isGongActive is checked, **Then** it is deactivated to prevent the next question from being treated as a final

---

### User Story 4 - Guest Lifecycle and Exception Handling (Priority: P2)

As a system tester, I need to validate that guest status changes (dropping, reviving, disconnecting, reconnecting) work correctly across all apps, so that the system handles real-world scenarios gracefully.

**Why this priority**: Real-world events will have disconnections and exceptional situations. This ensures the system remains functional and fair even when unexpected events occur.

**Independent Test**: Can be fully tested by simulating guest drops, using the revive-all feature, closing and reopening participant browsers, and verifying state synchronization. Delivers resilience and recovery functionality.

**Acceptance Scenarios**:

1. **Given** Guest C has been dropped, **When** the host taps the "Revive All" button, **Then** all dropped guests' statuses are set to "active", the projector plays the revive animation, and Guest C's phone updates from "dropped" to "Waiting for question..."
2. **Given** all active guests answer a question incorrectly, **When** the host advances to show results, **Then** no Worst 10 is displayed, the phase is set to "all_incorrect", gameState.prizeCarryover is incremented, and the projector plays the revive animation
3. **Given** Guest A is waiting for a question, **When** they close their browser tab, the host starts Q4, and Guest A reopens the browser and visits their join URL, **Then** Firebase Anonymous Auth logs them back in with the same uid, the app sees gameState.currentPhase is "accepting_answers", and Guest A's phone correctly shows the Q4 answer buttons mid-question
4. **Given** a new period begins with Q3, **When** the api-server processes the period start, **Then** all guests with status "dropped" are reset to "active" automatically as part of the period reset logic

---

### User Story 5 - Test Environment Setup and Automation (Priority: P2)

As a developer, I need an automated E2E test suite that runs in a local development environment with Firebase Emulators, so that I can validate system behavior without affecting production data and can run tests as part of CI/CD.

**Why this priority**: This enables repeatable, automated testing and supports continuous integration. Without this, all testing would be manual and error-prone.

**Independent Test**: Can be fully tested by running the Playwright test suite against local Firebase Emulators and local app instances, verifying all tests pass, and confirming no external dependencies or production data are accessed. Delivers automated testing infrastructure.

**Acceptance Scenarios**:

1. **Given** Firebase Emulators are running locally, **When** the E2E test suite starts, **Then** all tests connect to emulator endpoints (localhost:8080 for Firestore, localhost:9099 for Auth) and not to production Firebase
2. **Given** test scenarios require multiple browser contexts, **When** Playwright launches the tests, **Then** separate browser contexts are created for projector-app, host-app, and 3 participant-app instances, each maintaining independent session state
3. **Given** a test scenario requires admin setup, **When** the test runs, **Then** it can authenticate as admin, create test questions and guests, and clean up all test data after completion without affecting other tests
4. **Given** the E2E test suite completes, **When** results are generated, **Then** test reports show pass/fail status for each scenario, include screenshots of failure points, and provide detailed error logs for debugging

---

### Edge Cases

- What happens when a guest's browser crashes during answer submission? → The system should detect the missing answer and allow reconnection without blocking game progression
- What happens when network latency causes delayed answer submissions? → The system should use server-side timestamps to accurately record response times regardless of network delays
- What happens when the host accidentally triggers the gong on a question that was supposed to be non-final? → The host can tap an "Undo Gong" button before advancing to the results phase to revert the question back to normal Worst 10 elimination logic
- What happens when all guests are dropped before the end of a period? → The system should allow the host to revive all or end the period early
- What happens when Firebase Emulator data becomes corrupted during testing? → Test suite's global setup automatically clears all emulator data before each test run, ensuring clean state and preventing corruption from affecting tests
- What happens when multiple E2E test runs execute concurrently? → Each test run uses unique collection prefixes (e.g., `test_${runId}_guests`) to ensure complete data isolation without port conflicts or namespace complexity
- What happens when a question has no correct answer configured? → The system should validate question data during admin setup and prevent invalid questions from being used
- What happens when the socket-server disconnects during a live game? → Clients should attempt automatic reconnection and request current gameState when reconnected

## Requirements *(mandatory)*

### Functional Requirements

#### Test Infrastructure
- **FR-001**: System MUST provide an E2E test suite that runs against Firebase Emulators for Firestore and Authentication, not production Firebase services
- **FR-002**: System MUST support running all 6 applications (admin-app, host-app, projector-app, participant-app instances, socket-server, api-server) in a local development environment during E2E tests
- **FR-002a**: System MUST automatically start Firebase Emulators and all 6 application instances in global test setup (clearing all emulator data first), verify each app is ready via health check endpoints with 30-second timeout, and tear them down in global teardown, enabling single-command test execution without manual prerequisite steps and ensuring clean state for every test run
- **FR-003**: System MUST create separate browser contexts for each app instance (projector, host, 3 participants) to simulate independent user sessions
- **FR-004**: System MUST support automated test data setup (questions, guests, game state) before each test scenario and cleanup after completion
- **FR-005**: System MUST generate test reports with pass/fail status, screenshots of failures, and detailed error logs
- **FR-005a**: System MUST automatically retry failed tests up to 2-3 times before marking them as failed, reducing false failures from transient timing or environmental issues

#### Pre-Event Setup Testing (A-series tests)
- **FR-006**: System MUST validate that admin can authenticate via Google Auth and access admin-app functionality
- **FR-007**: System MUST validate that questions (4-choice and sorting types) can be created with correct structure and stored in Firestore
- **FR-008**: System MUST validate that guest profiles can be created with attributes (e.g., "speech_guest") and unique join tokens are generated
- **FR-009**: System MUST validate that question skip attributes can be configured to exclude specific guests from participating in designated questions
- **FR-010**: System MUST validate that guest join URLs are correctly displayed in admin-app for QR code generation

#### Game Flow Testing (B and C-series tests)
- **FR-011**: System MUST validate that all apps display correct initial states (projector shows "Waiting to Start", host shows control panel, participants show QR scan prompt)
- **FR-012**: System MUST validate that guests can authenticate via Firebase Anonymous Auth by visiting join URLs and are correctly linked to their guest profiles
- **FR-013**: System MUST validate that when a question starts, gameState updates to "accepting_answers", socket-server broadcasts START_QUESTION event, projector displays question with timer and BGM, and eligible guests see answer buttons
- **FR-014**: System MUST validate that guests with skip attributes see "This question is skipped" message and cannot submit answers
- **FR-015**: System MUST validate that answer submissions are recorded with correct isCorrect flags and responseTimeMs, and guest phones vibrate on lock-in
- **FR-016**: System MUST validate that progressing through answer check, correct answer reveal, and results phases updates all apps with correct visual states and sound effects
- **FR-017**: System MUST validate that the "Worst 10" logic correctly identifies the slowest incorrect answer participant(s) for elimination on non-final questions
- **FR-018**: System MUST validate that dropped guests have their Firestore status set to "dropped" and their participant-app displays "You have been dropped"

#### Period Finals and Gong Testing (D-series tests)
- **FR-019**: System MUST validate that dropped guests cannot participate in subsequent questions and their apps remain on the "dropped" screen
- **FR-020**: System MUST validate that triggering the gong sets gameState.isGongActive to true and plays the gong sound effect on projector-app
- **FR-021**: System MUST validate that period-final questions (isGongActive=true) calculate "Top 10" (fastest correct) instead of "Worst 10" and do not eliminate guests
- **FR-022**: System MUST validate that the fastest correct answer participant is designated as Period Champion in gameState.results
- **FR-023**: System MUST validate that starting a new period resets all dropped guests to "active" status automatically
- **FR-024**: System MUST validate that the host can undo a gong trigger before advancing to results phase, reverting the question back to normal Worst 10 elimination logic

#### Exception Handling Testing (E-series tests)
- **FR-025**: System MUST validate that the "Revive All" action sets all dropped guests to "active" and updates their apps to show "Waiting for question..."
- **FR-026**: System MUST validate that when all guests answer incorrectly, the phase is set to "all_incorrect", no Worst 10 is displayed, gameState.prizeCarryover is incremented, and the revive animation plays
- **FR-027**: System MUST validate that guests can reconnect after disconnection, authenticate with the same uid, and rejoin an active question mid-flight
- **FR-028**: System MUST validate that gameState listeners on participant-app correctly update the UI when the game state changes while the guest is disconnected

#### Test Automation
- **FR-029**: System MUST provide test fixtures for common game scenarios (question types, guest configurations, game states)
- **FR-030**: System MUST support parallel test execution by using unique collection prefixes per test run (e.g., `test_${runId}_`) to ensure complete data isolation without collision between concurrent test runs
- **FR-031**: System MUST validate test data integrity by asserting Firestore document structure matches expected schemas after each operation

### Key Entities

- **E2E Test Suite**: Collection of automated test scenarios covering all game phases, organized by test ID (A-1, B-1, C-1, etc.), includes setup, execution, assertions, and cleanup logic
- **Test Browser Context**: Isolated browser session representing one app instance (projector, host, or participant), maintains independent authentication state, local storage, and session cookies
- **Test Fixture**: Predefined test data (questions, guests, game states) used to initialize tests to known states, includes cleanup methods to reset emulator data between tests
- **Firebase Emulator Instance**: Local mock of Firebase services (Firestore on localhost:8080, Auth on localhost:9099) used for E2E testing, isolated from production data
- **Test Report**: Output of E2E test execution showing pass/fail status per scenario, includes screenshots of UI state at failure points, console logs, and network traffic for debugging

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 major test categories (Pre-Event Setup, Game Flow, Period Finals, Guest Lifecycle, Test Automation) have automated test coverage and execute successfully in under 10 minutes total
- **SC-002**: E2E tests can run in a clean local environment (Firebase Emulators + locally-run apps) without requiring production Firebase credentials or external dependencies
- **SC-003**: Test failure rate for flaky tests (tests that fail intermittently due to timing issues) is below 5% after automatic retry logic (2-3 retries per test), ensuring reliable CI/CD integration
- **SC-004**: When a test fails, the generated report includes screenshots, console logs, and network requests that allow developers to reproduce and debug the issue within 15 minutes
- **SC-005**: E2E tests validate that 100% of critical game flows (question lifecycle, guest joining, dropping, reviving, gong trigger, champion designation) work correctly across all 6 applications
- **SC-006**: Developers can add new E2E test scenarios by following documented patterns and conventions, with new test creation taking under 30 minutes per scenario
- **SC-007**: E2E tests can be executed as part of CI/CD pipeline on pull requests, providing automated validation before merging code changes
- **SC-008**: Test data cleanup succeeds 100% of the time, ensuring each test starts with a clean slate and no test pollution occurs

## Assumptions

1. **Firebase Emulators Availability**: Firebase Emulators for Firestore and Authentication are already set up and documented for local development use
2. **App Launch and Readiness**: All 6 applications have npm/pnpm scripts to launch them in local development mode and expose health check endpoints that return HTTP 200 when ready to accept requests
3. **Test Environment Isolation**: E2E tests run in a dedicated environment (e.g., FIREBASE_PROJECT_ID="test" or emulator namespace) to avoid affecting development or production data
4. **Browser Compatibility**: Playwright tests will target Chromium browser by default, with optional support for Firefox and WebKit if cross-browser testing is required
5. **Authentication Mocking**: Firebase Anonymous Auth works with emulators without requiring special configuration, and Google Auth can be mocked or bypassed for admin login in tests
6. **Network Reliability**: Tests assume local network (localhost) is reliable and low-latency, with no special retry logic needed for local connections
7. **Service Orchestration**: Test suite's global setup/teardown automatically starts and stops Firebase Emulators and all 6 application instances (including socket-server), requiring no manual prerequisite steps from developers
8. **Test Execution Environment**: Tests run on a developer's local machine or CI/CD environment with sufficient resources (CPU, memory) to run 6 app instances simultaneously
9. **QR Code Bypass**: E2E tests will bypass QR code scanning by directly navigating to join URLs, as camera access is not available in headless browser contexts
10. **Timing and Synchronization**: Tests use Playwright's built-in wait mechanisms (waitForSelector, waitForLoadState) to handle asynchronous state changes, with reasonable timeouts (5-30 seconds) for real-time events

## Dependencies

- **Firebase Emulators**: Requires Firestore and Authentication emulators to be installed and runnable (firebase emulators:start)
- **Playwright Test Framework**: Requires Playwright to be installed and configured for TypeScript, including browser drivers for Chromium
- **Application Deployment**: Requires all 6 apps (admin-app, host-app, projector-app, participant-app, socket-server, api-server) to have documented local launch commands
- **Test Data Seeding**: Requires ability to programmatically seed Firestore emulator with test questions, guests, and game states via Firebase Admin SDK
- **Authentication Bypass**: Requires mechanism to authenticate as admin (Google) and guests (Anonymous) in test environment without interactive login flows
- **CI/CD Integration**: Requires CI/CD pipeline (e.g., GitHub Actions) to support running Firebase Emulators and launching apps during automated test execution
