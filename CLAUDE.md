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
- 001-system-e2e-tests: Added TypeScript 5.3+ / Node.js 18+ (test execution environment) + Playwright Test 1.56.1+ (E2E framework), Firebase Admin SDK 13.5.0 (emulator management), Firebase Emulators
- 001-tv-style-rankings: Added TypeScript 5.3+ with React 18.2+ (browser runtime ES2020+) + React 18.2, Vite 5.0, Firebase SDK 10.x (Firestore), socket.io-client 4.x, Web Audio API
- 002-firestore-init: Added TypeScript 5.3+ with Node.js >=18.0.0 (existing monorepo standard) + Firebase Admin SDK 13.5.0 (already in devDependencies), tsx (for TypeScript execution), @allstars/types (workspace package)


<!-- MANUAL ADDITIONS START -->
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
