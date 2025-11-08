# Feature Specification: Firestore Development Environment Initialization Script

**Feature Branch**: `002-firestore-init`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "Firestore Development Environment Initialization Script - Create idempotent initialization script for Firestore emulator that sets up required gameState/live document for development environment"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Development Environment Setup (Priority: P1)

A new developer joins the team, clones the repository, and needs to set up their local development environment. After starting the Firebase emulators, they need to initialize the Firestore database with required documents so that applications can run without errors.

**Why this priority**: This is the foundation requirement - without this, no local development is possible. It directly addresses the critical pain point where developers currently see "GameState document does not exist" errors and must manually execute curl commands.

**Independent Test**: Can be fully tested by starting a clean Firestore emulator, running the initialization script, and verifying that the projector-app loads without errors showing "Get ready for the next question..." instead of "GameState document does not exist".

**Acceptance Scenarios**:

1. **Given** a clean Firestore emulator is running, **When** developer runs the initialization command, **Then** the gameState/live document is created with all required fields populated
2. **Given** the initialization script has completed successfully, **When** developer starts the projector-app, **Then** the application loads without errors and displays the default "ready_for_next" phase
3. **Given** the Firestore emulator is not running, **When** developer runs the initialization command, **Then** the script provides a clear error message indicating the emulator needs to be started first

---

### User Story 2 - Idempotent Re-Initialization (Priority: P2)

A developer accidentally runs the initialization script multiple times (e.g., included in a startup script or run manually after forgetting they already initialized). The script should detect existing data and skip initialization gracefully without errors or data corruption.

**Why this priority**: Prevents accidental data overwrites and allows the script to be safely integrated into automated workflows like startup scripts. This is essential for reliability but not blocking since developers can work around it with manual verification.

**Independent Test**: Can be tested by running the initialization script twice in succession and verifying that the second run skips creation and exits successfully without modifying the existing gameState document.

**Acceptance Scenarios**:

1. **Given** the gameState/live document already exists, **When** developer runs the initialization command, **Then** the script detects the existing document and skips creation with a success message
2. **Given** the script runs as part of an automated startup sequence, **When** the gameState/live document already exists, **Then** the startup sequence continues without errors or delays
3. **Given** the initialization script is run multiple times, **When** checking the gameState document timestamps, **Then** only the first run's timestamp is present (no overwrites occurred)

---

### User Story 3 - Clear Error Reporting for Common Issues (Priority: P3)

A developer encounters problems during initialization (e.g., wrong port, emulator not running, network issues). The script should provide clear, actionable error messages that help them diagnose and fix the issue quickly without needing to debug the script itself.

**Why this priority**: Improves developer experience and reduces time spent troubleshooting, but assumes developers will eventually succeed with the script - this is about speed of recovery rather than core functionality.

**Independent Test**: Can be tested by intentionally creating error conditions (stop emulator, wrong port, network issues) and verifying that each produces a specific, helpful error message rather than a generic stack trace.

**Acceptance Scenarios**:

1. **Given** the Firestore emulator is not running, **When** developer runs the initialization command, **Then** the error message clearly states "Firestore emulator is not running on localhost:8080" with instructions to start it
2. **Given** a network connectivity issue occurs during initialization, **When** the script attempts to connect to Firestore, **Then** the error message distinguishes between connection refused, timeout, and other network errors
3. **Given** the script encounters an unexpected error, **When** the error occurs, **Then** the error message includes the full error details and suggests checking the emulator logs for more information

---

### Edge Cases

- What happens when the Firestore emulator is running on a non-default port (not 8080)?
- How does the script handle partial document creation (e.g., network interruption mid-write)?
- What happens if the gameState collection doesn't exist yet (first run ever)?
- How does the script behave if the Firebase Admin SDK fails to initialize?
- What happens if the developer runs the script against production Firestore by mistake?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Script MUST connect to Firestore emulator at localhost:8080 using project ID "stg-wedding-allstars"
- **FR-002**: Script MUST check if the gameState/live document exists before attempting to create it (idempotency check)
- **FR-003**: Script MUST create a gameState/live document with all required fields: currentPhase, currentQuestion, isGongActive, participantCount, timeRemaining, lastUpdate, results, prizeCarryover, and settings
- **FR-004**: Script MUST initialize currentPhase to "ready_for_next" (a valid GamePhase value)
- **FR-005**: Script MUST initialize numeric fields to zero (participantCount: 0, prizeCarryover: 0) and nullable fields to null (currentQuestion, timeRemaining, results, settings)
- **FR-006**: Script MUST initialize boolean fields to false (isGongActive: false)
- **FR-007**: Script MUST use Firestore server timestamp for the lastUpdate field
- **FR-008**: Script MUST use TypeScript types from @allstars/types package to ensure type safety
- **FR-009**: Script MUST exit with code 0 on success and code 1 on failure
- **FR-010**: Script MUST provide clear console output indicating success or failure with contextual information
- **FR-011**: Script MUST detect when connecting to production Firestore and refuse to run with an error message
- **FR-012**: Script MUST be accessible via "pnpm run init:dev" command from the repository root
- **FR-013**: Script MUST handle connection errors gracefully and provide actionable error messages
- **FR-014**: Script MUST log its actions (checking for existing data, creating new data, skipping) with clear status indicators (✓, ✗)

### Key Entities *(include if feature involves data)*

- **GameState Document**: Singleton document at firestore path `gameState/live` representing the current state of the game quiz system. Contains phase information, active question reference, participant count, timing data, results, and configuration settings. This is the central state that all applications (projector-app, host-app, participant-app) depend on to function correctly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New developers can complete first-time environment setup and run applications without errors in under 5 minutes after starting the Firestore emulator
- **SC-002**: The initialization script completes successfully in under 3 seconds on a typical development machine
- **SC-003**: Running the initialization script multiple times produces no errors and maintains data integrity (idempotent behavior verified)
- **SC-004**: When Firestore emulator is not running, the script provides an error message within 2 seconds that clearly identifies the issue
- **SC-005**: Applications (projector-app, host-app, etc.) start successfully and display expected initial state after running the initialization script
- **SC-006**: Zero manual curl commands or Firestore console operations are required to set up a working development environment

## Assumptions *(include if making informed decisions)*

### Development Environment Assumptions

- **A-001**: Firestore emulator is always run on localhost:8080 for development (standard Firebase emulator default)
- **A-002**: The script only needs to initialize the gameState/live document; other collections (guests, questions, settings) will be handled separately or are not required for initial application startup
- **A-003**: All developers use pnpm as the package manager (consistent with repository setup)
- **A-004**: The tsx package is available in devDependencies for running TypeScript scripts directly
- **A-005**: Firebase Admin SDK is already available as a dependency in the monorepo
- **A-006**: Developers run Firebase emulators using the standard firebase-tools CLI

### Data Initialization Assumptions

- **A-007**: The "ready_for_next" phase is the correct initial state for a fresh game (based on GamePhase type definition)
- **A-008**: Starting with zero participants, zero prize carryover, and no active question represents a valid initial state
- **A-009**: Applications can handle null values for optional fields (currentQuestion, timeRemaining, results, settings) at startup
- **A-010**: The gameState collection is automatically created by Firestore when the first document is written (no explicit collection creation needed)

### Safety Assumptions

- **A-011**: Production Firestore instances will not have FIRESTORE_EMULATOR_HOST environment variable set, allowing the script to detect and prevent accidental production writes
- **A-012**: Connection failures (ECONNREFUSED, timeout) are sufficient indicators that the emulator is not running
- **A-013**: If the gameState/live document exists, it is assumed to be valid and should not be overwritten (idempotency takes precedence over validation)

## Out of Scope

The following are explicitly not part of this specification:

- **OOS-001**: Automatic execution of the initialization script on "pnpm run dev" startup
- **OOS-002**: Initialization of other Firestore collections (guests, questions, settings, answers)
- **OOS-003**: Command-line arguments to customize initialization data or behavior
- **OOS-004**: Integration with CI/CD pipeline for E2E test environment setup
- **OOS-005**: Validation or migration of existing gameState documents
- **OOS-006**: Seed data for development testing (sample questions, guest accounts, etc.)
- **OOS-007**: Configuration for non-standard emulator ports or remote emulators
- **OOS-008**: Backup or export of existing data before initialization
- **OOS-009**: Web-based UI or admin panel for triggering initialization
- **OOS-010**: Initialization of Firebase Authentication emulator data
