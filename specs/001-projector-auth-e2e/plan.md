# Implementation Plan: Projector Authentication E2E Tests

**Branch**: `001-projector-auth-e2e` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-projector-auth-e2e/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add comprehensive browser-based E2E tests for projector app authentication flow using Playwright and Firebase Emulators. Tests verify Firebase Anonymous Auth completes within 3 seconds, WebSocket reconnection with exponential backoff succeeds within 10 seconds, and Firestore fallback delivers updates with <500ms latency. Also fixes vitest configuration to enable existing integration tests (`tests/integration/auth-startup.test.ts`) to run in CI/CD pipeline.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (test execution environment)
**Primary Dependencies**: Playwright Test 1.40+, Vitest 1.3.1, Firebase Admin SDK 13.5.0, Firebase Emulators (Auth, Firestore)
**Storage**: N/A (E2E tests only - uses Firebase Emulators for test data, no persistent storage)
**Testing**: Playwright for browser-based E2E tests, Vitest for integration tests
**Target Platform**: Web browsers (Chromium/Firefox/WebKit) via Playwright, projector-app on localhost:5175
**Project Type**: Web application (monorepo with apps/projector-app)
**Performance Goals**: <3s authentication completion, <10s WebSocket reconnection, <500ms Firestore fallback latency, <5min full test suite execution
**Constraints**: Firebase Emulators only (no production connections), deterministic tests (zero flaky tests), headless browser mode for CI/CD, test data isolation between parallel runs
**Scale/Scope**: 4 user stories (2 P1, 2 P2), 15 functional requirements, 8 measurable success criteria, ~20 E2E test scenarios covering auth flow + reconnection + dual-channel fallback

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED - All principles compliant

### I. Monorepo Architecture
✅ **Compliant** - E2E tests will be added to `tests/e2e/` (shared across apps) and integration test configuration updated in `apps/projector-app/vitest.config.ts`. No new apps or packages created. Follows existing test organization pattern.

### II. Test-Driven Development
✅ **Compliant** - This feature IS test infrastructure. Adds E2E tests for existing authentication implementation. All 278 unit tests already pass. Integration tests exist but need configuration fix to run. TDD approach: write E2E tests → verify they catch issues → refine tests until robust.

### III. Fail-Safe State Management
✅ **Compliant** - Tests verify fail-safe behaviors: authentication timeout handling, reconnection backoff, Firestore fallback when WebSocket fails. No state management implementation changes - only verification of existing fail-safe mechanisms.

### IV. Comprehensive Error Handling
✅ **Compliant** - E2E tests validate error scenarios: auth failures (FR-014), emulator unavailability (FR-012), network disruptions (FR-011). Tests ensure error messages are clear and actionable.

### V. Firebase Integration Standards
✅ **Compliant** - Tests use Firebase Auth Emulator (localhost:9099) and Firestore Emulator (localhost:8080) per existing patterns. No production Firebase access. Validates existing Firebase integration without modification.

### VI. Documentation Standards
✅ **Compliant** - Specification includes detailed user scenarios, acceptance criteria, and success metrics. Test code will include JSDoc comments explaining test purpose and expected behavior. README updates planned for running E2E tests locally.

### VII. Pull Request Workflow & Quality Assurance
✅ **Compliant** - Feature follows standard workflow: spec → plan → implementation → PR. Zero failing tests enforced (existing 278 unit tests must continue passing). E2E tests will run in CI/CD pipeline (SC-005: <5min execution time).

**No violations identified. Ready to proceed to Phase 0 research.**

---

### Post-Phase 1 Design Re-Evaluation

**Status**: ✅ PASSED - All principles remain compliant after design phase

**Summary of Design Phase**:
- Created test fixtures with automatic setup/cleanup (data-model.md)
- Defined 4 test contracts covering all functional requirements (contracts/)
- Documented developer quickstart guide (quickstart.md)
- Designed test data seeding and network simulation helpers
- Planned Vitest workspace configuration for test separation

**Re-Evaluation Against Constitution**:

✅ **Monorepo Architecture**: Design confirms no new apps/packages. All tests added to existing `tests/e2e/` structure. Vitest workspace configured within `apps/projector-app/` following existing patterns.

✅ **Test-Driven Development**: Test contracts define expected behaviors before implementation. All 20 E2E test scenarios documented with assertions. Integration test configuration enables existing tests to run.

✅ **Fail-Safe State Management**: Test contracts validate fail-safe mechanisms (contracts/websocket-reconnection.md, contracts/dual-channel-fallback.md). No new state management logic added.

✅ **Comprehensive Error Handling**: Error scenarios explicitly tested (TC-AUTH-004, TC-RECON-004). Emulator validation provides actionable error messages (TC-CONFIG-002).

✅ **Firebase Integration Standards**: Emulator-only testing enforced via integration-setup.ts. No production Firebase connections in any test.

✅ **Documentation Standards**: Comprehensive documentation delivered: quickstart.md for developers, detailed test contracts, JSDoc examples in data-model.md.

✅ **Pull Request Workflow**: Design supports standard workflow. Zero failing tests enforced. CI/CD integration planned in contracts/integration-test-config.md.

**No new violations introduced. Design is implementation-ready.**

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
# E2E Test Infrastructure (shared across all apps)
tests/e2e/
├── fixtures/
│   └── projector-auth.fixture.ts     # Firebase Emulator setup, test data seeding
├── page-objects/
│   └── ProjectorPage.ts               # Page object for projector-app interactions
├── scenarios/
│   ├── projector-auth.spec.ts         # Authentication flow E2E tests (NEW)
│   ├── projector-reconnection.spec.ts # WebSocket reconnection E2E tests (NEW)
│   └── projector-fallback.spec.ts     # Dual-channel fallback E2E tests (NEW)
└── helpers/
    ├── emulator.ts                     # Firebase Emulator management utilities
    └── network-simulation.ts           # Network disconnection/reconnection helpers (NEW)

# Integration Test Configuration (projector-app specific)
apps/projector-app/
├── vitest.config.ts                    # UPDATED: Add tests/integration/**/*.test.ts
└── tests/
    ├── integration/
    │   └── auth-startup.test.ts        # Existing integration tests (NOW RUNNABLE)
    ├── unit/
    │   └── hooks/
    │       ├── useProjectorAuth.test.ts     # Existing (278 passing tests)
    │       ├── useWebSocket.test.ts         # Existing
    │       └── useDualChannelUpdates.test.ts # Existing
    └── setup.ts                        # Test environment setup

# CI/CD Configuration
.github/workflows/
└── test.yml                            # UPDATED: Add E2E test execution step
```

**Structure Decision**: This feature adds E2E tests to the existing monorepo test infrastructure. No new apps or packages created. The `tests/e2e/` directory already exists with placeholder tests - we're replacing TODOs with real implementations and adding new test scenarios. The `apps/projector-app/vitest.config.ts` configuration fix enables existing integration tests to run. All changes follow the existing monorepo architecture pattern (Principle I).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitutional violations identified. This feature adds test infrastructure to existing implementation without introducing architectural complexity.
