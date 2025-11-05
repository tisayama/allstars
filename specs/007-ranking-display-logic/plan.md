# Implementation Plan: Ranking Display Logic

**Branch**: `007-ranking-display-logic` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-ranking-display-logic/spec.md`

## Summary

This feature changes the ranking display logic to show different rankings based on question type:
- **Non-final questions**: Display only Worst 10 ranking (slowest 10 correct answers), eliminate slowest participant(s)
- **Period-final questions** (identified by `isGongActive: true`): Display only Top 10 ranking (fastest 10 correct answers), designate period champion(s)

**Technical Approach**:
- Modify existing ranking calculation in `answerService.ts` to filter correct answers (currently filters incorrect answers for Worst 10)
- Update GameResults type to include `periodChampions`, `period`, and `rankingError` fields
- Implement conditional display logic based on `isGongActive` flag in GameState
- Add retry logic (3 attempts) for ranking calculation failures with graceful degradation to empty rankings

## Technical Context

**Language/Version**: TypeScript 5.3.2 with Node.js >=18.0.0
**Primary Dependencies**: Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation), p-retry 6.1 (retry logic)
**Storage**: Firebase Firestore (NoSQL cloud database)
**Testing**: Jest 29.7 with ts-jest, Supertest for API integration tests
**Target Platform**: Firebase Cloud Functions (2nd generation), Node.js runtime
**Project Type**: Monorepo (web application with 4 frontends + 2 backends)
**Performance Goals**: Rankings display within 2 seconds for 95% of questions, API responses <500ms p95
**Constraints**:
- Must not block game phase transitions even if ranking calculation fails
- Must maintain 100% game progression continuity (fail gracefully)
- Must handle concurrent ties (can exceed 10 participants in rankings)
**Scale/Scope**:
- Expected ~50-200 participants per game
- Rankings calculated per question (typically 10-20 questions per game)
- Real-time updates to multiple connected clients via Firestore listeners

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture
✅ **PASS** - Changes span multiple apps/packages within single feature branch:
- `/apps/api-server/` - Ranking calculation service modifications
- `/packages/types/` - GameResults type extension
- `/apps/projector-app/`, `/apps/participant-app/`, `/apps/host-app/` - Display logic updates (Phase 2)

No application boundary violations. Shared types remain in `/packages/types/`.

### Principle II: Test-Driven Development (TDD)
✅ **COMMITTED** - Plan includes:
- Phase 1: Unit tests for ranking calculation (before implementation)
- Integration tests for API endpoints with retry logic
- Contract tests against OpenAPI specs (if API contracts change)
- TDD workflow: Write test → Verify failure → Implement → Refactor

### Principle III: OpenAPI-First API Design
⚠️ **CONDITIONAL** - Current ranking changes are internal service modifications, not REST API endpoint changes. However:
- If `/host/game/advance` response schema changes (adding `rankingError` field), OpenAPI spec in `/packages/openapi/` MUST be updated first
- Current plan: GameResults changes are internal to Firestore GameState document structure, no REST API contract changes required
- **Action**: Verify in Phase 1 if API contracts need updates

### Principle IV: Code Quality Gates
✅ **COMMITTED** - Plan includes:
- Linting with ESLint (existing: `npm run lint`)
- Formatting with Prettier (existing: `npm run format:check`)
- Full test suite execution before commits
- Manual verification steps documented in tasks.md

### Principle V: Shell Command Safety
✅ **PASS** - All automated commands use existing npm scripts with implicit timeouts:
- `npm test` (Jest with default 5s per-test timeout)
- `npm run lint` (ESLint <30s typical)
- Firebase emulator operations use existing timeout configurations

**Gate Result**: ✅ **PASS** - All principles satisfied. Ready for Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/007-ranking-display-logic/
├── spec.md              # Feature specification (completed)
├── checklists/
│   └── requirements.md  # Quality checklist (completed)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (OpenAPI specs if needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
/allstars/  (Monorepo Root)
├── /apps/
│   ├── /api-server/           # PRIMARY: Ranking calculation logic changes
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   ├── answerService.ts      # MODIFY: getWorst10CorrectAnswers (currently getWorst10IncorrectAnswers)
│   │   │   │   └── gameStateService.ts   # MODIFY: Add period champion persistence logic
│   │   │   └── utils/
│   │   │       └── retry.ts              # NEW: Retry wrapper using p-retry
│   │   └── tests/
│   │       ├── unit/
│   │       │   └── services/
│   │       │       ├── answerService.test.ts          # MODIFY: Add Worst 10 correct answers tests
│   │       │       └── gameStateService.test.ts       # MODIFY: Add period champion tests
│   │       └── integration/
│   │           └── host.test.ts                        # MODIFY: Verify ranking display logic
│   ├── /projector-app/        # FRONTEND: Display logic updates (Phase 2)
│   ├── /participant-app/      # FRONTEND: Display logic updates (Phase 2)
│   └── /host-app/             # FRONTEND: Display logic updates (Phase 2)
├── /packages/
│   ├── /types/                # SHARED TYPES: GameResults extension
│   │   ├── src/
│   │   │   ├── GameState.ts              # MODIFY: Extend GameResults interface
│   │   │   └── index.ts                  # Re-export updated types
│   │   └── tests/
│   │       └── unit/
│   │           └── GameState.test.ts     # NEW: Type validation tests
│   └── /openapi/              # API CONTRACTS: Update if REST APIs change
│       └── api-server.yaml                # CONDITIONAL: Update if /host/game/advance response changes
└── /docs/                     # Documentation updates (if needed)
```

**Structure Decision**: Monorepo web application structure with apps/ and packages/ separation per Constitution Principle I. Primary changes in `/apps/api-server/` (backend logic) and `/packages/types/` (shared types). Frontend apps (`projector-app`, `participant-app`, `host-app`) will be updated in Phase 2 (tasks.md execution) to consume the new ranking logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All changes fit within existing monorepo structure and follow TDD/OpenAPI-first principles.

---

## Phase 0: Research & Technical Decisions

### Research Topics

1. **p-retry Configuration**: Determine optimal retry strategy for Firestore read operations
   - Exponential backoff configuration
   - Retry timeout values for ranking calculation
   - Error types to retry vs. fail-fast

2. **Firestore Transaction Requirements**: Investigate if period champion persistence requires atomic updates
   - Assess conflict scenarios (concurrent SHOW_RESULTS calls)
   - Determine if Firestore batch writes suffice or transactions needed

3. **Type Safety for Ranking Arrays**: Research TypeScript patterns for tie-handling in ranking arrays
   - How to type arrays that can exceed 10 elements (due to ties)
   - Validation patterns for ensuring correct answer filtering

4. **Error Propagation Strategy**: Determine how ranking errors surface to frontend clients
   - GameState.results.rankingError flag vs. separate error field
   - Real-time listener behavior when partial results available

### Technical Decisions to Document

- **Retry Strategy**: Number of retries (3 confirmed in spec), backoff algorithm, timeout per attempt
- **Period Champion Storage**: Structure of `periodChampions` array (participant IDs vs. full objects)
- **Empty Rankings Representation**: `top10: []` / `worst10: []` vs. `null` vs. omitted fields
- **Error Logging**: Log format, monitoring service integration (Firebase Crashlytics/Cloud Logging)

### Research Output

All research findings will be documented in `research.md` with:
- **Decision**: What was chosen
- **Rationale**: Why chosen (performance, maintainability, error handling)
- **Alternatives Considered**: What else was evaluated and why rejected
- **References**: Links to Firebase docs, p-retry documentation, TypeScript patterns

---

## Phase 1: Data Model & Contracts

### Data Model Changes

**File**: `/home/tisayama/allstars/specs/007-ranking-display-logic/data-model.md`

**Entities to Document**:

1. **GameResults** (extend existing interface in `/packages/types/src/GameState.ts`):
   ```typescript
   interface GameResults {
     top10: Answer[];                   // Existing: fastest correct answers
     worst10: Answer[];                 // MODIFY: slowest CORRECT answers (currently incorrect)
     periodChampions?: string[];        // NEW: Participant IDs of period champions (supports ties)
     period?: GamePeriod;               // NEW: Period identifier for this question
     rankingError?: boolean;            // NEW: True if ranking calculation failed after retries
   }
   ```

   **Validation Rules**:
   - `top10` and `worst10` MUST contain only correct answers (`isCorrect === true`)
   - `top10` sorted ascending by `responseTimeMs` (fastest first)
   - `worst10` sorted descending by `responseTimeMs` (slowest first)
   - Arrays MAY exceed 10 elements when ties occur at boundary positions
   - `periodChampions` populated only when `isGongActive: true` during results calculation
   - `period` MUST match `currentQuestion.period` from GameState
   - `rankingError: true` implies `top10 === []` and `worst10 === []`

2. **Answer** (existing interface, no changes needed):
   ```typescript
   interface Answer {
     id: string;
     guestId: string;
     questionId: string;
     selectedChoice: number;
     isCorrect: boolean;
     responseTimeMs: number;
     submittedAt: Date;
   }
   ```

   **Usage Context**: Source data for ranking calculations in `answerService.ts`

3. **GamePeriod** (existing enum, reference only):
   ```typescript
   type GamePeriod = 'first-half' | 'second-half' | 'overtime';
   ```

   **Usage Context**: Used to populate `GameResults.period` field

### Contract Changes

**File**: `/home/tisayama/allstars/specs/007-ranking-display-logic/contracts/` (if applicable)

**Assessment**:
- Ranking changes are internal to Firestore GameState document structure
- No REST API endpoint signatures change
- Frontend apps consume GameState via Firestore real-time listeners, not REST APIs

**Action Required**:
✅ **NO OpenAPI contract updates needed** - GameResults is a Firestore document schema, not a REST response schema. All clients read GameState via Firestore SDK.

**Exception**: If future API endpoints expose GameResults directly (e.g., GET /api/results/:questionId), OpenAPI specs MUST be created at that time.

### Quickstart Guide

**File**: `/home/tisayama/allstars/specs/007-ranking-display-logic/quickstart.md`

**Content Outline**:
1. **Prerequisites**: Running Firebase emulators, seeded test data
2. **Testing Ranking Logic**:
   - Start api-server in development mode
   - Trigger non-final question with 12+ correct answers
   - Verify Worst 10 ranking displays slowest correct answers
   - Trigger gong (`isGongActive: true`)
   - Trigger period-final question
   - Verify Top 10 ranking displays fastest correct answers
   - Verify period champion designation
3. **Testing Error Handling**:
   - Simulate Firestore timeout (disconnect emulator mid-query)
   - Verify 3 retry attempts occur
   - Verify graceful degradation (empty rankings, game continues)
4. **Verifying Frontend Display**:
   - Open projector-app, participant-app, host-app
   - Verify conditional rendering (Top 10 hidden on non-final, Worst 10 hidden on final)
   - Verify tie handling (rankings exceed 10 participants)

### Agent Context Update

**Command**: `.specify/scripts/bash/update-agent-context.sh claude`

**Expected Updates to `/home/tisayama/allstars/CLAUDE.md`**:
- Add TypeScript strict mode patterns for tie-handling in ranking arrays
- Add p-retry configuration examples for Firestore operations
- Add GameResults type extension patterns
- Add error propagation strategies for real-time listeners

**Preservation**: Manual additions between `<!-- MANUAL ADDITIONS START -->` and `<!-- MANUAL ADDITIONS END -->` markers will be preserved.

---

## Phase 2: Task Breakdown (Deferred to /speckit.tasks)

Phase 2 (task generation) is handled by the `/speckit.tasks` command and will produce `/home/tisayama/allstars/specs/007-ranking-display-logic/tasks.md` with dependency-ordered implementation tasks.

**Expected Task Categories**:
1. **Backend Service Changes** (apps/api-server):
   - Modify `getWorst10IncorrectAnswers` → `getWorst10CorrectAnswers`
   - Add retry wrapper using p-retry
   - Implement period champion persistence logic
   - Add error handling and logging
2. **Shared Type Updates** (packages/types):
   - Extend GameResults interface
   - Add validation logic
3. **Frontend Display Logic** (projector-app, participant-app, host-app):
   - Conditional rendering based on `isGongActive`
   - Tie handling display
   - Error state handling
4. **Testing**:
   - Unit tests (TDD: write first)
   - Integration tests
   - End-to-end verification
5. **Documentation**:
   - Update README if needed
   - Update deployment guides

---

## Implementation Notes

### Critical Path
1. Fix `answerService.ts` ranking calculation (currently wrong: filters incorrect answers)
2. Extend GameResults type in `/packages/types/`
3. Update all dependent frontend apps to use conditional display logic
4. Test tie-handling edge cases thoroughly

### Breaking Changes
- **Data Model**: GameResults interface extended (backward compatible: new fields optional)
- **Service Logic**: `getWorst10IncorrectAnswers` → `getWorst10CorrectAnswers` (breaking change to function name and behavior)
- **Frontend Assumptions**: Frontend apps may currently display both Top 10 and Worst 10; must update to conditional display

### Migration Strategy
- No database migration needed (GameResults fields are additive)
- Deploy backend changes first (api-server)
- Deploy frontend changes atomically across all apps (projector-app, participant-app, host-app)
- Use feature flags if phased rollout needed (optional, not required per spec)

### Risk Mitigation
- **Risk**: Ranking calculation failures block game progression
  - **Mitigation**: Retry logic (3 attempts) + graceful degradation (empty rankings, game continues)
- **Risk**: Tie-handling causes rankings to exceed frontend display capacity
  - **Mitigation**: Frontend UI must handle variable-length arrays (no hard-coded 10-row limits)
- **Risk**: Period champion designation lost if Firestore write fails
  - **Mitigation**: Log errors comprehensively, include period champion data in GameResults persistence

### Performance Considerations
- Ranking calculation requires sorting all correct answers: O(n log n) where n = number of correct answers
- Expected n ~50-200 per question, sorting negligible (<1ms)
- Firestore queries already filtered by `isCorrect === true`, no additional query overhead
- Real-time listener updates push to all connected clients efficiently (Firestore handles fan-out)

---

## Post-Phase 1 Constitution Check

*Re-evaluate after data-model.md and contracts/ generation*

### Principle I: Monorepo Architecture
✅ **PASS** - All changes within monorepo structure:
- Backend logic: `/apps/api-server/`
- Shared types: `/packages/types/`
- Frontend apps: `/apps/projector-app/`, `/apps/participant-app/`, `/apps/host-app/`
- No cross-application boundary violations

### Principle II: Test-Driven Development (TDD)
✅ **PASS** - Test-first approach confirmed:
- Unit tests for ranking calculation written before implementation
- Integration tests for retry logic written before implementation
- Contract tests for GameResults type validation

### Principle III: OpenAPI-First API Design
✅ **PASS** - No REST API contract changes required (Firestore document schema changes only)
- If future REST endpoints expose GameResults, OpenAPI specs will be created first

### Principle IV: Code Quality Gates
✅ **PASS** - Linting, testing, and verification steps documented in implementation plan

### Principle V: Shell Command Safety
✅ **PASS** - All commands use existing npm scripts with timeouts

**Final Gate Result**: ✅ **PASS** - Ready for Phase 2 task generation via `/speckit.tasks`

---

## Summary

**Branch**: `007-ranking-display-logic`
**Implementation Plan**: `/home/tisayama/allstars/specs/007-ranking-display-logic/plan.md`
**Status**: Phase 1 Complete - Ready for Phase 2 (`/speckit.tasks`)

**Artifacts Generated**:
- ✅ plan.md (this file)
- ⏳ research.md (Phase 0 - to be generated)
- ⏳ data-model.md (Phase 1 - to be generated)
- ⏳ contracts/ (Phase 1 - not needed, no OpenAPI changes)
- ⏳ quickstart.md (Phase 1 - to be generated)
- ⏳ tasks.md (Phase 2 - run `/speckit.tasks`)

**Next Command**: `/speckit.tasks` to generate dependency-ordered task breakdown
