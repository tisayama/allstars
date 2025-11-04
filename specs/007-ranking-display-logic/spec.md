# Feature Specification: Ranking Display Logic

**Feature Branch**: `007-ranking-display-logic`
**Created**: 2025-01-04
**Status**: Draft
**Input**: User description: "ゲームの仕様を変更します。（1）進行上、最終問題でない問題では正解発表後、早押しワースト10を表示します。これは正解者の中から回答時間が遅い10人を表示し、最も遅い一人が予選落ちになるものです。最終問題でない問題では早押しトップ１０は表示しません。（2）進行上、ピリオドの最終問題では正解発表のあとには早押しトップ１０を表示します。このうち回答時間が最も短い１人がピリオドチャンピオンとなります。最終問題では早押しワースト１０は表示されません。"

## Clarifications

### Session 2025-01-04

- Q: How is a "period final question" (ピリオドの最終問題) identified in the system? → A: Period-final questions are identified by the existing `isGongActive` flag in GameState. When the host triggers the gong (`isGongActive: true`), that question becomes the period-final question and displays Top 10 rankings.
- Q: What happens if the system cannot determine whether a question is final or non-final (i.e., `isGongActive` is ambiguous)? → A: Default to non-final behavior (display Worst 10, eliminate slowest correct answer)
- Q: When multiple participants have identical response times (ties), how should the system handle ranking and elimination? → A: Include all tied participants in ranking, eliminate all tied for slowest position
- Q: What happens if fewer than 10 correct answers exist for a non-final question? → A: Display all available correct answers in the Worst 10 ranking
- Q: What happens if fewer than 10 correct answers exist for a final question? → A: Display all available correct answers in the Top 10 ranking
- Q: How should the system persist and retrieve period champion designations after a period concludes? → A: Store in GameState.results with period identifier and champion list
- Q: When ranking calculation fails (e.g., database read timeout, data corruption), how should the system behave? → A: Retry automatically up to 3 times, then fail gracefully with empty rankings

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Worst 10 Ranking for Non-Final Questions (Priority: P1)

As a quiz participant watching the results screen, I need to see the 10 slowest correct answer times after non-final questions, so I can understand who is at risk of elimination.

**Why this priority**: This is the core game mechanic change for regular questions. Without this, the game flow is broken and participants don't see the elimination criteria.

**Independent Test**: Can be fully tested by completing any non-final question with at least 10 correct answers, advancing to the results phase, and verifying only the Worst 10 ranking (slowest correct answers) is displayed while Top 10 is hidden.

**Acceptance Scenarios**:

1. **Given** a non-final question with 15 correct answers, **When** the results phase displays, **Then** the system shows the 10 slowest correct answers ordered by response time (descending) and the Top 10 ranking is not displayed
2. **Given** a non-final question with 8 correct answers, **When** the results phase displays, **Then** the system shows all 8 correct answers in the Worst 10 ranking section
3. **Given** the Worst 10 ranking is displayed for a non-final question, **When** viewing the slowest answer, **Then** the system marks that participant for elimination

---

### User Story 2 - Display Top 10 Ranking for Period Final Questions (Priority: P1)

As a quiz participant watching the final question results, I need to see the 10 fastest correct answer times, so I can celebrate the period champion and see who performed best.

**Why this priority**: This is the climactic moment of each period. Without the Top 10 display, the period champion cannot be determined and the dramatic conclusion is lost.

**Independent Test**: Can be fully tested by completing a period-final question with at least 10 correct answers, advancing to the results phase, and verifying only the Top 10 ranking (fastest correct answers) is displayed while Worst 10 is hidden.

**Acceptance Scenarios**:

1. **Given** a period-final question with 20 correct answers, **When** the results phase displays, **Then** the system shows the 10 fastest correct answers ordered by response time (ascending) and the Worst 10 ranking is not displayed
2. **Given** a period-final question with 6 correct answers, **When** the results phase displays, **Then** the system shows all 6 correct answers in the Top 10 ranking section
3. **Given** the Top 10 ranking is displayed for a period-final question, **When** viewing the fastest answer, **Then** the system identifies that participant as the period champion

---

### User Story 3 - Correct Elimination Logic for Non-Final Questions (Priority: P1)

As a game system, I must eliminate the slowest correct answer participant(s) from non-final questions, so that the game progressively reduces the participant pool.

**Why this priority**: Elimination is fundamental to the game progression. Without correct elimination logic based on the Worst 10 ranking, the game cannot advance properly.

**Independent Test**: Can be fully tested by submitting answers to a non-final question where multiple participants answer correctly, then verifying the slowest correct answer participant is marked as eliminated.

**Acceptance Scenarios**:

1. **Given** a non-final question where 12 participants answered correctly, **When** results are calculated, **Then** the participant with the slowest correct answer time is marked for elimination
2. **Given** a non-final question where 3 participants tie for slowest correct answer time, **When** results are calculated, **Then** all 3 tied participants are marked for elimination
3. **Given** a non-final question where no participants answered correctly, **When** results are calculated, **Then** no participants are eliminated and the prize carries over

---

### Edge Cases

- What happens when all participants answer a non-final question incorrectly? → No Worst 10 ranking is displayed (empty correct answer set), no eliminations occur, prize carries over as per existing all-incorrect logic
- What happens when only 1 participant answers a period-final question correctly? → Display that single participant in the Top 10 ranking as the period champion
- What happens if multiple participants tie for the fastest time on a final question? → All tied participants are included in the ranking and share the period champion title
- What happens if multiple participants tie for the slowest correct answer time on a non-final question? → All tied participants are included in the ranking and all are eliminated
- What happens if ties at the 10th position cause the ranking to exceed 10 participants? → Include all tied participants beyond the 10-participant limit (e.g., if 3 participants tie for 10th place, display 12 total)
- What happens if the system cannot determine whether a question is final or non-final (i.e., `isGongActive` state is ambiguous)? → Default to non-final behavior (display Worst 10, eliminate slowest correct answer) to ensure game progression continues
- What happens if ranking calculation fails due to database errors or data corruption? → System retries up to 3 times, then displays empty rankings and logs error to monitoring service; game progression continues normally
- How does the period champion designation interact with the overall winner logic? → Period champion is a title/honor with no impact on overall winner determination (which is based on cumulative score/survival)

## Requirements *(mandatory)*

### Functional Requirements

#### Ranking Display Rules

- **FR-001**: System MUST display **only** the Worst 10 ranking (slowest 10 correct answers) after non-final questions
- **FR-002**: System MUST display **only** the Top 10 ranking (fastest 10 correct answers) after period-final questions
- **FR-003**: System MUST hide the Top 10 ranking completely during non-final question results phases
- **FR-004**: System MUST hide the Worst 10 ranking completely during period-final question results phases
- **FR-005**: System MUST sort Worst 10 rankings by response time in descending order (slowest first)
- **FR-006**: System MUST sort Top 10 rankings by response time in ascending order (fastest first)

#### Ranking Calculation

- **FR-007**: System MUST include **only correct answers** when calculating both Top 10 and Worst 10 rankings
- **FR-008**: System MUST limit the Worst 10 ranking to a maximum of 10 participants (unless ties extend beyond 10)
- **FR-009**: System MUST limit the Top 10 ranking to a maximum of 10 participants (unless ties extend beyond 10)
- **FR-010**: System MUST display all correct answers (even if fewer than 10) when the correct answer count is below 10
- **FR-011**: System MUST identify the slowest correct answer participant in the Worst 10 ranking as the eliminated participant for non-final questions
- **FR-012**: System MUST identify the fastest correct answer participant in the Top 10 ranking as the period champion for final questions
- **FR-013a**: System MUST include all participants with identical response times in rankings (no arbitrary tie-breaking by submission order or random selection)

#### Question Classification

- **FR-013**: System MUST determine whether each question is a period-final question or non-final question using the existing `isGongActive` flag in GameState (when `isGongActive: true`, the question is a period-final question)
- **FR-014**: System MUST persist the period champion designation(s) in GameState.results.periodChampions array with the corresponding period identifier, supporting multiple champions in case of ties

#### Elimination Logic

- **FR-015**: System MUST eliminate the participant(s) with the slowest correct answer time for non-final questions
- **FR-016**: System MUST eliminate all participants who tie for the slowest correct answer time on non-final questions
- **FR-017**: System MUST NOT eliminate any participants on period-final questions (ranking is for honor only)
- **FR-018**: System MUST continue to use existing all-incorrect logic (no eliminations, prize carryover) when no correct answers exist for non-final questions

#### Error Handling & Resilience

- **FR-019**: System MUST retry ranking calculation up to 3 times when database operations fail (timeout, connection error, or read failure)
- **FR-020**: System MUST log all ranking calculation failures with error details (error type, retry count, question ID, timestamp) to monitoring service
- **FR-021**: System MUST display empty rankings (top10: [], worst10: []) when all retry attempts are exhausted
- **FR-022**: System MUST continue game progression even when rankings cannot be calculated (fail gracefully without blocking phase transitions)
- **FR-023**: System MUST include error indicator in GameState when ranking calculation fails after all retries

### Key Entities

- **GameResults**: Rankings displayed after each question
  - `top10`: Array of fastest 10 correct answers (only displayed for period-final questions)
  - `worst10`: Array of slowest 10 correct answers (only displayed for non-final questions)
  - `periodChampions`: Array of participant IDs who achieved fastest time on period-final questions (supports multiple champions in case of ties)
  - `period`: Period identifier (e.g., "first-half", "second-half", "overtime") for the question these results belong to
  - `rankingError`: Optional boolean flag indicating ranking calculation failed after all retries (when true, top10/worst10 will be empty arrays)
  - Each ranking entry includes: participant ID, name, response time

- **Question**: Quiz question entity
  - Period-final questions are identified by the `isGongActive` flag in GameState (not stored in the Question entity itself)
  - When `isGongActive: true`, the current question is treated as a period-final question
  - Determines which ranking type (Top 10 vs Worst 10) will be displayed

- **Participant**: Quiz contestant
  - Can be marked as eliminated based on Worst 10 ranking performance
  - Can be designated as period champion based on Top 10 ranking performance

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of non-final questions display only Worst 10 rankings (slowest correct answers) with Top 10 hidden
- **SC-002**: 100% of period-final questions display only Top 10 rankings (fastest correct answers) with Worst 10 hidden
- **SC-003**: The slowest correct answer participant is correctly eliminated in 100% of non-final questions with at least one correct answer
- **SC-004**: The fastest correct answer participant is correctly identified as period champion in 100% of period-final questions
- **SC-005**: Rankings display within 2 seconds of entering the results phase for 95% of questions
- **SC-006**: Tied participants (same response time) are handled consistently in 100% of cases (all tied participants eliminated or all share champion title)
- **SC-007**: When fewer than 10 correct answers exist, all correct answers are displayed in the appropriate ranking with 100% accuracy
- **SC-008**: The system correctly applies all-incorrect logic (no eliminations, prize carryover) when no correct answers exist for non-final questions
- **SC-009**: Period champions are persisted in game results and retrievable after game completion with 100% data integrity
- **SC-010**: When ranking calculation encounters errors, the system successfully retries up to 3 times and fails gracefully with empty rankings if all retries are exhausted, maintaining 100% game progression continuity (no phase transition blocks)
- **SC-011**: All ranking calculation errors are logged to monitoring service with complete error context (error type, retry count, question ID, timestamp) achieving 100% observability for operational debugging

## Assumptions

1. **Question Metadata Availability**: The question data structure already contains or can be extended to include a field identifying period-final questions
2. **Existing Ranking Infrastructure**: The current system already calculates both Top 10 and Worst 10 rankings; this feature only changes which ranking is displayed based on question type
3. **Correct Answer Set**: The system already identifies and filters correct vs incorrect answers; this logic remains unchanged
4. **Single Elimination Per Question**: For non-final questions, exactly one participant (or all tied participants) is eliminated per question based on slowest correct answer
5. **No Retroactive Changes**: Existing game sessions completed before this feature deployment will not have their results recalculated
6. **Period Count**: The game has multiple periods (first-half, second-half, overtime) and each period has exactly one final question
7. **Champion Designation**: Period champion is an honorary title with no mechanical impact on game progression or prize distribution
8. **Ranking Persistence**: Both Top 10 and Worst 10 rankings are still calculated and stored; only the display logic changes based on question type

## Dependencies

- **Question Service**: Requires ability to identify period-final questions vs non-final questions
- **Answer Service**: Existing correct answer filtering and response time calculations
- **Game State Service**: Existing ranking calculation functions (getTop10CorrectAnswers, getWorst10CorrectAnswers)
- **Frontend Applications**: projector-app, participant-app, host-app must update results display logic to show only the appropriate ranking
- **Database Schema**: May require question schema extension if period-final flag doesn't currently exist
