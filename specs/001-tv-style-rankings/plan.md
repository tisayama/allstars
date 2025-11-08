# Implementation Plan: TV-Style Rankings Display

**Branch**: `001-tv-style-rankings` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tv-style-rankings/spec.md`

## Summary

Transform the projector app's ranking display to emulate a professional Japanese TV game show aesthetic for "早押しワースト10" (fastest incorrect worst 10) and "早押しトップ10" (fastest correct top 10) rankings. The visual design will feature vibrant gradient backgrounds with subtle animations, color-coded highlighting for significant rankings, TV branding elements, and responsive text sizing optimized for projection displays. The implementation focuses on the `ShowingResultsPhase` component in the projector-app with graceful degradation for network failures and asset loading issues.

## Technical Context

**Language/Version**: TypeScript 5.3+ with React 18.2+ (browser runtime ES2020+)
**Primary Dependencies**: React 18.2, Vite 5.0, Firebase SDK 10.x (Firestore), socket.io-client 4.x, Web Audio API
**Storage**: Firebase Firestore (read-only listeners for gameState), Browser localStorage (not applicable for this feature)
**Testing**: Vitest 1.3+ (unit), @testing-library/react 14.2 (component), @playwright/test 1.42 (e2e)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari) on projection hardware (1920x1080+ resolution)
**Project Type**: Frontend web application (React SPA) within monorepo
**Performance Goals**: 30+ FPS with animations enabled, automatic degradation below 25 FPS, <0.5s phase transitions, <0.2s ranking screen load
**Constraints**: Browser rendering limitations, projection display readability from 5-20m distance, real-time updates from socket connection, graceful asset loading fallback
**Scale/Scope**: Single projector-app component enhancement, 1 main phase component with 2-3 sub-components, ~500-800 LOC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture ✅

**Compliance**: This feature modifies only the `/apps/projector-app/` application.
- Changes are scoped to a single app within the monorepo
- Uses existing workspace dependency `@allstars/types` for GameState types
- No new shared packages required
- No violation of application boundaries

### II. Test-Driven Development (TDD) ✅

**Compliance**: Implementation will follow TDD discipline.
- Component tests for ranking list rendering (unit)
- Animation behavior tests (unit)
- FPS monitoring and degradation tests (unit)
- Connection monitoring tests (unit)
- Visual regression tests (e2e with Playwright)
- All tests written before implementation code

### III. OpenAPI-First API Design ✅

**Compliance**: N/A - No REST API changes required.
- Feature consumes existing gameState data via real-time socket connection
- Data contract is already defined in `@allstars/types` GameState/GameResults types
- No new API endpoints needed

### IV. Code Quality Gates ✅

**Compliance**: Standard quality gates will be enforced.
- Linting with existing ESLint configuration
- All tests must pass before commit
- Manual verification on projection hardware recommended

### V. Shell Command Safety ✅

**Compliance**: N/A - No shell scripts required for this frontend feature.
- Build and test commands use existing package.json scripts

### VI. Protected Main Branch ✅

**Compliance**: Work performed on feature branch `001-tv-style-rankings`.
- All commits to feature branch
- Merge to master via PR after review

### VII. Pull Request Workflow & Quality Assurance ✅

**Compliance**: Full PR workflow will be followed.
- Self-review before merge
- Zero failing tests requirement
- Manual verification on projection display
- Documentation of test results in PR

**Status**: ✅ All constitution principles satisfied - No violations to justify

## Project Structure

### Documentation (this feature)

```text
specs/001-tv-style-rankings/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/projector-app/
├── src/
│   ├── components/
│   │   ├── phases/
│   │   │   └── ShowingResultsPhase.tsx          # [MODIFY] Main results display component
│   │   ├── rankings/
│   │   │   ├── TVRankingDisplay.tsx             # [NEW] TV-style ranking container
│   │   │   ├── RankingList.tsx                  # [NEW] Ranking entries list
│   │   │   ├── RankingEntry.tsx                 # [NEW] Single ranking entry
│   │   │   ├── TVBackground.tsx                 # [NEW] Animated gradient background
│   │   │   ├── TVBranding.tsx                   # [NEW] Logo and branding elements
│   │   │   └── ConnectionIndicator.tsx          # [NEW] Network status indicator
│   │   └── hooks/
│   │       ├── useFPSMonitor.ts                 # [NEW] Frame rate monitoring hook
│   │       ├── useRankingAnimation.ts           # [NEW] Stagger animation hook
│   │       └── useConnectionStatus.ts           # [NEW] Socket connection monitoring
│   ├── styles/
│   │   └── tv-rankings.css                      # [NEW] TV-style visual styles
│   └── utils/
│       └── rankingHelpers.ts                    # [NEW] Ranking data transformation
│
tests/
├── unit/
│   ├── components/
│   │   └── rankings/
│   │       ├── TVRankingDisplay.test.tsx        # [NEW] Container component tests
│   │       ├── RankingList.test.tsx             # [NEW] List rendering tests
│   │       └── RankingEntry.test.tsx            # [NEW] Entry component tests
│   └── hooks/
│       ├── useFPSMonitor.test.ts                # [NEW] FPS monitoring tests
│       ├── useRankingAnimation.test.ts          # [NEW] Animation timing tests
│       └── useConnectionStatus.test.ts          # [NEW] Connection monitoring tests
│
└── e2e/
    └── tv-rankings.spec.ts                      # [NEW] Visual regression and interaction tests
```

**Structure Decision**: This is a focused enhancement to the existing projector-app frontend. The implementation follows the established React component architecture with separation of concerns: presentational components (`rankings/`), custom hooks (`hooks/`), and utility functions (`utils/`). The test structure mirrors the source structure following monorepo conventions. No new apps or packages are required—all changes are contained within `apps/projector-app/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations requiring justification.*

---

## Phase 0: Research & Technical Discovery

**Objective**: Resolve technical unknowns and establish implementation patterns before design phase.

### Research Areas

#### R1: CSS Gradient Animation Performance
**Question**: What CSS animation techniques provide smooth gradient backgrounds while maintaining 30+ FPS on projection hardware?

**Research Tasks**:
- Investigate CSS `background: linear-gradient()` animation performance
- Evaluate CSS `@keyframes` vs `requestAnimationFrame` for gradient shifts
- Test GPU acceleration with `transform: translate3d()` and `will-change` properties
- Benchmark particle animation approaches (CSS vs Canvas vs WebGL)
- Identify best practices for 60Hz displays

**Deliverable**: Recommended gradient animation technique with performance benchmarks

#### R2: React Performance Monitoring Patterns
**Question**: How should we implement FPS monitoring in React to automatically disable animations?

**Research Tasks**:
- Explore `requestAnimationFrame` timing patterns for FPS calculation
- Investigate React performance profiling APIs
- Research debouncing/throttling strategies for degradation decisions
- Find existing libraries or hooks for FPS monitoring (e.g., `use-fps`)
- Determine threshold values for smooth degradation (25 FPS trigger confirmed)

**Deliverable**: FPS monitoring hook implementation pattern with React best practices

#### R3: Socket.io Connection State Management
**Question**: What is the best way to monitor socket connection status and trigger UI updates?

**Research Tasks**:
- Review socket.io-client v4.x connection event patterns (`connect`, `disconnect`, `reconnect`)
- Investigate React hook patterns for socket state management
- Research debouncing strategies for connection indicator display (prevent flickering)
- Explore existing patterns in projector-app codebase for socket integration
- Determine retry logic and reconnection handling

**Deliverable**: Connection monitoring hook pattern with socket.io best practices

#### R4: Japanese Text Rendering on Projection Displays
**Question**: What font configurations ensure crisp Japanese text rendering at large sizes on projection hardware?

**Research Tasks**:
- Identify web-safe Japanese fonts with good projection readability
- Research font rendering hints for ClearType/LCD optimization
- Test minimum font sizes for 15m readability (spec: 36-48px)
- Investigate font-weight and letter-spacing for projection clarity
- Evaluate fallback font stacks for Japanese characters

**Deliverable**: Font configuration and sizing guidelines for projection displays

#### R5: Stagger Animation Implementation in React
**Question**: How should we implement sequential stagger animations that only play once per question?

**Research Tasks**:
- Explore CSS `animation-delay` patterns for stagger effects
- Investigate React state management for "animation played" tracking
- Research `IntersectionObserver` or visibility-based animation triggers
- Evaluate transition libraries (e.g., react-spring, framer-motion) vs vanilla CSS
- Determine optimal stagger delay timing (recommendation: 50-100ms per entry)

**Deliverable**: Stagger animation implementation pattern with React state management

#### R6: Graceful Asset Loading Fallback Patterns
**Question**: What is the best way to handle missing branding assets with fallback placeholders?

**Research Tasks**:
- Investigate `<img>` `onError` event handling in React
- Research placeholder/fallback image patterns
- Explore CSS `::before` pseudo-element fallback techniques
- Test layout stability with missing assets (prevent CLS)
- Identify error boundary patterns for asset loading failures

**Deliverable**: Asset loading fallback pattern with layout stability

### Dependencies & Integration Patterns

#### D1: GameState Data Structure
**Question**: What is the exact structure of `GameResults` provided by gameState?

**Research Tasks**:
- Review `@allstars/types` package for GameResults type definition
- Examine existing `ShowingResultsPhase.tsx` usage of results data
- Document ranking data format (names, times, correctness flags)
- Verify period champion data structure (`periodChampions`, `period`)
- Identify worst10 and top10 array structures

**Deliverable**: Data model documentation showing exact GameResults contract

#### D2: Existing Phase Component Patterns
**Question**: What are the established patterns for phase components in projector-app?

**Research Tasks**:
- Analyze existing phase components for structural patterns
- Review props interfaces and gameState consumption patterns
- Document styling approaches (inline styles vs CSS modules)
- Identify animation patterns already in use
- Extract reusable patterns for new ranking components

**Deliverable**: Component architecture guidelines following established patterns

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete with all research areas resolved

### 1.1 Data Model (`data-model.md`)

**Objective**: Document the data structures and transformations for TV-style ranking display.

#### Entities

**RankingEntry** (Derived from GameResults)
```typescript
interface RankingEntry {
  rank: number;              // 1-10 position
  guestId: string;           // Participant identifier
  displayName: string;       // Pre-formatted "Name(Nickname)" string
  responseTime: number;      // Seconds with 2 decimal precision
  isHighlighted: boolean;    // True for special positions (worst/best)
  highlightColor?: string;   // 'red' | 'gold' | undefined
}
```

**RankingDisplayConfig** (UI Configuration)
```typescript
interface RankingDisplayConfig {
  title: string;                    // "早押しワースト10" | "早押しトップ10"
  entries: RankingEntry[];          // 1-10 ranking entries
  period?: 'first-half' | 'second-half';  // For period-final questions
  showPeriodChampions: boolean;     // Display champion badge
  periodChampions?: string[];       // Champion guest IDs
}
```

**AnimationState** (Component State)
```typescript
interface AnimationState {
  animationsEnabled: boolean;       // True if FPS >= 25
  currentFPS: number;               // Real-time frame rate
  hasPlayedStagger: boolean;        // True after initial display
  questionId: string;               // Current question identifier
}
```

**ConnectionState** (Network Monitoring)
```typescript
interface ConnectionState {
  isConnected: boolean;             // Socket connection status
  showIndicator: boolean;           // Display connection indicator
  lastDisconnectTime?: number;      // Timestamp of last disconnect
}
```

#### Validation Rules

1. **Ranking Entry Validation**:
   - `rank` must be 1-10
   - `responseTime` must be non-negative number
   - `displayName` must not be empty string
   - `displayName` max length: 50 characters (truncate with ellipsis)

2. **Animation State Validation**:
   - `currentFPS` must be non-negative
   - `animationsEnabled` set to false when `currentFPS` < 25 for >2 seconds
   - `hasPlayedStagger` resets when `questionId` changes

3. **Connection State Validation**:
   - `showIndicator` true when `isConnected` false for >2 seconds
   - `showIndicator` false immediately when reconnected

#### State Transitions

**Animation Degradation State Machine**:
```
[High Performance] (FPS >= 30)
  ↓ (FPS drops below 25 for >2s)
[Degraded Mode] (animations disabled)
  ↓ (session continues)
[Degraded Mode] (animations remain disabled)
  ↓ (new session/page reload)
[High Performance] (re-enabled)
```

**Stagger Animation State Machine**:
```
[Not Played] (question changes)
  ↓ (initial display)
[Playing Stagger] (sequential animation)
  ↓ (animation complete)
[Played] (no repeat on re-entry)
  ↓ (new question)
[Not Played] (reset for next question)
```

### 1.2 API Contracts (`/contracts/`)

**Status**: N/A - No REST API contracts required

This feature consumes existing real-time data via socket.io connection. The data contract is defined by the existing `GameResults` type in `@allstars/types` package.

**Existing Contract Reference**:
- Type: `GameResults` from `@allstars/types`
- Source: Socket.io emission from gameState updates
- Event: `gameState` event with full GameState payload
- Consumer: `ShowingResultsPhase` component

No new API endpoints or OpenAPI specifications are required.

### 1.3 Component Architecture (`quickstart.md`)

**Objective**: Document component hierarchy, props interfaces, and integration points.

#### Component Tree

```
<ShowingResultsPhase>                    [EXISTING - Modified]
  └── <TVRankingDisplay>                 [NEW]
      ├── <TVBackground>                 [NEW] - Gradient + particles
      ├── <TVBranding>                   [NEW] - Logo + live badge
      │   └── <ConnectionIndicator>      [NEW] - Network status
      ├── <RankingList type="worst">     [NEW]
      │   └── <RankingEntry> × 10        [NEW]
      └── <RankingList type="top">       [NEW]
          └── <RankingEntry> × 10        [NEW]
```

#### Component Responsibilities

**TVRankingDisplay** (Container):
- Orchestrates sub-components
- Manages animation state with `useFPSMonitor` hook
- Transforms GameResults to RankingDisplayConfig
- Handles connection monitoring with `useConnectionStatus` hook
- Passes animation flags to child components

**TVBackground**:
- Renders gradient background with CSS animations
- Accepts `animationsEnabled` prop to conditionally disable
- Implements particle effects with CSS keyframes
- Uses GPU acceleration (`transform`, `will-change`)

**TVBranding**:
- Displays show logo with asset loading fallback
- Renders "生放送" live broadcast badge
- Shows period identifier for period-final questions
- Implements `<img onError>` fallback pattern

**RankingList**:
- Renders ranking entries with vertical layout
- Implements stagger animation with `useRankingAnimation` hook
- Accepts `type` prop ("worst" | "top") for styling variations
- Manages entry highlighting based on `isHighlighted` flag

**RankingEntry**:
- Displays single ranking: number, name, time
- Applies color-coded background (red/gold/blue)
- Uses large font sizes per spec (36-48px)
- Handles text truncation with ellipsis

**ConnectionIndicator**:
- Shows subtle icon/text when disconnected
- Positioned in corner (non-intrusive)
- Appears after 2-second disconnect delay
- Disappears immediately on reconnection

#### Custom Hooks

**useFPSMonitor()**:
```typescript
function useFPSMonitor(): {
  currentFPS: number;
  animationsEnabled: boolean;
}
```
- Monitors frame rate using `requestAnimationFrame`
- Returns current FPS and enabled flag
- Disables animations when FPS < 25 for >2 seconds

**useRankingAnimation(questionId: string)**:
```typescript
function useRankingAnimation(questionId: string): {
  shouldStagger: boolean;
  staggerDelay: (index: number) => number;
}
```
- Tracks whether stagger animation has played
- Resets state when `questionId` changes
- Returns stagger delay function (e.g., index * 100ms)

**useConnectionStatus()**:
```typescript
function useConnectionStatus(): {
  isConnected: boolean;
  showIndicator: boolean;
}
```
- Monitors socket.io connection events
- Returns connection status and indicator visibility
- Implements 2-second delay before showing indicator

### 1.4 Agent Context Update

Run agent context update script to add new technologies to CLAUDE.md:

```bash
bash /home/tisayama/allstars/.specify/scripts/bash/update-agent-context.sh claude
```

**Technologies to Add**:
- CSS Gradient Animations (from R1 research)
- FPS Monitoring with requestAnimationFrame (from R2 research)
- Socket.io Connection Events (from R3 research)
- Japanese Font Rendering Best Practices (from R4 research)

---

## Phase 2: Task Breakdown

**Note**: Phase 2 task breakdown is generated by the `/speckit.tasks` command, NOT by `/speckit.plan`. This section is intentionally empty.

See `tasks.md` (to be generated) for the detailed implementation task list.

---

## Outputs Summary

### Generated Artifacts (by `/speckit.plan`)

1. ✅ `plan.md` (this file) - Implementation plan and technical context
2. ⏳ `research.md` - Research findings for 6 areas (R1-R6) and 2 dependencies (D1-D2)
3. ⏳ `data-model.md` - Data structures and state machines
4. ⏳ `quickstart.md` - Component architecture and integration guide
5. ⏳ Updated CLAUDE.md - Agent context with new technologies

### Next Steps

1. Execute Phase 0: Research workflow to generate `research.md`
2. Execute Phase 1: Design workflow to generate `data-model.md`, `quickstart.md`
3. Run agent context update script
4. User invokes `/speckit.tasks` to generate `tasks.md` with implementation checklist
5. User invokes `/speckit.implement` to execute tasks

**Branch**: `001-tv-style-rankings`
**Spec**: `/home/tisayama/allstars/specs/001-tv-style-rankings/spec.md`
**Plan**: `/home/tisayama/allstars/specs/001-tv-style-rankings/plan.md`
