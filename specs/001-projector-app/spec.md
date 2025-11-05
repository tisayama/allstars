# Feature Specification: Projector App (Broadcast Display Client)

**Feature Branch**: `001-projector-app`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "projector-app is the main presentation screen (broadcast client) for the wedding quiz game event. It displays game state changes reactively based on three data sources: (1) Firestore gameState/live document for primary state, (2) WebSocket connection to socket-server for synchronized events, and (3) dynamic Firestore listeners for real-time answer counts during questions. The app plays all event audio including BGM loops and sound effect one-shots. It handles game phases: ready_for_next (idle screen), accepting_answers (question start with countdown), showing_distribution (answer count visualization), showing_correct_answer (reveal), showing_results (top 10 and worst 10 rankings), all_revived (revival ceremony), and all_incorrect (prize carryover). Audio engine pre-loads all assets and supports layering/crossfading. Development uses Firebase emulators (Firestore :8080, socket-server :3001). No authentication required - read-only broadcast display."

## Clarifications

### Session 2025-11-04

- Q: Which frontend framework should the projector-app use? → A: React with TypeScript
- Q: Where should audio assets (BGM and sound effects) be stored and how should they be accessed? → A: Firebase Storage with public URLs
- Q: How should the projector-app determine the socket-server production URL? → A: Environment variable with default fallback
- Q: What format should the answer distribution visualization use during the showing_distribution phase? → A: Simple count list (A: 15, B: 8, C: 22, D: 5) - Text-only
- Q: Which build tool should the projector-app use for development and production builds? → A: Vite

## User Scenarios & Testing

### User Story 1 - Display Game State Transitions (Priority: P1)

As an event host, I need the projector screen to automatically display the current game phase so that all participants and audience members can follow along with the game flow in real-time.

**Why this priority**: This is the core functionality of the projector app. Without reactive state display, the app cannot fulfill its primary purpose as a broadcast client. This is the foundation upon which all other features depend.

**Independent Test**: Can be fully tested by manually updating the `gameState/live` Firestore document through Firebase console (or emulator UI) and observing that the projector screen immediately reflects each phase transition (ready_for_next → accepting_answers → showing_distribution → showing_correct_answer → showing_results → ready_for_next). Delivers immediate value by providing visual feedback for game progression.

**Acceptance Scenarios**:

1. **Given** the gameState/live document has `currentPhase: "ready_for_next"`, **When** the phase changes to `"accepting_answers"` with a question, **Then** the projector displays the question text, choices, and starts the countdown timer
2. **Given** the phase is `"accepting_answers"`, **When** the phase changes to `"showing_distribution"`, **Then** the projector displays the text-based answer count list (e.g., "A: 15, B: 8, C: 22, D: 5")
3. **Given** the phase is `"showing_distribution"`, **When** the phase changes to `"showing_correct_answer"`, **Then** the projector highlights the correct answer
4. **Given** the phase is `"showing_correct_answer"`, **When** the phase changes to `"showing_results"`, **Then** the projector displays the top 10 and worst 10 rankings with guest names and response times
5. **Given** the phase is `"showing_results"`, **When** the phase changes to `"all_revived"`, **Then** the projector displays the revival ceremony screen
6. **Given** the phase is `"showing_results"`, **When** the phase changes to `"all_incorrect"`, **Then** the projector displays the prize carryover notification

---

### User Story 2 - Real-Time Answer Count Updates (Priority: P2)

As an event host, I want the projector to show live answer counts during the question phase so that participants can see how many people have answered in real-time, creating excitement and urgency.

**Why this priority**: This adds significant value to the game experience by creating real-time engagement and social pressure, but the game can function without it. It depends on P1 (state display) being implemented first.

**Independent Test**: Can be tested by starting a question (setting phase to `"accepting_answers"`), then adding answer documents to the `questions/{questionId}/answers` collection in Firestore. The projector should display an incrementing counter showing the total number of answers submitted. Delivers value by adding live engagement metrics.

**Acceptance Scenarios**:

1. **Given** a question is active (`currentPhase: "accepting_answers"`), **When** guests submit answers to `questions/{questionId}/answers`, **Then** the projector displays the incrementing total answer count in real-time
2. **Given** 10 answers have been submitted, **When** 5 more answers are submitted, **Then** the counter updates from 10 to 15 without page refresh
3. **Given** the question phase ends (phase changes to `"showing_distribution"`), **When** the answer count listener is active, **Then** the listener is properly cleaned up and stops listening

---

### User Story 3 - Background Music and Sound Effects (Priority: P3)

As an event host, I want the projector to play appropriate background music and sound effects synchronized with game events so that the atmosphere matches the game's excitement level and phase transitions feel polished.

**Why this priority**: Audio significantly enhances the event experience but is not critical for core functionality. The game can be played without audio. This depends on P1 being implemented to know which audio to play for each phase.

**Independent Test**: Can be tested by transitioning through game phases and verifying that: (1) appropriate BGM loops play continuously for each phase, (2) sound effects trigger on specific events (gong sound, correct answer reveal, ranking display), (3) audio assets are pre-loaded to prevent playback delays. Delivers value by creating a professional, polished event atmosphere.

**Acceptance Scenarios**:

1. **Given** the projector app loads, **When** all audio assets finish pre-loading, **Then** a ready indicator is displayed and no audio playback delays occur during gameplay
2. **Given** the phase is `"ready_for_next"`, **When** the idle BGM is playing, **Then** the BGM loops seamlessly without gaps or clicks
3. **Given** the phase transitions from `"accepting_answers"` to `"showing_distribution"`, **When** the transition occurs, **Then** the BGM crossfades smoothly to the distribution phase music
4. **Given** the `isGongActive` flag is true, **When** a TRIGGER_GONG event is received via WebSocket, **Then** the gong sound effect plays immediately (one-shot, not looping)
5. **Given** the phase transitions to `"showing_results"`, **When** the top 10 ranking appears, **Then** a dramatic reveal sound effect plays once
6. **Given** multiple sound effects are triggered simultaneously, **When** audio playback occurs, **Then** sound effects layer properly without cutting each other off

---

### User Story 4 - WebSocket Event Synchronization (Priority: P2)

As an event host, I want the projector to respond immediately to synchronized events (like the gong sound trigger) via WebSocket so that all screens (projector, host app, participant apps) play the effect at exactly the same time, creating a unified experience.

**Why this priority**: This is important for time-sensitive events like the gong sound, where synchronization across all clients matters for the event experience. However, the game can function with Firestore-only updates (just with slight delays). This depends on P3 (audio) being implemented to actually play the synchronized sounds.

**Independent Test**: Can be tested by sending a WebSocket event (e.g., `TRIGGER_GONG`) from the socket-server (or simulating it) and observing that the projector immediately plays the gong sound effect without waiting for Firestore propagation delay. Delivers value by ensuring perfect timing synchronization across all event screens.

**Acceptance Scenarios**:

1. **Given** the projector is connected to socket-server WebSocket, **When** the connection is established, **Then** a connection status indicator shows "connected"
2. **Given** the WebSocket connection drops, **When** the disconnection is detected, **Then** the app attempts automatic reconnection with exponential backoff
3. **Given** a TRIGGER_GONG event is emitted by socket-server, **When** all connected clients receive the event, **Then** the projector plays the gong sound effect within 50ms of other clients
4. **Given** the socket-server emits a custom event (e.g., SYNC_TIMER), **When** the projector receives it, **Then** the on-screen countdown timer synchronizes to the server-provided timestamp

---

### Edge Cases

- **What happens when the Firestore connection is lost?**
  - The app should display a "Connection Lost" overlay and attempt reconnection. When reconnected, it should resync the current game state from `gameState/live`.

- **What happens when the WebSocket connection fails but Firestore is working?**
  - The app should continue displaying state changes from Firestore but show a warning that real-time events (like gong synchronization) may be delayed. Audio should still play based on Firestore state changes.

- **How does the system handle malformed data in gameState/live?**
  - The app should validate incoming data structure and display an error screen if critical fields (currentPhase, currentQuestion) are missing or invalid, logging the error details for debugging.

- **What happens when audio assets fail to load?**
  - The app should show a warning indicator but continue functioning without audio. A retry mechanism should attempt to reload failed assets.

- **What happens when multiple rapid phase transitions occur (e.g., host clicks buttons very quickly)?**
  - The app should queue state changes and process them sequentially with smooth transitions, preventing UI flickering or audio overlap issues.

- **How does the system handle the answer count listener when questions change rapidly?**
  - The app must properly clean up the previous question's answer listener before starting a new one to prevent memory leaks and incorrect count displays.

- **What happens when the projector app is opened mid-game?**
  - The app should immediately load the current state from `gameState/live` and display the active phase without requiring a restart or manual refresh.

- **How does the system handle timezone differences for the deadline countdown?**
  - All timestamps should be stored as UTC Firestore Timestamps and converted to local time for display, ensuring consistency across all clients.

## Requirements

### Functional Requirements

- **FR-001**: System MUST establish a real-time Firestore listener on the `gameState/live` document and update the UI reactively whenever any field changes (currentPhase, currentQuestion, isGongActive, results, prizeCarryover)

- **FR-002**: System MUST establish a WebSocket connection to socket-server on application load and maintain the connection with automatic reconnection logic (exponential backoff, max 5 retries)

- **FR-003**: System MUST display distinct UI screens for each game phase: ready_for_next (idle screen), accepting_answers (question display with countdown), showing_distribution (simple text-based answer count list showing each choice with its count, e.g., "A: 15, B: 8, C: 22, D: 5"), showing_correct_answer (correct answer highlight), showing_results (top 10 and worst 10 rankings), all_revived (revival ceremony), all_incorrect (prize carryover notification)

- **FR-004**: System MUST dynamically attach a Firestore listener to `questions/{questionId}/answers` when `currentPhase` is `"accepting_answers"` and display the real-time total answer count

- **FR-005**: System MUST clean up the answer count listener when the phase transitions away from `"accepting_answers"` to prevent memory leaks

- **FR-006**: System MUST pre-load all audio assets (BGM loops and sound effect one-shots) from Firebase Storage on application initialization and display a loading indicator until complete

- **FR-007**: System MUST play appropriate background music (BGM) for each game phase with seamless looping and smooth crossfading between phase transitions

- **FR-008**: System MUST play sound effect one-shots for specific events: gong trigger (when TRIGGER_GONG WebSocket event received), correct answer reveal (when phase transitions to `"showing_correct_answer"`), ranking reveal (when phase transitions to `"showing_results"`)

- **FR-009**: System MUST support audio layering (multiple sounds playing simultaneously without cutting each other off)

- **FR-010**: System MUST display the current question text, choices, question number, and period when `currentQuestion` is populated in gameState

- **FR-011**: System MUST display a countdown timer during the `"accepting_answers"` phase based on the question's `deadline` field (Firestore Timestamp)

- **FR-012**: System MUST display top 10 and worst 10 rankings from `gameState.results` when in the `"showing_results"` phase, showing guestName and responseTimeMs for each entry

- **FR-013**: System MUST display period champions (if present in `gameState.results.periodChampions`) with special visual treatment during the `"showing_results"` phase

- **FR-014**: System MUST display the accumulated prize carryover amount when in the `"all_incorrect"` phase (from `gameState.prizeCarryover`)

- **FR-015**: System MUST display connection status indicators for both Firestore and WebSocket connections

- **FR-016**: System MUST NOT require any user authentication (read-only broadcast client)

- **FR-017**: System MUST connect to Firebase emulator when running in development mode (Firestore on localhost:8080, socket-server on localhost:3001), with socket-server URL configurable via environment variable and default fallback to localhost:3001 in development

- **FR-018**: System MUST validate the structure of incoming gameState data and display an error screen if critical fields are malformed

- **FR-019**: System MUST log all state transitions, connection events, and errors to the browser console for debugging

- **FR-020**: System MUST display the `rankingError` flag visually when present in `gameState.results` (indicating ranking calculation failure)

### Key Entities

- **GameState**: Represents the live game state broadcasted to all clients. Key attributes: id (always "live"), currentPhase (GamePhase enum), currentQuestion (Question object or null), isGongActive (boolean), results (GameResults object or null), prizeCarryover (number), lastUpdate (Timestamp). This is the primary data source for the projector app, listened to via Firestore.

- **Question**: Represents a quiz question. Key attributes: questionId (string), questionText (string), choices (string array), correctAnswer (string), period (GamePeriod: "first" | "second" | "third"), questionNumber (number 1-10), deadline (Firestore Timestamp), type (always "multiple_choice"), skipAttributes (string array).

- **GameResults**: Represents the ranking data after a question. Key attributes: top10 (array of {guestId, guestName, responseTimeMs}), worst10 (array of {guestId, guestName, responseTimeMs}), periodChampions (optional array of guestId strings), period (optional GamePeriod), rankingError (optional boolean flag).

- **Answer**: Represents a submitted answer (listened to for real-time counts). Key attributes: answerId (string), guestId (string), questionId (string), selectedAnswer (string), responseTimeMs (number), isCorrect (boolean), submittedAt (Timestamp).

- **WebSocket Event**: Represents synchronized events emitted by socket-server. Key attributes: event (string, e.g., "TRIGGER_GONG", "SYNC_TIMER"), payload (object with event-specific data), timestamp (ISO string).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Projector app displays game state changes within 500ms of the `gameState/live` Firestore document update (measurable via timestamp comparison in logs)

- **SC-002**: Audio playback latency is under 100ms from the moment a sound trigger event is received (measurable via performance.now() timestamps in audio callbacks)

- **SC-003**: WebSocket event synchronization achieves sub-50ms timing differences across all connected clients (projector, host app, participant apps) - measurable via server-side timestamp comparison

- **SC-004**: All audio assets (BGM and sound effects) pre-load successfully within 10 seconds of app initialization on a standard broadband connection (measurable via loading indicator duration)

- **SC-005**: The app maintains stable Firestore and WebSocket connections for 4+ hours of continuous operation without manual reconnection (measurable via uptime monitoring and connection event logs)

- **SC-006**: Answer count updates display in real-time with sub-1-second latency when answers are submitted during the question phase (measurable via comparing answer submission timestamp to UI update timestamp)

- **SC-007**: The projector app functions correctly on a cold start when opened mid-game, displaying the current game state within 2 seconds (measurable via time-to-interactive metric)

- **SC-008**: Audio crossfades between BGM tracks occur smoothly without audible clicks, pops, or volume spikes (subjective quality metric, measurable via audio waveform analysis)

- **SC-009**: The app correctly displays all 8 game phases (ready_for_next, accepting_answers, showing_distribution, showing_correct_answer, showing_results, all_revived, all_incorrect, ready_for_next) with accurate visual content for each (measurable via screenshot comparison against design specs)

- **SC-010**: Zero memory leaks occur during 100+ phase transitions and answer listener attach/detach cycles (measurable via browser DevTools memory profiling)

## Assumptions

- The `gameState/live` Firestore document always exists and has a valid structure matching the GameState type
- The socket-server WebSocket URL is configured via environment variable (`VITE_SOCKET_SERVER_URL`) with default fallback to localhost:3001 in development
- Firebase Firestore emulator is available on localhost:8080 during development
- Audio assets (BGM files and sound effect files) are stored in Firebase Storage and accessed via public URLs with CORS enabled
- The projector device has a stable internet connection with sufficient bandwidth for WebSocket and Firestore real-time listeners
- The projector browser supports modern Web APIs: Firestore SDK, WebSocket, Web Audio API, and ES6+ JavaScript
- Only one projector client runs at a time per game event (no multi-projector synchronization required)
- The game host controls all phase transitions via the host-app; the projector app is strictly read-only
- Guest names are already populated in the `gameState.results` data structure by the api-server before reaching the projector (no additional hydration required)
- The projector app does not need to persist any local state; it always reflects the server-side source of truth
- The projector app will be implemented using React with TypeScript for component-based architecture and type safety
- The projector app will use Vite as the build tool for fast development HMR and optimized production builds

## Out of Scope

- **User authentication or authorization**: The projector app is a public, read-only broadcast client
- **Admin controls**: The projector app does not allow the user to start questions, trigger events, or modify game state (that's the host-app's responsibility)
- **Answer submission**: The projector app does not allow guests to submit answers (that's the participant-app's responsibility)
- **Offline mode**: The projector app requires continuous internet connectivity and does not support offline caching or playback
- **Multi-language support**: The projector app displays content in a single language (determined by the question data)
- **Custom theming or branding**: The projector app uses a fixed visual design (theming can be added in a future iteration)
- **Mobile responsiveness**: The projector app is designed for large displays (projectors or large monitors), not mobile devices
- **Accessibility features**: ARIA labels, screen reader support, and keyboard navigation are out of scope for this initial version
- **Recording or replay**: The projector app does not record game sessions or support replaying past games
- **Analytics or telemetry**: The projector app does not send usage data or analytics events to a backend service
- **Participant camera/video feeds**: The projector app does not display live video streams of participants (scope limited to game state and audio only)
- **Chat or messaging**: The projector app does not display a live chat or messaging interface
