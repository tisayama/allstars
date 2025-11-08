# Implementation Plan: Firestore Development Environment Initialization Script

**Branch**: `002-firestore-init` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-firestore-init/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create an idempotent TypeScript initialization script that sets up the Firestore emulator with a required gameState/live document for local development. The script eliminates manual curl commands, provides clear error messages, and ensures developers can start applications without database initialization errors. Accessible via `pnpm run init:dev` from repository root.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js >=18.0.0 (existing monorepo standard)
**Primary Dependencies**: Firebase Admin SDK 13.5.0 (already in devDependencies), tsx (for TypeScript execution), @allstars/types (workspace package)
**Storage**: Firestore Emulator (localhost:8080, project: stg-wedding-allstars)
**Testing**: Vitest 4.0.6 (existing test framework in monorepo)
**Target Platform**: Node.js development environment (Linux, macOS, Windows with WSL)
**Project Type**: Monorepo utility script (not an app, lives in /scripts/ directory)
**Performance Goals**: Script completes in <3 seconds (SC-002), error detection within 2 seconds (SC-004)
**Constraints**: Development-only (must refuse production Firestore connections), idempotent (safe to run multiple times), zero user interaction required
**Scale/Scope**: Single script file (~150 lines), single document creation, single NPM command addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture
✅ **PASS** - Script will be placed in `/scripts/` directory at repository root (not within apps/ or packages/). No new app or package created. Consumes existing shared types from `@allstars/types` workspace package per FR-008.

### II. Test-Driven Development (TDD)
✅ **PASS** - Tests will be written first in `/tests/unit/scripts/` directory following red-green-refactor cycle. Test scenarios:
- Idempotency check (document exists → skip creation)
- Document creation (clean emulator → document created)
- Error handling (emulator not running → error message)
- Production detection (no FIRESTORE_EMULATOR_HOST → refuse to run)

### III. OpenAPI-First API Design
✅ **N/A** - No REST API endpoints created. Script interacts directly with Firestore Admin SDK.

### IV. Code Quality Gates
✅ **PASS** - Script will follow existing lint configuration. Tests must pass before commit. Manual verification via running against actual Firestore emulator.

### V. Shell Command Safety
✅ **PASS** - NPM script in root package.json will use timeout: `"init:dev": "timeout 10 tsx scripts/init-firestore-dev.ts"` (10-second timeout sufficient for <3 second performance goal).

### VI. Protected Main Branch
✅ **PASS** - Implementation on feature branch `002-firestore-init`, will merge via PR after review.

## Project Structure

### Documentation (this feature)

```text
specs/002-firestore-init/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (minimal - no unknowns)
├── data-model.md        # Phase 1 output (GameState document schema)
├── quickstart.md        # Phase 1 output (developer usage guide)
├── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a monorepo utility script, not a new app/package. Files will be added to existing repository structure:

```text
/allstars/  (Repository Root)
├── scripts/                      # NEW: Utility scripts directory
│   └── init-firestore-dev.ts     # NEW: Initialization script (~150 lines)
├── tests/
│   └── unit/
│       └── scripts/              # NEW: Script tests directory
│           └── init-firestore-dev.test.ts  # NEW: Unit tests for initialization script
├── packages/
│   └── types/                    # EXISTING: Shared TypeScript types
│       └── src/
│           └── GameState.ts      # EXISTING: GameState type definition (used by script)
├── package.json                  # MODIFIED: Add "init:dev" script
└── [existing apps/ and packages/ directories remain unchanged]
```

**Structure Decision**:

This feature adds a single utility script to the monorepo root `/scripts/` directory rather than creating a new app or package. Rationale:

1. **Not an app**: No deployable artifact, HTTP server, or user interface
2. **Not a package**: No code reuse across multiple apps, single-purpose utility
3. **Repository-level concern**: Initialization affects the entire development environment, not specific to any one app
4. **Precedent**: Other monorepos place development utilities in `/scripts/` (e.g., database migrations, CI helpers)

The script imports types from `@allstars/types` workspace package to ensure type safety, demonstrating proper monorepo dependency management without duplicating code.

## Complexity Tracking

✅ **NO VIOLATIONS** - All constitution principles followed. No justification required.
