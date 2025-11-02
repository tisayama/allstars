# Implementation Plan: API Server for Quiz Game System

**Branch**: `001-api-server` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-api-server/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an Express-based RESTful API server deployed on Firebase Cloud Functions to serve as the central game logic controller for the AllStars quiz game platform. The server handles three primary responsibilities: (1) Firebase Authentication-based authorization for three user roles (admin/host via Google Login, participants via Anonymous Login), (2) stateless game state management using Firestore transactions to prevent race conditions, and (3) data persistence for quiz questions, guest management, and answer submissions. The API will expose admin endpoints for quiz CRUD operations, host endpoints for game flow orchestration (6 action types), and participant endpoints for time synchronization and answer submission with duplicate prevention.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+ (Firebase Cloud Functions 2nd gen runtime)
**Primary Dependencies**: Express.js 4.x, Firebase Admin SDK 11.x, firebase-functions 4.x
**Storage**: Firestore (NoSQL document database with transactions and composite indexes)
**Testing**: Jest 29.x for unit/integration tests, Supertest for API endpoint testing, Firebase Emulator Suite for local development
**Target Platform**: Firebase Cloud Functions (2nd generation, Node.js 18 runtime), serverless HTTP functions
**Project Type**: Backend API server within monorepo structure (apps/api-server)
**Performance Goals**: <2 seconds per game state update (SC-004), <50ms server time variance (SC-005), 500 concurrent answer submissions without data loss (SC-007)
**Constraints**: Stateless design (no in-memory state), cold start latency <1s, Firestore document size <1MB, transaction limit 500 writes/batch
**Scale/Scope**: Single game instance, ~500 concurrent guests, ~50 questions per game, <10 admin users, <5 host users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ COMPLIANT

- **Location**: `/apps/api-server/` (matches required apps/ directory structure)
- **Shared Dependencies**: Will consume `/packages/types/` for Question type schema (FR-026)
- **Workspace Protocol**: package.json will use `"workspace:*"` for /packages/types dependency
- **No Boundary Violations**: API server does not directly access other app databases; uses Firestore as shared data layer
- **Coordinated Changes**: Changes to /packages/types Question schema will require coordinated updates to api-server in same commit

### Principle II: Test-Driven Development (TDD) ✅ WILL COMPLY

- **Test-First Approach**: Phase 2 tasks will require writing tests before implementation
- **Test Organization**: `/apps/api-server/tests/` with unit/, integration/, and contract/ subdirectories
- **Coverage Target**: 100% of FR requirements must have corresponding tests
- **Verification**: Red-Green-Refactor cycle will be enforced via task structure in tasks.md

### Principle III: OpenAPI-First API Design ✅ WILL COMPLY

- **Contract Location**: OpenAPI specification will be generated in `/packages/openapi/api-server.yaml`
- **Shared Contract**: Frontend apps (admin-app, host-app, participant-app) will generate TypeScript clients from this spec
- **Pre-Implementation**: Phase 1 will generate complete OpenAPI spec before any implementation tasks
- **Validation**: Contract tests will validate implementation against OpenAPI spec using tools like `openapi-validator`

### Principle IV: Code Quality Gates ✅ WILL COMPLY

- **Linting**: ESLint + Prettier configured for TypeScript in apps/api-server/
- **Pre-Commit**: All linting, formatting, and tests must pass before commits
- **Test Execution**: Jest test suite will run on every commit via package.json scripts
- **Verification Steps**: Each task in tasks.md will include explicit verification criteria

### Principle V: Shell Command Safety ✅ WILL COMPLY

- **Timeout Wrappers**: All npm scripts and CI commands will use timeout mechanisms
- **Build Timeout**: 300s for `npm run build`
- **Test Timeout**: 120s for `jest` execution
- **Deploy Timeout**: 600s for `firebase deploy --only functions`

### Gate Status: ✅ PASSED (Re-evaluated after Phase 1 design)

**Initial Check**: All constitution principles were applicable and achievable for this feature.

**Post-Design Re-evaluation**:
- ✅ **Monorepo Architecture**: Design confirms apps/api-server location with workspace dependency on packages/types
- ✅ **TDD**: Test structure in quickstart.md supports unit/integration/contract test organization
- ✅ **OpenAPI-First**: OpenAPI specification generated in contracts/api-server-openapi.yaml before implementation
- ✅ **Code Quality Gates**: ESLint, Prettier, and Jest configurations documented in quickstart.md
- ✅ **Shell Command Safety**: Timeout values specified in research.md (300s build, 120s test, 600s deploy)

**Final Verdict**: No constitution violations. Design adheres to all principles. Ready to proceed to Phase 2 (task generation via /speckit.tasks).

## Project Structure

### Documentation (this feature)

```text
specs/001-api-server/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-server-openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/api-server/
├── src/
│   ├── index.ts                    # Cloud Functions entry point (exports Express app)
│   ├── middleware/
│   │   ├── auth.ts                 # Firebase Auth token validation middleware
│   │   ├── errorHandler.ts         # Standardized error response formatter
│   │   └── roleGuard.ts            # Role-based access control (admin/host vs participant)
│   ├── routes/
│   │   ├── admin.ts                # Admin quiz CRUD endpoints
│   │   ├── host.ts                 # Host game/advance endpoint
│   │   └── participant.ts          # Participant time & answer endpoints
│   ├── services/
│   │   ├── questionService.ts      # Quiz question business logic
│   │   ├── gameStateService.ts     # Game state transaction logic
│   │   ├── answerService.ts        # Answer submission validation & storage
│   │   └── guestService.ts         # Guest retrieval logic
│   ├── models/
│   │   ├── firestoreCollections.ts # Collection name constants
│   │   └── validators.ts            # Input validation schemas (Zod or Joi)
│   └── utils/
│       ├── firestore.ts             # Firestore client initialization
│       └── errors.ts                # Custom error classes
├── tests/
│   ├── unit/
│   │   ├── services/                # Unit tests for business logic
│   │   ├── middleware/              # Unit tests for middleware
│   │   └── validators/              # Unit tests for input validation
│   ├── integration/
│   │   ├── admin.test.ts            # Admin endpoint integration tests
│   │   ├── host.test.ts             # Host endpoint integration tests
│   │   └── participant.test.ts      # Participant endpoint integration tests
│   └── contract/
│       └── openapi.test.ts          # OpenAPI contract validation tests
├── package.json                     # Dependencies (express, firebase-admin, firebase-functions)
├── tsconfig.json                    # TypeScript configuration
└── .eslintrc.js                     # Linting rules

packages/types/
├── src/
│   ├── Question.ts                  # Question type (period, questionNumber, type, text, choices, correctAnswer, skipAttributes)
│   ├── GameState.ts                 # Game state type (activeQuestionId, phase, isGongActive, results)
│   ├── Guest.ts                     # Guest type (id, status, attributes)
│   ├── Answer.ts                    # Answer submission type (guestId, questionId, answer, responseTimeMs, isCorrect)
│   └── index.ts                     # Barrel export
└── package.json                     # Package metadata

packages/openapi/
├── api-server.yaml                  # OpenAPI 3.0 specification for all API endpoints
└── package.json                     # Package metadata
```

**Structure Decision**: The api-server follows a layered architecture pattern within the monorepo's apps/ directory. The structure separates concerns into routes (HTTP handling), services (business logic with Firestore transactions), middleware (auth, error handling), and models (validation, type definitions). This aligns with Express.js best practices while maintaining compatibility with Firebase Cloud Functions deployment. Shared types are consumed from `/packages/types/` to ensure type safety across client and server. The OpenAPI specification in `/packages/openapi/` serves as the contract for frontend applications to generate TypeScript clients.

## Complexity Tracking

No violations - this section intentionally left empty as all Constitution Check gates passed.
