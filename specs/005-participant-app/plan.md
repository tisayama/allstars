# Implementation Plan: Participant App - Guest Quiz Controller

**Branch**: `005-participant-app` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-participant-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Participant App is a mobile web application that allows wedding guests to participate in a real-time quiz game using their smartphones. Guests authenticate via QR code scanning (Firebase Anonymous Login), synchronize their device clocks with the server for fair timing, answer questions as they appear via WebSocket events, and receive haptic/visual feedback. The app handles network disconnections gracefully, monitors drop-out status via Firestore listeners, and ensures no answer submissions are lost through local queuing and retry mechanisms.

**Technical Approach**: React 18.2 single-page application with Vite 5.0 build tooling, Firebase SDK for authentication and Firestore real-time listeners, Socket.io client for WebSocket game events, and Firebase Crashlytics for error monitoring. The app implements a 5-ping median clock synchronization algorithm to compensate for network latency and ensure fair answer timing calculations. Code-splitting and pre-fetching strategies ensure <3s load time on 3G connections.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime)
**Primary Dependencies**: React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics), Socket.io Client 4.8, Tailwind CSS 3.4
**Storage**: Browser localStorage (session persistence), Firestore (guest status monitoring, read-only)
**Testing**: Vitest 1.0 (unit/integration tests), @testing-library/react 14.0 (component tests), Playwright or NEEDS CLARIFICATION (E2E tests)
**Target Platform**: Mobile web browsers (Chrome, Safari, Firefox, Samsung Internet, Edge on iOS 13+, Android 8+)
**Project Type**: Single-page web application (mobile-first)
**Performance Goals**: <3s load time on 3G (1.6 Mbps, 300ms RTT), <200ms answer submission latency (p90), <50ms clock sync accuracy (p95)
**Constraints**: <428KB main bundle (gzipped <117KB based on admin-app), 44x44px minimum touch targets, 16px minimum font size, one-handed portrait mode operation
**Scale/Scope**: Up to 200 concurrent guests per event, ~20 questions per quiz, 24-hour session lifetime, zero data retention after event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS

- **Compliance**: This feature creates a new frontend app at `/apps/participant-app/` following the established monorepo structure
- **Workspace Dependencies**: Will consume shared types from `@allstars/types` workspace package
- **Shared Code**: Will reference existing Firebase configuration patterns from admin-app (004)
- **Application Boundary**: Respects boundaries (calls api-server via REST, socket-server via WebSocket, reads Firestore guest documents only)
- **Coordinated Changes**: If API contracts change, updates will be coordinated with api-server in same feature branch

### Principle II: Test-Driven Development (TDD) ✅ PASS

- **Commitment**: Will follow Red-Green-Refactor cycle for all features
- **Test Coverage Target**: 80%+ for critical functions (clock sync, answer submission, reconnection logic)
- **Test Organization**: Tests organized under `apps/participant-app/tests/` with unit/, integration/, component/ subdirectories
- **Verification**: Each PR will include test results showing initial failures, then passes

### Principle III: OpenAPI-First API Design ⚠️ PARTIAL COMPLIANCE

- **Status**: API endpoints (`/participant/register`, `/participant/time`, `/participant/answer`) were defined in api-server (001-002) but OpenAPI specs may not exist in `/packages/openapi/`
- **Action Required**: Phase 0 research must verify if OpenAPI specs exist; if missing, will document as technical debt
- **Client Implementation**: Will use typed API calls based on shared types from `@allstars/types`
- **Justification for Partial**: Participant-app is a consumer of existing APIs, not defining new ones; API contracts already established

### Principle IV: Code Quality Gates ✅ PASS

- **Linting**: Will use ESLint + Prettier (same config as admin-app)
- **Testing**: All tests must pass before commits
- **Verification**: Manual testing on target mobile browsers (Chrome, Safari) before PR
- **Pre-commit**: Will run `pnpm lint && pnpm test` before commits

### Principle V: Shell Command Safety ✅ PASS

- **Build Scripts**: Will use timeout wrappers for `pnpm build` (300s), `pnpm test` (120s)
- **CI/CD**: All automated commands will include explicit timeouts
- **Documentation**: Timeout thresholds documented in package.json scripts

### Constitution Compliance Summary

**Overall Status**: ✅ PASS (1 partial compliance noted, justified)

**Violations Requiring Justification**: None (OpenAPI partial compliance is inherited from api-server implementation, not introduced by this feature)

**Re-evaluation Required After Phase 1**: YES - Verify if OpenAPI specs need to be created/updated for participant endpoints

---

### Post-Phase 1 Re-evaluation (2025-11-03)

**Principle III: OpenAPI-First API Design** - ✅ RESOLVED

- **Status**: Created `/specs/005-participant-app/contracts/participant-api.yaml` documenting participant endpoints
- **Action Taken**: Retroactively documented existing API contracts (`/participant/register`, `/participant/time`, `/participant/answer`) in OpenAPI 3.0 format
- **Technical Debt**: Documented as retroactive spec creation (not ideal OpenAPI-first workflow, but addresses constitution requirement)
- **Future Implementation**: OpenAPI spec can be moved to `/packages/openapi/` and shared across apps; TypeScript types can be generated via Swagger Codegen
- **Compliance**: Now PASS (spec exists, though created after api-server implementation)

**All Constitution Checks**: ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/005-participant-app/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (PENDING - will resolve NEEDS CLARIFICATION items)
├── data-model.md        # Phase 1 output (PENDING - entity definitions)
├── quickstart.md        # Phase 1 output (PENDING - local dev setup)
├── contracts/           # Phase 1 output (PENDING - WebSocket event schemas, API types)
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Requirements quality checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/participant-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth/              # QR code scanner, login flow
│   │   ├── game/              # Question display, answer buttons, feedback
│   │   ├── status/            # Waiting screen, drop-out overlay, spectator mode
│   │   └── shared/            # Loading spinner, error boundary, retry button
│   ├── hooks/
│   │   ├── useAuth.ts         # QR code auth, session management
│   │   ├── useClockSync.ts    # 5-ping median clock synchronization
│   │   ├── useWebSocket.ts    # Socket.io connection, event listeners
│   │   ├── useGameState.ts    # Question state, answer submission, feedback
│   │   └── useGuestStatus.ts  # Firestore listener for drop-out monitoring
│   ├── lib/
│   │   ├── firebase.ts        # Firebase SDK initialization (Auth, Firestore, Crashlytics)
│   │   ├── api-client.ts      # REST API calls (/participant/register, /time, /answer)
│   │   └── vibration.ts       # Vibration API wrapper with fallback
│   ├── utils/
│   │   ├── clock-sync.ts      # Clock offset calculation (median algorithm)
│   │   ├── answer-queue.ts    # Local answer queue for offline resilience
│   │   └── qr-parser.ts       # QR code URL parsing
│   ├── pages/
│   │   ├── QRScanPage.tsx     # QR code scanning entry point
│   │   ├── WaitingPage.tsx    # Pre-game waiting screen
│   │   ├── GamePage.tsx       # Main question answering interface
│   │   ├── DroppedOutPage.tsx # Drop-out overlay with final stats
│   │   └── ErrorPage.tsx      # Error screens with retry
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── clock-sync.test.ts
│   │   │   ├── answer-queue.test.ts
│   │   │   └── qr-parser.test.ts
│   │   └── lib/
│   │       └── vibration.test.ts
│   ├── integration/
│   │   ├── auth.test.ts       # QR auth flow integration
│   │   ├── clock-sync.test.ts # Clock sync with mock server
│   │   ├── answer-submission.test.ts
│   │   └── reconnection.test.ts
│   └── component/
│       ├── QRScanPage.test.tsx
│       ├── GamePage.test.tsx
│       └── DroppedOutPage.test.tsx
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
└── README.md

packages/types/                 # Shared across all apps (EXISTING)
├── src/
│   ├── Question.ts            # Question, Choice types (EXISTING)
│   ├── Guest.ts               # Guest, GuestSession types (EXISTING)
│   ├── GameState.ts           # GameState, GamePhase types (EXISTING)
│   ├── Answer.ts              # Answer submission types (EXISTING)
│   ├── WebSocketEvents.ts     # NEW: START_QUESTION, GAME_PHASE_CHANGED event schemas
│   └── index.ts
└── tests/
    └── unit/

packages/openapi/              # NEW: OpenAPI specs for participant endpoints
├── participant-api.yaml       # NEW or UPDATE: /participant/register, /time, /answer
└── README.md
```

**Structure Decision**: This feature follows the standard monorepo structure with a new frontend app at `apps/participant-app/`. The app is organized as a React single-page application with clear separation between components (UI), hooks (business logic), lib (SDK integrations), utils (pure functions), and pages (routes). Shared TypeScript types are consumed from `@allstars/types` workspace package. The structure mirrors admin-app (004) for consistency, with mobile-specific optimizations (e.g., vibration.ts, clock-sync.ts) added to lib/ and utils/. Tests are co-located under tests/ with unit/, integration/, and component/ subdirectories as per constitution requirements.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations requiring justification.** OpenAPI partial compliance is inherited technical debt from api-server (001-002), not introduced by this feature. This will be documented in research.md and potentially addressed in a future refactoring effort.
