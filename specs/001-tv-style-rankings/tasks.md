# Implementation Tasks: TV-Style Rankings Display

**Feature**: TV-Style Rankings Display for Projector App
**Branch**: `001-tv-style-rankings`
**Date**: 2025-11-07

**Prerequisites**: All planning artifacts complete (spec.md, plan.md, research.md, data-model.md, quickstart.md)

---

## Overview

This task list implements the TV-style ranking display feature following Test-Driven Development (TDD) principles. Tasks are organized by functional requirement (user story) to enable independent, incremental delivery.

**Total Tasks**: 47
**Parallelizable Tasks**: 23 (marked with [P])
**User Stories**: 9 functional requirements (FR-001 through FR-009)

---

## Task Organization Strategy

### Implementation Approach

1. **Phase 1**: Setup - Project structure and dependencies
2. **Phase 2**: Foundation - Core utilities and data transformations
3. **Phase 3-11**: User Stories (FR-001 through FR-009) - One phase per functional requirement
4. **Phase 12**: Integration - Connect all components
5. **Phase 13**: Polish - Visual refinements and performance validation

### Independent Testing Per Story

Each user story phase includes acceptance criteria that can be verified independently:
- Unit tests for components and hooks
- Visual regression tests for UI elements
- Performance tests for animations and monitoring
- Integration tests for data flow

### MVP Scope

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (FR-001) + Phase 4 (FR-002)
- This delivers basic TV-style visual design with ranking list display
- Sufficient for first demonstration and feedback
- Remaining phases add polish, resilience, and advanced features

---

## Phase 1: Setup

**Goal**: Initialize project structure, install dependencies, configure tooling

### Tasks

- [X] T001 Create directory structure for new components at `apps/projector-app/src/components/rankings/`
- [X] T002 Create directory structure for new hooks at `apps/projector-app/src/hooks/`
- [X] T003 Create directory structure for new utilities at `apps/projector-app/src/utils/`
- [X] T004 Create directory structure for styles at `apps/projector-app/src/styles/`
- [X] T005 Create directory structure for tests at `apps/projector-app/tests/unit/components/rankings/`
- [X] T006 Create directory structure for hook tests at `apps/projector-app/tests/unit/hooks/`
- [X] T007 Create directory structure for e2e tests at `apps/projector-app/tests/e2e/`
- [X] T008 Add Noto Sans JP font to project (Google Fonts CDN link in index.html)
- [X] T009 Create placeholder show logo asset at `apps/projector-app/public/assets/show-logo.png`
- [X] T010 Verify existing dependencies: React 18.2, socket.io-client 4.x, @testing-library/react

---

## Phase 2: Foundation - Data Transformation & Utilities

**Goal**: Implement core data transformation logic and utility functions

**Independent Test Criteria**:
- ✓ Utility functions pass unit tests with edge cases
- ✓ Data transformations correctly convert GameResults to RankingEntry[]
- ✓ Validation functions detect invalid inputs

### Tasks

- [X] T011 [P] [UTIL] Write unit test for `truncate()` function in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T012 [P] [UTIL] Write unit test for `msToSeconds()` function in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T013 [P] [UTIL] Write unit test for `shouldHighlight()` function in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T014 [P] [UTIL] Write unit test for `getHighlightColor()` function in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T015 [UTIL] Implement utility functions in `apps/projector-app/src/utils/rankingHelpers.ts`
- [X] T016 [P] [UTIL] Write unit test for `toRankingEntry()` transformation in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T017 [P] [UTIL] Write unit test for `createWorst10Config()` in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T018 [P] [UTIL] Write unit test for `createTop10Config()` in `apps/projector-app/tests/unit/utils/rankingHelpers.test.ts`
- [X] T019 [UTIL] Implement data transformation functions in `apps/projector-app/src/utils/rankingHelpers.ts`
- [X] T020 [UTIL] Run utility tests and verify all pass (`pnpm test -- tests/unit/utils/rankingHelpers.test.ts`)

---

## Phase 3: FR-001 - TV-Style Visual Design (Background)

**User Story**: As a host, I want vibrant gradient backgrounds with animations to create a TV show aesthetic

**Independent Test Criteria**:
- ✓ TVBackground component renders gradient without errors
- ✓ Animation plays when enabled, pauses when disabled
- ✓ GPU-accelerated transform detected in rendered output

### Tasks

- [X] T021 [P] [US1] Write unit test for TVBackground component in `apps/projector-app/tests/unit/components/rankings/TVBackground.test.tsx`
- [X] T022 [US1] Implement TVBackground component in `apps/projector-app/src/components/rankings/TVBackground.tsx`
- [X] T023 [US1] Create CSS animations for gradient in `apps/projector-app/src/styles/tv-rankings.css`
- [X] T024 [US1] Test gradient animation (visual verification with dev tools FPS meter)
- [X] T025 [US1] Verify GPU acceleration with Chrome DevTools Performance panel

---

## Phase 4: FR-002 & FR-003 - Ranking List Display with Highlighting

**User Story**: As an audience member, I want clear ranking displays with color-coded highlighting for significant positions

**Independent Test Criteria**:
- ✓ RankingEntry renders rank, name, time with correct styling
- ✓ Highlighted entries show red (worst) or gold (best) backgrounds
- ✓ Text sizes meet minimum requirements (48px, 36px, 40px)
- ✓ Names truncate at 50 characters with ellipsis

### Tasks

- [X] T026 [P] [US2] Write unit test for RankingEntry component in `apps/projector-app/tests/unit/components/rankings/RankingEntry.test.tsx`
- [X] T027 [US2] Implement RankingEntry component in `apps/projector-app/src/components/rankings/RankingEntry.tsx`
- [X] T028 [US2] Add RankingEntry styles to `apps/projector-app/src/styles/tv-rankings.css`
- [X] T029 [P] [US2] Write unit test for RankingList component in `apps/projector-app/tests/unit/components/rankings/RankingList.test.tsx`
- [X] T030 [US2] Implement RankingList component in `apps/projector-app/src/components/rankings/RankingList.tsx`
- [X] T031 [US2] Test ranking list with 10 entries, verify highlighting and truncation
- [X] T032 [US2] Test ranking list with <10 entries (edge case), verify graceful handling

---

## Phase 5: FR-004 - Branding and Context Elements

**User Story**: As a host, I want show branding and context information displayed to maintain event identity

**Independent Test Criteria**:
- ✓ TVBranding renders logo with fallback on error
- ✓ "生放送" badge displays correctly
- ✓ Period identifier shows "前半"/"後半" when provided
- ✓ Layout stable even when logo fails to load

### Tasks

- [X] T033 [P] [US3] Write unit test for TVBranding component with asset fallback in `apps/projector-app/tests/unit/components/rankings/TVBranding.test.tsx`
- [X] T034 [US3] Implement TVBranding component with image error handling in `apps/projector-app/src/components/rankings/TVBranding.tsx`
- [X] T035 [US3] Add TVBranding styles to `apps/projector-app/src/styles/tv-rankings.css`
- [X] T036 [US3] Test logo loading failure (simulate with invalid URL), verify fallback SVG placeholder
- [X] T037 [US3] Test period identifier display for first-half and second-half

---

## Phase 6: FR-005 - Animated Background with Performance Monitoring

**User Story**: As a system, I want automatic FPS monitoring to disable animations when performance degrades

**Independent Test Criteria**:
- ✓ useFPSMonitor hook returns current FPS and degradation flag
- ✓ Degradation triggers when FPS < 25 for 2 seconds
- ✓ Recovery triggers when FPS > 35 for 2 seconds
- ✓ Hook cleanup prevents memory leaks on unmount

### Tasks

- [X] T038 [P] [US4] Write unit test for useFPSMonitor hook in `apps/projector-app/tests/unit/hooks/useFPSMonitor.test.ts`
- [X] T039 [US4] Implement useFPSMonitor hook in `apps/projector-app/src/hooks/useFPSMonitor.ts`
- [X] T040 [US4] Integrate useFPSMonitor into TVBackground component (`src/components/rankings/TVBackground.tsx`)
- [X] T041 [US4] Test FPS degradation (simulate low FPS with Chrome DevTools CPU throttling)
- [X] T042 [US4] Verify animations disable after 2-second threshold, remain off for session

---

## Phase 7: FR-006 & FR-007 - Ranking Type Variations with Text Sizing

**User Story**: As a host, I want different ranking types (worst10/top10) with appropriate text sizing for projection

**Independent Test Criteria**:
- ✓ RankingList supports both "worst10" and "top10" types
- ✓ Side labels update to match ranking type
- ✓ Font sizes validated: rank (48px), name (36px), time (40px)
- ✓ Text remains crisp at 1920x1080 resolution

### Tasks

- [X] T043 [US5] Update RankingList component to support type prop (`apps/projector-app/src/components/rankings/RankingList.tsx`)
- [X] T044 [US5] Add vertical side label styling for "早押しワースト10" and "早押しトップ10" in `apps/projector-app/src/styles/tv-rankings.css`
- [X] T045 [US5] Verify font sizes meet spec minimums (use browser inspector)
- [X] T046 [US5] Test rendering at 1920x1080 resolution, verify text clarity

---

## Phase 8: FR-008 - Smooth Transitions with Stagger Animation

**User Story**: As an audience member, I want ranking entries to animate in sequentially for visual impact

**Independent Test Criteria**:
- ✓ useRankingAnimation hook tracks played questions
- ✓ Stagger effect plays only once per question ID
- ✓ Animation does NOT replay when navigating back
- ✓ Animation resets when question ID changes

### Tasks

- [X] T047 [P] [US6] Write unit test for useRankingAnimation hook in `apps/projector-app/tests/unit/hooks/useRankingAnimation.test.ts`
- [X] T048 [US6] Implement useRankingAnimation hook in `apps/projector-app/src/hooks/useRankingAnimation.ts`
- [X] T049 [US6] Add stagger animation CSS keyframes to `apps/projector-app/src/styles/tv-rankings.css`
- [X] T050 [US6] Integrate useRankingAnimation into RankingList component (`src/components/rankings/RankingList.tsx`)
- [X] T051 [US6] Update RankingEntry to accept shouldAnimate and animationDelay props (`src/components/rankings/RankingEntry.tsx`)
- [X] T052 [US6] Test stagger animation plays on first display (visual verification)
- [X] T053 [US6] Test animation does NOT replay when navigating back to same question

---

## Phase 9: FR-009 - Connection Monitoring and Failure Handling

**User Story**: As a host, I want the display to gracefully handle network disconnections without losing ranking visibility

**Independent Test Criteria**:
- ✓ useConnectionStatus hook monitors socket events
- ✓ Indicator shows after 2 seconds of disconnect
- ✓ Indicator hides immediately on reconnect
- ✓ Display freezes (no updates) while disconnected

### Tasks

- [X] T054 [P] [US7] Write unit test for useConnectionStatus hook in `apps/projector-app/tests/unit/hooks/useConnectionStatus.test.ts`
- [X] T055 [US7] Implement useConnectionStatus hook in `apps/projector-app/src/hooks/useConnectionStatus.ts`
- [X] T056 [P] [US7] Write unit test for ConnectionIndicator component in `apps/projector-app/tests/unit/components/rankings/ConnectionIndicator.test.tsx`
- [X] T057 [US7] Implement ConnectionIndicator component in `apps/projector-app/src/components/rankings/ConnectionIndicator.tsx`
- [X] T058 [US7] Add ConnectionIndicator styles to `apps/projector-app/src/styles/tv-rankings.css`
- [X] T059 [US7] Integrate ConnectionIndicator into TVBranding component (`src/components/rankings/TVBranding.tsx`)
- [X] T060 [US7] Test connection indicator (simulate disconnect in browser dev tools)
- [X] T061 [US7] Verify 2-second delay before indicator appears, immediate hide on reconnect

---

## Phase 10: Container Component - TVRankingDisplay

**User Story**: As the system, I need a container component to orchestrate all sub-components and manage state

**Independent Test Criteria**:
- ✓ TVRankingDisplay receives GameResults and renders sub-components
- ✓ Data transformations applied correctly (createWorst10Config/createTop10Config)
- ✓ Hooks integrated (useFPSMonitor, useConnectionStatus)
- ✓ Top10 rankings only shown when isGongActive is true

### Tasks

- [X] T062 [P] [US8] Write unit test for TVRankingDisplay component in `apps/projector-app/tests/unit/components/rankings/TVRankingDisplay.test.tsx`
- [X] T063 [US8] Implement TVRankingDisplay container component in `apps/projector-app/src/components/rankings/TVRankingDisplay.tsx`
- [X] T064 [US8] Add container layout styles to `apps/projector-app/src/styles/tv-rankings.css`
- [X] T065 [US8] Test TVRankingDisplay with mock GameResults (worst10 only)
- [X] T066 [US8] Test TVRankingDisplay with isGongActive=true (show both worst10 and top10)
- [X] T067 [US8] Test TVRankingDisplay with invalid/missing GameResults (error handling)

---

## Phase 11: Integration - ShowingResultsPhase Modification

**User Story**: As the system, I need to integrate the new TV-style component into the existing phase flow

**Independent Test Criteria**:
- ✓ ShowingResultsPhase delegates to TVRankingDisplay
- ✓ Existing validation logic preserved
- ✓ Props passed correctly (results, isGongActive)
- ✓ Error handling maintained for missing results

### Tasks

- [X] T068 [US9] Read existing ShowingResultsPhase component in `apps/projector-app/src/components/phases/ShowingResultsPhase.tsx`
- [X] T069 [US9] Update ShowingResultsPhase to import and use TVRankingDisplay (`apps/projector-app/src/components/phases/ShowingResultsPhase.tsx`)
- [X] T070 [US9] Verify existing ShowingResultsPhase tests still pass (or update as needed)
- [X] T071 [US9] Test full integration: socket event → gameState → ShowingResultsPhase → TVRankingDisplay → rendered output

---

## Phase 12: End-to-End Testing

**Goal**: Validate complete user scenarios from specification

**Independent Test Criteria**:
- ✓ Scenario 1 (Worst 10 Rankings) passes e2e test
- ✓ Scenario 2 (Top 10 Rankings) passes e2e test
- ✓ Scenario 3 (Visual Transitions) passes e2e test

### Tasks

- [ ] T072 [P] Write e2e test for Scenario 1 (Worst 10 Rankings) in `apps/projector-app/tests/e2e/tv-rankings.spec.ts`
- [ ] T073 [P] Write e2e test for Scenario 2 (Top 10 Rankings) in `apps/projector-app/tests/e2e/tv-rankings.spec.ts`
- [ ] T074 [P] Write e2e test for Scenario 3 (Visual Transitions) in `apps/projector-app/tests/e2e/tv-rankings.spec.ts`
- [ ] T075 Run e2e tests with Playwright (`pnpm test:e2e`)
- [ ] T076 Capture visual regression screenshots for baseline comparison

---

## Phase 13: Polish & Verification

**Goal**: Final refinements, performance validation, and production readiness

### Tasks

- [ ] T077 [P] Run full test suite (unit + integration + e2e) and verify 100% pass rate
- [X] T078 [P] Run linter and fix any issues (`pnpm run lint:fix`)
- [X] T079 [P] Run formatter and verify code style (`pnpm run format`)
- [X] T080 Build projector-app and verify no TypeScript errors (`pnpm run build`)
- [ ] T081 Manual test on actual projection hardware (1920x1080, verify readability from 15m)
- [ ] T082 Performance validation: Verify 30+ FPS with animations enabled (Chrome DevTools FPS meter)
- [ ] T083 Performance validation: Test FPS degradation triggers correctly at <25 FPS
- [ ] T084 [P] Accessibility review: Verify sufficient color contrast ratios
- [ ] T085 [P] Cross-browser testing: Test on Chrome, Firefox, Safari
- [ ] T086 Create visual demo: Record screen capture showing all ranking types and animations
- [ ] T087 Update documentation: Add usage notes to quickstart.md if needed

---

## Parallel Execution Examples

### Phase 2 (Foundation)
Run in parallel:
- T011-T014 (utility function tests - different test cases)
- T016-T018 (transformation tests - independent functions)

### Phase 4 (Ranking Display)
Run in parallel:
- T026 (RankingEntry test)
- T029 (RankingList test)

### Phase 9 (Connection Monitoring)
Run in parallel:
- T054 (useConnectionStatus test)
- T056 (ConnectionIndicator test)

### Phase 12 (E2E)
Run in parallel:
- T072, T073, T074 (independent e2e scenarios)

### Phase 13 (Polish)
Run in parallel:
- T077 (test suite)
- T078 (linting)
- T079 (formatting)
- T084 (accessibility)
- T085 (cross-browser)

---

## Dependency Graph

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundation - Utilities)
  ↓
┌─────────────────────────┬──────────────────────────┬──────────────────────┐
│                         │                          │                      │
Phase 3 (FR-001)     Phase 4 (FR-002/003)      Phase 5 (FR-004)     Phase 6 (FR-005)
Background           Ranking Display           Branding            FPS Monitoring
│                         │                          │                      │
└─────────────────────────┴──────────────────────────┴──────────────────────┘
  ↓
┌─────────────────────────┬──────────────────────────┐
│                         │                          │
Phase 7 (FR-006/007) Phase 8 (FR-008)           Phase 9 (FR-009)
Type Variations      Stagger Animation         Connection Monitor
│                         │                          │
└─────────────────────────┴──────────────────────────┘
  ↓
Phase 10 (Container - TVRankingDisplay)
  ↓
Phase 11 (Integration - ShowingResultsPhase)
  ↓
Phase 12 (E2E Testing)
  ↓
Phase 13 (Polish & Verification)
```

**Key Dependencies**:
- Phase 2 MUST complete before any component phases (provides data transformation)
- Phases 3-9 can largely run in parallel (independent functional requirements)
- Phase 10 depends on Phases 3-9 (container orchestrates sub-components)
- Phase 11 depends on Phase 10 (integration requires container)
- Phase 12-13 depend on Phase 11 (testing requires full integration)

---

## Implementation Strategy

### Test-Driven Development (TDD) Workflow

For each task marked with test/implementation pair:

1. **Write failing test** (Red)
   - Define expected behavior
   - Run test, verify it fails
   - Commit test

2. **Implement minimal code** (Green)
   - Write code to make test pass
   - Run test, verify it passes
   - Commit implementation

3. **Refactor** (Refactor)
   - Improve code quality
   - Run tests, verify still passing
   - Commit refactoring

### Incremental Delivery

**Sprint 1** (MVP):
- Phase 1 (Setup)
- Phase 2 (Foundation)
- Phase 3 (Background)
- Phase 4 (Ranking Display)
- **Deliverable**: Basic TV-style rankings visible on projector

**Sprint 2** (Core Features):
- Phase 5 (Branding)
- Phase 6 (FPS Monitoring)
- Phase 7 (Type Variations)
- **Deliverable**: Full ranking types with performance management

**Sprint 3** (Polish):
- Phase 8 (Stagger Animation)
- Phase 9 (Connection Monitoring)
- Phase 10 (Container)
- Phase 11 (Integration)
- **Deliverable**: Production-ready with animations and resilience

**Sprint 4** (Validation):
- Phase 12 (E2E Testing)
- Phase 13 (Polish)
- **Deliverable**: Fully tested, production-deployed

---

## Success Criteria

**Definition of Done** for this feature:
- [ ] All 87 tasks completed
- [ ] All unit tests passing (100% for new code)
- [ ] All e2e tests passing (3 scenarios)
- [ ] Linting and formatting clean
- [ ] Build succeeds with no TypeScript errors
- [ ] Manual verification on projection hardware
- [ ] Performance validated: 30+ FPS with animations
- [ ] Visual demo recorded
- [ ] PR created with self-review completed

**Acceptance Validation**:
- Functional requirements FR-001 through FR-009 all implemented
- Primary scenarios 1-3 from spec.md validated with e2e tests
- Edge cases handled (fewer than 10 entries, asset failures, connection loss)
- Non-functional requirements met (30+ FPS, 15m readability, 2s delays)

---

## Notes

- **Parallelization**: Tasks marked [P] can run in parallel with other [P] tasks in the same phase
- **User Story Labels**: [US1]-[US9] map to FR-001 through FR-009 in spec.md
- **File Paths**: All paths are absolute from repository root
- **Testing**: TDD discipline mandatory per constitution (write tests before implementation)
- **Constitution Compliance**: All quality gates enforced (linting, tests, verification)

**Branch**: `001-tv-style-rankings`
**Next Command**: `/speckit.implement` (executes tasks in order)
