# Quickstart Guide: Projector App Development

**Feature**: 001-projector-app
**Date**: 2025-11-04
**Target Audience**: Developers setting up local development environment

---

## Prerequisites

Ensure these tools are installed:

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.x or higher (`npm install -g pnpm`)
- **Firebase CLI**: 12.x or higher (`npm install -g firebase-tools`)
- **Git**: 2.x or higher

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to repository root
cd /path/to/allstars

# Install all workspace dependencies (including projector-app)
pnpm install

# Verify projector-app dependencies
cd apps/projector-app
pnpm list
```

### 2. Configure Environment Variables

Create `.env.development` in `apps/projector-app/`:

```bash
# apps/projector-app/.env.development

# Firebase Configuration (use emulator in development)
VITE_USE_EMULATORS=true
VITE_FIREBASE_PROJECT_ID=allstars-dev
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=demo-storage-bucket

# Socket Server Configuration
VITE_SOCKET_SERVER_URL=http://localhost:3001

# Audio Assets (Firebase Storage emulator or public bucket)
VITE_AUDIO_ASSETS_BUCKET=gs://allstars-dev.appspot.com
```

**DO NOT commit `.env` files to git**. Use `.env.example` for templates.

---

## Running the Development Environment

### Step 1: Start Firebase Emulators

From repository root:

```bash
# Start Firestore and Storage emulators
firebase emulators:start --only firestore,storage

# Emulators will start on:
# - Firestore: http://localhost:8080
# - Storage: http://localhost:9199
# - Emulator UI: http://localhost:4000
```

**Keep this terminal open** - emulators must run continuously.

---

### Step 2: Start Socket Server (Optional for WebSocket Events)

From repository root, in a new terminal:

```bash
cd apps/socket-server
pnpm dev

# Socket server starts on http://localhost:3001
```

**Note**: Projector-app can run without socket-server (degraded mode). WebSocket synchronization features (gong sound, timer sync) will be unavailable but Firestore state updates will work.

---

### Step 3: Start Projector App Development Server

From repository root, in a new terminal:

```bash
cd apps/projector-app
pnpm dev

# Vite dev server starts on http://localhost:5173
# Open in browser: http://localhost:5173
```

**Hot Module Replacement (HMR)** is enabled - changes to source files auto-reload.

---

## Seeding Test Data

### Populate Firestore with Initial Game State

Use Firebase Emulator UI or REST API to create test data:

**Option 1: Emulator UI (Recommended)**

1. Open http://localhost:4000
2. Navigate to Firestore
3. Create collection `gameState` → document `live`
4. Add fields:

```json
{
  "id": "live",
  "currentPhase": "ready_for_next",
  "currentQuestion": null,
  "isGongActive": false,
  "results": null,
  "prizeCarryover": 0,
  "lastUpdate": { "_seconds": 1699113600, "_nanoseconds": 0 }
}
```

**Option 2: REST API**

```bash
curl -X POST http://localhost:8080/v1/projects/allstars-dev/databases/(default)/documents/gameState \
  -H 'Content-Type: application/json' \
  -d '{
    "fields": {
      "id": {"stringValue": "live"},
      "currentPhase": {"stringValue": "ready_for_next"},
      "currentQuestion": {"nullValue": null},
      "isGongActive": {"booleanValue": false},
      "results": {"nullValue": null},
      "prizeCarryover": {"integerValue": "0"},
      "lastUpdate": {"timestampValue": "2023-11-04T14:00:00Z"}
    },
    "name": "projects/allstars-dev/databases/(default)/documents/gameState/live"
  }'
```

---

### Upload Audio Assets to Firebase Storage

**Option 1: Firebase Storage Emulator (Development)**

```bash
# Create audio assets directory in emulator storage
mkdir -p /tmp/firebase-storage-emulator/audio

# Copy audio files (replace with actual audio files)
cp path/to/bgm-idle.mp3 /tmp/firebase-storage-emulator/audio/
cp path/to/bgm-question.mp3 /tmp/firebase-storage-emulator/audio/
cp path/to/sfx-gong.mp3 /tmp/firebase-storage-emulator/audio/

# Access files at:
# http://localhost:9199/v0/b/allstars-dev.appspot.com/o/audio%2Fbgm-idle.mp3
```

**Option 2: Production Firebase Storage (for testing with real bucket)**

```bash
# Authenticate with Firebase
firebase login

# Upload audio files to production bucket
firebase storage:upload:file path/to/bgm-idle.mp3 audio/bgm-idle.mp3
firebase storage:upload:file path/to/sfx-gong.mp3 audio/sfx-gong.mp3

# Make files publicly readable
firebase storage:rules:set - <<EOF
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio/{fileName} {
      allow read: if true;  // Public read access
      allow write: if false;  // No public writes
    }
  }
}
EOF
```

---

## Testing Game State Transitions

### Manually Trigger Phase Transitions

Use Firebase Emulator UI to simulate host actions:

1. Open http://localhost:4000 → Firestore → `gameState/live`
2. Edit document fields to trigger phase transitions

**Example: Start a Question**

Change fields:
```json
{
  "currentPhase": "accepting_answers",
  "currentQuestion": {
    "questionId": "q1",
    "questionText": "What is 2 + 2?",
    "choices": ["2", "3", "4", "5"],
    "correctAnswer": "4",
    "period": "first",
    "questionNumber": 1,
    "deadline": { "_seconds": 1699114200, "_nanoseconds": 0 },
    "type": "multiple_choice",
    "skipAttributes": []
  }
}
```

Projector-app should immediately display the question screen with countdown timer.

**Example: Show Results**

Change fields:
```json
{
  "currentPhase": "showing_results",
  "results": {
    "top10": [
      { "guestId": "g1", "guestName": "Alice", "responseTimeMs": 1234 },
      { "guestId": "g2", "guestName": "Bob", "responseTimeMs": 2345 }
    ],
    "worst10": [
      { "guestId": "g3", "guestName": "Charlie", "responseTimeMs": 5678 }
    ]
  }
}
```

Projector-app should display the rankings screen.

---

### Simulate Answer Submissions (Answer Count)

Create answer documents in `questions/{questionId}/answers` collection:

1. Open Firestore UI → Create collection `questions` → document `q1` → subcollection `answers`
2. Add multiple answer documents:

```json
// Answer 1
{
  "answerId": "a1",
  "guestId": "g1",
  "questionId": "q1",
  "selectedAnswer": "4",
  "responseTimeMs": 1234,
  "isCorrect": true,
  "submittedAt": { "_seconds": 1699114100, "_nanoseconds": 0 }
}

// Answer 2
{
  "answerId": "a2",
  "guestId": "g2",
  "questionId": "q1",
  "selectedAnswer": "3",
  "responseTimeMs": 2345,
  "isCorrect": false,
  "submittedAt": { "_seconds": 1699114101, "_nanoseconds": 0 }
}
```

Projector-app should display incrementing answer count in real-time.

---

### Simulate WebSocket Events (Gong Trigger)

Use browser console on projector-app page:

```javascript
// Access socket instance (must be exposed globally for testing)
// Add to src/hooks/useWebSocket.ts: window.__socket = socket;

// Simulate TRIGGER_GONG event
window.__socket.emit('TRIGGER_GONG', {
  timestamp: new Date().toISOString()
});

// Verify gong sound plays immediately
```

---

## Development Workflow

### 1. Make Code Changes

Edit files in `apps/projector-app/src/`:

```bash
# Example: Update phase component
vim apps/projector-app/src/components/phases/AcceptingAnswersPhase.tsx

# Vite HMR will automatically reload the component in browser
```

### 2. Run Unit Tests

```bash
cd apps/projector-app
pnpm test

# Or run in watch mode
pnpm test:watch

# Or run specific test file
pnpm test src/hooks/useGameState.test.ts
```

### 3. Run Integration Tests

```bash
cd apps/projector-app
pnpm test:integration

# Tests will use Firebase emulators automatically
```

### 4. Run E2E Tests

```bash
cd apps/projector-app

# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run in UI mode for debugging
pnpm exec playwright test --ui
```

### 5. Lint and Format

```bash
cd apps/projector-app

# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format with Prettier
pnpm format
```

---

## Troubleshooting

### Issue: Vite Dev Server Won't Start

**Symptoms**: Port 5173 already in use

**Solution**:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.ts
export default defineConfig({
  server: { port: 5174 }
});
```

---

### Issue: Firestore Emulator Connection Refused

**Symptoms**: `Error: connect ECONNREFUSED 127.0.0.1:8080`

**Solution**:
1. Ensure emulator is running: `firebase emulators:start`
2. Check `.env.development` has `VITE_USE_EMULATORS=true`
3. Verify firestore is enabled in `firebase.json`:

```json
{
  "emulators": {
    "firestore": {
      "port": 8080
    }
  }
}
```

---

### Issue: Audio Files Not Loading

**Symptoms**: Console error "Failed to load audio asset"

**Solution**:
1. Verify audio files are uploaded to Firebase Storage
2. Check CORS configuration allows `localhost:5173`
3. Verify public read access is enabled:

```bash
# Set Storage CORS
gsutil cors set cors.json gs://allstars-dev.appspot.com

# cors.json:
[
  {
    "origin": ["http://localhost:5173"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

---

### Issue: WebSocket Not Connecting

**Symptoms**: `ConnectionStatus` shows WebSocket disconnected

**Solution**:
1. Ensure socket-server is running: `cd apps/socket-server && pnpm dev`
2. Verify `VITE_SOCKET_SERVER_URL=http://localhost:3001` in `.env.development`
3. Check socket-server CORS allows `localhost:5173`

---

### Issue: Tests Failing with Firebase SDK Errors

**Symptoms**: `Error: Firebase app not initialized`

**Solution**:
1. Ensure emulator is running before tests
2. Use `@firebase/rules-unit-testing` for test setup
3. Clear emulator data between test runs:

```bash
firebase emulators:exec "pnpm test" --project allstars-dev
```

---

## Production Build

### Build for Production

```bash
cd apps/projector-app
pnpm build

# Output: dist/ directory with optimized bundle
# Typical bundle size: ~300-500 KB (gzipped)
```

### Preview Production Build

```bash
pnpm preview

# Opens production build on http://localhost:4173
# Test with production-like environment before deployment
```

### Deploy to Hosting

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting:projector-app

# Or deploy to custom hosting (Netlify, Vercel, etc.)
# Upload contents of dist/ directory
```

---

## Common Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type-check without building
pnpm typecheck

# Build for production
pnpm build

# Preview production build
pnpm preview
```

---

## Recommended VS Code Extensions

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Vite** (`antfu.vite`)
- **Firebase** (`toba.vsfire`)
- **Vitest** (`ZixuanChen.vitest-explorer`)

Configure VS Code settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Next Steps

1. ✅ Environment configured and dev server running
2. ✅ Test data seeded in Firestore
3. ✅ Audio assets uploaded to Storage
4. **Start implementing P1 user stories** (Display Game State Transitions)
5. Follow TDD discipline: Write tests → Implement → Refactor
6. Run `/speckit.tasks` to generate detailed task breakdown

---

**For Questions or Issues**: Check `apps/projector-app/README.md` or consult the team.

**Happy Coding!** 🚀
