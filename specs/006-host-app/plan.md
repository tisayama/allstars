# Implementation Plan: Host Control App

**Branch**: `006-host-app` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-host-app/spec.md`

## Summary

The host-app is a tablet-optimized React web application that serves as the master control panel for the AllStars wedding quiz platform. Hosts (newly-weds) use it to control game progression through a simple "big button" interface that changes context based on real-time game state synchronized via Firebase Firestore. The app provides secure Google authentication, fail-fast error handling with 10-second API timeouts, concurrent multi-host support with synchronized screens, and comprehensive observability logging. Technical approach: React 18.2 + TypeScript 5.3 (strict mode) with Vite 5.0, Firebase SDK 10.7+ for auth and Firestore real-time listeners, tablet-first responsive design (768-1024px), and integration with existing api-server /host/game/advance endpoints.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime)
**Primary Dependencies**: React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics or Sentry), React Router 6.x
**Storage**: Browser localStorage (session persistence), Firestore (game state monitoring, read-only)
**Testing**: Vitest 1.0+ with React Testing Library, Playwright (E2E for tablet scenarios)
**Target Platform**: Tablet browsers (iPad Safari 14+, Android Chrome 90+), optimized for 768-1024px viewports
**Project Type**: Frontend web application (React SPA)
**Performance Goals**: <200ms interaction response, <1s state synchronization, <10s button tap to phase completion
**Constraints**: 10-second API timeout, fail-fast error handling (no auto-retry), 44x44pt minimum touch targets
**Scale/Scope**: Single-page app, ~15-20 components, 4 user stories, 31 functional requirements, multiple concurrent host sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS

- **Location**: `/apps/host-app/` (new deployable application)
- **Shared Dependencies**: Will consume `/packages/types/` for GameState, Question, and API contracts
- **Workspace Protocol**: Will use `"workspace:*"` for internal package references
- **No Boundary Violations**: Host-app only reads Firestore (gameState/live), does not access api-server database
- **Atomic Commits**: All host-app changes will be committed together with any necessary /packages/types/ updates

**Justification**: Host-app is a new frontend application that fits perfectly into the established apps/ structure. It shares types with existing apps (participant-app, projector-app) via /packages/types/ and will coordinate with api-server through REST API.

### Principle II: Test-Driven Development (TDD) ✅ PASS

- **Test Strategy**:
  - Unit tests for all hooks (useAuth, useGameState, useFirestoreListener), utilities (API client, error handlers), and UI components
  - Integration tests for authentication flow, Firestore listener behavior, and API client with mock servers
  - E2E tests for critical tablet workflows (login, advance through question cycle, concurrent host sync)
- **TDD Discipline**: All tests will be written BEFORE implementation, verified to fail (red), then implemented to pass (green)
- **Coverage Target**: 100% for business logic (hooks, services), >90% for UI components

### Principle III: OpenAPI-First API Design ✅ PASS

- **Existing Contract**: The api-server already has `/host/game/advance` endpoint defined (per spec dependencies section)
- **Host-app Consumption**: Will generate TypeScript types from /packages/openapi/ for POST /host/game/advance request/response schemas
- **No New Endpoints Required**: Host-app only consumes existing api-server endpoints, does not define new APIs
- **Contract Testing**: Will validate API client against OpenAPI contract using contract tests

**Note**: If /packages/openapi/ does not yet contain the /host/* endpoint definitions, Phase 1 will include creating those OpenAPI specs based on the api-server's existing implementation (per Assumption #7 in spec).

### Principle IV: Code Quality Gates ✅ PASS

- **Linting**: ESLint + Prettier (same configuration as participant-app for consistency)
- **Pre-commit Hooks**: Lint and format checks before every commit
- **Test Gate**: All tests must pass before commit
- **Verification**: Manual testing on iPad and Android tablet before PR

### Principle V: Shell Command Safety ✅ PASS

- **CI/CD Scripts**: All `pnpm install`, `pnpm test`, `pnpm build` commands will have explicit timeouts
- **Timeouts**: 300s for install, 180s for tests, 300s for build
- **Error Handling**: Clear timeout failure messages in CI logs

**Overall Gate Status**: ✅ ALL PASS - No constitution violations. Ready to proceed with Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/006-host-app/
├── spec.md              # Feature specification (user stories, requirements)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technology decisions and best practices
├── data-model.md        # Phase 1: GameState and HostUser data models
├── quickstart.md        # Phase 1: Development setup and local emulator guide
├── contracts/           # Phase 1: OpenAPI specs for /host/game/advance endpoint
│   └── host-api.yaml    # (if not already in /packages/openapi/)
├── checklists/          # Requirements validation checklist
│   └── requirements.md
└── tasks.md             # Phase 2: Task breakdown (created by /speckit.tasks, not this command)
```

### Source Code (repository root)

```text
apps/host-app/                         # New tablet control application
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── main.tsx                       # App entry point
│   ├── App.tsx                        # Root component with routing
│   ├── components/
│   │   ├── auth/
│   │   │   └── GoogleLoginButton.tsx  # Firebase Google sign-in UI
│   │   ├── control/
│   │   │   ├── BigButton.tsx          # Context-aware main action button
│   │   │   ├── GongButton.tsx         # Special event trigger
│   │   │   └── ReviveAllButton.tsx    # Emergency reset control
│   │   ├── display/
│   │   │   ├── GamePhaseDisplay.tsx   # Current phase indicator
│   │   │   ├── QuestionDisplay.tsx    # Question details viewer
│   │   │   └── LoadingSpinner.tsx     # Action-in-progress feedback
│   │   └── layout/
│   │       ├── ProtectedRoute.tsx     # Auth guard for routes
│   │       └── ErrorBoundary.tsx      # Top-level error handling
│   ├── hooks/
│   │   ├── useAuth.ts                 # Firebase auth + session management
│   │   ├── useGameState.ts            # Firestore listener for gameState/live
│   │   └── useApiClient.ts            # POST /host/game/advance with timeout
│   ├── lib/
│   │   ├── firebase.ts                # Firebase SDK initialization
│   │   ├── api-client.ts              # HTTP client with 10s timeout, fail-fast
│   │   └── logger.ts                  # Crashlytics/Sentry integration
│   ├── pages/
│   │   ├── LoginPage.tsx              # Google sign-in screen
│   │   └── ControlPanelPage.tsx       # Main game control interface
│   ├── types/
│   │   └── index.ts                   # Re-export shared types from @allstars/types
│   └── utils/
│       ├── error-handlers.ts          # Error display logic
│       └── phase-utils.ts             # Phase-to-button-label mapping
├── tests/
│   ├── unit/
│   │   ├── hooks/
│   │   │   ├── useAuth.test.ts
│   │   │   ├── useGameState.test.ts
│   │   │   └── useApiClient.test.ts
│   │   ├── lib/
│   │   │   ├── api-client.test.ts     # Timeout behavior, fail-fast
│   │   │   └── logger.test.ts
│   │   └── utils/
│   │       ├── error-handlers.test.ts
│   │       └── phase-utils.test.ts
│   ├── integration/
│   │   ├── firebase-auth.test.ts      # Google login flow with emulator
│   │   ├── firestore-listener.test.ts # Real-time sync with emulator
│   │   └── api-integration.test.ts    # Mock api-server responses
│   └── e2e/
│       ├── login-flow.spec.ts         # Full auth flow on tablet viewport
│       ├── question-cycle.spec.ts     # Advance through all phases
│       └── concurrent-hosts.spec.ts   # Multi-device synchronization
├── .env.example                       # Firebase config placeholders
├── .eslintrc.cjs                      # Linting rules (match participant-app)
├── .prettierrc                        # Formatting config
├── index.html                         # Vite entry point
├── package.json                       # Dependencies + scripts
├── tsconfig.json                      # TypeScript strict mode config
├── vite.config.ts                     # Vite build configuration
├── vitest.config.ts                   # Vitest test configuration
└── playwright.config.ts               # E2E tablet testing config

packages/types/                        # Shared types (existing)
├── src/
│   ├── GameState.ts                   # Firestore gameState/live structure
│   ├── Question.ts                    # Question entity from spec
│   ├── HostApi.ts                     # POST /host/game/advance types (new)
│   └── index.ts                       # Re-exports
└── package.json                       # "@allstars/types" workspace package

packages/openapi/                      # API contracts (may need update)
└── schemas/
    └── host-api.yaml                  # /host/game/advance OpenAPI spec (validate existence)
```

**Structure Decision**: Single frontend application (React SPA) in `/apps/host-app/` following the monorepo pattern established by participant-app. This is a new deployment target that shares types with existing apps via `/packages/types/`. The structure follows React best practices: components organized by responsibility (auth, control, display, layout), hooks for business logic, and lib/ for external integrations. Tests mirror the src/ directory structure for easy navigation.

## Complexity Tracking

> **No constitution violations detected. This section is not needed.**

---

## Phase 0: Research & Technology Decisions

### Research Questions

Based on the Technical Context and specification requirements, the following research tasks are needed:

1. **Firebase SDK Setup**: Best practices for initializing Firebase in React with emulator support for local development
2. **Firestore Real-Time Listeners**: Patterns for React hooks that manage Firestore onSnapshot() lifecycle, reconnection, and error handling
3. **API Client with Timeout**: HTTP client configuration for 10-second timeout and fail-fast behavior (no auto-retry)
4. **Tablet-Optimized React**: CSS strategies for 768-1024px responsive design, portrait/landscape orientation handling, and 44x44pt touch targets
5. **Concurrent Session Sync**: Firestore listener behavior with multiple clients subscribed to the same document (verify automatic synchronization)
6. **Error Monitoring Integration**: Comparison of Firebase Crashlytics vs Sentry for client-side error tracking in React SPAs
7. **Testing Strategy**: Vitest + React Testing Library setup for hooks testing, Firebase emulator integration for tests

### Research Output Location

All research findings will be documented in `specs/006-host-app/research.md` with the following structure:
- **Decision**: What was chosen (e.g., "Use fetch() with AbortController for 10s timeout")
- **Rationale**: Why it was chosen (e.g., "Native browser API, no extra dependencies, explicit timeout control")
- **Alternatives Considered**: What else was evaluated (e.g., "axios - extra dependency, Fetch API sufficient")

---

## Phase 1: Design & Contracts

### Data Model (`data-model.md`)

**Entities to Document**:

1. **GameState** (read from Firestore `gameState/live`):
   - `currentPhase`: string (ready_for_next | accepting_answers | showing_distribution | showing_correct_answer | showing_results | all_revived | all_incorrect)
   - `currentQuestion`: Question | null
   - `isGongActive`: boolean
   - `participantCount`: number (for display)
   - `timeRemaining`: number | null (optional display)

2. **Question** (embedded in GameState):
   - `questionId`: string
   - `questionText`: string
   - `choices`: Array<{index: number, text: string}>
   - `period`: 'first-half' | 'second-half' | 'overtime'
   - `questionNumber`: number

3. **HostUser** (local auth state):
   - `uid`: string (Firebase user ID)
   - `email`: string (Google account)
   - `displayName`: string | null
   - `idToken`: string (for API Authorization header)

4. **HostActionRequest** (POST /host/game/advance payload):
   - `action`: string (START_QUESTION | SHOW_DISTRIBUTION | SHOW_CORRECT_ANSWER | SHOW_RESULTS | TRIGGER_GONG | REVIVE_ALL | ready_for_next)
   - `payload?`: object (e.g., {questionId: string} for START_QUESTION)

5. **HostActionResponse** (POST /host/game/advance response):
   - `success`: boolean
   - `message?`: string (error details if success=false)

**State Transitions**: Document the 7 game phases and valid action transitions (ready_for_next → START_QUESTION → accepting_answers, etc.)

### API Contracts (`contracts/host-api.yaml`)

**Endpoint to Define** (if not already in /packages/openapi/):

```yaml
openapi: 3.0.0
info:
  title: AllStars Host Control API
  version: 1.0.0
paths:
  /host/game/advance:
    post:
      summary: Advance game state by triggering an action
      security:
        - FirebaseAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/HostActionRequest'
      responses:
        '200':
          description: Action processed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HostActionResponse'
        '401':
          description: Unauthorized (invalid or missing Firebase ID token)
        '400':
          description: Invalid action or payload
        '500':
          description: Server error processing action
components:
  schemas:
    HostActionRequest:
      type: object
      required:
        - action
      properties:
        action:
          type: string
          enum: [START_QUESTION, SHOW_DISTRIBUTION, SHOW_CORRECT_ANSWER, SHOW_RESULTS, TRIGGER_GONG, REVIVE_ALL, ready_for_next]
        payload:
          type: object
          description: Optional action-specific data (e.g., questionId for START_QUESTION)
    HostActionResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
        message:
          type: string
          description: Error message if success=false
  securitySchemes:
    FirebaseAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Contract Validation**:
- Generate TypeScript types from OpenAPI spec using `openapi-typescript` or similar tool
- Add contract tests to validate api-client.ts conforms to the schema

### Development Quickstart (`quickstart.md`)

**Contents**:

1. **Prerequisites**:
   - Node.js 18+, pnpm
   - Firebase CLI (`npm install -g firebase-tools`)
   - iPad or Android tablet (or browser dev tools with tablet emulation)

2. **Firebase Emulator Setup**:
   ```bash
   # From repo root
   firebase emulators:start
   # Starts Auth, Firestore, and Functions emulators
   ```

3. **Host-App Development**:
   ```bash
   # From /apps/host-app/
   cp .env.example .env.local
   # Edit .env.local with emulator URLs
   pnpm install
   pnpm dev
   # Access at http://localhost:5173 (or configured port)
   ```

4. **Register Test Host User**:
   - Open Firebase Auth Emulator UI (http://localhost:4000/auth)
   - Add test Google user (e.g., host@test.com)
   - Use this account to log into host-app

5. **Testing**:
   ```bash
   pnpm test              # Run all tests with emulators
   pnpm test:unit         # Unit tests only
   pnpm test:e2e          # Playwright tablet scenarios
   ```

6. **Linting**:
   ```bash
   pnpm lint              # ESLint check
   pnpm format            # Prettier format
   ```

### Agent Context Update

After Phase 1 design completion, run:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This will add the following technologies to CLAUDE.md:
- React 18.2 (Frontend framework)
- Vite 5.0 (Build tool)
- Firebase SDK 10.7+ (Auth, Firestore, Crashlytics)
- Vitest 1.0+ (Testing framework)
- Playwright (E2E testing for tablet)
- TypeScript 5.3+ (strict mode)

---

## Implementation Readiness

**Prerequisites Met**:
- ✅ Constitution compliance verified (all gates pass)
- ✅ Feature specification fully clarified (5/5 questions resolved)
- ✅ Technical context defined (no NEEDS CLARIFICATION markers)
- ✅ Existing dependencies identified (api-server /host/* endpoints, Firestore gameState/live)
- ✅ Monorepo structure planned (apps/host-app + packages/types)

**Next Steps**:
1. ✅ **Phase 0 Complete**: Generate `research.md` with technology decisions and best practices
2. ✅ **Phase 1 Complete**: Generate `data-model.md`, `contracts/host-api.yaml`, `quickstart.md`
3. ⏳ **Phase 2 Pending**: Run `/speckit.tasks` to generate task breakdown in `tasks.md`

**Post-Phase 1 Constitution Re-Check**: After Phase 1 design, re-evaluate constitution compliance to ensure no new violations introduced during design phase.

---

**Plan Status**: ✅ Ready for Phase 0 and Phase 1 execution

**Last Updated**: 2025-11-03
