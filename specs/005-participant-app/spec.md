# Feature Specification: Participant App - Guest Quiz Controller

**Feature Branch**: `005-participant-app`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Guest smartphone quiz client for real-time quiz participation with QR authentication, clock sync, and vibration feedback"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Join via QR Code (Priority: P1)

As a wedding guest, I need to join the quiz game by simply scanning the QR code provided at my table, so I can participate without complicated setup.

**Why this priority**: This is the entry point for all users. Without a working join flow, no other features matter. Must be frictionless since guests are at a wedding celebration, not a tech conference.

**Independent Test**: Can be fully tested by scanning a QR code and verifying the guest is authenticated and registered. Delivers immediate value by allowing guests to identify themselves to the system.

**Acceptance Scenarios**:

1. **Given** a guest has received a QR code at their table, **When** they scan it with their smartphone camera, **Then** the participant app opens and displays a welcome screen with their name
2. **Given** a guest's browser doesn't have camera permissions, **When** they try to join, **Then** the app displays clear instructions to grant camera access
3. **Given** a guest scans a QR code, **When** the authentication completes, **Then** they see a waiting screen indicating the game will start soon
4. **Given** a guest tries to scan an invalid/expired QR code, **When** authentication fails, **Then** they see a friendly error message asking them to contact the host

---

### User Story 2 - Answer Questions in Real-Time (Priority: P1)

As a participating guest, I need to see questions appear on my phone and submit answers quickly, so I can compete fairly with other guests based on speed and accuracy.

**Why this priority**: This is the core functionality of the entire app. The quiz game cannot exist without this feature. This delivers the primary value proposition.

**Independent Test**: Can be fully tested by triggering a question event and verifying answer submission with timing. Delivers the core quiz-playing experience.

**Acceptance Scenarios**:

1. **Given** the game has started and I'm waiting, **When** a new question appears, **Then** I see the question text and 2-6 answer choice buttons clearly displayed
2. **Given** a question is displayed with choices, **When** I tap an answer choice, **Then** I feel a brief vibration (50ms) confirming my tap
3. **Given** I've tapped an answer, **When** the button locks, **Then** I cannot change my answer and the UI shows my selection is locked
4. **Given** the answer period ends, **When** the correct answer is revealed, **Then** I see visual feedback showing whether I was correct or incorrect
5. **Given** I answered correctly, **When** results are revealed, **Then** I feel a double-pulse vibration (2x100ms) indicating success
6. **Given** I answered incorrectly, **When** results are revealed, **Then** I feel a long buzz vibration (300ms) indicating failure
7. **Given** I don't answer within the time limit, **When** time expires, **Then** my answer is recorded as "no response" with appropriate feedback

---

### User Story 3 - Receive Real-Time Game Feedback (Priority: P2)

As a participating guest, I need immediate feedback on my answers through vibrations and visual cues, so I stay engaged without constantly watching the projector screen.

**Why this priority**: Enhances user experience and engagement, but the quiz can technically function without haptic feedback. Important for creating the TV show atmosphere.

**Independent Test**: Can be tested by submitting answers and verifying vibration patterns trigger correctly. Delivers enhanced engagement and immersion.

**Acceptance Scenarios**:

1. **Given** I'm holding my phone, **When** I tap an answer, **Then** I immediately feel a 50ms vibration confirming the tap was registered
2. **Given** the answer reveal phase begins, **When** my answer is checked, **Then** I feel the appropriate vibration pattern (success: 2x100ms pulses, failure: 300ms buzz)
3. **Given** my device doesn't support vibration, **When** feedback events occur, **Then** I still see visual feedback without errors
4. **Given** I've answered multiple questions, **When** viewing my personal history, **Then** I see a timeline of my answers with correct/incorrect indicators

---

### User Story 4 - Know When I'm Dropped Out (Priority: P2)

As a participating guest who has been eliminated, I need clear notification that I'm out of the game, so I understand my status and can still watch the remaining rounds.

**Why this priority**: Important for game fairness and transparency, but the core quiz mechanics work without it. Prevents confusion about why questions stop appearing.

**Independent Test**: Can be tested by updating guest status in Firestore and verifying the drop-out overlay appears. Delivers clarity on game state.

**Acceptance Scenarios**:

1. **Given** I'm actively playing, **When** my status changes to "dropped" in Firestore, **Then** I see a full-screen overlay indicating I've been eliminated
2. **Given** I've been dropped out, **When** I view the overlay, **Then** I see my final rank, total points, and a thank-you message
3. **Given** I've been eliminated, **When** new questions appear, **Then** I can still view them but cannot submit answers
4. **Given** I'm viewing the drop-out screen, **When** I tap a "Watch Remaining Game" button, **Then** I can spectate without participating

---

### User Story 5 - Rejoin After Disconnection (Priority: P3)

As a participating guest whose connection was interrupted, I need to rejoin the game seamlessly, so temporary network issues don't eliminate me unfairly.

**Why this priority**: Nice-to-have for robustness, but not essential for MVP. Most guests will have stable connections at the venue.

**Independent Test**: Can be tested by disconnecting and reconnecting the client, verifying state restoration. Delivers improved reliability.

**Acceptance Scenarios**:

1. **Given** I lost network connection mid-game, **When** my connection restores, **Then** I automatically rejoin with my current game state intact
2. **Given** I closed the app accidentally, **When** I reopen it within the same game session, **Then** I'm taken back to my current question or waiting screen
3. **Given** I rejoin after disconnection, **When** I check my answer history, **Then** all my previous answers are still recorded correctly
4. **Given** the game ended while I was disconnected, **When** I rejoin, **Then** I see the final results screen with my placement

---

### Edge Cases

- **What happens when a guest scans a QR code for a different event?** System validates the token against the current active game and rejects with a clear error message
- **How does the system handle clock drift on old mobile devices?** Regular re-synchronization every 2 minutes during gameplay to maintain accuracy
- **What if a question is triggered while guest is still syncing their clock?** Guest sees a "Preparing..." message and can answer once sync completes, with adjusted timing
- **What happens if WebSocket connection drops during answer submission?** Answer is queued locally and submitted when connection restores, using pre-synced clock offset for timing
- **How does the app handle guests with vibration disabled in system settings?** Gracefully falls back to visual-only feedback without errors
- **What if a guest's device time is drastically wrong (hours/days off)?** Clock sync detects large offsets and displays a warning, but still compensates mathematically
- **How does the system prevent guests from answering the same question twice?** Server-side validation checks if guestId already has an answer for the current questionId
- **What happens when the participant app loads slowly on 3G?** Critical assets are prioritized, with a loading indicator showing progress to keep guests informed
- **What if answer submission retries exhaust all 3 attempts (200ms, 400ms, 800ms)?** Answer is marked as failed locally, error logged to Crashlytics, and user sees error message with manual retry option

## Clarifications

### Session 2025-11-03

- Q: FR-047 states "System MUST pre-fetch all questions during initialization" - which questions should be pre-fetched? → A: Only questions for the current period + next period, fetch others during gameplay
- Q: FR-046 mentions "session expiration" - how long should a guest session remain valid before expiring? → A: 24 hours (full day validity)
- Q: FR-052 states "System MUST log critical errors to monitoring service" - which monitoring/logging service should be used? → A: Firebase Crashlytics (native Firebase integration)
- Q: FR-045 mentions synchronizing "answer history" - how long should answer history data be retained after the event ends? → A: No retention, deleted when event ends
- Q: FR-021 and FR-030 mention retry mechanisms with "exponential backoff" and "up to 3 times" - what should be the retry delay strategy? → A: Exponential backoff for both: 1s, 2s, 4s (WebSocket) and 200ms, 400ms, 800ms (answers)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Registration
- **FR-001**: System MUST support QR code scanning to initiate guest authentication
- **FR-002**: System MUST extract the guest token from QR code URL format: `{PARTICIPANT_APP_URL}/join?token={UNIQUE_GUEST_TOKEN}`
- **FR-003**: System MUST authenticate guests using Firebase Anonymous Login
- **FR-004**: System MUST link the anonymous Firebase UID to the guest profile by calling `POST /participant/register` with the scanned token
- **FR-005**: System MUST store the authenticated guest's ID, name, and table number locally for session persistence
- **FR-006**: System MUST handle authentication failures with clear error messages (invalid token, expired token, guest already registered)
- **FR-007**: System MUST prevent guests from registering with the same token on multiple devices simultaneously

#### Clock Synchronization
- **FR-008**: System MUST perform clock synchronization immediately after successful registration
- **FR-009**: System MUST perform 5 time-sync pings to `POST /participant/time` endpoint
- **FR-010**: System MUST record client send time (t1), server time (t_server), and client receive time (t2) for each ping
- **FR-011**: System MUST calculate estimated server time as: `t_server + (t2 - t1) / 2`
- **FR-012**: System MUST sort the 5 estimated server times and select the median value
- **FR-013**: System MUST calculate the clock offset as: `clockOffset = medianEstimatedServerTime - clientReceiveTime`
- **FR-014**: System MUST store the calculated clock offset for use in answer timing calculations
- **FR-015**: System MUST re-synchronize the clock every 2 minutes during active gameplay to account for drift
- **FR-016**: System MUST display a warning if clock offset exceeds 500ms variance across pings

#### WebSocket Connection
- **FR-017**: System MUST establish WebSocket connection to socket-server using Socket.io client library
- **FR-018**: System MUST join the game room after WebSocket connection is established
- **FR-019**: System MUST listen for `START_QUESTION` events containing questionId, questionText, choices, and serverStartTime
- **FR-020**: System MUST listen for `GAME_PHASE_CHANGED` events containing phase and correctChoice
- **FR-021**: System MUST handle WebSocket disconnection by attempting automatic reconnection with exponential backoff (1s, 2s, 4s delays)
- **FR-022**: System MUST refresh game state from Firestore after reconnecting to WebSocket

#### Question Display & Answer Submission
- **FR-023**: System MUST display question text and 2-6 answer choice buttons when `START_QUESTION` event is received
- **FR-024**: System MUST trigger a 50ms vibration when guest taps an answer choice button
- **FR-025**: System MUST disable all choice buttons after guest selects an answer
- **FR-026**: System MUST visually highlight the selected answer choice
- **FR-027**: System MUST calculate corrected tap time as: `correctedTapTime = clientTapTime + clockOffset`
- **FR-028**: System MUST calculate response time as: `responseTimeMs = correctedTapTime - serverStartTime`
- **FR-029**: System MUST submit answer to `POST /participant/answer` with guestId, questionId, choiceIndex, and responseTimeMs
- **FR-030**: System MUST handle answer submission failures by retrying up to 3 times with exponential backoff (200ms, 400ms, 800ms delays)
- **FR-031**: System MUST allow guests to answer only once per question (button lock prevents changes)
- **FR-032**: System MUST display a waiting indicator when no active question is present

#### Real-Time Feedback
- **FR-033**: System MUST trigger a success vibration pattern (two 100ms pulses separated by 50ms) when guest answered correctly
- **FR-034**: System MUST trigger a failure vibration pattern (one 300ms buzz) when guest answered incorrectly
- **FR-035**: System MUST display visual feedback (green/red indicator) showing whether the answer was correct

#### Drop-Out Status Monitoring
- **FR-036**: System MUST listen to Firestore document `guests/{guestId}` for real-time status updates
- **FR-037**: System MUST check the `status` field in the guest document for drop-out detection
- **FR-038**: System MUST display a full-screen drop-out overlay when `status` changes to "dropped"
- **FR-039**: System MUST show the guest's final rank, total points, and correct answer count on the drop-out overlay
- **FR-040**: System MUST prevent answer submission when guest status is "dropped"
- **FR-041**: System MUST allow dropped guests to view subsequent questions in spectator mode

#### Session Persistence & Reconnection
- **FR-042**: System MUST persist guest session data (guestId, name, token) to localStorage
- **FR-043**: System MUST detect existing session on app load and automatically restore state
- **FR-044**: System MUST refresh game state from Firestore when rejoining after disconnection
- **FR-045**: System MUST synchronize answer history from Firestore to ensure consistency during active gameplay; answer history MUST be deleted when the event ends
- **FR-046**: System MUST expire guest sessions after 24 hours and redirect to QR code scan screen when session is expired

#### Pre-Fetching & Performance
- **FR-047**: System MUST pre-fetch questions for the current period and next period during initialization to enable instant display; additional periods MUST be fetched in the background during gameplay
- **FR-048**: System MUST load critical JavaScript bundles within 2 seconds on 3G connection
- **FR-049**: System MUST prioritize above-the-fold content loading before non-critical assets
- **FR-050**: System MUST implement code-splitting to reduce initial bundle size

#### Error Handling
- **FR-051**: System MUST display user-friendly error messages for network failures
- **FR-052**: System MUST log critical errors (authentication failures, network timeouts, clock sync failures, answer submission failures) to Firebase Crashlytics for debugging
- **FR-053**: System MUST provide a "Retry" button on error screens for manual recovery

### Key Entities

- **Guest Session**: Represents the authenticated guest's current game session. Includes guestId, Firebase UID, name, table number, clockOffset, and connection status. Sessions expire after 24 hours.
- **Answer Record**: Represents a submitted answer for a specific question. Includes questionId, choiceIndex, responseTimeMs, and submission timestamp. Answer history is deleted when the event ends.
- **Game State**: Represents the current phase of the game. Includes active questionId, current phase (waiting, answering, reveal), and drop-out status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of guests successfully join the game on their first QR code scan attempt
- **SC-002**: 100% of answer submissions are processed with correct timing calculations (verified through server logs)
- **SC-003**: Answer submission latency is under 200ms for 90% of guests under normal network conditions
- **SC-004**: Clock synchronization achieves accuracy within 50ms variance for 95% of devices
- **SC-005**: Vibration feedback triggers within 50ms of the corresponding event (tap, reveal) on devices that support it
- **SC-006**: App loads and becomes interactive within 3 seconds on a simulated 3G connection (1.6 Mbps, 300ms RTT)
- **SC-007**: WebSocket reconnection succeeds within 5 seconds after network interruption for 95% of disconnection events
- **SC-008**: Drop-out overlay appears within 1 second of Firestore status change
- **SC-009**: 90% of guests complete the full quiz game without requiring technical assistance
- **SC-010**: Zero answer submissions are lost due to temporary network failures (queuing and retry mechanisms)
- **SC-011**: App functions correctly on the top 5 mobile browsers (Chrome, Safari, Firefox, Samsung Internet, Edge)
- **SC-012**: Battery consumption is under 10% for a typical 20-question quiz session

## Assumptions *(mandatory)*

1. **Network Availability**: Guests have stable WiFi or cellular data at the wedding venue (minimum 3G speed)
2. **Device Compatibility**: Guests use smartphones manufactured within the last 5 years with modern browsers
3. **Camera Access**: Guests grant camera permissions when prompted for QR code scanning
4. **Admin Setup**: The admin app has already been used to create guests, generate QR codes, and configure questions
5. **Backend Services**: api-server and socket-server are deployed and operational before the event
6. **Participant App URL**: The `VITE_PARTICIPANT_APP_URL` environment variable is correctly configured for QR code generation
7. **Vibration Support**: While not all devices support vibration, the app gracefully degrades to visual-only feedback
8. **Single Device Per Guest**: Each guest uses only one device to participate (enforced by server-side validation)
9. **Event Timing**: The quiz game runs in real-time with all guests participating simultaneously
10. **Firestore Rules**: Firestore security rules allow authenticated guests to read their own guest document

## Out of Scope *(mandatory)*

1. **Native Mobile Apps**: This feature only covers the mobile web app (PWA-capable, but not native iOS/Android apps)
2. **Offline Mode**: Guests must have active internet connection to participate (no offline answer caching)
3. **Multi-Language Support**: Only one language (Japanese or English) is supported in MVP
4. **Accessibility Features**: Advanced screen reader support and keyboard navigation are not included in MVP
5. **Social Sharing**: Guests cannot share their results on social media directly from the app
6. **Answer Editing**: Once an answer is submitted, it cannot be changed (lock is permanent)
7. **Question Preview**: Guests cannot see upcoming questions before they're officially started
8. **Custom Themes**: Guests cannot customize app appearance or colors
9. **Voice Input**: Guests cannot submit answers via voice commands
10. **Leaderboard in Participant App**: Real-time rankings are only shown on projector app, not in participant app
11. **Historical Quiz Playback**: Guests cannot replay past quizzes from previous events
12. **Team Mode**: Guests participate individually, not as teams (team features are out of scope)
13. **Question Creation**: Guests cannot create or suggest questions (admin-only feature)
14. **Chat/Messaging**: No communication features between guests or with the host
15. **Push Notifications**: No native push notifications for game events (relies on WebSocket and in-app notifications only)

## Dependencies

### External Systems
- **api-server** (001-api-server, 002-api-server-refinement): Provides REST endpoints for registration (`/participant/register`), time sync (`/participant/time`), and answer submission (`/participant/answer`)
- **socket-server** (003-socket-server): Provides WebSocket events for real-time game state (`START_QUESTION`, `GAME_PHASE_CHANGED`)
- **admin-app** (004-admin-app): Used by hosts to generate QR codes with guest tokens before the event
- **Firebase Authentication**: Anonymous login for guest authentication
- **Firebase Firestore**: Real-time listener for guest drop-out status monitoring

### Shared Packages
- **@allstars/types**: Shared TypeScript types for Question, Choice, Guest, GameState

### Third-Party Services
- **Firebase SDK**: Authentication, Firestore client library, Crashlytics (error monitoring)
- **Socket.io Client**: WebSocket communication with socket-server
- **QR Code Scanner Library**: For scanning QR codes via camera (e.g., html5-qrcode, react-qr-reader)

## Risks

### Technical Risks

1. **Clock Sync Accuracy on Diverse Devices**
   - **Risk**: Older smartphones with slow processors may have inconsistent timing, affecting fairness
   - **Mitigation**: Use median-based filtering to reduce outlier impact; re-sync every 2 minutes; display warnings for excessive variance

2. **WebSocket Disconnections During Gameplay**
   - **Risk**: Network instability could cause guests to miss questions or lose answers
   - **Mitigation**: Implement automatic reconnection with exponential backoff; queue answers locally if disconnected; restore state from Firestore on reconnect

3. **Vibration API Browser Compatibility**
   - **Risk**: Not all mobile browsers support the Vibration API (notably iOS Safari before iOS 13)
   - **Mitigation**: Feature detection and graceful degradation to visual-only feedback; test across target browsers

4. **QR Code Scanning Failures**
   - **Risk**: Poor lighting, low camera quality, or incorrect QR code positioning may prevent scanning
   - **Mitigation**: Provide clear visual guidance; implement manual token entry fallback; test QR code size and error correction level

5. **High Concurrent Load at Game Start**
   - **Risk**: All guests joining and syncing clocks simultaneously could overwhelm the api-server
   - **Mitigation**: Implement client-side jitter (randomized delays); optimize server endpoints for high throughput; load test with expected guest count

### Business/UX Risks

1. **Guest Confusion During Onboarding**
   - **Risk**: Guests unfamiliar with QR codes or smartphone apps may struggle to join
   - **Mitigation**: Print clear instructions on QR code cards; provide venue staff with troubleshooting guide; design ultra-simple onboarding flow

2. **Battery Drain During Event**
   - **Risk**: Continuous WebSocket connection and screen-on time may drain phone batteries
   - **Mitigation**: Optimize rendering to reduce CPU usage; recommend guests charge phones before event; provide charging stations at venue

## Non-Functional Requirements

### Performance
- **NFR-001**: App MUST load and become interactive within 3 seconds on 3G connection (1.6 Mbps, 300ms RTT)
- **NFR-002**: Answer submission latency MUST be under 200ms for 90% of requests
- **NFR-003**: Clock sync MUST complete within 2 seconds under normal network conditions

### Scalability
- **NFR-004**: App MUST support up to 200 concurrent guests participating in a single quiz session
- **NFR-005**: WebSocket server MUST handle reconnection bursts of 50+ clients within 10 seconds

### Reliability
- **NFR-006**: App MUST automatically reconnect to WebSocket within 5 seconds after disconnection
- **NFR-007**: App MUST queue answer submissions locally if network is unavailable and retry when connection restores

### Compatibility
- **NFR-008**: App MUST function on Chrome, Safari, Firefox, Samsung Internet, and Edge mobile browsers
- **NFR-009**: App MUST support devices running iOS 13+ and Android 8+
- **NFR-010**: App MUST gracefully degrade when Vibration API is not supported

### Security
- **NFR-011**: Guest tokens MUST be single-use (validated server-side to prevent duplicate registrations)
- **NFR-012**: All API calls MUST include the guest's Firebase Authentication token for authorization

### Usability
- **NFR-013**: UI MUST be optimized for one-handed portrait mode smartphone use
- **NFR-014**: Text MUST be readable at minimum font size of 16px on 4.7" displays
- **NFR-015**: Touch targets MUST be at least 44x44px for easy tapping

### Maintainability
- **NFR-016**: Code MUST be written in TypeScript with strict type checking enabled
- **NFR-017**: All critical functions (clock sync, answer submission) MUST have unit tests with 80%+ coverage
