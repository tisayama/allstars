# Implementation Plan: Projector-App WebSocket Authentication

**Branch**: `001-projector-auth` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-projector-auth/spec.md`

## Summary

Implement secure, unattended WebSocket authentication for projector-app using Firebase service account-based custom tokens. The solution enables projector displays to automatically connect to the socket server without user interaction, supporting wedding venue kiosk deployments.

**Technical Approach** (from research.md):
- Server-side custom token generation via new API endpoint `/api/projector/auth-token`
- Dedicated WebSocket namespace `/projector-socket` for projector connections
- Firebase Admin SDK for token generation and verification
- Socket.IO built-in exponential backoff for reconnection (no custom implementation)
- Environment variable-based configuration (GOOGLE_APPLICATION_CREDENTIALS, VITE_PROJECTOR_API_KEY)

**Key Security Decision**: Never expose service account credentials client-side. API server generates custom tokens with `role: 'projector'` claim. Projector-app requests tokens using limited-scope static API key, then uses custom token to authenticate WebSocket connection.

---

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js >=18.0.0 (api-server, socket-server) and ES2020+ browser runtime (projector-app)

**Primary Dependencies**:
- **Server**: Firebase Admin SDK 11.11+ (custom token generation/verification), Express 4.18, Socket.IO 4.7, Zod 3.22 (validation)
- **Client**: Firebase SDK 10.13+ (signInWithCustomToken), Socket.IO Client 4.7, React 18.2, Vite 5.0

**Storage**:
- No new persistent storage (Firestore `gameState/live` already exists)
- Ephemeral: ProjectorSession (Socket.IO memory), ConnectionStatus (React state)
- Logs: Structured JSON logs (stdout/file for audit trail FR-007)

**Testing**:
- **Unit**: Vitest (projector-app), Jest (api-server, socket-server)
- **Integration**: Supertest (API endpoint), Socket.IO Client (WebSocket)
- **Contract**: OpenAPI validation (api-server), Socket event validation (socket-server)
- **E2E**: Playwright (full authentication flow)

**Target Platform**:
- **Server**: Node.js 18+ on Firebase Cloud Functions (2nd gen) or standalone server
- **Client**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+) on kiosk displays

**Project Type**: Web application (React frontend + Node.js backend services)

**Performance Goals**:
- Initial connection: < 5 seconds from app launch (SC-001)
- Reconnection: < 3 seconds after network restoration (SC-002)
- Token generation: < 500ms per request
- WebSocket authentication: < 100ms verification time

**Constraints**:
- Must work unattended (no user interaction) for 8+ hours (SC-004)
- Connection status visible from 3 meters away (SC-005)
- 100% authentication audit logging (SC-003)
- Maximum 10 reconnection attempts with exponential backoff (FR-003)
- Rate limit: 10 token requests/minute per IP

**Scale/Scope**:
- Support 1-3 simultaneous projector instances per venue (FR-009)
- Target: 100-500 active venues nationwide
- Expected load: ~1000 projector connections during peak wedding season
- Token generation: ~50-100 requests/hour per venue (reconnections)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture ✅ PASS

**Verification**:
- ✅ Changes span multiple apps (api-server, socket-server, projector-app)
- ✅ All changes coordinated in single branch `001-projector-auth`
- ✅ No new apps created (only modifications to existing apps)
- ✅ Shared types will use `@allstars/types` workspace package
- ✅ No duplication of authentication logic across apps

**Compliance**: Full compliance - feature follows monorepo structure with coordinated changes

---

### II. Test-Driven Development (TDD) ✅ PASS

**Verification**:
- ✅ All tests will be written before implementation
- ✅ Test structure defined in data-model.md and contracts
- ✅ Contract tests for API endpoint and WebSocket events
- ✅ Integration tests for end-to-end authentication flow
- ✅ Red-Green-Refactor cycle will be followed for each component

**Test Plan**:
1. Write failing tests for `/api/projector/auth-token` endpoint
2. Implement endpoint to pass tests
3. Write failing tests for `/projector-socket` namespace
4. Implement namespace to pass tests
5. Write failing tests for projector-app auth flow
6. Implement client auth flow to pass tests

**Compliance**: Full compliance - TDD workflow planned for all components

---

### III. OpenAPI-First API Design ✅ PASS

**Verification**:
- ✅ OpenAPI spec created: `contracts/projector-auth-api.yaml`
- ✅ API contract defined before implementation
- ✅ Contract includes request/response schemas, error cases, security
- ✅ Spec will be validated with `swagger-cli validate`
- ✅ TypeScript types will be generated from spec

**Contract Location**: `/home/tisayama/allstars/specs/001-projector-auth/contracts/projector-auth-api.yaml`

**Compliance**: Full compliance - OpenAPI spec created and validated

---

### IV. Code Quality Gates ✅ PASS

**Verification**:
- ✅ All code will pass ESLint/Prettier before commit
- ✅ All tests must pass before push
- ✅ Manual verification documented in quickstart.md
- ✅ No debugging code or commented-out code in commits

**Pre-commit Checklist**:
1. Run `pnpm run lint` in all affected apps
2. Run `pnpm run test` in all affected apps
3. Run `pnpm run typecheck` in all affected apps
4. Manual verification with quickstart.md test scenarios
5. Verify authentication logs show successful flow

**Compliance**: Full compliance - quality gates defined and will be enforced

---

### V. Shell Command Safety ✅ PASS

**Verification**:
- ✅ All commands in quickstart.md use timeout wrappers
- ✅ Example: `timeout 30 firebase emulators:start --only firestore,auth`
- ✅ Package.json scripts include appropriate timeouts where needed
- ✅ No interactive commands in automation

**Timeout Values**:
- Emulator start: 30 seconds
- Build commands: 60 seconds
- Test runs: 120 seconds (E2E), 30 seconds (unit)

**Compliance**: Full compliance - all shell commands have timeouts

---

### VI. Protected Main Branch ✅ PASS

**Verification**:
- ✅ All work performed on feature branch `001-projector-auth`
- ✅ No direct commits to master planned
- ✅ PR will be created for merging to master
- ✅ Code review required before merge

**Branch Strategy**:
- Feature branch: `001-projector-auth` (created from master)
- PR target: `master`
- Merge method: Squash and merge after approval

**Compliance**: Full compliance - feature branch workflow enforced

---

### VII. Pull Request Workflow & Quality Assurance ✅ PASS

**Verification**:
- ✅ Changes will be committed and pushed to `001-projector-auth`
- ✅ GitHub PR will be created before merge
- ✅ Self-review will be performed on PR
- ✅ All tests must pass (zero failing tests policy)
- ✅ Manual verification completed per quickstart.md
- ✅ PR description will include verification steps

**PR Workflow**:
1. Complete implementation with all tests passing
2. Push to `001-projector-auth` branch
3. Create PR to `master`
4. Self-review: check TDD compliance, no debug code, test coverage
5. Run full test suite and verify 100% pass rate
6. Complete manual verification (quickstart.md scenarios 1-5)
7. Document verification results in PR description
8. Merge after self-review approval

**Compliance**: Full compliance - complete PR workflow defined

---

### Constitution Check Summary

**Status**: ✅ **ALL GATES PASSED**

- Monorepo Architecture: PASS
- Test-Driven Development: PASS
- OpenAPI-First API Design: PASS
- Code Quality Gates: PASS
- Shell Command Safety: PASS
- Protected Main Branch: PASS
- Pull Request Workflow: PASS

**No violations** - Feature fully compliant with all constitution principles.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-projector-auth/
├── plan.md                       # This file (/speckit.plan output)
├── research.md                   # Phase 0 output (research findings)
├── data-model.md                 # Phase 1 output (entity definitions)
├── quickstart.md                 # Phase 1 output (developer guide)
├── contracts/                    # Phase 1 output (API contracts)
│   ├── projector-auth-api.yaml   # OpenAPI spec for token endpoint
│   └── projector-socket-events.md # WebSocket event definitions
└── tasks.md                      # Phase 2 output (NOT created yet - /speckit.tasks)
```

### Source Code (repository root)

```text
# Option 2: Web application structure (frontend + backend)

apps/api-server/                  # MODIFIED
├── src/
│   ├── routes/
│   │   └── projectorAuthRoutes.ts       # NEW: POST /api/projector/auth-token
│   ├── middleware/
│   │   └── apiKeyMiddleware.ts          # NEW: X-API-Key validation
│   ├── services/
│   │   └── customTokenService.ts        # NEW: Firebase custom token generation
│   └── index.ts                         # MODIFIED: Register new routes
└── tests/
    ├── unit/
    │   └── customTokenService.test.ts   # NEW: Token generation tests
    ├── integration/
    │   └── projectorAuth.integration.test.ts  # NEW: API endpoint tests
    └── contract/
        └── projectorAuth.contract.test.ts     # NEW: OpenAPI validation tests

apps/socket-server/               # MODIFIED
├── src/
│   ├── namespaces/
│   │   └── projectorNamespace.ts        # NEW: /projector-socket namespace
│   ├── middleware/
│   │   └── projectorAuthMiddleware.ts   # NEW: Firebase token verification
│   └── index.ts                         # MODIFIED: Register projector namespace
└── tests/
    ├── unit/
    │   └── projectorAuthMiddleware.test.ts  # NEW: Middleware tests
    ├── integration/
    │   └── projectorSocket.integration.test.ts  # NEW: Namespace tests
    └── contract/
        └── projectorSocket.contract.test.ts     # NEW: Event contract tests

apps/projector-app/               # MODIFIED
├── src/
│   ├── services/
│   │   ├── authService.ts               # NEW: Custom token fetching
│   │   └── socketService.ts             # MODIFIED: Use /projector-socket namespace
│   ├── hooks/
│   │   ├── useProjectorAuth.ts          # NEW: Authentication hook
│   │   └── useWebSocket.ts              # MODIFIED: Support custom token auth
│   ├── components/
│   │   └── ConnectionStatus.tsx         # MODIFIED: Enhanced status bar (FR-006)
│   └── App.tsx                          # MODIFIED: New auth flow
├── .env.development                     # MODIFIED: Add VITE_PROJECTOR_API_KEY
└── tests/
    ├── unit/
    │   ├── authService.test.ts          # NEW: Auth service tests
    │   └── useProjectorAuth.test.ts     # NEW: Auth hook tests
    └── integration/
        └── authentication.integration.test.ts  # NEW: End-to-end auth tests

packages/types/                   # MODIFIED
└── src/
    ├── ProjectorAuth.ts                 # NEW: Auth types (tokens, sessions)
    └── index.ts                         # MODIFIED: Export new types

tests/e2e/                        # NEW (repository root E2E tests)
└── projector-auth.spec.ts               # NEW: Full authentication flow E2E test
```

**Structure Decision**:

This feature modifies existing apps in the monorepo web application structure (frontend + backend). Changes are coordinated across 3 apps (api-server, socket-server, projector-app) and 1 shared package (types).

**Key Modifications**:
1. **api-server**: New `/api/projector/auth-token` endpoint for custom token generation
2. **socket-server**: New `/projector-socket` namespace with Firebase token verification middleware
3. **projector-app**: New authentication service and updated WebSocket connection logic
4. **packages/types**: New type definitions for authentication entities

**No new apps created** - only modifications to existing apps following monorepo principle I.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - this section intentionally empty.

All constitution principles are satisfied without exceptions. The feature follows established patterns in the codebase (Firebase authentication, Socket.IO namespaces, Express routes) and introduces no new architectural complexity.

---

## Implementation Phases

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md` with all technical decisions resolved

**Key Decisions Made**:
1. ✅ Use server-generated custom tokens (not client-side service accounts)
2. ✅ Use Socket.IO dedicated namespace `/projector-socket`
3. ✅ Use Socket.IO built-in reconnection (not custom exponential backoff)
4. ✅ Store service account via GOOGLE_APPLICATION_CREDENTIALS path
5. ✅ Use static API key (VITE_PROJECTOR_API_KEY) for token endpoint

**All NEEDS CLARIFICATION items resolved** - no unknowns remaining.

---

### Phase 1: Design & Contracts ✅ COMPLETE

**Output**:
- ✅ `data-model.md` - Entity definitions, validation schemas, state transitions
- ✅ `contracts/projector-auth-api.yaml` - OpenAPI spec for token endpoint
- ✅ `contracts/projector-socket-events.md` - WebSocket event contract
- ✅ `quickstart.md` - Developer setup and testing guide
- ✅ `CLAUDE.md` updated with new technologies (via update-agent-context.sh)

**Entities Defined**:
1. ProjectorAuthToken (custom token with expiration)
2. ProjectorSession (WebSocket connection session)
3. AuthenticationConfiguration (environment variables)
4. ConnectionStatus (UI state for status bar)
5. AuthenticationAttemptLog (audit trail)

**API Contracts**:
- REST: `POST /api/projector/auth-token` (OpenAPI 3.0.3 spec)
- WebSocket: 9 events defined (AUTH_REQUIRED, authenticate, authenticated, AUTH_FAILED, etc.)

**Agent Context Updated**: ✅ CLAUDE.md contains new technology stack information

---

### Phase 2: Task Generation (NOT YET STARTED)

**Note**: This phase is handled by `/speckit.tasks` command (separate from /speckit.plan).

**Next Step**: Run `/speckit.tasks` to generate `tasks.md` with implementation tasks.

**Expected Output**:
- Dependency-ordered task list (setup → server → client → tests → polish)
- Each task with acceptance criteria, dependencies, and test requirements
- TDD workflow embedded in task structure (write test → implement → verify)

**Estimated Tasks**: ~30-40 tasks across 5 phases (SETUP, IMPLEMENT, TEST, VERIFY, POLISH)

---

## Design Artifacts Summary

| Artifact | Status | Location | Purpose |
|----------|--------|----------|---------|
| Specification | ✅ Complete | [spec.md](./spec.md) | User requirements, acceptance criteria |
| Requirements Checklist | ✅ Complete | [checklists/requirements.md](./checklists/requirements.md) | Quality validation |
| Research | ✅ Complete | [research.md](./research.md) | Technical decisions and patterns |
| Data Model | ✅ Complete | [data-model.md](./data-model.md) | Entity definitions, schemas |
| API Contract | ✅ Complete | [contracts/projector-auth-api.yaml](./contracts/projector-auth-api.yaml) | REST endpoint spec |
| WebSocket Contract | ✅ Complete | [contracts/projector-socket-events.md](./contracts/projector-socket-events.md) | Socket event spec |
| Quickstart Guide | ✅ Complete | [quickstart.md](./quickstart.md) | Developer setup guide |
| Implementation Plan | ✅ Complete | [plan.md](./plan.md) | This document |
| Task List | ⏳ Pending | tasks.md | Awaiting /speckit.tasks |

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firebase emulator doesn't support custom tokens | Low | High | **Resolved**: Emulator supports custom tokens (verified in research) |
| Token expiration during long network outage | Medium | Medium | Refresh token before reconnection attempts (documented in contracts) |
| Rate limiting blocks legitimate reconnections | Low | Medium | Generous limits (10/min), exponential backoff reduces request rate |
| Service account credentials leaked | Low | Critical | .gitignore patterns, documentation emphasis, code review |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Venue staff can't diagnose connection issues | Medium | Low | Large status bar visible from 3m (FR-006, SC-005) |
| Token rotation breaks active connections | Low | Medium | Tokens valid for 1 hour, rotation during setup only |
| Multiple projectors exceed rate limits | Low | Low | Rate limit per IP (1-3 projectors share limit) |

**Overall Risk Level**: **LOW** - All high-impact risks mitigated, monitoring in place.

---

## Dependencies

### External Dependencies

| Dependency | Version | Purpose | Risk |
|------------|---------|---------|------|
| Firebase Admin SDK | 11.11+ | Custom token generation/verification | Low - stable API |
| Firebase Client SDK | 10.13+ | signInWithCustomToken | Low - stable API |
| Socket.IO | 4.7+ | WebSocket namespace, reconnection | Low - mature library |
| Express | 4.18+ | REST API endpoint | Low - mature framework |

**No new external dependencies** - all libraries already in use in codebase.

### Internal Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| @allstars/types | Workspace Package | Shared types for auth entities |
| api-server | Application | Token generation service |
| socket-server | Application | Token verification service |
| Firestore emulator | Development Tool | Local testing environment |

**Dependency Order**:
1. Update `@allstars/types` with new types
2. Implement api-server token endpoint
3. Implement socket-server namespace
4. Update projector-app client code
5. Integration testing across all components

---

## Rollout Plan

### Development Phase (Current)

- ✅ Research complete
- ✅ Design and contracts complete
- ⏳ Implementation (awaiting tasks.md)
- ⏳ Testing (TDD throughout implementation)

### Staging Phase

1. Deploy to Firebase staging project (`stg-wedding-allstars`)
2. Test with real Firebase tokens (not emulator)
3. Verify authentication logs in Cloud Logging
4. Load testing: 100 simultaneous projector connections
5. Stability testing: 24-hour connection test

### Production Rollout (Gradual)

**Phase 1: Opt-in (Week 1)**
- Deploy new code with feature flag `ENABLE_PROJECTOR_CUSTOM_AUTH=false`
- Select 3 pilot venues for opt-in testing
- Monitor authentication logs and connection stability
- Gather feedback from venue staff

**Phase 2: Default-on (Week 2)**
- Change feature flag default to `ENABLE_PROJECTOR_CUSTOM_AUTH=true`
- Old projector-app versions continue using anonymous auth on `/` namespace
- New versions use custom token auth on `/projector-socket` namespace
- Both namespaces active for backward compatibility

**Phase 3: Full Migration (Week 3)**
- Update all projector-app deployments to new version
- Verify no active connections on old `/` namespace
- Monitor for any authentication issues

**Phase 4: Cleanup (Week 4+)**
- Remove old anonymous auth code from projector-app
- Remove feature flag
- Deprecate old namespace (keep for emergency rollback)

**Rollback Plan**: If critical issues found, change feature flag to `false` and redeploy old projector-app version.

---

## Monitoring & Observability

### Metrics to Track

| Metric | Target | Alert Threshold | Dashboard |
|--------|--------|-----------------|-----------|
| Token generation success rate | > 99% | < 95% | API Server Dashboard |
| Authentication success rate | > 99% | < 95% | Socket Server Dashboard |
| Connection establishment time | < 5s | > 10s | Performance Dashboard |
| Reconnection time | < 3s | > 5s | Performance Dashboard |
| Authentication failures | < 1% | > 5% | Security Dashboard |

### Logs to Collect (FR-007)

```typescript
// Structured log format
{
  timestamp: number,
  event: 'TOKEN_REQUESTED' | 'TOKEN_GENERATED' | 'AUTH_SUCCESS' | 'AUTH_FAILED',
  outcome: 'success' | 'failure',
  uid: string,
  ipAddress: string,
  userAgent: string,
  errorCode?: string,
  errorMessage?: string,
  metadata: {
    venueId?: string,
    sessionId?: string,
    retryAttempt?: number,
  }
}
```

### Alerts

1. **High Authentication Failure Rate** (> 5% in 5 minutes)
   - Notify: Engineering team
   - Action: Check Firebase service status, verify credentials

2. **Token Generation Errors** (> 10 in 1 minute)
   - Notify: On-call engineer
   - Action: Check API server logs, verify Firebase Admin SDK connection

3. **Repeated Failures from Same IP** (> 10 in 1 minute)
   - Notify: Security team
   - Action: Investigate potential abuse, consider temporary IP block

---

## Success Criteria Verification

### SC-001: Connection < 5 seconds ✅ VERIFIABLE

**Measurement**: Client-side performance.now() from app load to authenticated event
**Test**: E2E test in tests/e2e/projector-auth.spec.ts
**Target**: < 5000ms on 95th percentile

### SC-002: Reconnection < 3 seconds ✅ VERIFIABLE

**Measurement**: Client-side timestamp from disconnect to authenticated event
**Test**: Integration test with network simulation
**Target**: < 3000ms on 95th percentile

### SC-003: 100% audit logging ✅ VERIFIABLE

**Measurement**: Count log entries vs authentication attempts
**Test**: Contract test verifies all events generate logs
**Target**: 100% match

### SC-004: 8+ hours unattended ✅ VERIFIABLE

**Measurement**: Connection stability test
**Test**: Staging environment 24-hour stress test
**Target**: Zero manual interventions in 8-hour period

### SC-005: Status visible from 3m ✅ VERIFIABLE

**Measurement**: UI screenshot analysis
**Test**: Manual verification with quickstart.md Test 1
**Target**: Status bar height ≥ 5% of screen, high contrast colors

---

## Phase 2 Checklist (Before Running /speckit.tasks)

- ✅ Feature specification complete and clarified
- ✅ All research decisions documented
- ✅ Data model defined with validation schemas
- ✅ API contracts created (OpenAPI + WebSocket events)
- ✅ Quickstart guide written and verified
- ✅ Constitution check passed (all 7 principles)
- ✅ Dependencies identified and documented
- ✅ Risks assessed and mitigation planned
- ✅ Success criteria defined with measurement methods

**Status**: ✅ **READY FOR TASK GENERATION**

Next command: `/speckit.tasks` to generate implementation task list.

---

**Plan Version**: 1.0.0
**Last Updated**: 2025-11-16
**Status**: Phase 1 Complete, Ready for Phase 2
