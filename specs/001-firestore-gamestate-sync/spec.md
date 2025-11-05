# Feature Specification: Fix Firestore Game State Synchronization

**Feature Branch**: `001-firestore-gamestate-sync`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Fix issue: there's a separate architectural issue where the API server's game state isn't being properly synchronized to Firestore, which breaks projector-app's Firestore listener. The problem appears to be in apps/projector-app/src/hooks/useGameState.ts:16-47 and how the API server updates Firestore gameState/live document structure."

## Clarifications

### Session 2025-11-05

- Q: How does the system handle race conditions when multiple components try to update game state simultaneously? → A: Last-write-wins with timestamp validation - accept latest update, log conflicts for monitoring
- Q: How does the system recover if game state updates are written to API server but fail to propagate to data store? → A: Continuous retry forever until successful synchronization
- Q: How should operators be alerted to ongoing synchronization issues? → A: Log to standard output with structured format (JSON) for external monitoring tools to process

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Projector Display Shows Current Game State (Priority: P1)

Event hosts and participants need the projector display to accurately reflect the current game state in real-time, so the quiz experience remains synchronized and participants can see questions, answers, and results without delays or errors.

**Why this priority**: This is the core functionality that's currently broken. Without it, the projector app is unusable and displays error messages instead of game content, making it impossible to run the quiz event.

**Independent Test**: Can be fully tested by starting a quiz game through the host app and verifying that the projector app immediately displays the correct game phase (waiting, accepting answers, showing results, etc.) without showing "Unknown Phase" errors. Delivers immediate value by restoring projector functionality.

**Acceptance Scenarios**:

1. **Given** a quiz game is in "accepting_answers" phase, **When** projector app loads, **Then** projector app displays the current question and accepts answer state
2. **Given** host app transitions game to "showing_results" phase, **When** projector app is monitoring game state, **Then** projector app updates display to show results within 1 second
3. **Given** projector app is running, **When** host app starts a new question, **Then** projector app displays the new question without requiring page refresh

---

### User Story 2 - Game State Updates Persist Across System Restarts (Priority: P2)

Event hosts need game state changes to be reliably stored, so that if any component restarts or temporarily disconnects, the system recovers to the correct state without losing progress or showing stale data.

**Why this priority**: Ensures data consistency and system reliability. While less critical than basic functionality, data persistence prevents confusion and data loss during technical issues.

**Independent Test**: Can be tested by advancing game state through host app, restarting projector app, and verifying it displays current state (not cached/stale state). Delivers value by ensuring reliable recovery from interruptions.

**Acceptance Scenarios**:

1. **Given** game is at question 5 in "showing_distribution" phase, **When** projector app is restarted, **Then** projector app immediately loads and displays question 5 distribution data
2. **Given** game state has been updated via API server, **When** querying the data store directly, **Then** data store reflects the current game state with all required fields populated
3. **Given** multiple clients are monitoring game state, **When** host app makes a state change, **Then** all clients receive the update within 2 seconds

---

### User Story 3 - Graceful Error Handling for Data Issues (Priority: P3)

Event hosts and technical operators need clear error messages when data synchronization issues occur, so they can quickly identify and resolve problems without disrupting the quiz event.

**Why this priority**: Improves troubleshooting and user experience during failures. While important for operational excellence, the system should primarily focus on preventing errors (P1 and P2) before handling them gracefully.

**Independent Test**: Can be tested by simulating various failure scenarios (missing fields, invalid data, network interruptions) and verifying appropriate error messages are shown with recovery guidance. Delivers value by reducing confusion during technical issues.

**Acceptance Scenarios**:

1. **Given** data store connection is temporarily unavailable, **When** projector app attempts to load game state, **Then** projector app displays "Connecting to game..." message and retries connection
2. **Given** game state document has invalid structure, **When** projector app receives the data, **Then** projector app logs detailed error information and displays actionable error message to operators
3. **Given** game state update fails to propagate, **When** timeout threshold is exceeded, **Then** system logs the synchronization failure with timestamp and affected fields

---

### Edge Cases

- What happens when the data store document exists but is missing required fields (currentPhase, currentQuestion, isGongActive)?
- **Race conditions**: System uses last-write-wins strategy with timestamp validation. Latest update is accepted and persisted. Conflicting writes are logged with timestamps for monitoring and debugging. Normal operation assumes sequential updates controlled by host app.
- What happens when projector app's listener is established before game state document is fully initialized?
- **Synchronization failure recovery**: If game state updates are written to API server but fail to propagate to data store, system continuously retries synchronization with exponential backoff until successful. Each retry attempt is logged with timestamp and attempt number. System ensures eventual consistency by never abandoning failed writes.
- What happens when data store returns data but in an incompatible format (e.g., field names don't match expected schema)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ensure all game state updates made through API server are synchronized to data store within 1 second
- **FR-002**: Data store MUST contain complete game state structure including currentPhase, currentQuestion, isGongActive, and lastUpdate fields at all times
- **FR-003**: Projector app MUST successfully receive and parse game state data from data store without encountering undefined values for required fields
- **FR-004**: System MUST validate game state data structure before writing to data store to prevent incomplete or malformed documents
- **FR-005**: Projector app MUST display current game state within 2 seconds of initial load
- **FR-006**: System MUST maintain consistency between API server's internal game state representation and data store's persisted state
- **FR-007**: System MUST log synchronization failures with sufficient detail to diagnose root cause (timestamp, fields affected, error message) in structured JSON format to standard output
- **FR-007a**: System MUST use last-write-wins strategy for concurrent game state updates, accepting the update with latest timestamp and logging conflicts with both timestamps for monitoring
- **FR-007b**: System MUST implement continuous retry with exponential backoff for failed data store writes, never abandoning updates until successful synchronization is achieved, logging each retry attempt with timestamp and attempt number in structured JSON format
- **FR-008**: Projector app MUST handle missing or malformed data gracefully without crashing or displaying technical error messages to end users
- **FR-009**: System MUST support real-time updates where data store changes trigger immediate projector app display updates
- **FR-010**: System MUST preserve existing API fallback mechanism in host app while ensuring data store synchronization works reliably for projector app

### Key Entities

- **Game State**: Represents the current state of the quiz game including phase (ready_for_next, accepting_answers, showing_distribution, etc.), active question, participant count, time remaining, gong status, and results. Must be consistently represented across API server and data store.
- **Game Phase**: The current stage of the quiz (waiting, accepting answers, showing results, etc.). Critical field that must always be defined and match one of the valid phase values.
- **Active Question**: The currently displayed question including text, choices, correct answer, and timing information. May be null when no question is active.
- **Game Results**: Calculated rankings, scores, and statistics for the current or completed question. May be null before results are calculated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Projector app displays correct game state with zero "Unknown Phase" errors in 100% of normal operation scenarios
- **SC-002**: Game state updates propagate from API server to projector app display within 1 second (measured from API call completion to projector UI update)
- **SC-003**: Projector app successfully loads and displays game state on first attempt in 99% of startups (no refresh required)
- **SC-004**: System maintains game state consistency across all components with zero data loss during state transitions
- **SC-005**: Data synchronization failures are logged with actionable diagnostic information in 100% of failure cases using structured JSON format compatible with standard log aggregation tools

## Dependencies & Assumptions

### Dependencies

- Existing data store (Firestore) infrastructure and connectivity
- API server endpoints for game state management
- Projector app's data listener implementation
- Shared type definitions for game state structure
- Host app's game state management functions

### Assumptions

- Data store (Firestore) emulator is correctly configured and accessible during development
- API server has appropriate permissions to write to data store
- Network latency between components is typically under 100ms in production environment
- Game state updates occur sequentially (one at a time) in normal operation
- Existing host app functionality with API fallback will remain unchanged
- Data store document schema can be modified if necessary to support proper synchronization

## Out of Scope

- Implementing new game phases or question types
- Modifying socket server authentication or WebSocket connection logic (separate issue)
- Changing the API server's REST endpoint structure or response formats
- Adding new features to projector app beyond fixing the data synchronization
- Optimizing data store read/write performance (beyond ensuring < 1 second sync)
- Implementing offline mode or caching strategies for projector app
- Refactoring host app's API fallback mechanism or error handling
