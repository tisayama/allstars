# Implementation Tasks: Projector-App WebSocket Authentication

**Feature Branch**: `001-projector-auth`
**Generated**: 2025-11-16
**Status**: Ready for Implementation

## Feature Overview

Implement secure, unattended WebSocket authentication for projector-app using Firebase custom tokens. This enables projector displays to automatically connect to the socket server without user interaction, supporting wedding venue kiosk deployments.

**Key Components**:
- API endpoint for custom token generation (api-server)
- Dedicated WebSocket namespace with authentication middleware (socket-server)
- Automatic authentication flow with token refresh (projector-app)
- Shared type definitions (@allstars/types)

**Testing Philosophy**: TDD is REQUIRED per constitution. All tests must be written BEFORE implementation (Red-Green-Refactor cycle).

---

## Implementation Strategy

### MVP Definition
**Minimum Viable Product = User Story 1 (Automatic Projector Connection)**

The MVP includes core authentication functionality:
- Custom token generation endpoint
- WebSocket namespace with Firebase token verification
- Client authentication flow with automatic connection
- Basic status display

User Stories 2 and 3 build upon this foundation with enhanced security, audit logging, and token management.

---

## Task Phases

### Phase 1: Setup & Project Initialization

**Purpose**: Prepare development environment and update shared types

- [X] T001 [P] Add service account patterns to /home/tisayama/allstars/.gitignore
- [X] T002 [P] Create api-server environment template at /home/tisayama/allstars/apps/api-server/.env.example
- [X] T003 [P] Create socket-server environment template at /home/tisayama/allstars/apps/socket-server/.env.example
- [X] T004 [P] Create projector-app environment template at /home/tisayama/allstars/apps/projector-app/.env.example
- [X] T005 [P] Add projector auth types to /home/tisayama/allstars/packages/types/src/ProjectorAuth.ts
- [X] T006 Export ProjectorAuth types from /home/tisayama/allstars/packages/types/src/index.ts
- [X] T007 Validate OpenAPI spec with swagger-cli: /home/tisayama/allstars/specs/001-projector-auth/contracts/projector-auth-api.yaml

---

### Phase 2: Foundational Infrastructure

**Purpose**: Build core server-side infrastructure that all user stories depend on

#### API Server - Custom Token Service (Foundation)

- [X] T008 Write failing unit tests for customTokenService at /home/tisayama/allstars/apps/api-server/tests/unit/customTokenService.test.ts
- [X] T009 Implement customTokenService.generateCustomToken() at /home/tisayama/allstars/apps/api-server/src/services/customTokenService.ts
- [X] T010 Write failing unit tests for apiKeyMiddleware at /home/tisayama/allstars/apps/api-server/tests/unit/apiKeyMiddleware.test.ts
- [X] T011 Implement apiKeyMiddleware with X-API-Key validation at /home/tisayama/allstars/apps/api-server/src/middleware/apiKeyMiddleware.ts

#### Socket Server - Namespace Foundation

- [X] T012 Write failing unit tests for projectorAuthMiddleware at /home/tisayama/allstars/apps/socket-server/tests/unit/projectorAuthMiddleware.test.ts
- [X] T013 Implement projectorAuthMiddleware with Firebase token verification at /home/tisayama/allstars/apps/socket-server/src/middleware/projectorAuthMiddleware.ts

---

### Phase 3: User Story 1 - Automatic Projector Connection [P1]

**Purpose**: Core authentication functionality - automatic connection without user interaction

**Independent Test**: Launch projector-app and verify "WebSocket: Connected" status appears automatically

#### API Server - Token Generation Endpoint [US1]

- [ ] T014 [US1] Write failing contract tests for POST /api/projector/auth-token at /home/tisayama/allstars/apps/api-server/tests/contract/projectorAuth.contract.test.ts
- [ ] T015 [US1] Write failing integration tests for projector auth routes at /home/tisayama/allstars/apps/api-server/tests/integration/projectorAuth.integration.test.ts
- [ ] T016 [US1] Implement POST /api/projector/auth-token endpoint at /home/tisayama/allstars/apps/api-server/src/routes/projectorAuthRoutes.ts
- [ ] T017 [US1] Register projectorAuthRoutes in /home/tisayama/allstars/apps/api-server/src/index.ts

#### Socket Server - Projector Namespace [US1]

- [ ] T018 [US1] Write failing contract tests for /projector-socket events at /home/tisayama/allstars/apps/socket-server/tests/contract/projectorSocket.contract.test.ts
- [ ] T019 [US1] Write failing integration tests for projector namespace at /home/tisayama/allstars/apps/socket-server/tests/integration/projectorSocket.integration.test.ts
- [ ] T020 [US1] Implement /projector-socket namespace with AUTH_REQUIRED flow at /home/tisayama/allstars/apps/socket-server/src/namespaces/projectorNamespace.ts
- [ ] T021 [US1] Register projectorNamespace in /home/tisayama/allstars/apps/socket-server/src/index.ts

#### Projector-App - Authentication Flow [US1]

- [X] T022 [US1] Write failing unit tests for authService at /home/tisayama/allstars/apps/projector-app/tests/unit/authService.test.ts
- [X] T023 [US1] Implement authService.fetchCustomToken() at /home/tisayama/allstars/apps/projector-app/src/services/authService.ts
- [X] T024 [US1] Write failing unit tests for useProjectorAuth hook at /home/tisayama/allstars/apps/projector-app/tests/unit/useProjectorAuth.test.ts
- [X] T025 [US1] Implement useProjectorAuth hook with automatic auth flow at /home/tisayama/allstars/apps/projector-app/src/hooks/useProjectorAuth.ts
- [X] T026 [US1] Update socketService to use /projector-socket namespace at /home/tisayama/allstars/apps/projector-app/src/services/socketService.ts
- [X] T027 [US1] Update useWebSocket to integrate useProjectorAuth at /home/tisayama/allstars/apps/projector-app/src/hooks/useWebSocket.ts

#### Projector-App - Status Display [US1]

- [X] T028 [US1] Write failing unit tests for ConnectionStatus component at /home/tisayama/allstars/apps/projector-app/tests/unit/ConnectionStatus.test.tsx
- [X] T029 [US1] Implement enhanced ConnectionStatus component (5-10% height status bar) at /home/tisayama/allstars/apps/projector-app/src/components/ConnectionStatus.tsx
- [X] T030 [US1] Integrate authentication flow in App.tsx at /home/tisayama/allstars/apps/projector-app/src/App.tsx

#### E2E Testing [US1]

- [X] T031 [US1] Write E2E test for complete authentication flow at /home/tisayama/allstars/tests/e2e/projector-auth.spec.ts
- [X] T032 [US1] Verify all User Story 1 tests pass (TDD completion)

---

### Phase 4: User Story 2 - Secure Unattended Operation [P2]

**Purpose**: Security enhancements and credential protection

**Independent Test**: Inspect browser console/network tab and verify no secrets are visible

#### Security Validation [US2]

- [X] T033 [US2] Write failing tests for environment variable security at /home/tisayama/allstars/apps/projector-app/tests/unit/envSecurity.test.ts
- [X] T034 [US2] Implement environment variable validation (no FIREBASE_PRIVATE_KEY in VITE_*) at /home/tisayama/allstars/apps/projector-app/src/utils/envValidator.ts
- [X] T035 [US2] Write failing tests for read-only permissions enforcement at /home/tisayama/allstars/apps/socket-server/tests/unit/projectorPermissions.test.ts
- [X] T036 [US2] Implement permission enforcement in projectorNamespace (reject write events) at /home/tisayama/allstars/apps/socket-server/src/namespaces/projectorNamespace.ts

#### Audit Logging [US2]

- [X] T037 [US2] Write failing tests for authentication audit logging at /home/tisayama/allstars/apps/api-server/tests/unit/auditLogger.test.ts
- [X] T038 [US2] Implement structured audit logging service at /home/tisayama/allstars/apps/api-server/src/services/auditLogger.ts
- [ ] T039 [US2] Add audit logging to customTokenService at /home/tisayama/allstars/apps/api-server/src/services/customTokenService.ts
- [ ] T040 [US2] Write failing tests for socket authentication logging at /home/tisayama/allstars/apps/socket-server/tests/unit/authLogging.test.ts
- [ ] T041 [US2] Add audit logging to projectorAuthMiddleware at /home/tisayama/allstars/apps/socket-server/src/middleware/projectorAuthMiddleware.ts

#### Session Management [US2]

- [ ] T042 [US2] Write failing tests for ProjectorSession management at /home/tisayama/allstars/apps/socket-server/tests/unit/sessionManager.test.ts
- [ ] T043 [US2] Implement session tracking with unique identifiers at /home/tisayama/allstars/apps/socket-server/src/services/sessionManager.ts
- [ ] T044 [US2] Integrate sessionManager in projectorNamespace at /home/tisayama/allstars/apps/socket-server/src/namespaces/projectorNamespace.ts

#### E2E Security Testing [US2]

- [ ] T045 [US2] Write E2E test for credential exposure check at /home/tisayama/allstars/tests/e2e/projector-security.spec.ts
- [ ] T046 [US2] Verify all User Story 2 tests pass (TDD completion)

---

### Phase 5: User Story 3 - Authentication Token Management [P3]

**Purpose**: Operational security - token rotation and error handling

**Independent Test**: Generate new token, update config, verify projector-app uses new token on restart

#### Token Lifecycle Management [US3]

- [ ] T047 [US3] Write failing tests for token expiration handling at /home/tisayama/allstars/apps/projector-app/tests/unit/tokenRefresh.test.ts
- [ ] T048 [US3] Implement token refresh logic before reconnection at /home/tisayama/allstars/apps/projector-app/src/hooks/useProjectorAuth.ts
- [ ] T049 [US3] Write failing tests for reconnection with token refresh at /home/tisayama/allstars/apps/projector-app/tests/integration/reconnection.integration.test.ts
- [ ] T050 [US3] Verify exponential backoff configuration (10 attempts, 1s-60s) at /home/tisayama/allstars/apps/projector-app/src/services/socketService.ts

#### Error Handling & Alerts [US3]

- [ ] T051 [US3] Write failing tests for authentication failure scenarios at /home/tisayama/allstars/apps/api-server/tests/integration/authFailures.integration.test.ts
- [ ] T052 [US3] Implement administrator alert on repeated auth failures (3+ attempts) at /home/tisayama/allstars/apps/socket-server/src/services/alertService.ts
- [ ] T053 [US3] Write failing tests for degraded mode behavior at /home/tisayama/allstars/apps/projector-app/tests/unit/degradedMode.test.ts
- [ ] T054 [US3] Implement degraded mode (show last known state) at /home/tisayama/allstars/apps/projector-app/src/hooks/useWebSocket.ts
- [ ] T055 [US3] Update ConnectionStatus for error messages "認証失敗：設定を確認してください" at /home/tisayama/allstars/apps/projector-app/src/components/ConnectionStatus.tsx

#### Token Rotation Support [US3]

- [ ] T056 [US3] Write failing tests for API key rotation at /home/tisayama/allstars/apps/api-server/tests/integration/keyRotation.integration.test.ts
- [ ] T057 [US3] Document token rotation procedure in /home/tisayama/allstars/specs/001-projector-auth/ROTATION.md
- [ ] T058 [US3] Implement token expiration warnings in audit logs at /home/tisayama/allstars/apps/api-server/src/services/auditLogger.ts

#### E2E Failure Testing [US3]

- [ ] T059 [US3] Write E2E test for invalid API key scenario at /home/tisayama/allstars/tests/e2e/projector-failures.spec.ts
- [ ] T060 [US3] Write E2E test for network interruption recovery at /home/tisayama/allstars/tests/e2e/projector-reconnection.spec.ts
- [ ] T061 [US3] Verify all User Story 3 tests pass (TDD completion)

---

### Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, monitoring, and production readiness

#### Rate Limiting

- [ ] T062 [P] Write failing tests for rate limiting at /home/tisayama/allstars/apps/api-server/tests/unit/rateLimiter.test.ts
- [ ] T063 [P] Implement rate limiting middleware (10 req/min per IP) at /home/tisayama/allstars/apps/api-server/src/middleware/rateLimiter.ts
- [ ] T064 Apply rate limiting to POST /api/projector/auth-token at /home/tisayama/allstars/apps/api-server/src/routes/projectorAuthRoutes.ts
- [ ] T065 [P] Implement REQUEST_STATE_REFRESH rate limiting (1 req/5s) at /home/tisayama/allstars/apps/socket-server/src/namespaces/projectorNamespace.ts

#### Performance & Monitoring

- [ ] T066 [P] Add performance metrics for token generation (<500ms target) at /home/tisayama/allstars/apps/api-server/src/services/customTokenService.ts
- [ ] T067 [P] Add performance metrics for connection establishment (<5s target) at /home/tisayama/allstars/apps/projector-app/src/hooks/useProjectorAuth.ts
- [ ] T068 [P] Add structured logging for debugging at /home/tisayama/allstars/apps/socket-server/src/namespaces/projectorNamespace.ts

#### Code Quality

- [ ] T069 [P] Run ESLint on api-server: pnpm --filter @allstars/api-server run lint
- [ ] T070 [P] Run ESLint on socket-server: pnpm --filter @allstars/socket-server run lint
- [ ] T071 [P] Run ESLint on projector-app: pnpm --filter @allstars/projector-app run lint
- [ ] T072 [P] Run TypeScript type checking across all modified packages: pnpm run typecheck
- [ ] T073 [P] Run Prettier formatting across all modified files: pnpm run format

#### Documentation

- [ ] T074 Update CLAUDE.md with new technologies and patterns at /home/tisayama/allstars/CLAUDE.md
- [ ] T075 Create production deployment guide at /home/tisayama/allstars/specs/001-projector-auth/DEPLOYMENT.md
- [ ] T076 Update main README with projector authentication setup at /home/tisayama/allstars/README.md

#### Manual Verification

- [ ] T077 Verify quickstart.md Test 1: Successful authentication flow
- [ ] T078 Verify quickstart.md Test 2: Invalid API key error handling
- [ ] T079 Verify quickstart.md Test 3: Socket server restart reconnection
- [ ] T080 Verify quickstart.md Test 4: Network interruption simulation
- [ ] T081 Verify quickstart.md Test 5: Manual state refresh functionality

---

## Dependencies

### Story Completion Order
1. **User Story 1 (P1)** must complete first - provides core authentication
2. **User Story 2 (P2)** depends on User Story 1 - adds security on top of working auth
3. **User Story 3 (P3)** depends on User Story 1 - adds management features to existing auth

### Technical Dependencies
- Phase 1 (Setup) must complete before all other phases
- Phase 2 (Foundation) must complete before Phase 3 (US1)
- T005-T006 (types package) blocks all implementation tasks
- T008-T009 (customTokenService) blocks T016 (API endpoint)
- T012-T013 (authMiddleware) blocks T020 (namespace)
- T022-T025 (client auth) blocks T026-T027 (socket integration)

---

## Parallel Execution Examples

### Within User Story 1 (After Foundation Complete)
Can run in parallel after Phase 2 completes:
- T014-T017 (API server endpoint)
- T018-T021 (Socket server namespace)
- T022-T025 (Client auth service)

### Within Polish Phase
Can run in parallel:
- T069, T070, T071 (Linting)
- T066, T067, T068 (Performance metrics)
- T062-T063 (Rate limiter tests + implementation)

### Test Execution
All test tasks within same phase can run in parallel:
- T014, T015 (Contract + integration tests for API)
- T018, T019 (Contract + integration tests for Socket)
- T022, T024, T028 (Client unit tests)

---

## Validation Checklist

### Code Quality Gates
- [ ] All ESLint rules pass (no warnings or errors)
- [ ] All TypeScript type checks pass
- [ ] All Prettier formatting applied
- [ ] No debugging code or console.logs in production code
- [ ] No commented-out code in commits

### Test Coverage Gates
- [ ] 100% of tests pass (zero failing tests policy)
- [ ] All contract tests validate against OpenAPI spec
- [ ] All user stories have corresponding E2E tests
- [ ] TDD workflow followed (tests written before implementation)

### Success Criteria Verification
- [ ] SC-001: Connection < 5 seconds (verified via E2E test T031)
- [ ] SC-002: Reconnection < 3 seconds (verified via E2E test T060)
- [ ] SC-003: 100% audit logging (verified via contract tests T014, T018)
- [ ] SC-004: 8+ hours unattended (manual test in staging)
- [ ] SC-005: Status visible from 3m (manual test T077)

### User Story Acceptance
- [ ] US1: Launch projector-app, verify automatic connection without user action
- [ ] US2: Inspect browser dev tools, verify no credentials visible
- [ ] US3: Rotate token, restart app, verify new token used

### Security Validation
- [ ] No service account credentials in client bundle (T034)
- [ ] No VITE_ variables contain sensitive data (T033)
- [ ] All authentication attempts logged (T037-T041)
- [ ] Read-only permissions enforced (T036)
- [ ] Rate limiting prevents abuse (T062-T065)

### Manual Testing (per quickstart.md)
- [ ] Test 1: Successful authentication (T077)
- [ ] Test 2: Invalid API key handling (T078)
- [ ] Test 3: Server restart recovery (T079)
- [ ] Test 4: Network interruption (T080)
- [ ] Test 5: Manual refresh (T081)

---

## Estimated Timeline

### MVP (User Story 1)
- **Setup**: 1 hour (T001-T007)
- **Foundation**: 3 hours (T008-T013)
- **User Story 1**: 8 hours (T014-T032)
- **Total MVP**: ~12 hours

### Complete Feature (All User Stories)
- **User Story 2**: 5 hours (T033-T046)
- **User Story 3**: 4 hours (T047-T061)
- **Polish**: 3 hours (T062-T081)
- **Total**: ~24 hours

### Task Breakdown
- Total Tasks: 81
- Setup/Foundation: 13 tasks
- User Story 1: 19 tasks
- User Story 2: 14 tasks
- User Story 3: 15 tasks
- Polish: 20 tasks

---

## Notes

### TDD Workflow
For each implementation task:
1. Write failing test (Red)
2. Implement minimal code to pass (Green)
3. Refactor for quality (Refactor)
4. Verify test passes
5. Commit with test + implementation together

### Environment Variables Security
**CRITICAL**: NEVER prefix sensitive credentials with `VITE_`
- ❌ `VITE_FIREBASE_PRIVATE_KEY` - Exposed in browser bundle
- ✅ `FIREBASE_PRIVATE_KEY` - Server-side only
- ✅ `VITE_PROJECTOR_API_KEY` - Limited scope, acceptable

### Socket.IO Configuration
Exponential backoff settings from research.md:
```typescript
{
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,      // 1s
  reconnectionDelayMax: 60000,  // 60s
  randomizationFactor: 0.5,     // ±50% jitter
}
```

### Performance Targets
- Token generation: < 500ms
- Initial connection: < 5 seconds (SC-001)
- Reconnection: < 3 seconds (SC-002)
- WebSocket auth: < 100ms verification

---

**Tasks Version**: 1.0.0
**Generated**: 2025-11-16
**Status**: Ready for Implementation
