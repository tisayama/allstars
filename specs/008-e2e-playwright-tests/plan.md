# Implementation Plan: End-to-End Testing Infrastructure with Playwright

**Branch**: `008-e2e-playwright-tests` | **Date**: 2025-01-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-e2e-playwright-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive E2E testing infrastructure using Playwright to validate all 6 applications (admin-app, host-app, projector-app, 3 participant-app instances, socket-server, api-server) working together during live game scenarios. The test suite will automatically orchestrate Firebase Emulators and all applications, execute tests in parallel with full data isolation using unique collection prefixes, and provide detailed failure reporting with screenshots and logs. Tests will validate critical game flows including pre-event setup, real-time coordination, period finals with gong mechanics, guest lifecycle management, and exception handling.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+
**Primary Dependencies**: Playwright Test (latest), Firebase Emulators (firestore, auth), Firebase Admin SDK 11.x
**Storage**: Firebase Firestore Emulator (localhost:8080), no persistent storage required
**Testing**: Playwright Test Framework with TypeScript
**Target Platform**: Local development environment (macOS/Linux/Windows) + CI/CD (GitHub Actions recommended)
**Project Type**: Testing infrastructure (monorepo testing suite)
**Performance Goals**: Complete test suite execution <10 minutes, individual test startup <30 seconds, health checks <30 seconds timeout
**Constraints**: Tests run against local emulators only (no production Firebase), automatic retry 2-3 times for flaky tests (<5% failure rate), parallel execution with full data isolation via collection prefixes
**Scale/Scope**: 5 major test categories (15+ test scenarios), 6 concurrent applications + Firebase Emulators, support for parallel CI jobs and multiple local developers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture ✅ COMPLIANT

**Applicability**: This feature adds E2E testing infrastructure to the existing monorepo.

**Compliance**:
- ✅ Tests will be added to monorepo root as `tests/e2e/` (testing infrastructure, not an app)
- ✅ Tests will validate integration across all 6 apps in `/apps/` directory
- ✅ Tests will use shared types from `/packages/types/` for test data validation
- ✅ No new apps or packages created - pure testing infrastructure
- ✅ Test configuration (playwright.config.ts) at monorepo root

**Justification**: E2E tests belong at monorepo root to validate cross-app integration. This is standard practice for integration/E2E testing in monorepos.

### II. Test-Driven Development (TDD) ⚠️ MODIFIED APPLICABILITY

**Applicability**: This feature **IS** the test infrastructure itself.

**Compliance**:
- ⚠️ **Modified workflow**: Tests are the primary deliverable, not implementation code
- ✅ Test helpers and utilities (e.g., app launchers, fixture factories) will follow TDD
- ✅ Playwright configuration and global setup/teardown will be tested via smoke tests
- ✅ Test infrastructure code (helpers) must have unit tests before implementation

**Justification**: The feature deliverable IS the test suite. However, any supporting code (helpers, utilities, launchers) will follow TDD discipline with unit tests written first.

### III. OpenAPI-First API Design ✅ NOT APPLICABLE

**Applicability**: This feature does not add new REST APIs.

**Compliance**: N/A - Feature consumes existing APIs defined in `/packages/openapi/`, does not create new endpoints.

###  IV. Code Quality Gates ✅ COMPLIANT

**Applicability**: All E2E test code must pass quality gates.

**Compliance**:
- ✅ Linting: Playwright TypeScript test files will be linted with project ESLint config
- ✅ Tests: Test infrastructure helpers will have unit tests (meta-testing)
- ✅ Verification: E2E tests themselves serve as verification; smoke tests will validate infrastructure

**Justification**: E2E test code is production code and must meet same quality standards as application code.

### V. Shell Command Safety ✅ COMPLIANT

**Applicability**: E2E tests will execute shell commands to start/stop emulators and apps.

**Compliance**:
- ✅ All emulator startup commands will have timeouts (30s default, configurable)
- ✅ All app launch commands will have health check timeouts (30s)
- ✅ Global setup/teardown will have overall timeout limits
- ✅ Test execution itself has Playwright's built-in timeout mechanisms

**Justification**: Service orchestration requires shell command execution. All commands will use explicit timeout guards per Principle V.

### Quality Assurance Requirements ✅ COMPLIANT

**Compliance**:
- ✅ **Unit Tests**: Required for test helpers, utilities, fixture factories
- ✅ **Integration Tests**: The E2E tests themselves are integration tests
- ✅ **Contract Tests**: E2E tests will validate API contracts indirectly through UI flows
- ✅ **Test Organization**: Standard structure at `tests/e2e/` with subdirectories per test category

**Continuous Integration**:
- ✅ E2E tests will run on PR (with selective execution for speed)
- ✅ Full E2E suite will run on merge to main
- ✅ Test results visible in PR status checks
- ✅ Flaky test retry (2-3x) built into infrastructure

### Development Workflow ✅ COMPLIANT

**Compliance**:
- ✅ Feature branch: `008-e2e-playwright-tests`
- ✅ TDD for infrastructure helpers
- ✅ Linting before commit
- ✅ PR will include verification steps (manual E2E test execution)

**Gate Result**: ✅ **PASSED** - All applicable principles compliant. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/008-e2e-playwright-tests/
├── spec.md              # Feature specification (already exists)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command - minimal, test data schemas)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
/allstars/  (Repository Root - existing monorepo)
├── apps/                         # Existing apps under test
│   ├── participant-app/          # Guest smartphone client (test target)
│   ├── projector-app/            # Main broadcast screen (test target)
│   ├── host-app/                 # Host control panel (test target)
│   ├── admin-app/                # Admin dashboard (test target)
│   ├── api-server/               # Game logic API (test target)
│   └── socket-server/            # WebSocket server (test target)
├── packages/                     # Existing shared packages
│   ├── types/                    # Shared types (used by tests for validation)
│   └── ...
├── tests/                        # NEW: E2E testing infrastructure
│   └── e2e/                      # NEW: Playwright E2E tests
│       ├── fixtures/             # Test fixtures and test data factories
│       │   ├── questions.ts      # Question test data
│       │   ├── guests.ts         # Guest test data
│       │   └── gameState.ts      # Game state fixtures
│       ├── helpers/              # Test helper utilities
│       │   ├── appLauncher.ts    # App startup/shutdown orchestration
│       │   ├── emulatorManager.ts # Firebase Emulator lifecycle management
│       │   ├── healthChecker.ts  # Health check polling utility
│       │   └── collectionPrefix.ts # Unique prefix generator for parallel tests
│       ├── scenarios/            # E2E test scenarios by category
│       │   ├── pre-event-setup.spec.ts       # User Story 1 (A-series)
│       │   ├── game-flow.spec.ts             # User Story 2 (B/C-series)
│       │   ├── period-finals.spec.ts         # User Story 3 (D-series)
│       │   ├── guest-lifecycle.spec.ts       # User Story 4 (E-series)
│       │   └── test-automation.spec.ts       # User Story 5 (infrastructure validation)
│       ├── global-setup.ts       # Playwright global setup (emulator + app orchestration)
│       ├── global-teardown.ts    # Playwright global teardown (cleanup)
│       └── helpers.test.ts       # Unit tests for test helpers (meta-testing)
├── playwright.config.ts          # NEW: Playwright configuration (root level)
└── package.json                  # UPDATE: Add Playwright dependencies
```

**Structure Decision**:

E2E tests are placed at **monorepo root** in `tests/e2e/` directory, following standard monorepo testing practice. This location:

1. **Validates cross-app integration**: Tests span all 6 apps in `/apps/`, requiring root-level access
2. **Aligns with monorepo patterns**: Integration/E2E tests belong at root, unit tests belong within each app
3. **Shares test infrastructure**: Common helpers and fixtures are reusable across all test scenarios
4. **Simplifies configuration**: Single `playwright.config.ts` at root orchestrates all E2E testing

This differs from per-app unit tests (e.g., `apps/api-server/tests/unit/`) which test individual app logic in isolation. E2E tests validate the **system as a whole**, making root-level placement appropriate.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution principles are followed or not applicable to this testing infrastructure feature.
