# allstars Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-02

## Active Technologies
- TypeScript 5.3 with Node.js >=18.0.0 + Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation) (002-api-server-refinement)
- Firebase Firestore (NoSQL cloud database) (002-api-server-refinement)
- TypeScript 5.3+ with Node.js >=18.0.0 (Firebase Cloud Functions 2nd gen runtime) + Socket.io 4.x, Firebase Admin SDK 11.x, Express 4.x (for health checks) (003-socket-server)
- Firebase Firestore (read-only listener on `gameState/live` document) (003-socket-server)

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
- 004-admin-app: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 003-socket-server: Added TypeScript 5.3+ with Node.js >=18.0.0 (Firebase Cloud Functions 2nd gen runtime) + Socket.io 4.x, Firebase Admin SDK 11.x, Express 4.x (for health checks)
- 002-api-server-refinement: Added TypeScript 5.3 with Node.js >=18.0.0 + Express 4.18, Firebase Admin SDK 11.11, Firebase Functions 4.5, Zod 3.22 (validation)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
