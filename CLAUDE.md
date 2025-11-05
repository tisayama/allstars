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
- 001-projector-app: Added TypeScript 5.3+ with React 18.2+ + React 18.2, Vite 5.0, Firebase SDK 10.x (Firestore + Storage), socket.io-client 4.x, Web Audio API
- 008-e2e-playwright-tests: Added TypeScript 5.3+ / Node.js 18+ + Playwright Test (latest), Firebase Emulators (firestore, auth), Firebase Admin SDK 11.x
- 007-ranking-display-logic: Added TypeScript 5.3.2 with Node.js >=18.0.0 + Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation), p-retry 6.1 (retry logic)


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
