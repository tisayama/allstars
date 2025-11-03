# Feature Specification: Admin Dashboard for Pre-Event Quiz Setup

**Feature Branch**: `004-admin-app`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "admin-app: Pre-event administrative dashboard for quiz setup - allows event organizers to create/manage quiz questions, manage guest lists, generate unique QR codes, and configure initial game settings"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Authentication and Overview (Priority: P1)

As an event organizer (newly-wed), I need to securely log into the admin dashboard using my Google account so that I can access the quiz setup tools and see an overview of my event preparation status.

**Why this priority**: Authentication is the foundational requirement - without it, no other features are accessible. The dashboard overview provides immediate value by showing preparation progress.

**Independent Test**: Can be fully tested by logging in with a Google account and verifying that the dashboard displays accurate counts of questions and guests. Delivers immediate value by confirming authentication works and showing current event status.

**Acceptance Scenarios**:

1. **Given** I am not logged in, **When** I visit the admin-app URL, **Then** I am redirected to Google login
2. **Given** I have valid admin credentials, **When** I successfully log in with Google, **Then** I see the dashboard with summary statistics
3. **Given** I am on the dashboard, **When** the page loads, **Then** I see "You have X Questions in Y Periods" and "Z Guests Registered"
4. **Given** I am logged in, **When** I navigate the dashboard, **Then** I see clear links to "Quiz Management" and "Guest Management" sections
5. **Given** I make an API request, **When** my Firebase token is invalid or expired, **Then** I receive an authentication error

---

### User Story 2 - Quiz Question Management (Priority: P1)

As an event organizer, I need to create, edit, and organize quiz questions so that I can build the complete quiz content for my wedding event.

**Why this priority**: The quiz content is the core of the entire event. Without questions, there's no quiz to run. This must be available immediately alongside authentication.

**Independent Test**: Can be fully tested by creating a new question with all fields, editing it, viewing it in the list, and deleting it. Delivers standalone value by enabling complete quiz content preparation.

**Acceptance Scenarios**:

1. **Given** I am on the Quiz Management page, **When** the page loads, **Then** I see all existing questions grouped by period and ordered by question number
2. **Given** I am viewing the question list, **When** I click "New Question", **Then** I see a form with fields for period, questionNumber, type, text, vtrUrl, choices, correctAnswer, and skipAttributes
3. **Given** I am creating a question, **When** I select "four_choice" as type, **Then** I can add up to 4 choices with text and optional images
4. **Given** I am creating a sorting question, **When** I enter the correct answer, **Then** I provide it as a comma-separated list (e.g., "B,D,A,C")
5. **Given** I have filled out the question form, **When** I submit it, **Then** the app validates the data and sends it to POST /admin/quizzes
6. **Given** I am viewing a question in the list, **When** I click "Edit", **Then** the form populates with existing data
7. **Given** I have edited a question, **When** I submit changes, **Then** the app sends data to PUT /admin/quizzes/{quizId}
8. **Given** I am viewing a question, **When** I click "Delete" and confirm, **Then** the question is removed via DELETE /admin/quizzes/{quizId}
9. **Given** I am adding choices, **When** I need more or fewer choices, **Then** I can dynamically add or remove choice fields
10. **Given** I am creating a question, **When** I add skipAttributes, **Then** I can enter tags like "groom_family" or "speech_guest"

---

### User Story 3 - Guest List Management (Priority: P2)

As an event organizer, I need to create and manage the guest list so that each guest can be pre-registered with their unique attributes for the quiz.

**Why this priority**: Guest management is essential for the event but can be done after questions are prepared. It's needed before QR code generation but is less critical than having quiz content ready.

**Independent Test**: Can be fully tested by adding guests individually and via CSV, viewing the guest list, and verifying guest data persistence. Delivers value by enabling complete guest roster setup.

**Acceptance Scenarios**:

1. **Given** I am on the Guest Management page, **When** the page loads, **Then** I see a list of all guests with Name, Table, and Attributes
2. **Given** I am viewing the guest list, **When** I click "Add Guest", **Then** I see a form with fields for Name, TableNumber, and attributes
3. **Given** I have filled out the guest form, **When** I submit it, **Then** the app sends data to POST /admin/guests
4. **Given** I want to add multiple guests, **When** I choose "Upload CSV", **Then** I can upload a CSV file with guest data
5. **Given** I upload a CSV, **When** the file is processed, **Then** each row creates a new guest with a unique guestId
6. **Given** a guest is created, **When** the API processes the request, **Then** a unique one-time-use token is generated for that guest
7. **Given** I am viewing a guest, **When** I see their attributes, **Then** I can identify tags like "groom_friend" or "bride_family"

---

### User Story 4 - QR Code Generation and Printing (Priority: P2)

As an event organizer, I need to generate unique QR codes for each guest so that they can quickly join the quiz on their mobile devices at the wedding.

**Why this priority**: QR codes are critical for the event day but only needed after guests are registered. This is a pre-event setup task that must be completed before the wedding day.

**Independent Test**: Can be fully tested by clicking "Print All" and verifying that each guest has a unique QR code pointing to the correct URL with their token. Delivers value by producing the physical materials needed for guest onboarding.

**Acceptance Scenarios**:

1. **Given** I am on the Guest Management page, **When** I click "Print All", **Then** I am taken to a /print page
2. **Given** I am on the print page, **When** the page loads, **Then** I see all guest names with their corresponding QR codes
3. **Given** I am viewing a QR code, **When** I scan it, **Then** it points to https://[participant-app-domain]/join?token=[unique-token]
4. **Given** I am on the print page, **When** I trigger browser print, **Then** the layout is optimized for printing physical QR code cards
5. **Given** each guest has a unique token, **When** they scan their QR code, **Then** the participant-app can link their anonymous Firebase auth to their pre-registered profile

---

### User Story 5 - Game Configuration (Priority: P3)

As an event organizer, I need to configure initial game settings so that the default rules for drop-out and ranking are set before the event starts.

**Why this priority**: Configuration is important but can use reasonable defaults. It's the lowest priority because the system can function with default settings, unlike authentication, questions, or guests.

**Independent Test**: Can be fully tested by viewing current settings, changing them, saving, and verifying the gameState/live document is updated. Delivers value by allowing customization of game behavior.

**Acceptance Scenarios**:

1. **Given** I am on the System Configuration page, **When** the page loads, **Then** I see current settings from gameState/live document
2. **Given** I am viewing settings, **When** I see the Drop-out Rule field, **Then** I can select "period" or "worst_one"
3. **Given** I am viewing settings, **When** I see the Ranking Rule field, **Then** I can select "time" or "point"
4. **Given** I have changed settings, **When** I click Save, **Then** the app sends data to PUT /admin/settings
5. **Given** settings are saved, **When** the API processes the request, **Then** the gameState/live document is updated

---

### Edge Cases

- What happens when a user tries to create a question without specifying required fields (period, questionNumber, type, text)?
- How does the system handle duplicate question numbers within the same period?
- What happens when a CSV upload contains malformed data or duplicate guest names?
- How does the system handle a user who is authenticated with Google but doesn't have admin privileges?
- What happens when the Firebase ID token expires during a long editing session?
- How does the system handle concurrent edits to the same question by multiple admin users?
- What happens when a QR code is generated but the guest token has already been used?
- How does the system handle image uploads for question choices if the file size exceeds limits?
- What happens when a user tries to delete a question that is currently active in a live quiz?

### Error Handling Strategy

For all edge cases and validation failures, the system MUST:
- **Block the action** from completing (prevent invalid data from being saved)
- **Display user-friendly error messages** with specific guidance on how to fix the issue
- **Preserve user input** in the form to allow correction and retry without re-entering all data
- **Highlight invalid fields** visually with clear error indicators
- **Provide actionable next steps** (e.g., "Period 2, Question 3 already exists. Please use a different question number or edit the existing question.")

This ensures event organizers receive clear guidance when errors occur while protecting their time investment in data entry.

## Clarifications

### Session 2025-11-03

- Q: How should the system handle edge cases and validation failures (missing required fields, duplicates, malformed CSV, expired tokens, etc.)? → A: Block action, show user-friendly error message with specific guidance, preserve user input for correction and retry
- Q: Which CSV format should the guest bulk import feature support? → A: Template-based with validation - provide downloadable guest-template.csv with exact format (headers: Name,TableNumber,Attributes), strict validation rejecting non-conforming files with clear error messages referencing the template
- Q: How should the system handle Firebase authentication token expiration during active admin sessions? → A: Proactive token refresh (silent background renewal) - monitor token expiration, automatically refresh 5 minutes before expiry using getIdToken(true), only require re-login if refresh fails
- Q: How should the QR code URL be configured for different environments (development, staging, production)? → A: Use environment variable VITE_PARTICIPANT_APP_URL with validation at app startup to ensure it's set
- Q: How should image uploads for question choices be implemented? → A: Firebase Storage with client-side upload - users upload directly from browser using signed URLs, storing the download URL in the imageUrl field
- Q: How should game settings updates be applied to the gameState/live Firestore document? → A: Merge update (preserve other fields) - update only settings fields using Firestore merge operation to preserve other gameState data
- Q: What should the guest-template.csv sample data look like to demonstrate the attribute format? → A: Multiple realistic examples showing edge cases - Row 1 with multiple attributes ("groom_friend,speech_guest"), Row 2 with single attribute ("bride_family"), Row 3 with no attributes ("")

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST require users to authenticate via Firebase Authentication (Google Login) before accessing any admin features
- **FR-002**: System MUST include Firebase ID Token in the Authorization Bearer header for all API requests to api-server
- **FR-003**: System MUST monitor Firebase ID token expiration timestamp and automatically refresh tokens 5 minutes before expiry
- **FR-004**: System MUST use Firebase SDK's getIdToken(true) method to force token refresh in the background without user interaction
- **FR-005**: System MUST only redirect to login if automatic token refresh fails (e.g., network error, revoked credentials)
- **FR-006**: System MUST display an error and redirect to login when an API request returns a 401 Unauthorized response after refresh attempts
- **FR-007**: api-server MUST validate the Firebase ID Token and verify the user has administrative privileges before processing any admin request

#### Dashboard

- **FR-008**: System MUST display total question count and period count on the dashboard home page
- **FR-009**: System MUST display total registered guest count on the dashboard home page
- **FR-010**: System MUST provide navigation links to Quiz Management and Guest Management sections

#### Quiz Management (CRUD)

- **FR-011**: System MUST fetch all questions by calling GET /admin/quizzes when the Quiz Management page loads
- **FR-012**: System MUST display questions grouped by period and ordered by questionNumber
- **FR-013**: System MUST provide a "New Question" button that opens a creation form
- **FR-014**: Question form MUST include fields for: period (number), questionNumber (number), type (dropdown: "four_choice", "sorting", "survey"), text (textarea), vtrUrl (optional text), choices (dynamic list), correctAnswer, and skipAttributes
- **FR-015**: System MUST allow users to dynamically add and remove choices in the question form
- **FR-016**: Each choice MUST have fields for: id, text, and optional imageUrl
- **FR-016a**: System MUST allow users to upload images for question choices directly to Firebase Storage from the browser and store the resulting download URL in the imageUrl field
- **FR-017**: System MUST validate question data client-side before submission
- **FR-018**: System MUST send new question data to POST /admin/quizzes on form submission
- **FR-019**: System MUST populate the form with existing question data when "Edit" is clicked
- **FR-020**: System MUST send updated question data to PUT /admin/quizzes/{quizId} when edit form is submitted
- **FR-021**: System MUST prompt for confirmation when "Delete" is clicked on a question
- **FR-022**: System MUST send delete request to DELETE /admin/quizzes/{quizId} after confirmation

#### Guest Management (CRUD)

- **FR-023**: System MUST fetch all guests by calling GET /admin/guests when the Guest Management page loads
- **FR-024**: System MUST display guest list with columns: Name, Table, Attributes, and actions
- **FR-025**: System MUST provide "Add Guest" button that opens a guest creation form
- **FR-026**: Guest form MUST include fields for: Name (text), TableNumber (number), and attributes (tags)
- **FR-027**: System MUST send new guest data to POST /admin/guests on form submission
- **FR-028**: System MUST support CSV upload for bulk guest creation
- **FR-029**: System MUST parse CSV file and create individual guest records via POST /admin/guests for each row
- **FR-030**: api-server MUST generate a unique guestId for each new guest
- **FR-031**: api-server MUST generate a unique, one-time-use token for each guest upon creation
- **FR-032**: System MUST provide a downloadable CSV template file (guest-template.csv) with exact format and sample data demonstrating edge cases: multiple attributes in quotes, single attribute in quotes, and empty attributes
- **FR-033**: CSV template MUST use headers: Name, TableNumber, Attributes (first row)
- **FR-034**: CSV template MUST use comma delimiters with attributes encoded as comma-separated values in quoted strings (e.g., "groom_friend,speech_guest")
- **FR-034a**: CSV template MUST include 3 sample data rows: Row 1 with format "John Doe,5,\"groom_friend,speech_guest\"", Row 2 with "Jane Smith,3,\"bride_family\"", Row 3 with "Robert Johnson,7,\"\""
- **FR-035**: System MUST validate uploaded CSV files against template structure and reject non-conforming files with specific error messages
- **FR-036**: CSV validation errors MUST reference the template and specify which row/column caused the failure

#### QR Code Generation

- **FR-037**: System MUST provide a "Print All" button on the Guest Management page
- **FR-038**: "Print All" button MUST open a new page at /print route
- **FR-039**: Print page MUST display all guest names with their corresponding QR codes
- **FR-040**: Each QR code MUST encode a URL in the format: {VITE_PARTICIPANT_APP_URL}/join?token={unique-guest-token}, where VITE_PARTICIPANT_APP_URL is configured via environment variable and validated at app startup
- **FR-041**: Print page MUST use a layout optimized for printing physical cards
- **FR-042**: QR codes MUST be unique per guest and link to their pre-registered profile

#### System Configuration

- **FR-043**: System MUST provide a System Configuration page for editing game settings
- **FR-044**: Configuration form MUST read current settings from gameState/live document
- **FR-045**: Configuration form MUST include dropdown for Default Drop-out Rule with options: "period" and "worst_one"
- **FR-046**: Configuration form MUST include dropdown for Default Ranking Rule with options: "time" and "point"
- **FR-047**: System MUST send updated settings to PUT /admin/settings when Save is clicked
- **FR-048**: api-server MUST update the settings object within gameState/live document using Firestore merge operation (merge: true) to preserve other gameState fields

#### Local Development

- **FR-049**: admin-app MUST support configuration via .env file for emulator endpoints
- **FR-050**: admin-app MUST allow pointing to Firebase Auth emulator (default: http://localhost:9099)
- **FR-051**: admin-app MUST allow pointing to Firestore emulator (default: localhost:8080)
- **FR-052**: admin-app MUST allow pointing to Functions emulator for api-server (default: http://localhost:5001)
- **FR-053**: admin-app MUST validate that VITE_PARTICIPANT_APP_URL environment variable is set at application startup and display error if missing

### Key Entities

- **Question**: Represents a quiz question with attributes including period (which round), questionNumber (order), type (four_choice, sorting, survey), text (question content), vtrUrl (optional video), choices (array of answer options), correctAnswer (correct choice or sorting order), and skipAttributes (tags for targeting specific guest groups)

- **Choice**: Represents an answer option within a question with attributes including id (unique identifier like "A", "B", "C"), text (choice content), and optional imageUrl (visual representation of choice)

- **Guest**: Represents a pre-registered event attendee with attributes including guestId (unique identifier), name (display name), tableNumber (seating assignment), attributes (array of tags like "groom_family", "bride_friend"), and a unique one-time-use token for authentication via QR code

- **GameSettings**: Represents initial game configuration stored in gameState/live document including defaultDropoutRule (how players are eliminated: "period" or "worst_one") and defaultRankingRule (how players are ranked: "time" or "point")

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Event organizers can create a complete quiz of 40+ questions in under 60 minutes
- **SC-002**: Event organizers can register a guest list of 80+ guests in under 20 minutes including CSV upload
- **SC-003**: System generates unique QR codes for all registered guests within 5 seconds
- **SC-004**: Printed QR codes successfully authenticate 95% of guests on first scan
- **SC-005**: Admin dashboard loads and displays current statistics in under 2 seconds
- **SC-006**: Question creation form validates data and provides clear error messages for 100% of invalid submissions
- **SC-007**: System prevents unauthorized access to admin features for 100% of non-admin users
- **SC-008**: Event organizers can complete all pre-event setup tasks (questions, guests, QR codes, settings) without requiring technical support
- **SC-009**: CSV guest import successfully processes files with 100+ rows without errors or timeouts

## Assumptions

- Event organizers will have Google accounts that can be granted administrative privileges
- The api-server already has or will implement the required admin endpoints (GET/POST/PUT/DELETE for /admin/quizzes, GET/POST for /admin/guests, PUT for /admin/settings)
- The participant-app is already built or will handle the /join?token= route for guest authentication
- Firebase Authentication, Firestore, and Cloud Functions are already configured for the project
- Image uploads for question choices will be handled via Firebase Storage with client-side upload (users upload directly from browser, storing download URLs in imageUrl fields)
- Event organizers will download and use the provided CSV template (guest-template.csv) for bulk guest imports
- The admin-app will be deployed to a secure, HTTPS-enabled domain
- Only a small number of admin users (2-5) will use the dashboard concurrently
- The gameState/live document structure already exists or will be created to support settings updates
- QR codes will be printed on standard paper/cardstock and must be scannable from typical smartphone cameras
