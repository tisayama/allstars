# Implementation Plan: Projector Anonymous Authentication

**Branch**: `001-projector-anonymous-auth` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-projector-anonymous-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Firebase Anonymous Authentication for projector-app to enable automatic, unattended operation. The projector will authenticate anonymously on app launch, access Firestore gameState (read-only), connect to WebSocket for real-time events, and maintain dual update channels (WebSocket + Firestore snapshots) for redundancy. This reuses the existing participant-app authentication pattern for consistency and reduced implementation risk.

**Technical Approach**: Adopt participant-app's `useAuth` hook pattern modified for projector requirements (no guest registration, pure anonymous auth). Implement dual-channel update system with deduplication logic. Add connection status monitoring for Firebase auth, WebSocket, and Firestore listener states.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime)
**Primary Dependencies**: React 18.2, Vite 5.0, Firebase SDK 10.x (Auth + Firestore), Socket.io Client 4.x
**Storage**: Browser localStorage (session persistence), Firestore (read-only access to gameState, questions, guests)
**Testing**: Vitest (unit tests), React Testing Library (component tests), Playwright (E2E tests)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari) with localStorage support
**Project Type**: Web application (frontend only - projector-app in /apps/projector-app)
**Performance Goals**: <3s authentication on launch, <500ms update propagation, 8+ hour continuous operation
**Constraints**: Read-only Firestore access, no write operations, automatic recovery from network disruptions, zero manual intervention
**Scale/Scope**: Single projector display per wedding reception, ~200 lines of new authentication code, reuses 80% of participant-app patterns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS
- **Compliance**: Feature modifies only `/apps/projector-app` within monorepo structure
- **Shared Dependencies**: Reuses `@allstars/types` from `/packages/types` for WebSocket event types
- **Application Boundaries**: Respects separation - projector-app does not access api-server or socket-server internals
- **Workspace Dependencies**: Uses `workspace:*` protocol for internal packages

### Principle II: Test-Driven Development (TDD) ✅ PASS
- **Test-First**: Unit tests will be written before implementing `useProjectorAuth` hook
- **Coverage Plan**:
  - Unit tests for authentication hook (anonymous sign-in, session persistence, token refresh)
  - Integration tests for Firebase + WebSocket connection flow
  - E2E tests for full projector startup and update reception
- **Red-Green-Refactor**: All tests will initially fail, then pass after implementation

### Principle III: OpenAPI-First API Design ⚠️ NOT APPLICABLE
- **Rationale**: This feature is frontend-only authentication, no REST API changes
- **WebSocket Events**: Existing socket event contracts in `/packages/types` will be reused
- **No New APIs**: No new REST endpoints created by this feature

### Principle IV: Code Quality Gates ✅ PASS
- **Linting**: ESLint + Prettier configured for projector-app
- **Testing**: All tests must pass before commit (unit, integration, E2E)
- **Verification**: Manual testing will verify 8+ hour continuous operation, reconnection logic

### Principle V: Shell Command Safety ✅ PASS
- **Development Scripts**: Use `timeout 60 pnpm test` for test execution
- **CI/CD**: Firebase emulator startup uses `timeout 120 firebase emulators:start`
- **Build**: Vite build uses `timeout 300 pnpm run build`

### Principle VI: Protected Main Branch ✅ PASS
- **Feature Branch**: Working on `001-projector-anonymous-auth` branch
- **No Direct Commits**: All work committed to feature branch, merged via PR
- **Naming Convention**: Follows `<number>-<feature-name>` pattern

### Principle VII: Pull Request Workflow & Quality Assurance ✅ PASS (Pending)
- **Commit & Push**: Will commit all changes to `001-projector-anonymous-auth` branch
- **PR Creation**: GitHub PR will be created from feature branch to master
- **Self-Review**: Will review all changed files, verify TDD compliance, check for debug code
- **Zero Failing Tests**: All unit tests must pass before merge (non-negotiable)
- **Documentation**: PR description will include what changed, why, verification steps, test results

**GATE STATUS**: ✅ ALL GATES PASS - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/001-projector-anonymous-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/projector-app/
├── src/
│   ├── hooks/
│   │   ├── useProjectorAuth.ts        # NEW: Anonymous auth hook (adapted from participant-app)
│   │   └── useWebSocket.ts            # MODIFIED: Updated to use Firebase ID token
│   ├── services/
│   │   └── firestoreService.ts        # NEW: Firestore snapshot listener for dual-channel updates
│   ├── components/
│   │   └── ConnectionStatus.tsx       # MODIFIED: Enhanced to show auth + WebSocket + Firestore status
│   └── App.tsx                        # MODIFIED: Integrate useProjectorAuth hook
└── tests/
    ├── unit/
    │   ├── useProjectorAuth.test.ts   # NEW: Unit tests for auth hook
    │   └── firestoreService.test.ts   # NEW: Unit tests for Firestore service
    ├── integration/
    │   └── auth-websocket.test.ts     # NEW: Integration test for auth + WebSocket flow
    └── e2e/
        └── projector-startup.spec.ts   # NEW: E2E test for complete startup sequence

packages/types/
└── src/
    └── index.ts                       # NO CHANGES: Reuses existing WebSocket event types
```

**Structure Decision**: Single frontend app modification (`apps/projector-app`) following monorepo web application pattern. No backend changes required. This feature adapts the existing participant-app authentication pattern (`apps/participant-app/src/hooks/useAuth.ts`) for projector use case, removing guest registration logic and simplifying to pure anonymous authentication. New files follow projector-app's existing structure (hooks/, services/, components/, tests/).

## Complexity Tracking

**Status**: ✅ No constitution violations - no complexity tracking required

All constitution principles are satisfied. This feature follows established patterns, reuses existing code, and introduces minimal new complexity.
