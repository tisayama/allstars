# Feature Specification: System-Wide E2E Testing Infrastructure

**Feature Branch**: `001-system-e2e-tests`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "システムの複雑性をうまくテストしきれておらず、バグが残っているようです。E2Eテストで以下のような観点を確認するようにします。admin-appからのデータ追加(Questions, Guests, Setting)、participant-appでの参加と回答確認、projector-appでの回答確認と正解確認と進行の表示確認、host-appでのコントロール(通常問題、最終問題、その他遷移、全員復活)。Firebase Emulator Suiteを利用します。pnpm run e2eでFirebase Emulator Suiteの起動を含め、全てのE2Eテストを実施できるようにします。各appはホスト名work-ubuntuでやりとりするようにして、localhostを利用しないでください。"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Game Administrator Setup Flow (Priority: P1)

As a game administrator, I need to configure the entire game session (questions, guests, settings) before the game begins, so that all participants and displays have the correct data to operate.

**Why this priority**: This is the foundation of the entire system. Without properly configured game data, no other functionality can be tested or validated. This represents the critical path for all subsequent user journeys.

**Independent Test**: Can be fully tested by creating a complete game setup (adding 10 questions, 50 guests, configuring settings) and verifying all data is persisted and retrievable. Delivers a configured game ready to start.

**Acceptance Scenarios**:

1. **Given** the admin-app is accessible via work-ubuntu hostname, **When** administrator adds a new question with text, correct answer, and time limit, **Then** the question appears in the questions list with all entered details
2. **Given** a question exists in the system, **When** administrator edits the question text or answer, **Then** the updated question reflects the changes immediately
3. **Given** the admin-app guests section is open, **When** administrator imports a CSV file with 50 guest names, **Then** all 50 guests appear in the guests list
4. **Given** the admin-app guests section is open, **When** administrator manually adds a guest with name and optional details, **Then** the new guest appears in the guests list
5. **Given** the admin-app settings section is open, **When** administrator configures game settings (default ranking rule, dropout rule), **Then** the settings are saved and displayed correctly
6. **Given** questions and guests have been added, **When** administrator navigates away and returns, **Then** all previously entered data persists

---

### User Story 2 - Participant Joining and Answering Flow (Priority: P1)

As a game participant, I need to join the game session and submit answers to questions, so that I can compete with other participants.

**Why this priority**: This is the primary user experience for the majority of users (participants). Without functional participant flows, the game cannot be played. This is equally critical as admin setup.

**Independent Test**: Can be fully tested by having multiple simulated participants join a session, submit answers with varying correctness and speed, and verify all submissions are recorded. Delivers a functioning participant experience.

**Acceptance Scenarios**:

1. **Given** the participant-app is accessible via work-ubuntu hostname, **When** a participant enters their name and joins, **Then** they see a waiting screen indicating successful registration
2. **Given** a participant has joined the game, **When** the host starts a question, **Then** the participant sees the question text and can select an answer
3. **Given** a participant is viewing a question, **When** they select an answer and submit within the time limit, **Then** they see a confirmation that their answer was submitted
4. **Given** a participant is viewing a question, **When** the time limit expires before they submit, **Then** they see a message indicating time is up
5. **Given** a participant submits a correct answer, **When** the correct answer is revealed, **Then** they see positive feedback indicating they answered correctly
6. **Given** a participant submits an incorrect answer, **When** the correct answer is revealed, **Then** they see feedback showing the correct answer and that they were incorrect
7. **Given** 10 participants join simultaneously, **When** all participants submit answers, **Then** all submissions are recorded without data loss

---

### User Story 3 - Projector Display Flow (Priority: P1)

As a game host or audience member, I need to see the game progress displayed on the projector (question display, answer reveals, rankings), so that everyone can follow along with the game state.

**Why this priority**: The projector is the shared visual focal point for all participants and the audience. Without functioning projector displays, the game lacks transparency and engagement. This is critical for the game show experience.

**Independent Test**: Can be fully tested by triggering all game phases (question display, correct answer reveal, rankings display) and verifying each phase renders correctly with accurate data. Delivers a complete visual game experience.

**Acceptance Scenarios**:

1. **Given** the projector-app is accessible via work-ubuntu hostname, **When** the host starts a question, **Then** the projector displays the question text and remaining time
2. **Given** a question is active on the projector, **When** participants submit answers, **Then** the projector shows a count or visualization of submitted answers (without revealing answers)
3. **Given** a question time has expired, **When** the host reveals the correct answer, **Then** the projector displays the correct answer prominently
4. **Given** the correct answer is shown, **When** the host transitions to rankings, **Then** the projector displays rankings with participant names, scores, and response times
5. **Given** rankings are displayed, **When** the system identifies the fastest correct answer, **Then** that participant is highlighted visually
6. **Given** rankings are displayed, **When** the system identifies the slowest correct answer or incorrect answers, **Then** those participants are shown in the "worst 10" section
7. **Given** a period ends (first-half or second-half), **When** rankings are displayed, **Then** period champions are highlighted with special badges

---

### User Story 4 - Host Control Flow (Priority: P2)

As a game host, I need to control the game progression (start questions, reveal answers, trigger special events), so that I can manage the game flow and keep participants engaged.

**Why this priority**: While critical for game operation, this is dependent on the three P1 stories (admin setup, participant interaction, projector display). The host controls are the orchestration layer that ties everything together.

**Independent Test**: Can be fully tested by simulating a complete game flow with host triggering each phase (start question, reveal answer, show rankings, handle special events) and verifying state transitions. Delivers a complete game control experience.

**Acceptance Scenarios**:

1. **Given** the host-app is accessible via work-ubuntu hostname and game data is configured, **When** the host clicks "Start Question", **Then** the selected question becomes active for all participants and the projector
2. **Given** a question is active, **When** the host clicks "Reveal Correct Answer", **Then** the correct answer is shown to all participants and the projector
3. **Given** the correct answer is revealed, **When** the host clicks "Show Rankings", **Then** rankings are displayed on the projector based on answer correctness and speed
4. **Given** the host is on a normal question, **When** the host marks the next question as the "final question", **Then** the system activates special final question rules (e.g., gong activation)
5. **Given** rankings show participants have been eliminated, **When** the host clicks "Revive All", **Then** all eliminated participants are restored to active status
6. **Given** the host is viewing game state, **When** the host transitions to the next phase, **Then** all connected apps (participant, projector) update to reflect the new phase
7. **Given** multiple hosts try to control the game simultaneously, **When** one host issues a command, **Then** the command is executed and other hosts see the updated state

---

### User Story 5 - Test Infrastructure and Automation (Priority: P2)

As a developer, I need a single command to run all E2E tests including emulator setup and teardown, so that I can validate system functionality quickly and reliably.

**Why this priority**: This is infrastructure that enables all other testing but doesn't deliver user-facing value directly. It's critical for development velocity but secondary to actual game functionality.

**Independent Test**: Can be fully tested by running `pnpm run e2e` on a clean machine and verifying all tests pass without manual setup. Delivers a complete automated testing pipeline.

**Acceptance Scenarios**:

1. **Given** a developer has the project cloned, **When** they run `pnpm run e2e`, **Then** Firebase Emulator Suite starts automatically
2. **Given** Firebase Emulator Suite is starting, **When** emulators are ready, **Then** all four apps (admin, participant, projector, host) start on work-ubuntu hostname
3. **Given** all apps are running, **When** E2E tests execute, **Then** tests interact with apps using work-ubuntu hostname (not localhost)
4. **Given** E2E tests are running, **When** tests complete (pass or fail), **Then** all emulators and apps shut down automatically
5. **Given** E2E tests have completed, **When** viewing test results, **Then** clear pass/fail status and error details are shown
6. **Given** a test fails, **When** reviewing failure details, **Then** screenshots and logs from the failure moment are available

---

### Edge Cases

- What happens when a participant loses network connection during answer submission?
- How does the system handle 100+ participants joining simultaneously?
- What happens when the host tries to reveal an answer before the question timer expires?
- How does the system behave when Firebase Emulator Suite crashes mid-test?
- What happens when two participants submit answers at the exact same millisecond?
- How does the projector handle displaying rankings when all participants answered incorrectly?
- What happens when the admin deletes a question that is currently active in the game?
- How does the system handle clock synchronization differences between participant and server?
- What happens when the host-app loses connection during a critical phase transition?
- How does the system handle special characters or emoji in participant names or question text?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow administrators to create, read, update, and delete questions via admin-app
- **FR-002**: System MUST allow administrators to add guests individually or via batch CSV import
- **FR-003**: System MUST allow administrators to configure game settings (ranking rules, dropout rules) that apply to all game sessions
- **FR-004**: System MUST allow participants to join a game session by entering their name via participant-app
- **FR-005**: System MUST present active questions to all joined participants simultaneously
- **FR-006**: System MUST record participant answers with timestamps accurate to the millisecond
- **FR-007**: System MUST validate answer correctness against the stored correct answer
- **FR-008**: System MUST calculate rankings based on answer correctness and response time
- **FR-009**: System MUST display question text, timer, and participant count on projector-app
- **FR-010**: System MUST display correct answer on projector when host triggers reveal
- **FR-011**: System MUST display rankings on projector showing top 10 and worst 10 participants
- **FR-012**: System MUST highlight fastest correct answer and slowest correct answer in rankings
- **FR-013**: System MUST allow host to control game phases (start question, reveal answer, show rankings) via host-app
- **FR-014**: System MUST support special "final question" mode with gong activation
- **FR-015**: System MUST allow host to revive all eliminated participants
- **FR-016**: System MUST sync game state changes to all connected apps in real-time
- **FR-017**: System MUST run all applications using work-ubuntu hostname (not localhost)
- **FR-018**: System MUST provide single command `pnpm run e2e` to execute all E2E tests
- **FR-019**: System MUST automatically start and stop Firebase Emulator Suite for E2E tests
- **FR-020**: System MUST reset Firestore to clean state before each E2E test run to ensure test isolation and reproducibility
- **FR-021**: System MUST persist all game data (questions, guests, settings, answers) in Firebase Firestore
- **FR-024**: System MUST continue executing all E2E tests even after individual test failures to provide complete visibility into system state
- **FR-022**: System MUST handle concurrent answer submissions from multiple participants without data loss
- **FR-023**: System MUST display period champions (first-half, second-half) with special badges in rankings

### Key Entities

- **Question**: Represents a quiz question with text, correct answer, time limit, and optional metadata. Questions can be marked as "final question" to activate special rules.
- **Guest**: Represents a registered participant with name and optional details. Guests can be in active or eliminated status.
- **GameState**: Represents the current state of the game including active phase, current question, participant count, timer status, and results. Updates to GameState trigger real-time sync to all connected apps.
- **Answer**: Represents a participant's submitted answer linked to a specific question and participant, with timestamp and correctness validation. Used for ranking calculation.
- **GameSettings**: Represents configuration for ranking rules (time-based or accuracy-based) and dropout rules (worst-one, worst-two, etc.)
- **RankingResult**: Represents calculated rankings for a question including participant position, score, response time, and champion status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can execute complete E2E test suite with single `pnpm run e2e` command without manual setup steps
- **SC-002**: E2E tests validate end-to-end workflows across all four apps (admin, participant, projector, host) in under 5 minutes running sequentially
- **SC-003**: System handles 50 concurrent participant answer submissions without data loss or timeout
- **SC-004**: Game state changes propagate to all connected apps within 500 milliseconds
- **SC-005**: 100% of game phase transitions (question start, answer reveal, ranking display) are covered by automated E2E tests
- **SC-006**: All network communication between apps uses work-ubuntu hostname with zero localhost references
- **SC-007**: E2E test failures provide actionable error messages with screenshots and logs

### Test Coverage Goals

- **SC-008**: Admin app data operations (CRUD for questions, guests, settings) are validated by automated tests
- **SC-009**: Participant app flows (join, answer submission, feedback display) are validated by automated tests
- **SC-010**: Projector app display states (question display, answer reveal, rankings) are validated by automated tests
- **SC-011**: Host app control operations (phase transitions, special events) are validated by automated tests
- **SC-012**: Edge cases (connection loss, simultaneous submissions, timer expiry) are validated by automated tests

## Assumptions

- **A-001**: Firebase Emulator Suite is already installed and available in the development environment
- **A-002**: The work-ubuntu hostname resolves correctly on the test machine (via /etc/hosts or DNS)
- **A-003**: All four apps (admin, participant, projector, host) have existing build scripts and can be started programmatically
- **A-004**: The system uses Firebase Firestore for data persistence (existing architecture)
- **A-005**: Real-time synchronization between apps is already implemented (needs E2E validation, not implementation)
- **A-006**: Standard browser automation tools (Playwright or similar) are acceptable for E2E testing
- **A-007**: Test execution will run on a single machine with all apps and emulators local
- **A-008**: Network latency between apps on the same machine via work-ubuntu hostname is negligible (<10ms)

## Clarifications

### Session 2025-11-08

- Q: How should E2E tests handle Firestore data between test runs? → A: Each test run starts with completely clean Firestore state (recommended for test reliability)
- Q: Should E2E test scenarios run sequentially or in parallel? → A: Tests run sequentially in predictable order (simpler, easier to debug)
- Q: When a test fails mid-suite, should remaining tests continue or abort immediately? → A: Continue running all tests even after failures (complete visibility)
