# Feature Specification: Real-Time Game State Synchronization Server

**Feature Branch**: `003-socket-server`
**Created**: 2025-11-02
**Status**: Draft
**Input**: User description: "please implement socket-server. Here is the detailed operational specification for the socket-server. This component is crucial for the low-latency, everyone-at-once feeling of the game."

## Clarifications

### Session 2025-11-03

- Q: When the Firestore listener temporarily loses connection, should the server continue accepting client connections or enter a degraded state? → A: Stop accepting new connections; existing clients stay connected but paused
- Q: How should the server handle rapid successive game state updates (e.g., 5 updates within 100ms)? → A: Broadcast every update immediately; clients receive all state transitions
- Q: What should clients receive when connecting before any game state exists? → A: Send empty/idle state event indicating no active game session
- Q: When the server detects malformed/invalid data in the `gameState/live` document, what should it do? → A: Log error and skip broadcasting that update; maintain connections
- Q: What operational observability signals are required for production readiness? → A: Connection count, auth failures, broadcast latency (p95/p99), Firestore listener status

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simultaneous Question Start (Priority: P1)

As a game participant, I need all players to see the new question at exactly the same moment, so that the competition is fair and everyone has equal time to answer.

**Why this priority**: This is the core value proposition of the real-time system. Without instant synchronization, the game loses its competitive integrity and "live show" feel.

**Independent Test**: Can be fully tested by connecting multiple test clients to the server, triggering a question start event, and measuring timestamp deltas. Delivers immediate value by proving the synchronization mechanism works.

**Acceptance Scenarios**:

1. **Given** 100 participants are connected and waiting, **When** the host starts a new question, **Then** all participants receive the START_QUESTION event within 100ms of each other with synchronized server timestamps
2. **Given** participants on different network conditions (3G, 4G, WiFi), **When** a question starts, **Then** all clients can calculate accurate countdown timers based on the server timestamp regardless of network latency
3. **Given** a question is in progress, **When** new participants join mid-question, **Then** they see the current question state without disrupting other players' experience

---

### User Story 2 - Instant Phase Transitions (Priority: P1)

As a host or projector operator, I need the display to transition instantly to show results, answer distributions, or other game phases when I trigger them, so that the show flow feels seamless and professionally produced.

**Why this priority**: Critical for maintaining show momentum and preventing awkward gaps where participants are unsure what's happening. Part of the core real-time experience.

**Independent Test**: Can be fully tested by triggering phase changes and measuring projector response time. Delivers value by enabling smooth show operations.

**Acceptance Scenarios**:

1. **Given** participants have submitted answers, **When** the host triggers "show distribution", **Then** the projector displays the answer distribution within 200ms
2. **Given** the distribution is displayed, **When** the host triggers "reveal correct answer", **Then** all connected clients see the correct answer highlighted instantly
3. **Given** a question round is complete, **When** the host triggers "show results", **Then** the projector displays the updated rankings within 300ms

---

### User Story 3 - GONG Event Broadcasting (Priority: P2)

As a participant or audience member, I need to hear the dramatic GONG sound exactly when it's triggered, so that I know this is the final question and can experience the heightened tension.

**Why this priority**: Important for game drama and participant experience, but not essential for basic functionality. Can be added after core synchronization works.

**Independent Test**: Can be fully tested by triggering the GONG flag in Firestore and verifying all connected projectors play the sound simultaneously.

**Acceptance Scenarios**:

1. **Given** multiple projectors are connected, **When** the host activates the GONG, **Then** all projectors play the sound effect within 100ms of each other
2. **Given** the GONG has been activated, **When** the next question starts, **Then** all clients display visual indicators that this is the final question
3. **Given** participants on mobile devices, **When** the GONG is activated, **Then** they receive a silent visual notification (respecting mobile sound policies)

---

### User Story 4 - Authenticated Connection Management (Priority: P1)

As a system operator, I need only authenticated users to connect to the real-time server, so that unauthorized clients cannot disrupt the game or access game state.

**Why this priority**: Essential security requirement that must be in place from day one. Without authentication, the system is vulnerable to abuse.

**Independent Test**: Can be fully tested by attempting connections with valid/invalid tokens and verifying only authenticated clients can join the game room.

**Acceptance Scenarios**:

1. **Given** a client attempts to connect, **When** they provide a valid Firebase Auth token, **Then** they are admitted to the game room and receive state updates
2. **Given** a client attempts to connect, **When** they provide an invalid or expired token, **Then** the connection is rejected with an authentication error
3. **Given** a client is connected, **When** their token expires, **Then** they are gracefully disconnected and must re-authenticate

---

### User Story 5 - Graceful Disconnection Handling (Priority: P3)

As a participant with an unstable network connection, I need the system to handle my disconnections gracefully, so that I can rejoin quickly without losing my game progress.

**Why this priority**: Important for reliability but not blocking for initial launch. Can be enhanced iteratively based on real-world connection patterns.

**Independent Test**: Can be fully tested by simulating network interruptions and verifying reconnection behavior without needing the full game flow.

**Acceptance Scenarios**:

1. **Given** a participant loses network connection, **When** they reconnect within 30 seconds, **Then** they automatically rejoin the game room and receive current state
2. **Given** a projector disconnects, **When** it reconnects, **Then** it resumes receiving all game phase events without manual intervention
3. **Given** 50+ clients disconnect simultaneously (network outage), **When** they reconnect, **Then** the server handles the reconnection load without degradation

---

### Edge Cases

- **Firestore listener network interruption**: Server stops accepting new client connections and enters degraded state. Existing clients remain connected but receive no state updates until Firestore connection is restored.
- How does the system handle a Cloud Run instance restart mid-game (session affinity preservation)?
- **Rapid successive game state updates**: Server broadcasts every update immediately without debouncing or throttling. Clients receive all state transitions to maintain complete event fidelity.
- **Clients connecting before game start**: Server sends an empty/idle state event to newly connected clients when no active game session exists, allowing clients to display appropriate "waiting" state.
- What if a client sends authentication credentials after already receiving events (authentication timing)?
- How does the system handle WebSocket connection limits per Cloud Run instance (horizontal scaling)?
- What happens when client clocks are significantly out of sync with server time (>5 seconds)?
- **Malformed/corrupted game state data**: Server logs the error and skips broadcasting that specific update while maintaining all existing client connections. Normal operation resumes with the next valid update.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a persistent listener on the `gameState/live` Firestore document upon server initialization
- **FR-002**: System MUST verify client authentication credentials before admitting any client connection
- **FR-003**: System MUST join all authenticated clients to a single broadcast room (e.g., "gameRoom")
- **FR-003a**: System MUST send an empty/idle state event to newly connected clients when no active game session exists in the `gameState/live` document
- **FR-004**: System MUST broadcast a START_QUESTION event containing questionId and serverStartTime when `currentPhase` changes to "accepting_answers"
- **FR-005**: System MUST broadcast a GONG_ACTIVATED event when the `isGongActive` flag changes to true
- **FR-006**: System MUST broadcast a GAME_PHASE_CHANGED event with the new phase value whenever `currentPhase` changes to any value other than "accepting_answers"
- **FR-007**: System MUST include accurate server timestamps in all time-sensitive events for client clock synchronization
- **FR-008**: System MUST reject unauthenticated connection attempts with appropriate error messages
- **FR-009**: System MUST NOT write any data to Firestore (read-only listener pattern)
- **FR-010**: System MUST NOT subscribe to or process the `answers` or `guests` collections (only watches `gameState/live`)
- **FR-011**: System MUST handle Firestore listener errors gracefully and attempt to re-establish the connection
- **FR-011a**: System MUST enter degraded state when Firestore listener disconnects, stopping new client connections while maintaining existing connections without updates until recovery
- **FR-011b**: System MUST broadcast all game state updates immediately without debouncing or throttling to ensure complete event fidelity
- **FR-011c**: System MUST validate game state document structure before broadcasting; when malformed data is detected, log the error and skip that update while maintaining all client connections
- **FR-012**: System MUST support persistent bidirectional connections with session affinity enabled
- **FR-013**: System MUST disconnect clients whose authentication tokens expire during their session
- **FR-014**: System MUST support concurrent connections from participants, hosts, and projector clients without role-based filtering (all clients receive all events)

### Observability Requirements

- **OR-001**: System MUST emit metrics for current connection count (total authenticated connections)
- **OR-002**: System MUST log authentication failures with timestamps and attempted credentials (without sensitive data)
- **OR-003**: System MUST track broadcast latency at 95th and 99th percentiles for performance monitoring
- **OR-004**: System MUST expose Firestore listener connection status (connected/disconnected/error) for health monitoring

### Key Entities

- **Real-Time Connection**: Represents an authenticated client connection (participant, host, or projector) subscribed to game state events. Identified by user ID. No persistent storage required.
- **Game State Document**: The single source of truth at `gameState/live` in Firestore. Contains `currentPhase`, `currentQuestionId`, `isGongActive`, and other game state fields. The server is a passive observer of this entity.
- **Broadcast Room**: A logical grouping ("gameRoom") containing all authenticated connections. Used for efficient message broadcasting to all clients simultaneously.
- **Server Timestamp**: A millisecond-precision timestamp included in events to enable client-side clock synchronization and countdown timers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All connected clients receive START_QUESTION events within 100ms of each other (99th percentile)
- **SC-002**: System supports 200+ concurrent connections on a single server instance without message delivery delays exceeding 50ms
- **SC-003**: Server maintains 99.9% uptime during game sessions with automatic reconnection for Firestore listener failures
- **SC-004**: Authentication failures are detected and rejected within 500ms of connection attempt
- **SC-005**: Phase transition events (GAME_PHASE_CHANGED) are delivered to all clients within 150ms (95th percentile)
- **SC-006**: Server memory usage remains stable under continuous operation for 8+ hour game sessions (no memory leaks)
- **SC-007**: Zero unauthorized clients can establish connections (100% authentication enforcement)
- **SC-008**: Clients can calculate countdown timers accurate to within 100ms of server time using provided timestamps

## Assumptions

- **A-001**: Backend service credentials are provided via secure configuration
- **A-002**: Server infrastructure is configured with session affinity enabled before deployment
- **A-003**: The `gameState/live` document structure includes fields: `currentPhase`, `currentQuestionId`, `isGongActive` (as described in the operational spec)
- **A-004**: Clients are responsible for implementing exponential backoff reconnection logic if disconnected
- **A-005**: All clients are assumed to have reasonably accurate system clocks (within 10 seconds of NTP time)
- **A-006**: Network latency between server and clients is assumed to be under 500ms for 95% of connections
- **A-007**: A single server instance can handle 200+ connections; horizontal scaling will be needed for larger games but is outside this feature's scope
- **A-008**: The server does not need to persist connection state; reconnecting clients can query current game state from Firestore directly

## Out of Scope

- **OS-001**: Processing or aggregating answer submissions from the `answers` collection (handled by `api-server`)
- **OS-002**: Calculating game rankings or results (handled by `api-server`)
- **OS-003**: Managing individual guest state or status updates (handled by client-side Firestore listeners)
- **OS-004**: Rate limiting or throttling client message sends (assuming clients are read-only event consumers)
- **OS-005**: Custom client-to-server messages beyond authentication (server is broadcast-only)
- **OS-006**: Advanced analytics such as message content analysis, user behavior tracking, or business intelligence dashboards (only basic operational metrics required per OR-001 through OR-004)
- **OS-007**: Handling multiple concurrent games (single game room assumption)
- **OS-008**: Client-side clock synchronization algorithm implementation (clients are responsible for this)
