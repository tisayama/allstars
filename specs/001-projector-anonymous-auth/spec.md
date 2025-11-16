# Feature Specification: Projector Anonymous Authentication

**Feature Branch**: `001-projector-anonymous-auth`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "projector-appにFirebase Anonymous Authenticationを実装したい。projector-appはFirestoreのgameStateをReadすることができ(Writeはできないし、しない)、WebSocketで更新イベントを受信する。また、冗長性確保のためFirestoreのgameStateの更新通知でも同じ内容を受け取る。そのほか、時刻校正の処理もWebSocketで行う。participant-appでちょうどFirebase Anonymous Authenticationを利用しているので、これと同じ認証パターンを使って、read-only操作のみ行いたい。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Authentication on App Launch (Priority: P1)

When the projector application launches, it must automatically authenticate using Firebase Anonymous Authentication without any user interaction, allowing the display to immediately begin showing game state information.

**Why this priority**: This is the foundation of all projector functionality. Without authentication, the app cannot access Firestore or WebSocket services. This must work first for any other feature to function.

**Independent Test**: Can be fully tested by launching the app and verifying that Firestore read access is granted and WebSocket connection establishes within 3 seconds, delivering the value of immediate operational readiness.

**Acceptance Scenarios**:

1. **Given** the projector app is launched for the first time, **When** the app initializes, **Then** Firebase Anonymous Authentication completes automatically and the app receives a valid authentication token
2. **Given** the projector app has been closed and reopened, **When** the app initializes, **Then** the existing anonymous session is restored and authentication completes without re-authentication delay
3. **Given** the anonymous session has expired after 24 hours, **When** the app initializes, **Then** a new anonymous authentication is performed automatically and completes successfully

---

### User Story 2 - Read-Only Access to Game State (Priority: P1)

Once authenticated, the projector must be able to read the current game state from Firestore to display questions, rankings, and other game information to the audience.

**Why this priority**: This is the core functionality of the projector - displaying game information. Without read access to game state, the projector serves no purpose.

**Independent Test**: Can be fully tested by authenticating the app and verifying that it can successfully read the `gameState/live` document from Firestore and display its contents, delivering the value of real-time game information display.

**Acceptance Scenarios**:

1. **Given** the projector is authenticated, **When** the app attempts to read the `gameState/live` document, **Then** the read operation succeeds and returns the current game state
2. **Given** the projector is authenticated, **When** Firestore security rules evaluate the read request, **Then** the anonymous user is granted read access to game state collections
3. **Given** the projector is authenticated, **When** the app attempts to write to the `gameState/live` document, **Then** the write operation fails with a permission denied error

---

### User Story 3 - WebSocket Connection for Real-Time Updates (Priority: P1)

The projector must establish a WebSocket connection to receive real-time game events (question start, phase changes, etc.) and system events (time synchronization) to keep the display synchronized with game progression.

**Why this priority**: Real-time updates are essential for the projector to display timely information. Without WebSocket connection, the projector would need to poll Firestore continuously, which is inefficient and may have lag.

**Independent Test**: Can be fully tested by establishing a WebSocket connection with the authenticated Firebase token and verifying that the app receives test events within 500ms, delivering the value of instant game state synchronization.

**Acceptance Scenarios**:

1. **Given** the projector is authenticated with Firebase, **When** the app connects to the WebSocket server, **Then** the connection is established successfully using the Firebase ID token for authentication
2. **Given** the WebSocket connection is established, **When** the host triggers a game event (e.g., GONG_ACTIVATED), **Then** the projector receives the event within 500ms
3. **Given** the WebSocket connection is established, **When** the server sends a time synchronization message, **Then** the projector processes the time correction and adjusts its internal clock accordingly

---

### User Story 4 - Dual Update Channel Redundancy (Priority: P2)

To ensure reliability, the projector must receive game state updates through both WebSocket events (primary) and Firestore snapshot listeners (backup), automatically using whichever channel delivers the update first.

**Why this priority**: This provides fault tolerance and ensures the display remains synchronized even if one update channel fails or experiences delays. This is less critical than basic connectivity but important for production reliability.

**Independent Test**: Can be fully tested by triggering a game state update and verifying that the projector receives it through at least one channel within 500ms, even if WebSocket or Firestore is temporarily unavailable, delivering the value of uninterrupted display operation.

**Acceptance Scenarios**:

1. **Given** both WebSocket and Firestore listeners are active, **When** the game state changes, **Then** the projector receives the update through at least one channel within 500ms
2. **Given** the WebSocket connection is temporarily disconnected, **When** the game state changes in Firestore, **Then** the projector still receives the update through the Firestore snapshot listener
3. **Given** both channels deliver the same update, **When** the projector receives duplicate updates, **Then** only one update is processed and duplicate is ignored based on timestamp or event ID

---

### User Story 5 - Automatic Reconnection on Network Issues (Priority: P2)

If the network connection is lost or the WebSocket disconnects, the projector must automatically attempt to reconnect and re-authenticate without manual intervention.

**Why this priority**: For an unattended display system, automatic recovery is essential. This ensures the projector continues operating even after temporary network issues.

**Independent Test**: Can be fully tested by simulating a network disconnect, waiting 10 seconds, restoring the connection, and verifying that the projector automatically reconnects to WebSocket and resumes receiving updates, delivering the value of hands-free operation.

**Acceptance Scenarios**:

1. **Given** the projector is connected and displaying game state, **When** the network connection is lost for 10 seconds, **Then** the projector automatically detects the disconnection and shows a connection status indicator
2. **Given** the network connection is restored after a disruption, **When** the projector detects network availability, **Then** it automatically re-authenticates with Firebase and re-establishes the WebSocket connection within 5 seconds
3. **Given** the WebSocket server is restarted, **When** the projector detects the disconnection, **Then** it retries the connection using exponential backoff (1s, 2s, 4s, up to 60s) until successful

---

### Edge Cases

- What happens when Firebase Authentication service is temporarily unavailable during app launch?
  - App should retry authentication with exponential backoff and display a "Connecting..." status indicator
- What happens when the anonymous session token expires while the app is running?
  - App should automatically refresh the token using Firebase's built-in token refresh mechanism
- What happens when both WebSocket and Firestore fail to deliver updates?
  - App should display a "Connection Lost" warning to indicate the display may be out of sync
- What happens when Firestore security rules are misconfigured and deny read access?
  - App should log the permission denied error and display a clear error message indicating configuration issue
- What happens when the same update is received through both WebSocket and Firestore with slightly different timestamps?
  - App should use the update with the newest timestamp and ignore the older duplicate

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate automatically using Firebase Anonymous Authentication on app launch without user interaction
- **FR-002**: System MUST persist the anonymous authentication session for 24 hours to avoid re-authentication on app restart
- **FR-003**: System MUST provide read-only access to Firestore collections (gameState, questions, guests) for authenticated anonymous users
- **FR-004**: System MUST prevent write operations to Firestore from the projector app and fail with permission denied errors
- **FR-005**: System MUST establish WebSocket connection using the Firebase ID token for authentication
- **FR-006**: System MUST receive real-time game events through WebSocket (GONG_ACTIVATED, START_QUESTION, GAME_PHASE_CHANGED)
- **FR-007**: System MUST receive time synchronization messages through WebSocket and adjust internal clock accordingly
- **FR-008**: System MUST listen to Firestore snapshot updates on the `gameState/live` document as a backup update channel
- **FR-009**: System MUST process game state updates from whichever channel (WebSocket or Firestore) delivers first and ignore duplicates
- **FR-010**: System MUST automatically re-authenticate and reconnect if the network connection is lost and restored
- **FR-011**: System MUST use exponential backoff for WebSocket reconnection attempts (1s, 2s, 4s, 8s, up to 60s max delay)
- **FR-012**: System MUST display connection status indicators showing Firebase auth state, WebSocket connection state, and Firestore listener state
- **FR-013**: System MUST reuse the authentication pattern from participant-app (anonymous auth with automatic session management)

### Key Entities

- **Anonymous User Session**: Represents the projector's authentication state
  - Firebase UID (unique identifier for anonymous session)
  - ID Token (JWT token for authenticating to services)
  - Session creation timestamp
  - Token expiration time (automatically managed by Firebase)

- **Game State**: The current state of the quiz game (read-only access)
  - Current phase (waiting, showing_question, showing_results, etc.)
  - Active question ID
  - Current rankings
  - Timer state

- **WebSocket Events**: Real-time notifications from the server
  - Event type (GONG_ACTIVATED, START_QUESTION, GAME_PHASE_CHANGED, TIME_SYNC)
  - Event payload (question data, phase information, time correction data)
  - Event timestamp (for duplicate detection)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Projector app completes automatic authentication within 3 seconds of app launch
- **SC-002**: Projector app maintains connection and receives updates for 8+ hour sessions without requiring restart
- **SC-003**: Projector app receives game state updates within 500ms through at least one channel (WebSocket or Firestore)
- **SC-004**: Projector app successfully recovers from network disconnections within 10 seconds of network restoration
- **SC-005**: Projector app displays connection status accurately, updating within 1 second of any connection state change
- **SC-006**: Projector app handles 100% of duplicate updates correctly (processes first, ignores subsequent duplicates)
- **SC-007**: Projector app operates for full wedding reception duration (typically 3-4 hours) without authentication errors or manual intervention

### Business Value

This feature enables the projector to operate as an unattended display system, reducing operational overhead and ensuring guests see a seamless, synchronized game experience throughout the wedding reception.

## Assumptions

- Firebase Authentication service is configured and available
- Firestore security rules will be updated to allow anonymous read access to gameState, questions, and guests collections
- WebSocket server will accept Firebase ID tokens for authentication
- Network connectivity is generally stable, with only temporary disruptions expected
- Projector hardware/browser supports localStorage for session persistence
- Session duration of 24 hours is sufficient (wedding receptions typically last 3-4 hours)
- Time synchronization messages from WebSocket include server timestamp and client should calculate offset
- Duplicate detection can be based on event timestamps or game state version numbers
- The authentication pattern from participant-app (signInAnonymously + onAuthStateChanged) is suitable for projector use case

## Out of Scope

- User-initiated authentication or login UI (projector is fully automatic)
- Admin authentication or access control (projector is read-only display only)
- Custom token generation or API key-based authentication (anonymous auth is sufficient)
- Write operations or bidirectional communication (projector is display-only)
- Offline mode or local data caching (projector requires live connection)
- Multi-projector synchronization or leader election (each projector operates independently)
- Advanced security like encryption of WebSocket messages (relying on Firebase token security)
