# Feature Specification: Development Server Configuration

**Feature Branch**: `001-dev-server-config`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "pnpm run devで、projector-appが起動するようにして。また、pnpm run devで起動するViteのappのポート番号が固定されるようにして。"

## Clarifications

### Session 2025-11-05

- Q: Which specific port numbers should be assigned to each application? → A: Use thematic spacing - admin-5170, host-5175, participant-5180, projector-5185
- Q: When a port conflict is detected, should the entire system fail or continue with partial startup? → A: Retry with fallback on alternate ports if configured
- Q: What label name and color should be used for projector-app in the concurrently output? → A: projector with bgCyan color

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start All Applications Simultaneously (Priority: P1)

As a developer, when I run `pnpm run dev`, I want all application services to start together including the projector-app, so I can develop and test the full system without running multiple terminal commands.

**Why this priority**: This is the primary workflow improvement - allowing developers to start the entire development environment with a single command. Without projector-app running, the full game flow cannot be tested during development.

**Independent Test**: Can be fully tested by running `pnpm run dev` and verifying that projector-app starts alongside admin-app, host-app, participant-app, socket-server, and Firebase emulators. Delivers the value of a complete development environment startup.

**Acceptance Scenarios**:

1. **Given** I am in the project root directory, **When** I run `pnpm run dev`, **Then** the projector-app development server starts successfully alongside all other services
2. **Given** all services are running via `pnpm run dev`, **When** I open the projector-app URL in a browser, **Then** the projector interface loads correctly
3. **Given** I run `pnpm run dev`, **When** I check the terminal output, **Then** I can see the "projector" label with cyan background color for projector-app logs, distinct from other services

---

### User Story 2 - Consistent Port Assignment (Priority: P1)

As a developer, I want each Vite-based application (admin-app, host-app, participant-app, projector-app) to always use the same port number across restarts, so I don't need to update URLs or bookmarks when restarting the development server.

**Why this priority**: Port stability is critical for developer workflow - bookmarked URLs, mobile device testing configurations, and cross-service communication all depend on consistent ports. Random port assignment causes friction and wastes developer time.

**Independent Test**: Can be tested by starting and stopping `pnpm run dev` multiple times and verifying each app always gets the same port. Delivers predictable URLs for development workflow.

**Acceptance Scenarios**:

1. **Given** I start the development server, **When** I note the port numbers for each app, **Then** the same apps use the same ports on subsequent restarts
2. **Given** the development server is running, **When** I access an app at its designated port, **Then** the correct application loads (not a different app due to port conflict)
3. **Given** I have port conflicts from other processes, **When** I start `pnpm run dev`, **Then** the system attempts configured fallback ports and reports which port was actually used

---

### Edge Cases

- **Port conflict behavior**: When a designated port is already in use, the system will attempt to use configured fallback ports (if specified) before failing. If no fallback is configured or all fallback ports are unavailable, the service will fail with a clear error message.
- **Partial service failure**: If projector-app fails to start while other services succeed, concurrently will report the failure in the console output with distinct labels, but other services will continue running.
- **Vite automatic port fallback**: Vite's automatic port incrementing behavior will be disabled to prevent unpredictable port assignments. Only explicitly configured fallback ports will be used.
- **Concurrently failure handling**: Concurrently will continue running other services even if one service fails, allowing developers to work with partially functional environments while debugging port conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST include projector-app in the root-level `pnpm run dev` command
- **FR-002**: System MUST assign port 5170 to admin-app's Vite development server
- **FR-003**: System MUST assign port 5175 to host-app's Vite development server
- **FR-004**: System MUST assign port 5180 to participant-app's Vite development server
- **FR-005**: System MUST assign port 5185 to projector-app's Vite development server
- **FR-006**: System MUST prevent Vite from automatically using a different port if the configured port is unavailable
- **FR-007**: System MUST display distinct log output labels for each service in the concurrently output, with projector-app using label "projector" and background color cyan (bgCyan)
- **FR-008**: System MUST report clear errors when a required port is unavailable, including which port was in conflict
- **FR-009**: Each Vite application MUST use a unique port number to avoid conflicts
- **FR-010**: Port configuration MUST be documented for developer reference
- **FR-011**: System MAY support optional fallback ports for each application, which will be attempted in order if the primary port is unavailable

### Port Assignments

- **admin-app**: Port 5170 (primary)
- **host-app**: Port 5175 (primary)
- **participant-app**: Port 5180 (primary)
- **projector-app**: Port 5185 (primary)

### Console Output Configuration

- **projector-app**: Label "projector" with background color cyan (bgCyan)
- Existing labels maintained: admin (bgBlue), host (bgMagenta), participant (bgGreen), socket (bgYellow), firebase (bgRed)

### Key Entities

- **Vite Application**: A React-based frontend application that runs a Vite development server (admin-app, host-app, participant-app, projector-app)
- **Development Server**: The combined set of services started by `pnpm run dev` including all Vite apps, socket server, and Firebase emulators
- **Port Assignment**: The mapping of each Vite application to a specific port number
- **Fallback Port**: An optional secondary port that an application will attempt to use if the primary port is unavailable
- **Console Label**: A color-coded text label used by concurrently to identify log output from each service

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can start the complete development environment (including projector-app) in under 30 seconds with a single command
- **SC-002**: Port numbers remain consistent across 100% of development server restarts when no port conflicts exist
- **SC-003**: Developers can access each application at a predictable URL without checking terminal output
- **SC-004**: Port conflicts are detected and reported within 5 seconds of running `pnpm run dev`
- **SC-005**: Developer setup time is reduced by eliminating the need to manually start projector-app in a separate terminal
- **SC-006**: When fallback ports are configured and primary port conflicts occur, services start successfully on fallback ports with clear console notification
- **SC-007**: Developers can visually distinguish projector-app logs from other services by the cyan background label in terminal output

## Scope & Constraints *(mandatory)*

### In Scope

- Adding projector-app to the root package.json dev script
- Configuring fixed primary ports for all Vite applications
- Disabling Vite's automatic port fallback behavior
- Adding distinct color-coded label "projector" with bgCyan for projector-app in concurrently output
- Documenting the port assignments
- Optional: Configuring fallback ports for port conflict scenarios

### Out of Scope

- Changing the existing port numbers of services that already have fixed ports (socket-server, Firebase emulators)
- Modifying the build or production configurations
- Adding automatic port conflict resolution without explicit fallback configuration
- Creating Docker or containerized development environments
- Modifying the application code or routing logic
- Automatic port discovery or dynamic port allocation
- Changing existing console labels or colors for other services

### Constraints

- Must maintain compatibility with existing development workflow
- Must work across different developer machines (Linux, macOS, Windows)
- Port numbers must not conflict with commonly used development ports (3000, 8000, 8080, etc.)
- Changes must not affect production builds or deployments
- Fallback ports (if configured) must also be unique across all applications
- Console label colors must be distinct and supported by the concurrently package

## Assumptions *(mandatory)*

- Developers have pnpm installed and configured
- Developers understand basic port concepts and can resolve conflicts when necessary
- The concurrently package supports adding another parallel process
- Vite supports strict port configuration to prevent fallback behavior
- Projector-app has a valid package.json with a "dev" script
- Port numbers below 1024 are avoided (require root/admin privileges on most systems)
- Each application can run on any available port (no hardcoded port requirements in application logic)
- Developers can tolerate partial service startup when debugging port conflicts
- Terminal supports ANSI color codes for background colors (bgCyan)

## Dependencies *(include if relevant)*

- Concurrently package for running multiple processes in parallel
- Vite development server for each frontend application
- PNPM workspace configuration
- Existing dev scripts in each application's package.json
