# Implementation Plan: System-Wide E2E Testing Infrastructure

**Branch**: `001-system-e2e-tests` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-system-e2e-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature establishes comprehensive end-to-end testing infrastructure to validate the entire AllStars game platform across all four applications (admin-app, participant-app, projector-app, host-app). The testing system must verify complete user workflows from game setup through participant interaction to display rendering and host control. All tests execute via a single `pnpm run e2e` command that automatically manages Firebase Emulator Suite lifecycle. The system uses work-ubuntu hostname for all inter-app communication (never localhost) and runs tests sequentially with clean Firestore state before each run to ensure test isolation and reproducibility.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (test execution environment)
**Primary Dependencies**: Playwright Test 1.56.1+ (E2E framework), Firebase Admin SDK 13.5.0 (emulator management), Firebase Emulators
**Storage**: Firebase Firestore Emulator (localhost:8080, project: stg-wedding-allstars) - clean state per test run
**Testing**: Playwright Test (multi-context browser automation), Firebase Emulators (Firestore, Auth)
**Target Platform**: Linux (work-ubuntu hostname), Chromium/Firefox/WebKit browsers for test execution
**Project Type**: Monorepo test infrastructure spanning 4 web applications + 2 backend services
**Performance Goals**: Complete E2E test suite execution in <5 minutes (sequential), state propagation <500ms
**Constraints**: work-ubuntu hostname required (NO localhost), single-command execution (`pnpm run e2e`), sequential test execution, clean Firestore state before each run
**Scale/Scope**: 4 frontend apps (admin, participant, projector, host), 50+ concurrent simulated participants, 100% game phase transition coverage

**Research Resolution**: Playwright selected as E2E framework (see [research.md](./research.md) for detailed analysis). Key decision factors: multi-context support for testing 4 apps simultaneously, excellent TypeScript integration, active Microsoft support, and superior debugging capabilities.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture ✅ PASS

**Evaluation**: This feature adds E2E testing infrastructure to the existing monorepo without creating new deployable applications or shared packages. Testing infrastructure will be organized within existing app directories and potentially a new root-level `/tests/e2e/` directory for cross-app test orchestration.

**Compliance**:
- ✅ No new apps or packages added - maintains existing monorepo structure
- ✅ Tests organized per-app in `apps/<app-name>/tests/e2e/` directories
- ✅ Cross-app test orchestration in root `/tests/e2e/` or similar
- ✅ Shared test utilities can use `/packages/` if needed (e.g., `@allstars/test-utils`)
- ✅ No application boundary violations - tests interact via public interfaces only

### II. Test-Driven Development (TDD) ⚠️ MODIFIED APPLICATION

**Evaluation**: This feature IS the test infrastructure itself. Traditional TDD (write tests for implementation) doesn't directly apply since we're building the testing system. However, TDD principles still apply to test infrastructure code.

**Compliance**:
- ✅ Test infrastructure code (helpers, setup scripts) should have unit tests
- ✅ E2E test orchestration logic should be tested
- ⚠️ The E2E tests themselves are the deliverable, not implementation code with tests
- ✅ Follow red-green-refactor for test helper utilities and setup scripts

**Interpretation**: TDD applies to the test infrastructure implementation, but not to the E2E test scenarios themselves (which are the primary deliverable).

### III. OpenAPI-First API Design ✅ PASS

**Evaluation**: This feature does not create or modify any REST APIs. It only tests existing APIs defined in prior features.

**Compliance**:
- ✅ No new API endpoints created
- ✅ Tests will verify existing APIs against OpenAPI specs in `/packages/openapi/`
- ✅ Contract testing validates API implementations match specifications

### IV. Code Quality Gates ✅ PASS

**Evaluation**: All test infrastructure code must pass linting, type checking, and quality gates.

**Compliance**:
- ✅ Test code must be linted and formatted
- ✅ TypeScript strict mode for test infrastructure
- ✅ E2E tests themselves must pass before commit
- ✅ No debugging statements or commented code in committed tests

### V. Shell Command Safety ✅ PASS

**Evaluation**: Critical principle for this feature. E2E test execution involves starting/stopping emulators and applications, all of which require timeout protection.

**Compliance**:
- ✅ Firebase emulator startup: `timeout 60 firebase emulators:start`
- ✅ App startup commands: `timeout 30 pnpm run dev` (per app)
- ✅ Test execution: `timeout 300 pnpm run test:e2e` (5 min limit per spec)
- ✅ Cleanup operations: `timeout 10 firebase emulators:stop`
- ✅ All orchestration scripts use explicit timeouts

**Critical**: This principle directly addresses the "hung process" risk during E2E test execution.

### VI. Protected Main Branch ✅ PASS

**Evaluation**: Standard feature branch workflow applies.

**Compliance**:
- ✅ Work performed on `001-system-e2e-tests` branch
- ✅ PR required before merge to master/main
- ✅ No direct commits to master/main

### VII. Pull Request Workflow & Quality Assurance ✅ PASS

**Evaluation**: Standard PR workflow with self-review and zero-failing-test policy.

**Compliance**:
- ✅ PR created upon work completion
- ✅ Self-review performed before merge
- ✅ Zero failing tests before merge (including new E2E tests)
- ✅ All quality gates passed
- ✅ Manual verification: E2E tests successfully execute via `pnpm run e2e`

### Quality Assurance Requirements ✅ PASS

**Evaluation**: This feature creates the E2E testing layer mentioned in the QA requirements.

**Compliance**:
- ✅ Unit tests for test infrastructure utilities
- ✅ Integration tests for emulator management and app orchestration
- ✅ Contract tests verify API compliance (existing requirement, validated by E2E)
- ✅ E2E tests validate critical user journeys across apps (this feature's deliverable)

### Summary

**Overall Status**: ✅ PASS - No constitution violations

All constitution principles are satisfied. The feature aligns with existing monorepo structure, follows development discipline, and addresses the mandated shell command safety for process management. TDD applies to test infrastructure code (helpers, orchestration), while the E2E test scenarios themselves are the deliverable being validated.

## Project Structure

### Documentation (this feature)

```text
specs/001-system-e2e-tests/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - testing framework selection and best practices
├── data-model.md        # Phase 1 output - test data models and fixtures
├── quickstart.md        # Phase 1 output - E2E test execution guide
├── contracts/           # Phase 1 output - test environment contracts and configurations
│   └── e2e-environment.yaml   # Environment setup contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Root-level E2E test infrastructure
tests/
└── e2e/
    ├── setup/
    │   ├── emulator-manager.ts      # Firebase emulator lifecycle management
    │   ├── app-launcher.ts          # Multi-app startup orchestration
    │   ├── firestore-init.ts        # Clean Firestore state initialization
    │   └── hostname-config.ts       # work-ubuntu hostname configuration
    ├── helpers/
    │   ├── test-data-factory.ts     # Test data generation (questions, guests, settings)
    │   ├── browser-helpers.ts       # Browser automation utilities
    │   └── wait-helpers.ts          # Waiting and polling utilities
    ├── fixtures/
    │   ├── questions.json           # Sample question data
    │   ├── guests.csv               # Sample guest data for import testing
    │   └── settings.json            # Sample game settings
    ├── scenarios/
    │   ├── admin-setup.spec.ts      # Admin app CRUD operations (User Story 1)
    │   ├── participant-flow.spec.ts # Participant joining and answering (User Story 2)
    │   ├── projector-display.spec.ts # Projector display states (User Story 3)
    │   ├── host-control.spec.ts     # Host control operations (User Story 4)
    │   └── full-game-flow.spec.ts   # Complete game flow integration test
    └── config/
        ├── playwright.config.ts     # Playwright configuration (if selected)
        └── jest.config.ts           # Jest configuration for test infrastructure

# Per-app E2E test additions (if needed for app-specific tests)
apps/admin-app/tests/e2e/          # Admin-specific E2E tests
apps/participant-app/tests/e2e/    # Participant-specific E2E tests
apps/projector-app/tests/e2e/      # Projector-specific E2E tests
apps/host-app/tests/e2e/           # Host-specific E2E tests

# Shared test utilities package (optional, if substantial)
packages/test-utils/               # Shared test utilities (if needed)
├── src/
│   ├── emulator-utils.ts
│   ├── data-generators.ts
│   └── assertions.ts
└── tests/
    └── unit/                      # Unit tests for test utilities

# Root package.json script additions
# - pnpm run e2e              # Single command to run all E2E tests
# - pnpm run e2e:setup        # Setup emulators and apps
# - pnpm run e2e:teardown     # Cleanup emulators and apps
# - pnpm run e2e:debug        # Run E2E tests in debug mode
```

**Structure Decision**:

This feature uses a **hybrid monorepo testing structure**:

1. **Root-level E2E orchestration** (`/tests/e2e/`): Cross-app test scenarios that validate complete user journeys across multiple applications. This is where the "system-wide" tests live.

2. **Per-app E2E tests** (optional, `apps/<app>/tests/e2e/`): App-specific E2E tests if needed for isolated app testing. Not required initially.

3. **Shared test utilities** (optional, `/packages/test-utils/`): If test helpers become substantial enough to warrant a shared package, they can be extracted here. Start with inline helpers in `/tests/e2e/helpers/` and extract only if duplication emerges.

The root-level structure is chosen because:
- E2E tests validate inter-app communication and workflows
- Single command execution (`pnpm run e2e`) orchestrates all apps simultaneously
- Emulator management is shared across all apps
- Test data and fixtures are reused across scenarios

This aligns with the monorepo architecture principle while maintaining clear separation between test infrastructure and application code.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations identified. This section is not applicable.
