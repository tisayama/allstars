# Feature Specification: Host Control App

**Feature Branch**: `006-host-app`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Host-app is the master control panel for the live quiz event, designed for tablet use by newly-weds to control the pace of the show through a simple presenter view interface."

## Clarifications

### Session 2025-11-03

- Q: When a host taps a button but the network is disconnected or API call fails, should the app automatically retry or require manual retry? → A: Show immediate error message and require manual retry (fail-fast approach)
- Q: How long should the app wait for a POST /host/game/advance API response before displaying a timeout error? → A: 10 seconds
- Q: Should the system allow multiple hosts to be logged in simultaneously, and if so, how should it handle concurrent sessions? → A: Allow concurrent sessions with synchronized screen state across all logged-in hosts (no warning)
- Q: Should the system implement logging/monitoring for errors, user actions, and system events? → A: Log errors and critical events only (authentication, API failures, state transitions) to a monitoring service
- Q: When a host taps an action button and the system is waiting for response, what should the loading state display? → A: Show a loading spinner with the action name (e.g., "Starting Question...", "Closing Answers...")

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and Progress Through Questions (Priority: P1)

As a wedding host, I need to advance through quiz questions at my own pace, so I can control the flow of the event and respond to the audience's energy.

**Why this priority**: This is the core functionality - without the ability to start and progress questions, the host-app serves no purpose. This represents the minimum viable product.

**Independent Test**: Can be fully tested by logging in, viewing the current game state, and tapping the main "Next" button to advance through all phases of a single question cycle, delivering immediate value by controlling game progression.

**Acceptance Scenarios**:

1. **Given** the game is in "ready_for_next" phase, **When** the host taps "Start Question Q1", **Then** the system sends a START_QUESTION action to the api-server and waits for the game state to update to "accepting_answers"
2. **Given** the game is in "accepting_answers" phase, **When** the host taps "Close Answers (→ Check)", **Then** the system sends a SHOW_DISTRIBUTION action and waits for the phase to change to "showing_distribution"
3. **Given** the game is in "showing_distribution" phase, **When** the host taps "Show Correct Answer", **Then** the system sends a SHOW_CORRECT_ANSWER action and waits for the phase to change to "showing_correct_answer"
4. **Given** the game is in "showing_correct_answer" phase, **When** the host taps "Show Results/Rankings", **Then** the system sends a SHOW_RESULTS action and waits for the phase to change to "showing_results"
5. **Given** the game is in "showing_results" phase, **When** the host taps "Next (→ Ready)", **Then** the system sends a ready_for_next action and the cycle repeats

---

### User Story 2 - Trigger Special Game Events (Priority: P2)

As a wedding host, I need to activate special game mechanics (like the final question gong) during gameplay, so I can create dramatic moments and control the game's climax.

**Why this priority**: While not required for basic game operation, special events like the gong significantly enhance the entertainment value and are key to the quiz format's excitement. This can be added after basic progression works.

**Independent Test**: Can be tested by reaching the "accepting_answers" phase, tapping the "TRIGGER GONG" button, and verifying the game state reflects the gong is active without disrupting ongoing answer collection.

**Acceptance Scenarios**:

1. **Given** the game is in "accepting_answers" phase, **When** the host taps "TRIGGER GONG", **Then** the system sends a TRIGGER_GONG action and the game state updates to show isGongActive=true while remaining in "accepting_answers" phase
2. **Given** the gong has been triggered, **When** the host continues to "Close Answers", **Then** the system proceeds normally through the remaining phases with the gong flag persisted
3. **Given** any game phase, **When** the host taps "REVIVE ALL", **Then** the system sends a REVIVE_ALL action to restore all eliminated participants

---

### User Story 3 - Monitor Real-Time Game State (Priority: P1)

As a wedding host, I need to see the current game status update in real-time, so I always know what's happening and can make informed decisions about when to advance.

**Why this priority**: This is critical infrastructure for P1 - the host can't effectively control the game without seeing the current state. However, it's listed separately because it's primarily a passive listening feature versus active control.

**Independent Test**: Can be tested by opening the app, verifying it displays the current game phase, then having the api-server update the game state externally and confirming the UI reflects the change immediately.

**Acceptance Scenarios**:

1. **Given** the host-app is loaded, **When** the app initializes, **Then** it establishes a Firestore listener on the gameState/live document and displays the current phase
2. **Given** the Firestore listener is active, **When** the game state changes in the database, **Then** the UI updates automatically within 1 second to reflect the new phase
3. **Given** a phase transition occurs, **When** the UI updates, **Then** the main "Next" button label changes to match the new phase's appropriate action
4. **Given** the app loses connection, **When** connectivity is restored, **Then** the listener re-establishes and syncs to the current game state

---

### User Story 4 - Secure Host Authentication (Priority: P1)

As a system administrator, I need to ensure only authorized wedding hosts can control the game, so unauthorized guests cannot disrupt the event.

**Why this priority**: Security is non-negotiable - without authentication, any guest could control the game from their phone. This must be implemented from day one.

**Independent Test**: Can be tested by attempting to access the host-app without authentication (should fail), logging in with valid Google credentials (should succeed), and verifying all API calls include the proper authentication token.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they access the host-app URL, **Then** they see a login screen requiring Google authentication
2. **Given** a user with valid Google credentials, **When** they complete the Google sign-in flow, **Then** they gain access to the host control interface
3. **Given** an authenticated user, **When** the app sends any command to /host/* endpoints, **Then** it includes the Firebase ID token in the Authorization: Bearer header
4. **Given** an authenticated user's session expires, **When** they attempt an action, **Then** they are prompted to re-authenticate
5. **Given** an unauthenticated request to /host/* endpoints, **When** it reaches the api-server, **Then** it is rejected with a 401 Unauthorized response

---

### Edge Cases

- What happens when the host taps "Next" rapidly multiple times before the game state updates? (Should be rate-limited or disabled until state confirms)
- What happens when network disconnection occurs during a critical transition (e.g., starting a question)? The system displays an immediate error message and requires manual retry (no automatic retry)
- What happens if two hosts log in simultaneously on different devices? The system allows concurrent sessions with all hosts seeing synchronized screen state via the shared Firestore listener; no warning is displayed
- How does the system behave if the api-server fails to process an action? (Should show error message and allow retry without losing state)
- What happens when the host tries to advance from an invalid phase (e.g., data corruption)? (Should display current phase clearly and only allow valid transitions)
- How does the app handle if it receives a game state with an unknown phase value? (Should display error and prevent destructive actions)
- What happens if the Firestore listener fails to establish on initial load? (Should show connection error and provide manual retry)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization
- **FR-001**: System MUST require Google Login via Firebase Authentication before granting access to any host controls
- **FR-002**: System MUST include the Firebase ID token in the Authorization: Bearer header for all API requests to /host/* endpoints
- **FR-003**: System MUST prevent access to host controls for unauthenticated users
- **FR-004**: System MUST handle session expiration by prompting re-authentication without losing the current game state view

#### Real-Time State Management
- **FR-005**: System MUST establish a Firestore real-time listener on the gameState/live document upon successful authentication
- **FR-006**: System MUST update the UI automatically when the gameState/live document changes
- **FR-007**: System MUST reflect the current game phase in the UI within 1 second of any Firestore update
- **FR-008**: System MUST maintain the Firestore listener connection throughout the session
- **FR-009**: System MUST re-establish the listener automatically if the connection is lost
- **FR-010a**: System MUST allow multiple hosts to log in and control the game concurrently, with all sessions synchronized via the shared Firestore listener

#### Core Game Progression
- **FR-010**: System MUST display a context-aware "Next" button whose label changes based on currentPhase:
  - "Start Question [Q_Name]" when phase is "ready_for_next"
  - "Close Answers (→ Check)" when phase is "accepting_answers"
  - "Show Correct Answer" when phase is "showing_distribution"
  - "Show Results/Rankings" when phase is "showing_correct_answer"
  - "Next (→ Ready)" when phase is "showing_results"
  - "Next Question" when phase is "all_revived" or "all_incorrect"

- **FR-011**: System MUST send POST /host/game/advance requests with the appropriate action payload when the "Next" button is tapped:
  - Action: "START_QUESTION" with payload {questionId} from ready_for_next
  - Action: "SHOW_DISTRIBUTION" from accepting_answers
  - Action: "SHOW_CORRECT_ANSWER" from showing_distribution
  - Action: "SHOW_RESULTS" from showing_correct_answer
  - Action: "ready_for_next" from showing_results, all_revived, or all_incorrect

- **FR-012**: System MUST NOT immediately update its own UI state when a button is tapped; it MUST wait for the Firestore listener to receive the updated game state from the api-server

#### Special Actions
- **FR-013**: System MUST display a "TRIGGER GONG" button that is visible during the "accepting_answers" phase
- **FR-014**: System MUST send POST /host/game/advance with action "TRIGGER_GONG" when the gong button is tapped
- **FR-015**: System MUST display a "REVIVE ALL" button that is always visible in a corner of the screen (emergency action)
- **FR-016**: System MUST send POST /host/game/advance with action "REVIVE_ALL" when the revive button is tapped

#### User Interface
- **FR-017**: System MUST display the current game phase prominently on the screen
- **FR-018**: System MUST display the current question information when a question is active
- **FR-019**: System MUST use large, tablet-friendly touch targets for all interactive elements (minimum 44x44 points)
- **FR-020**: System MUST provide visual feedback when a button is tapped by displaying a loading spinner with the action name (e.g., "Starting Question...", "Closing Answers...") and disabling the button until the state update is received
- **FR-021**: System MUST display error messages clearly when an action fails
- **FR-022**: System MUST prevent button spam by disabling the "Next" button after tap until the next state update is received

#### Error Handling
- **FR-023**: System MUST display a user-friendly error message if the Firestore listener fails to connect
- **FR-024**: System MUST provide a manual reconnect option if the real-time connection is lost
- **FR-025**: System MUST display the HTTP error message from the api-server if a POST /host/game/advance request fails
- **FR-026**: System MUST allow the host to retry a failed action without refreshing the page
- **FR-027**: System MUST NOT automatically retry failed API requests; it MUST immediately display an error and require manual retry (fail-fast approach)

#### Observability & Logging
- **FR-028**: System MUST log authentication events (login success, login failure, session expiration) to a monitoring service
- **FR-029**: System MUST log API request failures (network errors, timeouts, HTTP errors) with error details to a monitoring service
- **FR-030**: System MUST log critical game state transitions (phase changes, action triggers) to a monitoring service
- **FR-031**: System MUST log Firestore listener connection failures and reconnection events to a monitoring service

### Non-Functional Requirements

- **NFR-001**: The UI MUST be optimized for tablet viewport sizes (768px - 1024px width)
- **NFR-002**: The UI MUST support both portrait and landscape orientations
- **NFR-003**: The app MUST respond to user interactions within 200ms (excluding network latency)
- **NFR-004**: The app MUST work reliably on iPad Safari and Chrome browsers
- **NFR-005**: Button tap targets MUST be at least 44x44 points to accommodate touch input
- **NFR-006**: The app MUST maintain connection to Firestore even during temporary network interruptions (Firebase SDK handles automatic reconnection)
- **NFR-007**: The app MUST NOT play any audio; sound effects are the responsibility of the projector-app
- **NFR-008**: API requests to POST /host/game/advance MUST timeout after 10 seconds and display an error message

### Key Entities *(data displayed/consumed)*

- **GameState**: The central state document (gameState/live in Firestore) containing:
  - `currentPhase`: The current phase of the game (ready_for_next, accepting_answers, showing_distribution, showing_correct_answer, showing_results, all_revived, all_incorrect)
  - `currentQuestion`: Object containing question details (questionId, questionText, choices, etc.)
  - `isGongActive`: Boolean flag indicating if the final question gong has been triggered
  - Additional state data used for display purposes (e.g., participant counts, time remaining)

- **Host User**: The authenticated Google user controlling the game:
  - Google account email
  - Firebase ID token (used for API authentication)
  - Display name (for UI personalization)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Hosts can advance through a complete question cycle (ready → answering → distribution → correct → results → ready) in under 10 seconds of button taps (excluding deliberate wait times)
- **SC-002**: The UI updates to reflect game state changes within 1 second of the Firestore document updating
- **SC-003**: 100% of authentication attempts with valid Google credentials succeed in granting access to host controls
- **SC-004**: 100% of API requests to /host/* endpoints include valid Firebase ID tokens in the Authorization header
- **SC-005**: Hosts can successfully trigger the gong and revive all participants without disrupting the game flow (0% failure rate)
- **SC-006**: The app reconnects automatically after network interruption within 5 seconds of connectivity restoration
- **SC-007**: Button tap targets are at least 44x44 points, resulting in 0% accidental mis-taps during usability testing
- **SC-008**: The app functions correctly on 100% of tested tablet browsers (Safari iOS, Chrome Android)
- **SC-009**: Hosts receive clear error feedback for 100% of failed actions, allowing them to retry or understand the issue
- **SC-010**: The "Next" button label correctly reflects the current phase in 100% of state transitions
- **SC-011**: When multiple hosts are logged in concurrently, all host screens display synchronized state within 1 second of any game state change
- **SC-012**: Loading states display within 200ms of button tap and clearly communicate the action in progress to the host

## Assumptions

1. **Firebase Configuration**: The Firebase project is already configured with Google Authentication enabled and the api-server has the necessary /host/* endpoints implemented
2. **Network Reliability**: The venue will have stable Wi-Fi connectivity; the app assumes network is available but handles temporary disconnections gracefully
3. **Single Active Game**: There is only one active game instance (gameState/live document) at any time; the app does not need to select between multiple games. However, multiple hosts can connect concurrently to control the same game
4. **Authorized Users**: The list of authorized host Google accounts is managed outside this app (e.g., Firebase Auth rules or api-server validation)
5. **Tablet Platform**: The primary deployment target is modern tablets (iPads with iOS 14+, Android tablets with Chrome 90+); desktop and phone views are not optimized
6. **Local Development**: Developers have access to Firebase emulator suite and can register test Google accounts in the Auth emulator
7. **API Contract**: The api-server's POST /host/game/advance endpoint accepts JSON payloads with {action: string, payload?: object} and returns success/error responses
8. **Firestore Security**: Firestore security rules allow authenticated hosts to read gameState/live but not write directly (all writes go through api-server)
9. **No Offline Mode**: The app requires active network connection to function; offline support is not required
10. **Question Data Pre-loaded**: Question details (IDs, text, choices) are already loaded in the api-server; the host-app only needs to reference questionId

## Dependencies

- **Firebase Authentication**: Requires Firebase project with Google sign-in method enabled
- **Firebase Firestore**: Requires read access to the `gameState/live` document via Firestore SDK
- **API Server**: Requires the api-server to implement POST /host/game/advance endpoint with all required action handlers (START_QUESTION, SHOW_DISTRIBUTION, SHOW_CORRECT_ANSWER, SHOW_RESULTS, TRIGGER_GONG, REVIVE_ALL, ready_for_next)
- **Game State Management**: Depends on the api-server properly updating the gameState/live Firestore document after processing each action
- **Network Connectivity**: Requires stable Wi-Fi or cellular connection to maintain Firestore listener and send API requests
- **Browser Compatibility**: Requires modern browser with ES6+ support, Firebase SDK compatibility, and touch event handling
- **Monitoring Service**: Requires access to a logging/monitoring service for capturing errors and critical events (e.g., Firebase Crashlytics, Sentry, or similar)
