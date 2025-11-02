# Feature Specification: API Server for Quiz Game System

**Feature Branch**: `001-api-server`
**Created**: 2025-11-02
**Status**: Draft
**Input**: User description: "Here is a high-level overview of the API specifications for the `api-server`, which will be built with Express and run on **Cloud Functions for Firebase**. This server acts as the 'brain' of the operation. Its primary responsibilities are: 1. **Authentication & Authorization:** Verifying who is making a request. 2. **State Management:** Executing game logic and updating the 'official' game state in Firestore. 3. **Data Persistence:** Handling quiz creation (for admins) and answer submissions (from participants). This server **does not** handle WebSocket connections. It only manages HTTP requests. It changes the state in Firestore, and the separate `socket-server` (on Cloud Run) will watch Firestore for those changes to broadcast real-time signals."

## Clarifications

### Session 2025-11-02

- Q: What happens when a participant submits multiple answers to the same question? → A: Accept only first submission; reject subsequent attempts with error
- Q: What format should error responses use for consistency and client debugging? → A: JSON with error code, message, and details array
- Q: What happens when an admin attempts to create a question with duplicate period/question number combination? → A: Reject creation with validation error
- Q: How does the system handle requests when Firestore is temporarily unavailable? → A: Return 503 with retry-after guidance
- Q: How does the system handle concurrent game state updates from the host (e.g., rapid button presses)? → A: Use Firestore transactions; last write wins

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quiz Master Creates Game Content (Priority: P1)

As a quiz master (admin), I need to create, view, and update quiz questions so that I can prepare engaging content for the wedding reception game before the event begins.

**Why this priority**: Without quiz questions, there is no game. This is the foundational requirement that must exist before any game can be played. This represents the core content creation workflow.

**Independent Test**: Can be fully tested by authenticating as an admin user, creating a new quiz question with all required fields (period, question number, type, text, choices, correct answer), retrieving the list of all questions, and updating an existing question. Delivers immediate value by allowing game preparation.

**Acceptance Scenarios**:

1. **Given** an authenticated admin user, **When** they submit a new quiz question with valid data (period, question number, type, text, choices, correct answer, skip attributes), **Then** the system creates the question and returns it with a unique ID
2. **Given** an authenticated admin user, **When** they request all quiz questions, **Then** the system returns a complete list of all created questions
3. **Given** an authenticated admin user with an existing question, **When** they update any field of that question, **Then** the system saves the changes and returns the updated question
4. **Given** an authenticated admin user, **When** they request the guest list, **Then** the system returns all registered guests for QR code management
5. **Given** an authenticated admin user and an existing question with period 1 and question number 5, **When** they attempt to create a new question with the same period and question number, **Then** the system rejects the creation with a validation error

---

### User Story 2 - Host Controls Game Flow (Priority: P1)

As a game host (the newly-weds), I need to control the progression of the quiz game through different phases so that I can manage the live event smoothly during the wedding reception.

**Why this priority**: The host controls are essential for running the actual live event. Without this, the game cannot be played even if questions exist. This is equally critical to P1 because it enables the core game experience.

**Independent Test**: Can be fully tested by authenticating as a host user, starting a question, triggering various game phase transitions (show distribution, show correct answer, show results), and reviving eliminated guests. Delivers the complete game orchestration capability.

**Acceptance Scenarios**:

1. **Given** an authenticated host and an existing question, **When** the host starts that question, **Then** the system updates game state to "accepting_answers" for that specific question
2. **Given** a question is active, **When** the host triggers the gong, **Then** the system sets the gong status to active in game state
3. **Given** answers have been submitted, **When** the host shows distribution, **Then** the system updates game state to "showing_distribution"
4. **Given** distribution is shown, **When** the host shows correct answer, **Then** the system updates game state to "showing_correct_answer"
5. **Given** a question is complete, **When** the host shows results, **Then** the system calculates the worst/top 10 performers, saves results to game state, and sets phase to "showing_results"
6. **Given** guests have been eliminated, **When** the host revives all guests, **Then** the system sets all guest statuses to "active"

---

### User Story 3 - Participant Submits Answers (Priority: P1)

As a wedding guest (participant), I need to submit my answer to quiz questions in real-time so that I can compete in the game and have my performance tracked accurately.

**Why this priority**: Participant interaction is the core engagement mechanism. Without answer submission, there is no competitive game. This must work for the event to succeed.

**Independent Test**: Can be fully tested by authenticating as an anonymous participant, synchronizing device time with server, submitting an answer for the current active question with response time tracking, and verifying the answer is recorded with correctness validation. Delivers the complete participant gameplay experience.

**Acceptance Scenarios**:

1. **Given** an unauthenticated participant, **When** they request server time, **Then** the system returns the current server timestamp for clock synchronization
2. **Given** an authenticated participant and an active question, **When** they submit an answer with question ID, answer choice, and response time, **Then** the system validates the question is currently active
3. **Given** a valid answer submission, **When** the system processes it, **Then** it extracts guest ID from auth token, compares answer to correct answer, and stores the submission with correctness flag and response time
4. **Given** a participant submits an answer for an inactive question, **When** the system validates it, **Then** it rejects the submission with an appropriate error
5. **Given** a participant without valid authentication, **When** they attempt to submit an answer, **Then** the system rejects the request with 401 Unauthorized
6. **Given** a participant has already submitted an answer for a question, **When** they attempt to submit another answer for the same question, **Then** the system rejects the duplicate submission with an error

---

### User Story 4 - System Enforces Authentication & Authorization (Priority: P1)

As the system, I need to verify user identities and enforce role-based access control so that only authorized users can perform specific actions and the game remains secure.

**Why this priority**: Security is foundational. Without proper authentication, the game could be compromised by unauthorized users creating questions, manipulating game state, or submitting fraudulent answers. This protects the integrity of all other features.

**Independent Test**: Can be fully tested by attempting requests with missing tokens, invalid tokens, and tokens with wrong authorization levels (e.g., anonymous user trying to access admin endpoints). Delivers complete security enforcement across all endpoints.

**Acceptance Scenarios**:

1. **Given** a request to any endpoint without an Authorization header, **When** the system processes it, **Then** it rejects with 401 Unauthorized
2. **Given** a request with an invalid or expired token, **When** the system validates it, **Then** it rejects with 401 Unauthorized
3. **Given** an anonymous user token, **When** used to access admin or host endpoints, **Then** the system rejects with 403 Forbidden
4. **Given** a Google Login token, **When** used to access admin or host endpoints, **Then** the system allows the request to proceed
5. **Given** an anonymous user token, **When** used to access participant endpoints, **Then** the system allows the request to proceed

---

### Edge Cases

- What happens when a host attempts to show results before any answers have been submitted?
- How does the system handle invalid question IDs in host commands or participant submissions?
- What happens when a participant submits an answer with an invalid choice (e.g., choice "E" for a four-choice question)?
- How does the system handle extremely large response times (e.g., negative values or values exceeding question time limit)?
- What happens when token validation fails due to Firebase Auth service issues?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate all incoming requests using Firebase ID tokens provided in the Authorization header
- **FR-002**: System MUST reject requests without valid tokens with 401 Unauthorized status
- **FR-003**: System MUST enforce role-based access where admin/host endpoints require Google Login tokens and participant endpoints require Anonymous Login tokens
- **FR-004**: System MUST reject requests with incorrect authorization level with 403 Forbidden status
- **FR-005**: System MUST allow admins to create new quiz questions with all required fields (period, questionNumber, type, text, choices, correctAnswer, skipAttributes)
- **FR-006**: System MUST enforce uniqueness constraint on the combination of period and questionNumber, rejecting duplicate combinations with a validation error
- **FR-007**: System MUST assign a unique ID to each newly created quiz question
- **FR-008**: System MUST allow admins to retrieve a list of all quiz questions
- **FR-009**: System MUST allow admins to update existing quiz questions by ID
- **FR-010**: System MUST allow admins to retrieve the complete guest list
- **FR-011**: System MUST provide a single host endpoint for game state progression with multiple action types
- **FR-012**: System MUST validate host actions against current game state before applying updates
- **FR-013**: System MUST use Firestore transactions when updating game state to prevent race conditions from concurrent host actions
- **FR-014**: System MUST update game state in Firestore for START_QUESTION action with the specified question ID and set phase to "accepting_answers"
- **FR-015**: System MUST update game state to set isGongActive flag for TRIGGER_GONG action
- **FR-016**: System MUST update game state phase to "showing_distribution" for SHOW_DISTRIBUTION action
- **FR-017**: System MUST update game state phase to "showing_correct_answer" for SHOW_CORRECT_ANSWER action
- **FR-018**: System MUST query all answers for current question, calculate worst/top 10 performers, and update game state with results for SHOW_RESULTS action
- **FR-019**: System MUST set all guest statuses to "active" in Firestore for REVIVE_ALL action
- **FR-020**: System MUST provide server time endpoint for participant clock synchronization
- **FR-021**: System MUST extract guest ID from Anonymous Auth token for participant answer submissions
- **FR-022**: System MUST validate that submitted answers correspond to the currently active question
- **FR-023**: System MUST compare submitted answers against correct answers to determine correctness
- **FR-024**: System MUST store answer submissions in Firestore with answer choice, response time, correctness flag, guest ID, and question ID
- **FR-025**: System MUST reject duplicate answer submissions (same guest ID and question ID) and return an error to the participant
- **FR-026**: System MUST validate question data matches the Question type schema from /packages/types
- **FR-027**: System MUST return appropriate HTTP status codes (201 for creation, 200 for success, 401/403 for auth errors)
- **FR-028**: System MUST be stateless, reading current state from Firestore for each request rather than maintaining in-memory state
- **FR-029**: System MUST return error responses in JSON format with three fields: error code (string), message (human-readable string), and details (array of additional context objects)
- **FR-030**: System MUST handle errors gracefully across all endpoints using the standardized error response format
- **FR-031**: System MUST detect Firestore unavailability or timeout conditions and return 503 Service Unavailable status
- **FR-032**: System MUST include Retry-After header in 503 responses to guide client retry behavior during Firestore outages
- **FR-033**: System MUST log authentication failures for security monitoring

### Key Entities

- **Quiz Question**: Represents a single question in the game with period (game phase), question number (must be unique within each period), type (e.g., four_choice), question text, answer choices, correct answer, and optional skip attributes for excluding certain guest categories
- **Guest**: Represents a wedding guest participant with unique ID, status (active/eliminated), and authentication credentials (anonymous or Google)
- **Game State**: Represents the current state of the live game including active question ID, current phase (accepting_answers, showing_distribution, showing_correct_answer, showing_results), gong status, and calculated results (worst/top 10 performers)
- **Answer Submission**: Represents a participant's answer to a specific question including guest ID, question ID, selected answer choice, response time in milliseconds, and correctness flag
- **Host Action**: Represents a game control command from the host including action type (START_QUESTION, TRIGGER_GONG, SHOW_DISTRIBUTION, SHOW_CORRECT_ANSWER, SHOW_RESULTS, REVIVE_ALL) and optional payload data
- **Error Response**: Standardized error structure returned for all failures with error code (machine-readable identifier), message (human-readable description), and details array (additional context such as field validation errors or affected resources)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a complete quiz question with all required fields in under 60 seconds
- **SC-002**: System successfully authenticates and authorizes 100% of valid requests with correct tokens
- **SC-003**: System rejects 100% of unauthorized requests (missing, invalid, or wrong-level tokens) with appropriate error codes
- **SC-004**: Host can progress through all game phases (start question, show distribution, show correct answer, show results) with each state update completing in under 2 seconds
- **SC-005**: Participants receive accurate server time for synchronization with variance under 50 milliseconds
- **SC-006**: System correctly validates and stores participant answer submissions with 100% accuracy in correctness determination
- **SC-007**: System handles at least 500 concurrent participant answer submissions for a single question without data loss or incorrect state updates
- **SC-008**: All game state changes triggered by host actions are persisted to Firestore and visible to monitoring systems within 1 second
- **SC-009**: System calculates worst/top 10 performers from answer submissions with correct ranking based on correctness and response time
- **SC-010**: System completes full end-to-end flow (question creation → host starts question → participants answer → host shows results) with zero data inconsistencies

## Assumptions

- Firebase Authentication service is properly configured with Google Login and Anonymous Login providers enabled
- Firestore database is provisioned with appropriate security rules and indexes
- The Question type schema exists in /packages/types package and is shared between client and server
- Clock synchronization is critical for fair gameplay, and clients will implement synchronization logic using the time endpoint
- Response time is measured client-side from question display to answer selection
- The separate socket-server is responsible for real-time broadcast of state changes to clients via WebSocket
- QR codes for guest authentication are generated and managed outside this API server
- Guest registration and attribute assignment (e.g., "groom_family") happens through a separate process before the game begins
- "Worst performers" are determined by incorrect answers and/or slowest response times (exact algorithm to be defined in implementation)
- "Top 10" refers to best-performing guests based on correct answers and fastest response times
- Each question can only be active one at a time (no simultaneous multi-question gameplay)
- Game state includes sufficient information for the socket-server to broadcast meaningful updates without additional queries
- Standard Firebase Authentication token expiration and refresh mechanisms are acceptable for the game duration
- Admin and host roles are distinguished by their use case but use the same authentication mechanism (Google Login)

## Dependencies

- Firebase Cloud Functions runtime environment with Express.js support
- Firebase Authentication service for token validation
- Firestore database for persistent storage of questions, answers, guests, and game state
- /packages/types package providing shared TypeScript type definitions (particularly Question type)
- Socket-server (running on Cloud Run) for real-time event broadcasting based on Firestore changes

## Out of Scope

- WebSocket or real-time push notification implementation (handled by separate socket-server)
- QR code generation for guest authentication
- Guest registration and initial setup workflows
- Frontend client applications (admin-app, host-app, participant-app)
- Real-time leaderboard calculations beyond the worst/top 10 calculation in SHOW_RESULTS action
- Multi-game or multi-session support (assumes single game instance per deployment)
- Detailed analytics or post-game reporting beyond basic answer storage
- Question templates or bulk question import features
- Multimedia content support (images, videos) in questions
- Game customization settings (e.g., time limits, scoring algorithms) beyond what's encoded in question data
- Backup and disaster recovery procedures (relies on Firebase built-in capabilities)
- Rate limiting or abuse prevention beyond authentication enforcement
