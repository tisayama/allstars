# allstars Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-02

## Active Technologies
- TypeScript 5.3 with Node.js >=18.0.0 + Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation) (002-api-server-refinement)
- Firebase Firestore (NoSQL cloud database) (002-api-server-refinement)
- TypeScript 5.3+ with Node.js >=18.0.0 (Firebase Cloud Functions 2nd gen runtime) + Socket.io 4.x, Firebase Admin SDK 11.x, Express 4.x (for health checks) (003-socket-server)
- Firebase Firestore (read-only listener on `gameState/live` document) (003-socket-server)
- TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime) + React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics), Socket.io Client 4.8, Tailwind CSS 3.4 (005-participant-app)
- Browser localStorage (session persistence), Firestore (guest status monitoring, read-only) (005-participant-app)
- TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime) + React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics or Sentry), React Router 6.x (006-host-app)
- Browser localStorage (session persistence), Firestore (game state monitoring, read-only) (006-host-app)
- TypeScript 5.3.2 with Node.js >=18.0.0 + Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation), p-retry 6.1 (retry logic) (007-ranking-display-logic)
- TypeScript 5.3+ / Node.js 18+ + Playwright Test (latest), Firebase Emulators (firestore, auth), Firebase Admin SDK 11.x (008-e2e-playwright-tests)
- Firebase Firestore Emulator (localhost:8080), no persistent storage required (008-e2e-playwright-tests)
- TypeScript 5.3+ with React 18.2+ + React 18.2, Vite 5.0, Firebase SDK 10.x (Firestore + Storage), socket.io-client 4.x, Web Audio API (001-projector-app)
- Firebase Firestore (read-only listeners), Firebase Storage (audio asset hosting) (001-projector-app)
- TypeScript 5.3+ / Node.js 18+ (Vite development servers) + Vite 5.0, Concurrently 9.2, PNPM workspaces (001-dev-server-config)
- N/A (configuration-only changes) (001-dev-server-config)
- TypeScript 5.3+ with Node.js >=18.0.0 (existing monorepo standard) + Firebase Admin SDK 13.5.0 (already in devDependencies), tsx (for TypeScript execution), @allstars/types (workspace package) (002-firestore-init)
- Firestore Emulator (localhost:8080, project: stg-wedding-allstars) (002-firestore-init)
- TypeScript 5.3+ with React 18.2+ (browser runtime ES2020+) + React 18.2, Vite 5.0, Firebase SDK 10.x (Firestore), socket.io-client 4.x, Web Audio API (001-tv-style-rankings)
- Firebase Firestore (read-only listeners for gameState), Browser localStorage (not applicable for this feature) (001-tv-style-rankings)
- TypeScript 5.3+ / Node.js 18+ (test execution environment) + Playwright Test 1.56.1+ (E2E framework), Firebase Admin SDK 13.5.0 (emulator management), Firebase Emulators (001-system-e2e-tests)
- Firebase Firestore Emulator (localhost:8080, project: stg-wedding-allstars) - clean state per test run (001-system-e2e-tests)
- TypeScript 5.3+ with Node.js >=18.0.0 (api-server, socket-server) and ES2020+ browser runtime (projector-app) (001-projector-auth)

- TypeScript 5.x / Node.js 18+ (Firebase Cloud Functions 2nd gen runtime) + Express.js 4.x, Firebase Admin SDK 11.x, firebase-functions 4.x (001-api-server)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / Node.js 18+ (Firebase Cloud Functions 2nd gen runtime): Follow standard conventions

## Recent Changes
- 001-projector-auth: Added Firebase custom token authentication for projector-app with automatic token refresh, exponential backoff reconnection, and API key-based token generation
- 001-projector-auth: Added environment variable security validation, token rotation procedures, and audit logging for authentication events
- 001-system-e2e-tests: Added TypeScript 5.3+ / Node.js 18+ (test execution environment) + Playwright Test 1.56.1+ (E2E framework), Firebase Admin SDK 13.5.0 (emulator management), Firebase Emulators


<!-- MANUAL ADDITIONS START -->
## Projector Authentication Patterns (001-projector-auth)

### Token Refresh for Long-Running Sessions
Projector apps require 8+ hour unattended operation. Implement automatic token refresh:
- **Refresh Timing**: Refresh 5 minutes before token expiration (for 1-hour tokens)
- **Short-Lived Tokens**: For tokens <10 min lifetime, refresh at 80% of lifetime
- **Automatic Scheduling**: Use `setTimeout` to schedule refresh, re-schedule after each refresh
- **Manual Refresh**: Expose `refreshToken()` method for testing/debugging
- **Example**: `useProjectorAuth` hook in `apps/projector-app/src/hooks/useProjectorAuth.ts:75-121`

### Exponential Backoff for WebSocket Reconnection
Configure Socket.IO with exponential backoff to prevent thundering herd:
- **Initial Delay**: 1 second
- **Max Delay**: 60 seconds
- **Attempts**: 10 reconnection attempts
- **Jitter**: ±50% randomization factor to distribute reconnections
- **Example**: `createProjectorSocket()` in `apps/projector-app/src/services/socketService.ts:51-61`

### API Key Security Best Practices
Projector apps use static API keys for server-to-server auth:
- **Environment Variables**: Store as `VITE_PROJECTOR_API_KEY` (client-side is acceptable for static keys)
- **Server Validation**: API server validates `X-API-Key` header in `apiKeyAuth` middleware
- **Rotation**: Follow dual-key strategy during rotation (support old+new for 24-48h)
- **Documentation**: See `specs/001-projector-auth/ROTATION.md` for rotation procedures
- **Never Commit**: Add `.env` to `.gitignore`, use `.env.example` for templates

### Token Rotation Procedures
When rotating projector API keys:
- **Generate**: Use `openssl rand -base64 32` for cryptographically secure keys
- **Dual-Key Period**: Support both old and new keys during transition (24-48 hours)
- **Verification**: Monitor audit logs for successful token generation with new key
- **Removal**: Only remove old key after all projector instances updated
- **Rollback**: Keep old key available for quick rollback if issues arise
- **Audit Logging**: Track all token generation/validation in `auditLogger.ts`

### Environment Variable Validation
Prevent accidental exposure of sensitive credentials:
- **Security Checks**: Validate `VITE_*` variables don't contain private keys or service account credentials
- **Patterns to Block**: Firebase private keys, service account JSON, client email addresses
- **Implementation**: `validateEnvironmentSecurity()` in `apps/projector-app/src/utils/envValidator.ts`
- **Runtime Assertion**: Call `assertEnvironmentSecurity()` in `main.tsx` before app starts
- **Example**:
  ```typescript
  // ✅ ALLOWED: Static API key for projector
  VITE_PROJECTOR_API_KEY=abc123xyz789

  // ❌ BLOCKED: Private key should be server-side only
  VITE_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
  ```

## Error Handling Patterns

### Retry Logic for Transient Failures (007-ranking-display-logic)
Use `withRetry()` wrapper from `src/utils/retry.ts` for Firestore operations that may fail transiently:
- Configure with 3 retries, 1-5 second exponential backoff
- Implement graceful degradation with error flags when all retries exhausted
- Log errors with full context (error message, timestamp, stack trace)
- Example: `calculateRankingsWithRetry()` in `src/services/gameStateService.ts:26-63`

### Type Extensions (007-ranking-display-logic)
When extending `GameResults` type from `@allstars/types`:
- Add optional fields for period champions: `periodChampions?: string[]`
- Add optional period field: `period?: GamePeriod`
- Add optional error flags: `rankingError?: boolean`
- Use spread operator with conditional inclusion: `...(field && { field })`

### Firestore Initialization Scripts (002-firestore-init)
When creating scripts that initialize Firestore data:
- **Production Safety**: ALWAYS check `FIRESTORE_EMULATOR_HOST` env var before connecting
  ```typescript
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('✗ FIRESTORE_EMULATOR_HOST not set - refusing to run against production');
    process.exit(1);
  }
  ```
- **Idempotency**: Check document existence before creation to enable safe re-runs
  ```typescript
  const doc = await gameStateRef.get();
  if (doc.exists) {
    console.log('✓ gameState/live already exists, skipping initialization');
    return;
  }
  ```
- **Clear Error Messages**: Provide actionable guidance for common failures (ECONNREFUSED, timeout)
  ```typescript
  console.error('  Hint: Ensure Firestore emulator is running on localhost:8080');
  console.error('  Start with: firebase emulators:start --only firestore');
  ```
- **Status Indicators**: Use ✓ for success, ✗ for errors to improve readability
- **NPM Script**: Expose via package.json with timeout: `"init:dev": "timeout 10 tsx scripts/init-firestore-dev.ts"`
<!-- MANUAL ADDITIONS END -->

## E2E Testing Patterns (008-e2e-playwright-tests)

### Hostname Configuration
**CRITICAL**: All E2E tests MUST use `work-ubuntu` hostname, NOT `localhost`:
- Configure `/etc/hosts`: `127.0.0.1 work-ubuntu`
- Page Object base URLs: `http://work-ubuntu:5173` (participant), `http://work-ubuntu:5174` (host), `http://work-ubuntu:5175` (projector), `http://work-ubuntu:5176` (admin)
- Playwright config baseURL: `http://work-ubuntu`
- CI/CD: Add hostname configuration step in GitHub Actions

### Test Data Isolation
Use collection prefix isolation for all Firestore operations:
- Fixture provides unique `collectionPrefix` per test: `test_{timestamp}_{uuid}_`
- All seeder methods accept `collectionPrefix` parameter
- Prevents data leakage between parallel tests
- Example: `await seeder.seedQuestions([question], collectionPrefix)`

### Page Object Model Pattern
Encapsulate all UI interactions in page objects with `data-testid` selectors:
```typescript
export class ParticipantPage {
  private readonly baseUrl = 'http://work-ubuntu:5173';
  private readonly joinButton = page.locator('[data-testid="join-button"]');

  async joinAsParticipant(name: string): Promise<void> {
    await this.enterName(name);
    await this.clickJoin();
    await this.waitForWaitingScreen();
  }
}
```

### Performance Validation
Validate state propagation and execution time:
```typescript
const actionTime = Date.now();
await seeder.seedGameState({ currentPhase: 'showing_question' }, collectionPrefix);
const propagationTime = Date.now() - actionTime;
expect(propagationTime).toBeLessThan(500); // <500ms requirement
```

### Test Structure for Unimplemented Apps
Use TODO comments with placeholder assertions:
```typescript
// TODO: Once participant-app UI is implemented, uncomment:
// await participantPage.selectAnswer('A');
// await expect(participantPage.hasSubmissionConfirmation()).resolves.toBe(true);

// For now, verify data exists
expect(question.correctAnswer).toBe('A');
```

### Multi-Context Testing
Test real-time synchronization across multiple apps:
```typescript
const participantContext = await browser.newContext();
const projectorContext = await browser.newContext();
const participantPage = await participantContext.newPage();
const projectorPage = await projectorContext.newPage();

// Verify state propagates to all contexts within 500ms
```

### Edge Case Testing
Always test:
- Special characters and emoji in user input (names, questions)
- XSS prevention (HTML escaping)
- Network disconnection handling
- Concurrent operations (simultaneous submissions)
- All participants answering incorrectly
- Premature actions (revealing answer before timer expires)
