# Quickstart Guide: Ranking Display Logic

**Feature Branch**: `007-ranking-display-logic`
**Created**: 2025-01-04
**Status**: Developer Testing Guide
**Related Documents**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md) | [research.md](./research.md)

---

## 1. Introduction

### Feature Overview

The Ranking Display Logic feature modifies the quiz game to display different rankings based on question type:
- **Non-final questions**: Display only **Worst 10** ranking (slowest 10 correct answers), eliminate the slowest participant
- **Period-final questions** (triggered by gong): Display only **Top 10** ranking (fastest 10 correct answers), designate period champion(s)

### Purpose of This Guide

This quickstart guide provides step-by-step instructions for developers to:
- Set up the development environment
- Test ranking logic for both question types
- Verify tie-handling behavior
- Validate error handling and retry mechanisms
- Ensure frontend apps display rankings correctly

### Expected Time to Complete

**~20-30 minutes** (including environment setup and all test scenarios)

---

## 2. Prerequisites

Before starting, ensure you have:

### Required Tools
- **Node.js**: Version 18.0.0 or higher (`node --version`)
- **pnpm**: Package manager (`pnpm --version`)
- **Firebase CLI**: Version 11.0.0 or higher (`firebase --version`)
- **Git**: For branch management

### Environment Requirements
- Firebase emulators installed and configured
- API server development environment setup
- Access to the monorepo root: `/home/tisayama/allstars`

### Knowledge Prerequisites
- Basic understanding of Firebase Firestore data model
- Familiarity with the quiz game flow (phases: ready_for_next → accepting_answers → showing_correct_answer → showing_results)
- Understanding of the gong mechanism (`isGongActive` flag)

### Seeded Test Data
The feature includes seed scripts to populate test data. Ensure the following data exists:
- At least 15 active participants (guests)
- At least 2 questions per period (first-half, second-half)
- Pre-configured correct/incorrect answers with varying response times

---

## 3. Environment Setup

### Step 1: Navigate to API Server Directory

```bash
cd /home/tisayama/allstars/apps/api-server
```

### Step 2: Install Dependencies

```bash
pnpm install
```

**Expected Output**: All dependencies installed without errors.

### Step 3: Start Firebase Emulators

Start the emulators with data import/export enabled:

```bash
pnpm run emulator
```

**Expected Output**:
```
✔  firestore: Firestore Emulator running on http://127.0.0.1:8080
✔  functions: Functions Emulator running on http://127.0.0.1:5001
✔  hosting: Hosting Emulator running on http://127.0.0.1:5000
✔  All emulators ready! View status at http://127.0.0.1:4000
```

**Note**: The emulator will import data from `./emulator-data` if available and export on exit.

### Step 4: Seed Test Data (Optional)

If starting fresh or need to reset data:

```bash
# In a new terminal, navigate to api-server
cd /home/tisayama/allstars/apps/api-server

# Run seed script
pnpm run seed
```

**Expected Output**: Seed script creates:
- 20 test participants (guest001 - guest020)
- 6 questions (2 per period)
- Sample answers with distributed response times (500ms - 10,000ms)

### Step 5: Start API Server in Development Mode

In a new terminal:

```bash
cd /home/tisayama/allstars/apps/api-server

# Build TypeScript
pnpm run build

# Start development server (watches for changes)
npm run serve
```

**Expected Output**:
```
✔  functions: api-server: http function initialized (http://localhost:5001/...)
```

### Step 6: Verify Services Are Healthy

```bash
# Check Firestore emulator
curl http://127.0.0.1:8080

# Check API server health endpoint
curl http://localhost:5001/allstars-dev/us-central1/api/health
```

**Expected Response**: `{"status": "ok"}` from API server.

---

## 4. Testing Non-Final Question Rankings (Worst 10)

### Scenario: Display Slowest 10 Correct Answers

This test verifies that non-final questions show only the **Worst 10** ranking (slowest correct answers) and hide the Top 10 ranking.

### Step 1: Trigger a Non-Final Question

Using the Firestore emulator UI or API:

```bash
# Navigate to Firestore UI
open http://127.0.0.1:4000/firestore

# Update GameState document: gameStates/live
# Set the following fields:
# - currentPhase: "ready_for_next"
# - isGongActive: false
# - currentQuestion: (select question from first-half period)
```

**Or via API** (if host endpoints available):

```bash
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/start-question \
  -H "Content-Type: application/json" \
  -d '{"questionId": "question-001"}'
```

### Step 2: Submit 12+ Correct Answers with Varying Response Times

Using the seed data or manually create answers:

```bash
# Example: Submit correct answers via participant API
for i in {1..12}; do
  curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
    -H "Content-Type: application/json" \
    -d "{
      \"guestId\": \"guest$(printf %03d $i)\",
      \"questionId\": \"question-001\",
      \"answer\": \"A\",
      \"responseTimeMs\": $((1000 + i * 500))
    }"
done
```

**Response Times Distribution**:
- guest001: 1500ms (fastest correct)
- guest006: 4000ms
- guest010: 6500ms (10th slowest)
- guest011: 7000ms (tied with guest012 at boundary)
- guest012: 7000ms (slowest)

### Step 3: Advance to Showing Results Phase

```bash
# Advance game: accepting_answers → showing_correct_answer
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance

# Advance game: showing_correct_answer → showing_results
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance
```

### Step 4: Verify Worst 10 Ranking Displays Slowest Correct Answers

Query GameState from Firestore:

```bash
# Via Firestore UI
open http://127.0.0.1:4000/firestore/data/gameStates/live

# Via API (if query endpoint available)
curl http://localhost:5001/allstars-dev/us-central1/api/game/state
```

**Expected GameState.results**:

```json
{
  "top10": [],
  "worst10": [
    {"guestId": "guest012", "guestName": "Guest 012", "responseTimeMs": 7000},
    {"guestId": "guest011", "guestName": "Guest 011", "responseTimeMs": 7000},
    {"guestId": "guest010", "guestName": "Guest 010", "responseTimeMs": 6500},
    {"guestId": "guest009", "guestName": "Guest 009", "responseTimeMs": 6000},
    {"guestId": "guest008", "guestName": "Guest 008", "responseTimeMs": 5500},
    {"guestId": "guest007", "guestName": "Guest 007", "responseTimeMs": 5000},
    {"guestId": "guest006", "guestName": "Guest 006", "responseTimeMs": 4500},
    {"guestId": "guest005", "guestName": "Guest 005", "responseTimeMs": 4000},
    {"guestId": "guest004", "guestName": "Guest 004", "responseTimeMs": 3500},
    {"guestId": "guest003", "guestName": "Guest 003", "responseTimeMs": 3000}
  ],
  "periodChampions": undefined,
  "period": undefined,
  "rankingError": false
}
```

### Step 5: Verify Top 10 Ranking is Hidden

- `top10` array should be **empty** (`[]`)
- Frontend apps should **not render** the Top 10 section

### Step 6: Verify Slowest Participant Marked for Elimination

Check the elimination logic in GameState:

```json
{
  "eliminatedGuests": ["guest012", "guest011"]
}
```

**Expected Behavior**: Both `guest011` and `guest012` eliminated (tied for slowest at 7000ms).

### Commands and Expected Outputs Summary

| Step | Command | Expected Output |
|------|---------|----------------|
| Start question | `POST /host/game/start-question` | `currentPhase: "accepting_answers"` |
| Submit answers | `POST /participant/submit-answer` (x12) | 12 correct answers with varying times |
| Show correct answer | `POST /host/game/advance` | `currentPhase: "showing_correct_answer"` |
| Show results | `POST /host/game/advance` | `currentPhase: "showing_results"` |
| Query GameState | `GET /game/state` | `results.worst10` array length = 10, `results.top10` = [] |

---

## 5. Testing Period-Final Question Rankings (Top 10)

### Scenario: Display Fastest 10 Correct Answers for Gong Question

This test verifies that period-final questions show only the **Top 10** ranking (fastest correct answers) and hide the Worst 10 ranking.

### Step 1: Trigger Gong (Set isGongActive: true)

```bash
# Via Firestore UI
open http://127.0.0.1:4000/firestore/data/gameStates/live

# Update document:
# - isGongActive: true
```

**Or via API**:

```bash
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/trigger-gong
```

**Expected GameState Update**:
```json
{
  "isGongActive": true
}
```

### Step 2: Trigger a Period-Final Question

```bash
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/start-question \
  -H "Content-Type: application/json" \
  -d '{"questionId": "question-002"}'
```

**Expected**: Question starts with `isGongActive: true` flag preserved.

### Step 3: Submit 10+ Correct Answers with Varying Response Times

```bash
for i in {1..15}; do
  curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
    -H "Content-Type: application/json" \
    -d "{
      \"guestId\": \"guest$(printf %03d $i)\",
      \"questionId\": \"question-002\",
      \"answer\": \"B\",
      \"responseTimeMs\": $((500 + i * 400))
    }"
done
```

**Response Times Distribution**:
- guest001: 900ms (fastest correct)
- guest002: 1300ms
- guest010: 4900ms (10th fastest)
- guest015: 6900ms (slowest)

### Step 4: Advance to Showing Results Phase

```bash
# Advance: accepting_answers → showing_correct_answer
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance

# Advance: showing_correct_answer → showing_results
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance
```

### Step 5: Verify Top 10 Ranking Displays Fastest Correct Answers

Query GameState:

```bash
curl http://localhost:5001/allstars-dev/us-central1/api/game/state
```

**Expected GameState.results**:

```json
{
  "top10": [
    {"guestId": "guest001", "guestName": "Guest 001", "responseTimeMs": 900},
    {"guestId": "guest002", "guestName": "Guest 002", "responseTimeMs": 1300},
    {"guestId": "guest003", "guestName": "Guest 003", "responseTimeMs": 1700},
    {"guestId": "guest004", "guestName": "Guest 004", "responseTimeMs": 2100},
    {"guestId": "guest005", "guestName": "Guest 005", "responseTimeMs": 2500},
    {"guestId": "guest006", "guestName": "Guest 006", "responseTimeMs": 2900},
    {"guestId": "guest007", "guestName": "Guest 007", "responseTimeMs": 3300},
    {"guestId": "guest008", "guestName": "Guest 008", "responseTimeMs": 3700},
    {"guestId": "guest009", "guestName": "Guest 009", "responseTimeMs": 4100},
    {"guestId": "guest010", "guestName": "Guest 010", "responseTimeMs": 4500}
  ],
  "worst10": [],
  "periodChampions": ["guest001"],
  "period": "first-half",
  "rankingError": false
}
```

### Step 6: Verify Worst 10 Ranking is Hidden

- `worst10` array should be **empty** (`[]`)
- Frontend apps should **not render** the Worst 10 section

### Step 7: Verify Period Champion Designation

Check the period champion:

```json
{
  "periodChampions": ["guest001"],
  "period": "first-half"
}
```

**Expected Behavior**: `guest001` designated as period champion (fastest correct answer at 900ms).

### Commands and Expected Outputs Summary

| Step | Command | Expected Output |
|------|---------|----------------|
| Trigger gong | `POST /host/game/trigger-gong` | `isGongActive: true` |
| Start question | `POST /host/game/start-question` | `currentPhase: "accepting_answers"`, `isGongActive: true` |
| Submit answers | `POST /participant/submit-answer` (x15) | 15 correct answers with varying times |
| Show results | `POST /host/game/advance` (x2) | `currentPhase: "showing_results"` |
| Query GameState | `GET /game/state` | `results.top10` length = 10, `results.worst10` = [], `periodChampions: ["guest001"]` |

---

## 6. Testing Tie Handling

### Scenario: Verify All Tied Participants Included in Rankings

This test verifies that when multiple participants have identical response times at boundary positions, all tied participants are included (rankings can exceed 10 participants).

### Step 1: Create Scenario with Tied Response Times at Boundary Positions

Manually create answers with intentional ties:

```bash
# 10th place tie: 3 participants at 5000ms (positions 10, 11, 12)
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
  -H "Content-Type: application/json" \
  -d '{"guestId": "guest010", "questionId": "question-003", "answer": "A", "responseTimeMs": 5000}'

curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
  -H "Content-Type: application/json" \
  -d '{"guestId": "guest011", "questionId": "question-003", "answer": "A", "responseTimeMs": 5000}'

curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
  -H "Content-Type: application/json" \
  -d '{"guestId": "guest012", "questionId": "question-003", "answer": "A", "responseTimeMs": 5000}'
```

### Step 2: Verify All Tied Participants Included in Ranking

Advance to showing_results and query GameState:

**Expected GameState.results.worst10** (non-final question):

```json
{
  "worst10": [
    {"guestId": "guest012", "guestName": "Guest 012", "responseTimeMs": 6000},
    {"guestId": "guest011", "guestName": "Guest 011", "responseTimeMs": 5500},
    {"guestId": "guest010", "guestName": "Guest 010", "responseTimeMs": 5000},
    {"guestId": "guest009", "guestName": "Guest 009", "responseTimeMs": 5000},
    {"guestId": "guest008", "guestName": "Guest 008", "responseTimeMs": 5000}
  ]
}
```

**Array Length**: 12 participants (exceeds 10 due to 3-way tie at 10th position).

### Step 3: Verify Rankings Can Exceed 10 Participants

- Rankings array length: 12 (not hard-coded to 10)
- All participants with `responseTimeMs >= 10th position time` included

### Step 4: Verify Elimination Logic for Tied Slowest Participants

For non-final questions:

```json
{
  "eliminatedGuests": ["guest010", "guest011", "guest012"]
}
```

**Expected**: All 3 tied participants eliminated.

### Step 5: Verify Champion Sharing for Tied Fastest Participants

For period-final questions with tied fastest times:

```bash
# Create 2 participants tied for fastest (500ms)
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
  -d '{"guestId": "guest001", "questionId": "question-004", "answer": "B", "responseTimeMs": 500}'

curl -X POST http://localhost:5001/allstars-dev/us-central1/api/participant/submit-answer \
  -d '{"guestId": "guest002", "questionId": "question-004", "answer": "B", "responseTimeMs": 500}'
```

**Expected GameState.results**:

```json
{
  "top10": [
    {"guestId": "guest001", "guestName": "Guest 001", "responseTimeMs": 500},
    {"guestId": "guest002", "guestName": "Guest 002", "responseTimeMs": 500},
    ...
  ],
  "periodChampions": ["guest001", "guest002"],
  "period": "first-half"
}
```

**Expected**: Both `guest001` and `guest002` share period champion title.

---

## 7. Testing Error Handling and Retry Logic

### Scenario: Verify Retry Attempts and Graceful Degradation

This test verifies that the system retries 3 times on Firestore errors and falls back to empty rankings if all retries fail.

### Step 1: Simulate Firestore Timeout

**Option A: Disconnect Emulator Mid-Query**

```bash
# In a new terminal, stop the Firestore emulator
# Find the emulator process ID
ps aux | grep firestore

# Kill the emulator
kill -9 <PID>
```

**Option B: Inject Artificial Delay in answerService.ts** (for testing only)

Add temporary code to simulate timeout:

```typescript
// apps/api-server/src/services/answerService.ts
export async function getWorst10CorrectAnswers(questionId: string): Promise<Answer[]> {
  // TESTING ONLY: Simulate timeout
  throw new Error('DEADLINE_EXCEEDED');

  // ... rest of function
}
```

### Step 2: Trigger Ranking Calculation

```bash
# Advance to showing_results (will trigger ranking calculation)
curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance
```

### Step 3: Verify 3 Retry Attempts Occur (Check Logs)

Monitor the API server logs:

```bash
# In the api-server terminal, you should see:
# Ranking calculation attempt 1 failed. 3 retries left.
# Ranking calculation attempt 2 failed. 2 retries left.
# Ranking calculation attempt 3 failed. 1 retries left.
# Ranking calculation attempt 4 failed. 0 retries left.
# Ranking calculation failed after all retries
```

**Expected Log Output**:

```
ERROR: Ranking calculation attempt 1 failed. 3 retries left. { questionId: 'question-001', error: 'DEADLINE_EXCEEDED' }
ERROR: Ranking calculation attempt 2 failed. 2 retries left. { questionId: 'question-001', error: 'DEADLINE_EXCEEDED' }
ERROR: Ranking calculation attempt 3 failed. 1 retries left. { questionId: 'question-001', error: 'DEADLINE_EXCEEDED' }
ERROR: Ranking calculation attempt 4 failed. 0 retries left. { questionId: 'question-001', error: 'DEADLINE_EXCEEDED' }
ERROR: Ranking calculation failed after all retries { questionId: 'question-001', error: 'DEADLINE_EXCEEDED', timestamp: '2025-01-04T12:00:00.000Z' }
```

### Step 4: Verify Graceful Degradation (Empty Rankings Displayed)

Query GameState:

```bash
curl http://localhost:5001/allstars-dev/us-central1/api/game/state
```

**Expected GameState.results**:

```json
{
  "top10": [],
  "worst10": [],
  "rankingError": true
}
```

### Step 5: Verify Game Progression Continues (Phase Transitions Not Blocked)

```bash
# Game should still transition to showing_results phase
curl http://localhost:5001/allstars-dev/us-central1/api/game/state | grep currentPhase
```

**Expected**: `"currentPhase": "showing_results"` (not stuck in previous phase).

### Step 6: Verify rankingError Flag Set to True

```bash
curl http://localhost:5001/allstars-dev/us-central1/api/game/state | grep rankingError
```

**Expected**: `"rankingError": true`

### Commands to Simulate Failures Summary

| Failure Type | Simulation Method | Expected Behavior |
|--------------|-------------------|-------------------|
| Firestore timeout | Kill emulator mid-query | 3 retries → empty rankings |
| Network partition | Disconnect network | 3 retries → empty rankings |
| Data corruption | Invalid answer data | Fail-fast (no retries) |
| Permission denied | Misconfigured Firestore rules | Fail-fast (no retries) |

---

## 8. Verifying Frontend Display Logic

### Step 1: Open Frontend Apps in Browsers

Start the frontend development servers:

```bash
# Projector App
cd /home/tisayama/allstars/apps/projector-app
pnpm run dev
# Opens at http://localhost:3000

# Participant App
cd /home/tisayama/allstars/apps/participant-app
pnpm run dev
# Opens at http://localhost:3001

# Host App
cd /home/tisayama/allstars/apps/host-app
pnpm run dev
# Opens at http://localhost:3002
```

### Step 2: Verify Conditional Rendering Based on isGongActive

**Non-Final Question** (`isGongActive: false`):
- Navigate to projector-app: http://localhost:3000
- **Expected Display**:
  - "Worst 10" section visible
  - "Top 10" section hidden (not rendered)
  - Rankings sorted descending by response time (slowest first)

**Period-Final Question** (`isGongActive: true`):
- Trigger gong and advance to showing_results
- **Expected Display**:
  - "Top 10" section visible
  - "Worst 10" section hidden (not rendered)
  - Rankings sorted ascending by response time (fastest first)
  - Period champion badge displayed on fastest participant

### Step 3: Verify Real-Time Updates via Firestore Listeners

1. Open projector-app in browser: http://localhost:3000
2. In another terminal, advance game to showing_results:
   ```bash
   curl -X POST http://localhost:5001/allstars-dev/us-central1/api/host/game/advance
   ```
3. **Expected**: Projector app updates within 100ms showing rankings (no page refresh needed)

### Step 4: Verify Empty State Handling When rankingError: true

1. Simulate ranking calculation failure (see Section 7)
2. Open projector-app: http://localhost:3000
3. **Expected Display**:
   - "Rankings Temporarily Unavailable" message
   - "The game will continue shortly." subtitle
   - No ranking list displayed
   - Game progression buttons still active

### Step 5: Verify UI Handles Variable-Length Arrays (Ties)

1. Create scenario with 12 participants in rankings (3-way tie at 10th position)
2. Open projector-app: http://localhost:3000
3. **Expected Display**:
   - All 12 participants displayed (no truncation)
   - UI dynamically adjusts height (scrollable or auto-fit grid)
   - No hard-coded 10-row limit

### URLs and Ports for Each App

| Application | URL | Port |
|-------------|-----|------|
| Projector App | http://localhost:3000 | 3000 |
| Participant App | http://localhost:3001 | 3001 |
| Host App | http://localhost:3002 | 3002 |
| Firebase Emulator UI | http://localhost:4000 | 4000 |
| Firestore Emulator | http://localhost:8080 | 8080 |
| API Server | http://localhost:5001 | 5001 |

---

## 9. Manual Verification Checklist

Use this checklist to ensure all acceptance scenarios are met:

### Non-Final Questions
- [ ] Non-final questions show only Worst 10 rankings
- [ ] Top 10 rankings are hidden (not rendered) for non-final questions
- [ ] Worst 10 sorted descending by response time (slowest first)
- [ ] Slowest participant(s) marked for elimination
- [ ] If fewer than 10 correct answers, all displayed in Worst 10 section

### Period-Final Questions
- [ ] Period-final questions show only Top 10 rankings
- [ ] Worst 10 rankings are hidden (not rendered) for period-final questions
- [ ] Top 10 sorted ascending by response time (fastest first)
- [ ] Fastest participant(s) designated as period champion
- [ ] Period champion designation persisted in GameState.results
- [ ] If fewer than 10 correct answers, all displayed in Top 10 section

### Tie Handling
- [ ] Tied participants included in rankings (no arbitrary exclusion)
- [ ] Rankings can exceed 10 participants when ties occur at boundary
- [ ] All tied slowest participants eliminated (non-final questions)
- [ ] All tied fastest participants share period champion title (final questions)

### Error Handling
- [ ] Retry logic attempts 3 times on Firestore timeout
- [ ] Empty rankings displayed when all retries fail
- [ ] Game continues to showing_results phase even with ranking errors
- [ ] rankingError flag set to true when calculation fails
- [ ] Errors logged to console with full context (questionId, error message, timestamp)

### Frontend Display
- [ ] All frontend apps (projector, participant, host) update in real-time
- [ ] Error states display "Rankings Temporarily Unavailable" message
- [ ] UI handles variable-length arrays (ties) without truncation
- [ ] Firestore listener auto-reconnects on network disruption
- [ ] No page refresh required for ranking updates

### Data Integrity
- [ ] Period champions persisted correctly in GameState.results.periodChampions
- [ ] Period identifier (first-half, second-half, overtime) stored correctly
- [ ] Rankings contain only correct answers (isCorrect === true)
- [ ] Guest names hydrated correctly in ranking entries

---

## 10. Troubleshooting

### Common Issues and Solutions

#### Issue: Emulators Not Starting

**Symptom**: `firebase emulators:start` fails with port conflicts.

**Solution**:
```bash
# Check for processes using Firebase ports
lsof -i :4000 -i :5001 -i :8080 -i :9099

# Kill conflicting processes
kill -9 <PID>

# Restart emulators
pnpm run emulator
```

#### Issue: Seed Data Not Loading

**Symptom**: Firestore emulator has no data after running seed script.

**Solution**:
```bash
# Verify emulator is running
curl http://127.0.0.1:8080

# Run seed script with verbose logging
cd /home/tisayama/allstars/apps/api-server
pnpm run seed --verbose

# Manually verify data in Firestore UI
open http://127.0.0.1:4000/firestore
```

#### Issue: API Server Connection Errors

**Symptom**: `curl` commands return "Connection refused" or timeout.

**Solution**:
```bash
# Check if API server is running
ps aux | grep node

# Restart API server
cd /home/tisayama/allstars/apps/api-server
pnpm run build
npm run serve

# Verify API health endpoint
curl http://localhost:5001/allstars-dev/us-central1/api/health
```

#### Issue: Firestore Listener Not Updating

**Symptom**: Frontend apps don't show ranking updates in real-time.

**Solution**:
1. Open browser console (F12)
2. Check for Firestore listener errors:
   ```
   Error: Missing or insufficient permissions
   ```
3. Verify Firestore security rules allow read access:
   ```bash
   open http://127.0.0.1:4000/firestore/rules
   ```
4. Ensure rules allow read for gameStates/live document

#### Issue: Rankings Showing Incorrect Data

**Symptom**: Top 10 displays incorrect answers, or Worst 10 sorted incorrectly.

**Solution**:
1. Check answer data in Firestore UI:
   ```bash
   open http://127.0.0.1:4000/firestore/data/questions/{questionId}/answers
   ```
2. Verify `isCorrect` field is boolean (not string "true")
3. Verify `responseTimeMs` field is number (not string)
4. Check API server logs for Zod validation errors:
   ```bash
   # In api-server terminal, look for:
   # ERROR: Ranking validation failed
   ```

#### Issue: rankingError Flag Always True

**Symptom**: All ranking calculations fail even with valid data.

**Solution**:
1. Check API server logs for specific error:
   ```bash
   # Look for: "Ranking calculation failed"
   # Error message should indicate root cause
   ```
2. Common causes:
   - Firestore indexes missing (check emulator logs)
   - Invalid answer data (missing required fields)
   - Firestore emulator not running
3. Test with minimal scenario (2 participants, 1 question)

### Where to Find Logs

| Service | Log Location |
|---------|-------------|
| API Server | Terminal running `npm run serve` |
| Firebase Emulators | Terminal running `pnpm run emulator` |
| Projector App | Browser console (F12) |
| Participant App | Browser console (F12) |
| Host App | Browser console (F12) |
| Firestore Operations | http://localhost:4000/logs |

---

## 11. Next Steps

After completing all test scenarios:

### 1. Run Full Test Suite

```bash
cd /home/tisayama/allstars/apps/api-server

# Run all unit and integration tests
pnpm test

# Run with coverage report
pnpm run test:coverage
```

**Expected**: All tests pass, coverage >80%.

### 2. Review Implementation Against Spec

Cross-reference test results with acceptance scenarios in [spec.md](./spec.md):
- [ ] User Story 1: Display Worst 10 Ranking for Non-Final Questions (3 scenarios)
- [ ] User Story 2: Display Top 10 Ranking for Period Final Questions (3 scenarios)
- [ ] User Story 3: Correct Elimination Logic for Non-Final Questions (3 scenarios)
- [ ] All edge cases handled correctly

### 3. Proceed to Manual QA Testing

1. Test with realistic participant counts (50-200 participants)
2. Test concurrent answer submissions (stress test)
3. Test network disruptions (disconnect/reconnect)
4. Test on mobile devices (participant-app)

### 4. Deploy to Staging Environment

```bash
# Build production bundles
pnpm run build

# Deploy to Firebase staging project
firebase use staging
firebase deploy --only functions,firestore

# Verify deployment
curl https://staging-api.allstars.com/health
```

### 5. Additional Resources

- **Specification**: [spec.md](./spec.md) - Detailed requirements and acceptance criteria
- **Implementation Plan**: [plan.md](./plan.md) - Technical architecture and decisions
- **Data Model**: [data-model.md](./data-model.md) - TypeScript interfaces and validation schemas
- **Research Document**: [research.md](./research.md) - Technical decisions and rationale
- **Firebase Emulator Docs**: https://firebase.google.com/docs/emulator-suite
- **p-retry Documentation**: https://github.com/sindresorhus/p-retry

---

## Summary

This quickstart guide covered:
- ✅ Environment setup with Firebase emulators and API server
- ✅ Testing non-final question rankings (Worst 10)
- ✅ Testing period-final question rankings (Top 10)
- ✅ Verifying tie-handling logic
- ✅ Validating error handling and retry mechanisms
- ✅ Confirming frontend display logic
- ✅ Troubleshooting common issues

**Total Test Time**: ~20-30 minutes

**Next Action**: Run full test suite (`pnpm test`) and deploy to staging environment.

---

**Document Status**: ✅ Complete
**Generated**: 2025-01-04
**Last Updated**: 2025-01-04
