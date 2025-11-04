# Quickstart Guide: Host Control App

**Feature**: 006-host-app | **Last Updated**: 2025-11-03

This guide helps developers set up the host-app for local development, including Firebase emulator configuration, dependency installation, and testing workflows.

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher ([download](https://nodejs.org/))
- **pnpm**: Package manager (install: `npm install -g pnpm`)
- **Firebase CLI**: For running emulators (install: `npm install -g firebase-tools`)
- **Git**: For cloning the repository
- **Tablet** (optional): iPad (iOS 14+) or Android tablet (Chrome 90+) for real-device testing
  - Alternative: Use browser dev tools with tablet emulation (1024x768 viewport)

### Verify Installations

```bash
node --version   # Should show v18.x.x or higher
pnpm --version   # Should show 8.x.x or higher
firebase --version  # Should show 12.x.x or higher
```

---

## Repository Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/tisayama/allstars.git
cd allstars

# Install all workspace dependencies (from repo root)
pnpm install

# This installs dependencies for:
# - All apps (participant-app, api-server, socket-server, admin-app, host-app)
# - All packages (types, ui-components, openapi)
```

### 2. Firebase Project Setup

The AllStars platform uses Firebase for authentication, Firestore database, and cloud functions.

#### Option A: Use Firebase Emulators (Recommended for Local Development)

Firebase emulators run locally without requiring a real Firebase project.

```bash
# From repository root
firebase emulators:start

# Expected output:
# ✔  Emulators started successfully
# ┌────────────────┬────────────────┬────────────────────┐
# │ Emulator       │ Host:Port      │ View in Emulator UI│
# ├────────────────┼────────────────┼────────────────────┤
# │ Authentication │ 127.0.0.1:9099 │ http://localhost:4000/auth │
# │ Functions      │ 127.0.0.1:5001 │ http://localhost:4000/functions │
# │ Firestore      │ 127.0.0.1:8080 │ http://localhost:4000/firestore │
# └────────────────┴────────────────┴────────────────────┘
```

Keep this terminal window open (emulators must run while developing).

#### Option B: Use Real Firebase Project (Production-like)

If you have access to the AllStars Firebase project:

```bash
# Login to Firebase
firebase login

# Set the active project
firebase use allstars-dev  # or allstars-prod
```

---

## Host-App Development

### 3. Configure Environment Variables

```bash
# Navigate to host-app directory
cd apps/host-app

# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your preferred editor
nano .env.local  # or vim, code, etc.
```

#### Environment File Contents

**For Firebase Emulators** (`.env.local`):

```env
# Firebase Project Config (Emulator)
VITE_FIREBASE_API_KEY=fake-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=allstars-emulator
VITE_FIREBASE_STORAGE_BUCKET=allstars-emulator.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Emulator Settings
VITE_USE_EMULATOR=true
VITE_EMULATOR_AUTH_URL=http://127.0.0.1:9099
VITE_EMULATOR_FIRESTORE_HOST=127.0.0.1
VITE_EMULATOR_FIRESTORE_PORT=8080
VITE_EMULATOR_FUNCTIONS_HOST=127.0.0.1
VITE_EMULATOR_FUNCTIONS_PORT=5001

# API Server Base URL (points to emulated Functions)
VITE_API_BASE_URL=http://127.0.0.1:5001/allstars-emulator/us-central1

# Error Monitoring (optional for local dev)
VITE_SENTRY_DSN=  # Leave empty for local development
```

**For Real Firebase Project** (`.env.local`):

```env
# Firebase Project Config (Production/Staging)
VITE_FIREBASE_API_KEY=AIzaSy...  # Get from Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=allstars-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=allstars-dev
VITE_FIREBASE_STORAGE_BUCKET=allstars-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Emulator Settings (disabled)
VITE_USE_EMULATOR=false

# API Server Base URL (points to deployed Functions)
VITE_API_BASE_URL=https://us-central1-allstars-dev.cloudfunctions.net

# Error Monitoring (Sentry)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 4. Start Development Server

```bash
# From /apps/host-app/
pnpm dev

# Expected output:
# VITE v5.0.x ready in 342 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
# ➜  press h to show help
```

Open `http://localhost:5173/` in your browser (or tablet browser if on the same network).

---

## Register Test Host User

To log into the host-app, you need a test Google user registered in Firebase Auth.

### Using Firebase Emulator

1. Open Firebase Emulator UI: `http://localhost:4000/auth`
2. Click **"Add User"**
3. Fill in user details:
   - **Email**: `host@test.com` (or any email)
   - **Password**: `test123` (any password - not used for Google sign-in)
   - **Provider**: Leave as default (Email/Password for manual creation)
4. Click **"Save"**
5. In host-app login screen, click **"Sign in with Google"**
6. Emulator will show a list of test users - select `host@test.com`

### Using Real Firebase Project

1. Go to Firebase Console → Authentication → Users
2. Manually add a test user with Google provider
3. Ensure your Google account email is authorized in Firestore security rules or api-server validation logic
4. Sign in to host-app with your real Google account

---

## Testing

The host-app has comprehensive test coverage using Vitest (unit/integration) and Playwright (E2E).

### Run All Tests

```bash
# From /apps/host-app/
pnpm test

# Expected output:
# ✓ tests/unit/hooks/useAuth.test.ts (8 tests)
# ✓ tests/unit/hooks/useGameState.test.ts (12 tests)
# ✓ tests/unit/lib/api-client.test.ts (6 tests)
# ✓ tests/integration/firebase-auth.test.ts (5 tests)
# ✓ tests/integration/firestore-listener.test.ts (7 tests)
# Test Files  5 passed (5)
# Tests  38 passed (38)
# Duration  2.34s
```

### Run Unit Tests Only

```bash
pnpm test:unit

# Faster execution (no emulator required if mocks are used)
```

### Run Integration Tests

```bash
# Requires Firebase emulators to be running
pnpm test:integration
```

### Run E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI (interactive mode)
pnpm test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/login-flow.spec.ts
```

### Test Coverage

```bash
pnpm test:coverage

# Generates coverage report in /coverage/ directory
# Open coverage/index.html in browser to view detailed report
```

---

## Linting and Formatting

### Run ESLint

```bash
# Check for linting errors
pnpm lint

# Auto-fix linting errors
pnpm lint:fix
```

### Run Prettier

```bash
# Check formatting
pnpm format:check

# Auto-format all files
pnpm format
```

### Pre-commit Hook

The project uses Husky for pre-commit hooks that automatically run linting and formatting checks.

```bash
# Install pre-commit hooks (run once after cloning)
pnpm prepare

# Now, every git commit will:
# 1. Run ESLint on staged files
# 2. Run Prettier on staged files
# 3. Block commit if linting/formatting fails
```

---

## Build for Production

```bash
# From /apps/host-app/
pnpm build

# Expected output:
# vite v5.0.x building for production...
# ✓ 125 modules transformed.
# dist/index.html                  0.45 kB │ gzip:  0.30 kB
# dist/assets/index-abc123.css    12.34 kB │ gzip:  4.56 kB
# dist/assets/index-def456.js    145.67 kB │ gzip: 52.34 kB
# ✓ built in 3.21s
```

Built files are output to `/apps/host-app/dist/` and ready for deployment.

### Preview Production Build

```bash
pnpm preview

# Serves production build at http://localhost:4173/
```

---

## Tablet Testing

### Using Browser Dev Tools

1. Open host-app in Chrome/Safari
2. Open DevTools (F12)
3. Click "Toggle Device Toolbar" (Ctrl+Shift+M / Cmd+Shift+M)
4. Select device:
   - **iPad Pro 11"**: 834 × 1194 (portrait) or 1194 × 834 (landscape)
   - **iPad Air**: 820 × 1180 (portrait) or 1180 × 820 (landscape)
5. Test touch interactions by clicking (simulates taps)

### Using Real Tablet

1. Ensure tablet and development machine are on same network
2. Find your machine's local IP:
   ```bash
   # macOS/Linux
   ifconfig | grep inet
   # Windows
   ipconfig | findstr IPv4
   ```
3. On tablet, open browser and navigate to `http://<your-ip>:5173/`
   - Example: `http://192.168.1.100:5173/`
4. Allow Vite to expose network access:
   ```bash
   pnpm dev --host
   ```

### Testing Concurrent Host Sessions

1. Open host-app in two browser windows (or two devices)
2. Sign in with the same or different test users
3. Tap action button in one window
4. Verify the other window updates automatically within 1 second
5. Test rapid button tapping in both windows simultaneously
6. Verify only one action succeeds, both windows converge to same state

---

## Troubleshooting

### Issue: Firebase Emulators Won't Start

**Symptoms**: `firebase emulators:start` fails with port conflicts

**Solution**:
```bash
# Check which process is using port 5001 (Functions) or 8080 (Firestore)
lsof -i :5001
lsof -i :8080

# Kill the conflicting process
kill -9 <PID>

# Or change emulator ports in firebase.json
```

### Issue: Vite Dev Server Won't Start

**Symptoms**: `pnpm dev` fails with "Port 5173 already in use"

**Solution**:
```bash
# Use a different port
pnpm dev --port 3000

# Or kill the process using port 5173
lsof -i :5173
kill -9 <PID>
```

### Issue: Authentication Fails in Emulator

**Symptoms**: "Unauthorized: Invalid Firebase ID token" error

**Solution**:
1. Verify emulators are running: `http://localhost:4000/`
2. Check `.env.local` has correct emulator URLs
3. Clear browser cache and localStorage
4. Re-register test user in Emulator Auth UI
5. Check Firebase SDK is initialized with emulator config:
   ```typescript
   // In src/lib/firebase.ts
   if (import.meta.env.VITE_USE_EMULATOR === 'true') {
     connectAuthEmulator(auth, 'http://127.0.0.1:9099');
     connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
   }
   ```

### Issue: Tests Fail with Timeout

**Symptoms**: Vitest tests timeout or hang

**Solution**:
```bash
# Increase test timeout in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000,  // 10 seconds (default is 5s)
  }
});

# For specific slow tests, use test.only with longer timeout
test('slow test', { timeout: 20000 }, async () => {
  // test code
});
```

### Issue: Firestore Listener Not Updating

**Symptoms**: UI doesn't update when gameState changes

**Solution**:
1. Check browser console for Firestore connection errors
2. Verify Firestore security rules allow reading `gameState/live`
3. Check useGameState() hook is properly mounted and not unmounted early
4. Test Firestore directly in Emulator UI: `http://localhost:4000/firestore`
5. Verify onSnapshot() listener is not being unsubscribed prematurely:
   ```typescript
   useEffect(() => {
     const unsubscribe = onSnapshot(docRef, (snapshot) => {
       // update logic
     });
     return () => unsubscribe();  // Cleanup on unmount
   }, []);  // Empty deps - only run once
   ```

### Issue: API Requests Timeout

**Symptoms**: POST /host/game/advance always times out after 10 seconds

**Solution**:
1. Verify api-server is deployed or running in emulator
2. Check `VITE_API_BASE_URL` in `.env.local` matches emulator or deployed URL
3. Test API directly with curl:
   ```bash
   curl -X POST http://127.0.0.1:5001/allstars-emulator/us-central1/host/game/advance \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"action": "ready_for_next"}'
   ```
4. Check Firebase Functions logs:
   ```bash
   firebase emulators:start --inspect-functions
   # Opens Chrome DevTools for debugging Functions
   ```

---

## Common Development Workflows

### Workflow 1: Implementing a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/new-host-button

# 2. Write failing tests first (TDD)
# Edit: tests/unit/components/control/NewButton.test.tsx

# 3. Run tests (should fail - RED state)
pnpm test tests/unit/components/control/NewButton.test.tsx

# 4. Implement component (minimal code to pass tests)
# Edit: src/components/control/NewButton.tsx

# 5. Run tests (should pass - GREEN state)
pnpm test tests/unit/components/control/NewButton.test.tsx

# 6. Refactor (improve code quality while keeping tests green)
# Edit: src/components/control/NewButton.tsx

# 7. Lint and format
pnpm lint
pnpm format

# 8. Commit
git add .
git commit -m "feat(host-app): add new host control button"
```

### Workflow 2: Debugging a UI Issue

```bash
# 1. Start dev server with source maps
pnpm dev

# 2. Open browser DevTools (F12)
# 3. Reproduce the issue
# 4. Check console for errors
# 5. Use React DevTools to inspect component state
# 6. Set breakpoints in source code (not minified)
# 7. Step through code execution

# 8. Write a test that reproduces the bug
# Edit: tests/unit/...

# 9. Fix the bug (TDD approach)
# 10. Verify test passes
pnpm test
```

### Workflow 3: Testing API Integration

```bash
# 1. Start Firebase emulators
firebase emulators:start

# 2. In another terminal, seed test data
# Use Firestore Emulator UI or script:
node scripts/seed-test-data.js

# 3. Start host-app
cd apps/host-app
pnpm dev

# 4. Manually test API calls in browser
# 5. Check Functions logs in emulator UI
# 6. Write integration test based on manual test
# Edit: tests/integration/api-integration.test.ts

# 7. Run integration test with emulators
pnpm test:integration
```

---

## Next Steps

After setting up the development environment:

1. **Explore the Codebase**:
   - Read `src/App.tsx` to understand routing
   - Review `src/hooks/useGameState.ts` to see Firestore listener pattern
   - Check `src/lib/api-client.ts` for API call implementation

2. **Run Example Tests**:
   - `pnpm test tests/unit/hooks/useAuth.test.ts`
   - Study how Firebase Auth is mocked

3. **Make a Test Change**:
   - Edit button label in `src/components/control/BigButton.tsx`
   - See hot-reload in action
   - Verify lint and format pre-commit hooks work

4. **Review Related Documentation**:
   - [Feature Specification](./spec.md)
   - [Data Model](./data-model.md)
   - [API Contract](./contracts/host-api.yaml)
   - [Research Decisions](./research.md)

---

## Additional Resources

- **Firebase Emulators**: https://firebase.google.com/docs/emulator-suite
- **Vite Documentation**: https://vitejs.dev/
- **React Testing Library**: https://testing-library.com/react
- **Playwright**: https://playwright.dev/
- **Vitest**: https://vitest.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Document Status**: ✅ Complete
**Maintained By**: AllStars Development Team
**Last Updated**: 2025-11-03
