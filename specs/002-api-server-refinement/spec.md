# Feature Specification: API Server Refinement

**Feature Branch**: `002-api-server-refinement`
**Created**: 2025-11-02
**Status**: Draft
**Parent Feature**: 001-api-server

## Overview

This feature refines the API server implementation to align with detailed game flow requirements. The current implementation (001-api-server) has architectural and naming inconsistencies that need to be corrected to match the intended stateless game engine design.

### Core Concept

The API server functions as a **stateless game engine** that:
1. Reads current game state from Firestore
2. Processes game logic based on client requests
3. Writes updated state back to Firestore
4. Triggers reactive UI updates via WebSocket server watching Firestore changes

The server holds **no in-memory state**. All state is persisted in Firestore, making the architecture resilient and scalable.

## Key Changes from 001-api-server

### 1. Firestore Document Structure
- **Game State Document**: `gameState/live` (was `gameState/current`)
- **Guest Status Values**: `active`/`dropped` (was `alive`/`eliminated`)
- **Answers Collection**: `questions/{questionId}/answers/{guestId}` sub-collection (was top-level `answers` collection)
- **New Field**: `prizeCarryover` in game state for accumulated prizes

### 2. Game Phases
Add support for all phases:
- `accepting_answers` (existing)
- `showing_distribution` (existing)
- `showing_correct_answer` (existing)
- `showing_results` (existing)
- `all_incorrect` (NEW)
- `all_revived` (NEW)

### 3. Validation and Business Logic
- Validate guest status before accepting answers (only `active` guests can submit)
- Validate game phase before accepting answers (only during `accepting_answers`)
- Implement three distinct result calculation cases:
  1. **All Incorrect**: Everyone got wrong answer → nobody eliminated, prize carries over
  2. **Gong Active**: Someone triggered gong → worst performer eliminated, gong becomes inactive
  3. **Normal Question**: Standard elimination of worst performer(s)

## User Scenarios & Testing

### User Story 1 - Correct Document References (Priority: P1)

The system must use the correct Firestore document paths and field names to ensure consistency across the entire platform (api-server, socket-server, admin dashboard, client app).

**Why this priority**: Foundation for all other features. Wrong document names will cause data not to sync properly between components.

**Independent Test**: Can be verified by checking Firestore reads/writes point to `gameState/live` and answers are in sub-collections.

**Acceptance Scenarios**:

1. **Given** game state exists in Firestore, **When** API server reads game state, **Then** it reads from `gameState/live` document
2. **Given** client submits an answer, **When** API server stores the answer, **Then** it writes to `questions/{questionId}/answers/{guestId}` sub-collection
3. **Given** guest status needs to be updated, **When** API server updates guest, **Then** it uses `status: "active"` or `status: "dropped"` (not `alive`/`eliminated`)

---

### User Story 2 - Guest Status Validation (Priority: P1)

Only active guests should be able to submit answers. Dropped guests should receive a clear error message when attempting to submit answers.

**Why this priority**: Core game rule that prevents eliminated players from continuing to play.

**Independent Test**: Can be tested by marking a guest as `dropped` and attempting to submit an answer.

**Acceptance Scenarios**:

1. **Given** guest has `status: "active"` and game is in `accepting_answers` phase, **When** guest submits answer, **Then** answer is accepted and stored
2. **Given** guest has `status: "dropped"`, **When** guest attempts to submit answer, **Then** API returns 403 error with message "Guest is no longer active"
3. **Given** guest has `status: "active"` but game is in `showing_results` phase, **When** guest attempts to submit answer, **Then** API returns 400 error with message "Not accepting answers in current phase"

---

### User Story 3 - Prize Carryover on All Incorrect (Priority: P2)

When all guests answer incorrectly, nobody should be eliminated and the prize money should carry over to the next question.

**Why this priority**: Important game mechanic that adds excitement and fairness when questions are too difficult.

**Independent Test**: Can be tested by creating a question where all submitted answers are incorrect, then verifying next question has increased prize.

**Acceptance Scenarios**:

1. **Given** 5 active guests all submit wrong answers, **When** results are calculated, **Then** all guests remain `active`, prize is added to `prizeCarryover`, and phase becomes `all_incorrect`
2. **Given** `prizeCarryover` is 20000 from previous all-incorrect question, **When** new question starts, **Then** question prize is base prize + 20000
3. **Given** `prizeCarryover` is 20000 and current question has mixed correct/incorrect answers, **When** results are calculated, **Then** `prizeCarryover` is reset to 0 and winner receives full accumulated prize

---

### User Story 4 - Gong Trigger Behavior (Priority: P2)

When a guest triggers the gong on a normal question, the worst performer should be eliminated and the gong should become inactive for the rest of the game.

**Why this priority**: Core special action that changes game dynamics.

**Independent Test**: Can be tested by triggering gong on a question and verifying elimination rules and gong state.

**Acceptance Scenarios**:

1. **Given** gong is active (`isGongActive: true`) and guest triggers TRIGGER_GONG, **When** results are calculated, **Then** worst performer is eliminated, gong becomes inactive (`isGongActive: false`), and phase becomes normal
2. **Given** gong is inactive (`isGongActive: false`), **When** guest attempts to trigger TRIGGER_GONG, **Then** API returns 400 error "Gong is no longer active"
3. **Given** question has mix of correct/incorrect answers and gong was triggered, **When** results are calculated, **Then** guest with worst performance gets `status: "dropped"`

---

### User Story 5 - Revive All Guests (Priority: P3)

Host should be able to revive all dropped guests simultaneously, giving them a second chance in the game.

**Why this priority**: Optional game mechanic for special episodes or dramatic moments.

**Independent Test**: Can be tested by dropping multiple guests, then calling REVIVE_ALL endpoint and verifying all statuses.

**Acceptance Scenarios**:

1. **Given** 3 guests have `status: "dropped"` and 2 have `status: "active"`, **When** host triggers REVIVE_ALL, **Then** all 5 guests have `status: "active"` and phase becomes `all_revived`
2. **Given** all guests are already `status: "active"`, **When** host triggers REVIVE_ALL, **Then** no changes occur (idempotent operation)
3. **Given** REVIVE_ALL is triggered, **When** guests are updated, **Then** Firestore batch write is used to update all guests atomically

---

### Edge Cases

- What happens when answer is submitted during phase transition (e.g., from `accepting_answers` to `showing_distribution`)? → Use Firestore transactions to ensure consistent phase validation
- How does system handle guest submitting multiple answers for same question? → Latest answer overwrites previous answer (use document set with merge)
- What happens if game state document `gameState/live` doesn't exist? → Return 404 error "Game not initialized"
- How does system handle concurrent answer submissions? → Use Firestore sub-collection writes which are naturally isolated per guest
- What happens when TRIGGER_GONG is called but no answers have been submitted yet? → Return 400 error "Cannot trigger gong before answers are submitted"
- How does system handle eliminating worst performer when multiple guests have same (worst) score? → All guests with worst score are eliminated
- What happens when `prizeCarryover` accumulates from multiple consecutive all-incorrect questions? → Continue accumulating (20000 + 20000 + 20000... = total carryover)

## Requirements

### Functional Requirements

- **FR-001**: System MUST read game state from `gameState/live` document (not `gameState/current`)
- **FR-002**: System MUST store answers in `questions/{questionId}/answers/{guestId}` sub-collection (not top-level `answers` collection)
- **FR-003**: System MUST use guest status values `active` and `dropped` (not `alive` and `eliminated`)
- **FR-004**: System MUST include `prizeCarryover` field in game state document structure
- **FR-005**: System MUST validate guest status is `active` before accepting answer submission
- **FR-006**: System MUST validate game phase is `accepting_answers` before accepting answer submission
- **FR-007**: System MUST support all six game phases: `accepting_answers`, `showing_distribution`, `showing_correct_answer`, `showing_results`, `all_incorrect`, `all_revived`
- **FR-008**: System MUST implement three distinct result calculation cases: All Incorrect, Gong Active, Normal Question
- **FR-009**: System MUST accumulate prize money in `prizeCarryover` when all guests answer incorrectly
- **FR-010**: System MUST reset `prizeCarryover` to 0 after a question with any correct answers
- **FR-011**: System MUST set `isGongActive: false` after gong is triggered on a question
- **FR-012**: System MUST eliminate worst performer(s) when gong is active and triggered
- **FR-013**: System MUST implement REVIVE_ALL endpoint that sets all guests to `status: "active"` using batch write
- **FR-014**: System MUST use Firestore transactions for phase transitions to ensure consistency
- **FR-015**: System MUST allow latest answer to overwrite previous answer for same question/guest
- **FR-016**: System MUST eliminate all guests tied for worst score in normal questions
- **FR-017**: System MUST return appropriate HTTP status codes: 400 for validation errors, 403 for unauthorized actions, 404 for missing resources
- **FR-018**: System MUST maintain stateless architecture (no in-memory state, all state in Firestore)

### Key Entities

- **GameState** (`gameState/live`): Current game state with fields:
  - `currentQuestionId`: string (current question being played)
  - `phase`: enum (one of 6 phases)
  - `isGongActive`: boolean (whether gong can be triggered)
  - `prizeCarryover`: number (accumulated prize from all-incorrect questions)
  - `questionsAsked`: number (count of questions in current game)

- **Guest** (`guests/{guestId}`): Player in the game with fields:
  - `id`: string
  - `name`: string
  - `status`: "active" | "dropped"
  - `score`: number (total winnings)

- **Answer** (`questions/{questionId}/answers/{guestId}`): Guest's answer to a question with fields:
  - `guestId`: string
  - `answerId`: string (selected answer option)
  - `submittedAt`: timestamp
  - `isCorrect`: boolean (calculated after answer deadline)

- **Question** (`questions/{questionId}`): Game question with fields:
  - `id`: string
  - `text`: string
  - `options`: array of answer options
  - `correctAnswerId`: string
  - `prize`: number (base prize for this question)
  - `submittedCount`: number (count of submitted answers)
  - `answersDistribution`: object mapping answerId to count

## Success Criteria

### Measurable Outcomes

- **SC-001**: All Firestore read operations use `gameState/live` document path (0 references to `gameState/current`)
- **SC-002**: All answer write operations use `questions/{questionId}/answers/{guestId}` path (0 references to top-level `answers` collection)
- **SC-003**: All guest status checks use `active`/`dropped` values (0 references to `alive`/`eliminated`)
- **SC-004**: Dropped guests receive 403 error when attempting to submit answers (100% rejection rate)
- **SC-005**: All-incorrect questions correctly update `prizeCarryover` and keep all guests active (100% accuracy)
- **SC-006**: Gong trigger correctly eliminates worst performer and sets `isGongActive: false` (100% accuracy)
- **SC-007**: REVIVE_ALL successfully updates all guest statuses in single batch operation (atomic updates)
- **SC-008**: Phase transitions use Firestore transactions to prevent race conditions (0 consistency errors)
- **SC-009**: API server maintains stateless architecture with 0 in-memory game state
- **SC-010**: All existing unit and integration tests pass after refactoring (100% test pass rate)

## Implementation Notes

### Migration Strategy

This is a refactoring task that requires updating existing code. The implementation should:

1. **Phase 1 - Data Layer**: Update all Firestore references in services
   - gameStateService.ts: Change document path to `gameState/live`
   - answerService.ts: Change collection path to sub-collection structure
   - guestService.ts: Update status enum values

2. **Phase 2 - Validation**: Add business rule validation
   - Validate guest status before answer submission
   - Validate game phase before answer submission
   - Add error messages with appropriate HTTP codes

3. **Phase 3 - Game Logic**: Implement enhanced result calculation
   - Detect all-incorrect case and update `prizeCarryover`
   - Detect gong-active case and handle elimination
   - Ensure normal question logic handles ties

4. **Phase 4 - Special Actions**: Implement new endpoints
   - Add REVIVE_ALL endpoint with batch writes
   - Update TRIGGER_GONG to modify `isGongActive` state

5. **Phase 5 - Testing**: Update all tests to use new paths and values
   - Update mock data to use correct document paths
   - Update assertions to expect new field names
   - Add tests for new validation rules

### Backward Compatibility

This is a breaking change that requires coordinated deployment:
- API server must be deployed with new paths
- Socket server must be updated to watch `gameState/live`
- Admin dashboard must be updated to read/write new paths
- Client app must be updated to expect new field names

All components should be updated in same deployment window to avoid data inconsistencies.

## Related Features

- **001-api-server**: Original API server implementation that this refines
- **Socket Server** (future): WebSocket server that watches Firestore for `STATE_CHANGED` events
- **Admin Dashboard** (future): Host interface for managing game state
- **Client App** (future): Guest interface for playing the game
