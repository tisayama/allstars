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
- 006-host-app: Added TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime) + React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics or Sentry), React Router 6.x
- 005-participant-app: Added TypeScript 5.3+ / Node.js 18+ (development), ES2020+ (browser runtime) + React 18.2, Vite 5.0, Firebase SDK 10.7+ (Auth, Firestore, Crashlytics), Socket.io Client 4.8, Tailwind CSS 3.4
- 004-admin-app: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
