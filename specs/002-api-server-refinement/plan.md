# Implementation Plan: API Server Refinement

**Branch**: `002-api-server-refinement` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-api-server-refinement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature refines the existing API server implementation (001-api-server) to align with detailed game flow requirements. The refactoring involves updating Firestore document paths (gameState/live instead of gameState/current), changing guest status terminology (active/dropped instead of alive/eliminated), restructuring answer storage to use sub-collections, adding authentication/authorization, implementing enhanced result calculation with prize carryover, and adding performance monitoring. The technical approach maintains the stateless Express-based Firebase Cloud Functions architecture while adding validation layers, retry logic, and performance tracking.

## Technical Context

**Language/Version**: TypeScript 5.3 with Node.js >=18.0.0
**Primary Dependencies**: Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation)
**Storage**: Firebase Firestore (NoSQL cloud database)
**Testing**: Jest 29.5 (unit, integration, contract tests)
**Target Platform**: Firebase Cloud Functions (serverless)
**Project Type**: Monorepo - apps/api-server (refactoring existing implementation)
**Performance Goals**: P95 < 500ms for read operations, P95 < 1000ms for write operations
**Constraints**: Stateless architecture (no in-memory state), Firestore retry with exponential backoff (max 3 attempts)
**Scale/Scope**: Real-time quiz game with ~10-50 concurrent guests per game session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS

- **Status**: COMPLIANT
- **Verification**: This is a refactoring of existing apps/api-server within the monorepo structure
- **Shared packages**: Will consume types from /packages/types/ (already established in 001-api-server)
- **Coordinated changes**: This refactoring is isolated to api-server, but breaking changes to Firestore paths will require future coordination with socket-server, admin-app, and client apps (documented in spec.md Backward Compatibility section)

### Principle II: Test-Driven Development (TDD) ✅ PASS

- **Status**: COMPLIANT
- **Approach**: Existing test suite from 001-api-server will be updated incrementally following TDD
  1. Update test expectations to new document paths/field names (tests will fail - red)
  2. Refactor implementation to pass updated tests (green)
  3. Add new tests for validation, auth, retry logic (red → green → refactor)
- **Coverage**: Must maintain or improve existing test coverage from 001-api-server

### Principle III: OpenAPI-First API Design ⚠️ NEEDS CLARIFICATION

- **Status**: PARTIAL - Need to determine if 001-api-server has existing OpenAPI specs
- **Action Required**: Phase 0 research must verify existence of /packages/openapi/ specs for api-server
- **If exists**: Update OpenAPI specs first before implementation changes
- **If missing**: Create OpenAPI specs as part of this refinement (adds scope to feature)

### Principle IV: Code Quality Gates ✅ PASS

- **Status**: COMPLIANT
- **Verification**: Existing linting configuration (ESLint + Prettier) from 001-api-server will be maintained
- **Gates**: All changes will run lint, tests, and format checks before commit
- **No blockers**: Standard quality gates apply

### Principle V: Shell Command Safety ✅ PASS

- **Status**: COMPLIANT
- **Verification**: No new shell commands or automation scripts introduced by this refactoring
- **Existing scripts**: Firebase emulator and test scripts already present from 001-api-server

### Gate Summary

**Overall Status**: ✅ CONDITIONAL PASS (1 clarification needed)

**Blockers**:
- NONE (OpenAPI clarification is advisory, not blocking - can create specs if missing)

**Proceed to Phase 0**: YES

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
apps/api-server/                    # Existing API server (from 001-api-server)
├── src/
│   ├── index.ts                   # Firebase Functions entry point
│   ├── app.ts                     # Express app configuration
│   ├── middleware/
│   │   ├── auth.ts               # Authentication middleware (TO BE ENHANCED)
│   │   ├── errorHandler.ts       # Error handling middleware
│   │   └── validation.ts         # Request validation middleware
│   ├── routes/
│   │   ├── admin.ts              # Admin endpoints (game state, questions)
│   │   ├── guest.ts              # Guest endpoints (answers, status)
│   │   └── health.ts             # Health check endpoint
│   ├── services/
│   │   ├── gameStateService.ts   # Game state operations (TO BE REFACTORED)
│   │   ├── questionService.ts    # Question operations (TO BE REFACTORED)
│   │   ├── answerService.ts      # Answer operations (TO BE REFACTORED)
│   │   ├── guestService.ts       # Guest operations (TO BE REFACTORED)
│   │   └── firestoreRetry.ts     # NEW: Retry logic with exponential backoff
│   ├── types/
│   │   └── index.ts              # Local type definitions
│   └── utils/
│       ├── logger.ts             # Logging utilities (TO BE ENHANCED)
│       └── performance.ts        # NEW: Performance tracking middleware
├── tests/
│   ├── unit/                     # Unit tests (TO BE UPDATED)
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   ├── integration/              # Integration tests (TO BE UPDATED)
│   │   └── routes/
│   └── contract/                 # Contract tests (TO BE UPDATED)
│       └── admin.contract.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── .eslintrc.js

packages/types/                     # Shared types (existing)
└── src/
    ├── GameState.ts              # TO BE UPDATED: Add prizeCarryover, new phases
    ├── Guest.ts                  # TO BE UPDATED: Change status enum
    ├── Question.ts               # TO BE UPDATED: Add deadline field
    └── Answer.ts                 # TO BE UPDATED: Move to sub-collection context

packages/openapi/                   # OpenAPI specs (TO BE VERIFIED/CREATED)
└── api-server/
    └── v1/
        └── openapi.yaml          # API contract definitions
```

**Structure Decision**: This is a refactoring of the existing monorepo apps/api-server implementation. The structure follows the single-project pattern established in 001-api-server with Express routes, service layer, and Firebase Functions deployment. Refactoring will touch all service files to update Firestore paths, add validation, implement retry logic, and enhance performance monitoring. Shared types in packages/types/ will also be updated to reflect new field names and data structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All constitutional principles are being followed in this refactoring.
