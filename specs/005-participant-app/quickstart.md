# Quickstart: Participant App Local Development

**Feature**: 005-participant-app
**Date**: 2025-11-03
**Status**: Complete

## Overview

This guide helps developers set up the Participant App for local development using Firebase Emulators and the existing api-server and socket-server.

## Prerequisites

Before starting, ensure you have:

1. **Node.js 18+** and **pnpm** installed
2. **Firebase CLI** installed (`npm install -g firebase-tools`)
3. **Monorepo setup** completed (run `pnpm install` from repository root)
4. **Firebase Emulators** running (api-server, socket-server dependencies)
5. **Admin app** data (guests and questions) created for testing

## Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd apps/participant-app
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with emulator settings:

```env
# Firebase Configuration (Emulator)
VITE_FIREBASE_API_KEY=fake-api-key
VITE_FIREBASE_PROJECT_ID=allstars-dev
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=allstars-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789

# API Configuration (Emulator)
VITE_API_BASE_URL=http://localhost:5001/allstars-dev/us-central1
VITE_SOCKET_SERVER_URL=http://localhost:8080

# Feature Flags
VITE_USE_EMULATORS=true

# Participant App URL (for QR code generation in admin-app)
VITE_PARTICIPANT_APP_URL=http://localhost:5173
```

### 3. Start Firebase Emulators

From repository root:

```bash
firebase emulators:start
```

Emulators should be running at:
- **Authentication**: http://localhost:9099
- **Firestore**: http://localhost:8080
- **Functions (api-server)**: http://localhost:5001
- **Emulator UI**: http://localhost:4000

### 4. Start Development Server

```bash
pnpm dev
```

App runs at: **http://localhost:5173**

### 5. Create Test Data (One-Time Setup)

Open admin-app at **http://localhost:5174** (or configured port):

1. **Login** with Google (emulator auto-approves)
2. **Create Guests**:
   - Navigate to Guests page
   - Add a test guest: "Test Guest", Table 1
   - Note the generated QR code
3. **Create Questions**:
   - Navigate to Quizzes page
   - Add test questions for first-half period

### 6. Test Participant Flow

1. Open participant-app at **http://localhost:5173**
2. Click "Scan QR Code" (or use manual token entry)
3. For emulator testing, extract token from admin-app QR code URL:
   - Format: `http://localhost:5173/join?token={TOKEN}`
   - Enter token manually if camera not available

## Development Workflow

### Running Tests

```bash
# Unit tests
pnpm test

# Component tests
pnpm test:component

# E2E tests (requires Playwright)
pnpm test:e2e

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Linting and Formatting

```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Format with Prettier
pnpm format
```

### Build for Production

```bash
# Build optimized bundle
pnpm build

# Preview production build
pnpm preview
```

## Testing Scenarios

### Scenario 1: Happy Path (Full Quiz Flow)

1. **Register Guest**:
   - Scan QR code or enter token
   - Verify: Welcome screen shows guest name
2. **Clock Sync**:
   - Observe: "Synchronizing..." message
   - Verify: Transitions to waiting screen
3. **Answer Question** (requires host-app to start game):
   - Wait for question to appear
   - Tap an answer
   - Verify: Button locks, vibration feedback (if supported)
4. **View Results**:
   - Wait for reveal phase
   - Verify: Correct/incorrect visual feedback
   - Verify: Success/failure vibration pattern

### Scenario 2: Network Disconnection

1. Start answering a question
2. Open browser DevTools → Network tab
3. Set throttling to "Offline"
4. Submit answer
5. Verify: Answer queued locally
6. Set throttling back to "Online"
7. Verify: Answer auto-submits with retry

### Scenario 3: Drop-Out Monitoring

1. Complete registration and clock sync
2. Manually update Firestore guest document:
   ```javascript
   // In Emulator UI → Firestore
   // Update document: guests/{guestId}
   {
     "status": "dropped",
     "rank": 10,
     "totalPoints": 500,
     "correctAnswers": 5
   }
   ```
3. Verify: Drop-out overlay appears with stats
4. Verify: Cannot submit new answers

### Scenario 4: Session Persistence

1. Complete registration
2. Refresh browser (F5)
3. Verify: Auto-restores session, skips QR scan
4. Manually delete localStorage key `allstars_guest_session`
5. Refresh browser
6. Verify: Redirects to QR scan page

## Debugging Tips

### Enable Verbose Logging

Add to `.env.local`:

```env
VITE_LOG_LEVEL=debug
```

### Inspect WebSocket Events

Open browser DevTools → Console:

```javascript
// Enable Socket.io debug logs
localStorage.debug = 'socket.io-client:*';
```

Refresh page to see detailed WebSocket event logs.

### Inspect Firestore Listener

Add console logs in `useGuestStatus.ts`:

```typescript
onSnapshot(doc(firestore, 'guests', guestId), (snapshot) => {
  console.log('[Firestore] Guest status update:', snapshot.data());
  // ... existing logic
});
```

### Mock Clock Offset

For testing timing calculations without server:

```typescript
// In useClockSync.ts
const MOCK_CLOCK_OFFSET = -42; // Server is 42ms behind client
```

### Disable Vibration for Testing

Add to `.env.local`:

```env
VITE_DISABLE_VIBRATION=true
```

## Common Issues

### Issue: QR Code Scanner Not Working

**Symptoms**: Camera permission denied or black screen

**Solutions**:
1. **HTTPS Required**: Modern browsers require HTTPS for camera access. Use `ngrok` or similar for testing on mobile devices:
   ```bash
   ngrok http 5173
   ```
2. **Manual Token Entry**: Add fallback UI for entering token manually (recommended for development)
3. **File Upload**: html5-qrcode supports file upload as fallback

### Issue: WebSocket Connection Refused

**Symptoms**: Console error "WebSocket connection failed"

**Solutions**:
1. Verify socket-server is running at `http://localhost:8080`
2. Check CORS configuration in socket-server
3. Ensure `VITE_SOCKET_SERVER_URL` matches socket-server port

### Issue: Clock Sync Fails

**Symptoms**: Warning "Clock offset exceeds 500ms"

**Solutions**:
1. Verify api-server is running and responsive
2. Check network latency (emulator should have < 10ms RTT)
3. Restart emulators to reset timestamps

### Issue: Firebase Auth Errors

**Symptoms**: "Firebase: Error (auth/...)"

**Solutions**:
1. Ensure emulators are running (`firebase emulators:start`)
2. Verify `VITE_USE_EMULATORS=true` in `.env.local`
3. Check Firebase config in `src/lib/firebase.ts` connects to emulator

### Issue: Build Fails with "Module not found"

**Symptoms**: Import errors for `@allstars/types`

**Solutions**:
1. Rebuild workspace packages:
   ```bash
   cd ../../packages/types
   pnpm build
   ```
2. Re-install dependencies from root:
   ```bash
   cd ../..
   pnpm install
   ```

## Mobile Device Testing

### Option 1: ngrok (Recommended)

1. Start ngrok tunnel:
   ```bash
   ngrok http 5173
   ```
2. Use ngrok HTTPS URL on mobile device
3. Scan QR code or enter token

### Option 2: Local Network (Same WiFi)

1. Find your local IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   # Windows
   ipconfig
   ```
2. Update Vite config to expose on network:
   ```javascript
   // vite.config.ts
   export default {
     server: {
       host: '0.0.0.0', // Expose to network
       port: 5173
     }
   }
   ```
3. Access from mobile: `http://{YOUR_IP}:5173`

**Note**: Camera access requires HTTPS, so ngrok is recommended.

## Performance Testing

### Measure Load Time (3G Simulation)

1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Verify: Time to Interactive < 3 seconds

### Measure Answer Submission Latency

Add timing logs in `useGameState.ts`:

```typescript
const submitAnswer = async (choiceIndex: number) => {
  const startTime = performance.now();
  await apiClient.post('/participant/answer', payload);
  const latency = performance.now() - startTime;
  console.log(`[Perf] Answer submission latency: ${latency}ms`);
};
```

Target: < 200ms for p90

### Monitor Bundle Size

```bash
pnpm build
```

Check output for bundle sizes. Target:
- Main bundle: < 428KB (gzipped < 117KB)
- Lazy chunks: < 50KB each

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Participant App CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter participant-app lint
      - run: pnpm --filter participant-app test
      - run: pnpm --filter participant-app build
```

## Next Steps

After local development is working:

1. **Run Full Test Suite**: `pnpm test && pnpm test:e2e`
2. **Code Review**: Create PR with test results
3. **Deploy to Staging**: Use Firebase Hosting preview channels
4. **Load Testing**: Test with 200 concurrent guests (use Playwright or k6)

---

**Completed**: 2025-11-03
**Last Updated**: 2025-11-03
