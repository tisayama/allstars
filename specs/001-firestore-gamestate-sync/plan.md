# Implementation Plan: Fix Firestore Game State Synchronization

**Branch**: `001-firestore-gamestate-sync` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-firestore-gamestate-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The API server's game state updates are not being properly synchronized to Firestore, causing the projector-app's Firestore listener to receive incomplete data with missing required fields (currentPhase, currentQuestion, isGongActive). This results in "Unknown Phase" errors and non-functional projector displays. The solution requires implementing reliable Firestore write operations in the API server with proper field validation, last-write-wins conflict resolution, continuous retry with exponential backoff for failed writes, and structured JSON logging for observability.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js >=18.0.0 (ES2022 target)
**Primary Dependencies**: Firebase Admin SDK 11.11, firebase-functions 4.5, Express 4.18, Zod 3.22, p-retry 6.1
**Storage**: Firebase Firestore (NoSQL cloud database)
**Testing**: Jest (API server), Vitest (projector-app), Playwright (E2E)
**Target Platform**: Firebase Cloud Functions 2nd gen (api-server), Modern web browsers ES2020+ (projector-app)
**Project Type**: Web - monorepo with multiple frontend apps (admin, host, participant, projector) and backend services (api-server, socket-server)
**Performance Goals**: Game state synchronization within 1 second, projector load within 2 seconds, real-time updates < 2 second latency
**Constraints**: Eventual consistency model (last-write-wins), continuous retry required (no abandoned writes), structured JSON logging to stdout for external monitoring
**Scale/Scope**: Real-time quiz game state synchronization across 6 applications, single gameState/live Firestore document, sequential updates controlled by host app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I (Monorepo Architecture)**: ✅ PASS
- Feature modifies existing apps/api-server and apps/projector-app
- Uses existing @allstars/types workspace package
- No new projects or packages required

**Principle II (Test-Driven Development)**: ✅ PASS
- Will write tests first for Firestore synchronization logic
- Tests will be committed together with implementation
- Uses existing Jest test infrastructure in api-server
- Uses existing Vitest infrastructure in projector-app

**Principle III (OpenAPI-First)**: ✅ PASS
- No new REST API endpoints required
- Modifies internal Firestore write behavior only
- Existing API endpoints in /packages/openapi/ remain unchanged

**Principle IV (Types-First)**: ✅ PASS
- Uses existing GameState type from @allstars/types
- May add validation schemas using existing Zod infrastructure
- No new shared types required

**Principle V (Conventional Commits)**: ✅ PASS
- Will use conventional commit format: `fix(api-server): implement firestore game state sync`
- Commits will be atomic and follow established patterns

**Principle VI (Protected Main Branch)**: ✅ PASS
- Feature branch `001-firestore-gamestate-sync` already created
- Will create PR for review before merging to main

**Result**: All constitution principles satisfied. No violations to justify. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-firestore-gamestate-sync/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already complete)
├── checklists/
│   └── requirements.md  # Quality checklist (passed)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/api-server/
├── src/
│   ├── services/
│   │   └── gameStateService.ts      # [MODIFY] Add Firestore sync logic
│   ├── utils/
│   │   ├── retry.ts                 # [REVIEW] Existing retry utility
│   │   ├── validation.ts            # [MODIFY] Add game state validation
│   │   └── logger.ts                # [CREATE] Structured JSON logger
│   └── types/
│       └── firestore.ts             # [CREATE] Firestore document types
└── tests/
    ├── unit/
    │   ├── services/
    │   │   └── gameStateService.test.ts  # [MODIFY] Add sync tests
    │   └── utils/
    │       ├── validation.test.ts        # [MODIFY] Add validation tests
    │       └── logger.test.ts            # [CREATE] Logger tests
    └── integration/
        └── firestore-sync.test.ts         # [CREATE] Integration tests

apps/projector-app/
├── src/
│   ├── hooks/
│   │   └── useGameState.ts          # [MODIFY] Add error handling
│   └── types/
│       └── gameState.ts             # [REVIEW] Ensure type alignment
└── tests/
    ├── unit/
    │   └── hooks/
    │       └── useGameState.test.ts # [CREATE] Hook tests
    └── integration/
        └── firestore-listener.test.ts # [CREATE] Listener tests

packages/types/
├── src/
│   ├── gameState.ts                 # [REVIEW] Existing GameState type
│   └── validation.ts                # [CREATE] Shared Zod schemas
└── tests/
    └── validation.test.ts           # [CREATE] Schema validation tests
```

**Structure Decision**: Web monorepo structure with modifications to existing apps/api-server (backend service) and apps/projector-app (frontend React app). Primary changes are in api-server's gameStateService.ts for Firestore write logic, with supporting utilities for validation, retry, and logging. Projector-app changes are minimal - focused on error handling for malformed data. Shared type validation schemas will be added to packages/types to ensure consistency.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - All constitution principles passed. No violations to track.
