# Implementation Plan: Real-Time Game State Synchronization Server

**Branch**: `003-socket-server` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-socket-server/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a real-time WebSocket server that acts as a "signal bell" to broadcast game state changes from Firestore to all connected clients simultaneously. The server watches the `gameState/live` Firestore document and broadcasts events (START_QUESTION, GONG_ACTIVATED, GAME_PHASE_CHANGED) to authenticated clients within 100-150ms (p95/p99) to maintain competitive fairness and live-show synchronization across 200+ concurrent connections.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js >=18.0.0 (Firebase Cloud Functions 2nd gen runtime)
**Primary Dependencies**: Socket.io 4.x, Firebase Admin SDK 11.x, Express 4.x (for health checks)
**Storage**: Firebase Firestore (read-only listener on `gameState/live` document)
**Testing**: Jest with socket.io-client for integration tests
**Target Platform**: Google Cloud Run (containerized Node.js, session affinity required)
**Project Type**: Backend server (single Node.js service)
**Performance Goals**:
- <100ms event broadcast synchronization (p99)
- <150ms phase transition latency (p95)
- 200+ concurrent WebSocket connections per instance
- <50ms message delivery delay
**Constraints**:
- Read-only Firestore access (FR-009)
- No state persistence (stateless except active connections)
- Single game room broadcast pattern
- Session affinity required for WebSocket connections
- 99.9% uptime requirement
**Scale/Scope**:
- 200+ simultaneous client connections per instance
- 4 distinct event types (START_QUESTION, GONG_ACTIVATED, GAME_PHASE_CHANGED, IDLE_STATE)
- 4 observability metrics (connection count, auth failures, broadcast latency, listener status)
- Integration with existing Firebase Auth and Firestore infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ COMPLIANT
- **Status**: PASS
- **Location**: `/apps/socket-server/` (new application in monorepo)
- **Shared Dependencies**: Will consume types from `/packages/types/` for GameState, Question, and Answer entities
- **Rationale**: New deployable backend service fits into established `/apps/` directory structure. No shared UI components needed (backend service). Will reference existing types package for Firestore document contracts.

### Principle II: Test-Driven Development (TDD) ⚠️ COMMITMENT REQUIRED
- **Status**: PENDING (must be verified during implementation)
- **Test Strategy**:
  - Unit tests for Firestore listener logic, authentication validation, event mapping
  - Integration tests for Socket.io connection lifecycle, broadcast behavior, reconnection
  - Contract tests for event payloads (validate against expected client schemas)
- **TDD Discipline**: Tests MUST be written before implementation, verified to fail, then made to pass
- **Coverage Target**: >80% for core broadcast logic, 100% for authentication flows

### Principle III: OpenAPI-First API Design ⚠️ NOT APPLICABLE (WebSocket-based)
- **Status**: N/A - Socket.io uses event-based communication, not REST
- **Alternative Contract**: Event schemas MUST be documented in `/specs/003-socket-server/contracts/` with TypeScript type definitions
- **Client Contract**: Event payload types MUST be added to `/packages/types/` for client consumption
- **Rationale**: WebSocket events don't use OpenAPI, but require equivalent type-safe contracts

### Principle IV: Code Quality Gates ✅ COMMITMENT REQUIRED
- **Status**: PENDING (must be enforced pre-commit)
- **Linting**: ESLint + Prettier (matching existing `apps/api-server` configuration)
- **Testing**: `pnpm test` must pass all tests before commit
- **Verification**: Manual connection testing with test clients for each event type
- **Pre-commit**: Hooks will enforce linting and test execution

### Principle V: Shell Command Safety ✅ COMPLIANT
- **Status**: PASS
- **Application**: All CI/CD scripts, build commands, and deployment scripts will use timeout wrappers
- **Example**: `timeout 300 pnpm build`, `timeout 60 pnpm test`

### Summary
- **Blockers**: None
- **Warnings**: TDD and Code Quality gates require disciplined implementation
- **Exceptions**: OpenAPI-First doesn't apply to WebSocket server; alternative contract approach documented

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/socket-server/            # New WebSocket server application
├── src/
│   ├── index.ts              # Server entry point, Socket.io initialization
│   ├── server.ts             # Socket.io server setup with Express
│   ├── auth/
│   │   └── tokenVerifier.ts  # Firebase Auth token validation
│   ├── listeners/
│   │   └── firestoreListener.ts  # Firestore gameState/live watcher
│   ├── events/
│   │   ├── eventMapper.ts    # Maps Firestore changes to Socket.io events
│   │   └── broadcaster.ts    # Broadcasts events to room
│   ├── middleware/
│   │   └── authMiddleware.ts # Socket.io authentication middleware
│   ├── monitoring/
│   │   └── metrics.ts        # Connection count, latency, listener status
│   └── utils/
│       ├── errors.ts         # Error types and handlers
│       └── validator.ts      # Game state document validation
├── tests/
│   ├── unit/
│   │   ├── auth/             # Token verification tests
│   │   ├── events/           # Event mapping tests
│   │   └── utils/            # Validator tests
│   ├── integration/
│   │   ├── connection.test.ts    # Socket.io lifecycle tests
│   │   ├── broadcast.test.ts     # Event broadcast tests
│   │   └── reconnection.test.ts  # Reconnection handling tests
│   └── contract/
│       └── eventSchemas.test.ts  # Event payload validation
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc.json
├── Dockerfile                # Cloud Run container definition
└── .dockerignore

packages/types/                # Shared types (existing, will be extended)
├── src/
│   ├── GameState.ts          # Existing type (will be used)
│   ├── Question.ts           # Existing type (will be used)
│   ├── SocketEvents.ts       # NEW: Socket.io event payload types
│   └── index.ts              # Export all types
└── package.json

specs/003-socket-server/contracts/  # Event type definitions
├── socket-events.ts          # TypeScript definitions for all events
└── README.md                 # Event protocol documentation
```

**Structure Decision**: Monorepo application structure following Constitution Principle I. New `/apps/socket-server/` directory contains isolated Node.js service. Extends existing `/packages/types/` with Socket.io event definitions for type-safe client consumption. Standard `src/` and `tests/` separation with domain-driven organization (auth, listeners, events, monitoring).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. The socket-server adds a new application to the existing monorepo structure, uses WebSocket communication (reasonable alternative to REST for real-time broadcast), and follows all constitution principles with documented TDD and quality gate commitments.
