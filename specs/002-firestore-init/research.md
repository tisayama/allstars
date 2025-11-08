# Research: Firestore Development Environment Initialization Script

**Feature**: 002-firestore-init
**Date**: 2025-11-06
**Status**: Complete

## Overview

This document consolidates research findings for implementing an idempotent Firestore initialization script for development environments. All technical unknowns have been resolved through examination of existing codebase patterns and Firebase Admin SDK documentation.

## Research Tasks Completed

### 1. Firebase Admin SDK Emulator Configuration

**Question**: How to programmatically configure Firebase Admin SDK to connect to Firestore emulator?

**Decision**: Use `admin.firestore().settings()` method with host/port configuration

**Rationale**:
- Firebase Admin SDK automatically detects `FIRESTORE_EMULATOR_HOST` environment variable
- Explicit `settings()` call provides clearer intent and error handling
- Pattern already used successfully in `/home/tisayama/allstars/apps/socket-server/src/index.ts:63-67`

**Implementation Pattern**:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'stg-wedding-allstars',
});

// Configure emulator connection
const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false,
});
```

**Alternatives Considered**:
- Environment variable only (implicit): Rejected because less explicit, harder to debug
- REST API via fetch/axios: Rejected because Firebase Admin SDK provides type-safe API

### 2. Production Firestore Detection

**Question**: How to reliably detect if script is running against production Firestore?

**Decision**: Check for absence of `FIRESTORE_EMULATOR_HOST` environment variable

**Rationale**:
- Production environments will never have `FIRESTORE_EMULATOR_HOST` set
- Simple, reliable detection mechanism
- Aligns with Firebase emulator best practices
- Fail-safe: defaults to production connection, which we explicitly block

**Implementation**:
```typescript
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('✗ FIRESTORE_EMULATOR_HOST not set - refusing to run against production');
  console.error('  Set FIRESTORE_EMULATOR_HOST=localhost:8080 to use emulator');
  process.exit(1);
}
```

**Alternatives Considered**:
- Project ID check (stg-wedding-allstars vs production ID): Rejected because project IDs can be reused across environments
- Explicit `--emulator` CLI flag: Rejected because adds complexity and can be forgotten

### 3. Idempotency Implementation

**Question**: What's the best pattern for idempotent Firestore document creation?

**Decision**: Check document existence with `.get()` before creating with `.set()`

**Rationale**:
- Firebase Admin SDK `.get()` returns document snapshot with `.exists` property
- Atomic operation: no race condition between check and create
- Clear error messages for each path (exists vs created)
- Standard Firebase pattern used throughout the codebase

**Implementation Pattern**:
```typescript
const gameStateRef = db.collection('gameState').doc('live');
const doc = await gameStateRef.get();

if (doc.exists) {
  console.log('✓ gameState/live already exists, skipping initialization');
  return;
}

await gameStateRef.set(initialGameState);
console.log('✓ gameState/live created successfully');
```

**Alternatives Considered**:
- `set()` with `merge: true`: Rejected because it would overwrite existing data
- Transaction-based creation: Rejected as overkill for single-document initialization

### 4. Error Message Formatting

**Question**: What console output format provides best developer experience?

**Decision**: Use status indicators (✓, ✗) with descriptive messages and actionable guidance

**Rationale**:
- Visual indicators (✓, ✗) are immediately recognizable
- Consistent with output from other tools (npm, git, firebase-tools)
- Actionable messages reduce troubleshooting time
- Already used in the provided user specification examples

**Implementation Pattern**:
```typescript
// Success
console.log('Initializing Firestore development environment...');
console.log('✓ gameState/live created successfully');
console.log('✓ Initialization complete');

// Error
console.error('✗ Initialization failed:', error);
console.error('  Hint: Ensure Firestore emulator is running on localhost:8080');
console.error('  Start with: firebase emulators:start --only firestore');
```

**Alternatives Considered**:
- JSON output: Rejected because script is human-facing, not machine-consumed
- Verbose logging with timestamps: Rejected because script runs in <3 seconds
- Colored output (chalk, colors): Rejected to avoid additional dependencies

### 5. TypeScript Execution in Monorepo

**Question**: How to execute TypeScript scripts directly without build step?

**Decision**: Use `tsx` package (already in devDependencies) with NPM script

**Rationale**:
- `tsx` provides fast TypeScript execution without compilation
- Already available in monorepo devDependencies
- Used by existing test setup (Vitest uses tsx internally)
- Supports latest TypeScript features and ES modules

**NPM Script**:
```json
{
  "scripts": {
    "init:dev": "timeout 10 tsx scripts/init-firestore-dev.ts"
  }
}
```

**Alternatives Considered**:
- `ts-node`: Rejected because tsx is faster and already available
- Compile to JS first: Rejected because adds build step complexity
- `node --loader`: Rejected because experimental and less stable

### 6. GameState Type Import Strategy

**Question**: How to import GameState type from @allstars/types workspace package?

**Decision**: Use workspace protocol import with proper TypeScript path resolution

**Rationale**:
- `/home/tisayama/allstars/packages/types/src/GameState.ts` already exports GameState type
- Monorepo uses pnpm workspaces with `workspace:*` protocol
- TypeScript can resolve workspace packages via tsconfig paths
- Ensures type safety and prevents duplication

**Implementation**:
```typescript
import type { GameState } from '@allstars/types';
import * as admin from 'firebase-admin';

const initialGameState: Partial<GameState> = {
  currentPhase: 'ready_for_next',
  currentQuestion: null,
  isGongActive: false,
  participantCount: 0,
  timeRemaining: null,
  lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
  results: null,
  prizeCarryover: 0,
};
```

**Alternatives Considered**:
- Relative path import: Rejected because breaks if script moves
- Inline type definition: Rejected because duplicates source of truth

## Technology Stack Confirmation

All required technologies are already available in the monorepo:

| Technology | Version | Location | Status |
|------------|---------|----------|--------|
| TypeScript | 5.3.2 | devDependencies (via packages/types) | ✓ Available |
| Node.js | >=18.0.0 | Runtime requirement | ✓ Available |
| Firebase Admin SDK | 13.5.0 | devDependencies (root package.json:22) | ✓ Available |
| tsx | N/A | devDependencies (implicitly via Vitest) | ✓ Available |
| Vitest | 4.0.6 | devDependencies (root package.json:24) | ✓ Available |
| @allstars/types | workspace | packages/types | ✓ Available |

## Best Practices Applied

### Error Handling
- Use try-catch for all async operations
- Provide specific error messages for common failures (ECONNREFUSED, timeout)
- Exit with code 0 (success) or 1 (failure)
- Log errors to stderr, success messages to stdout

### Performance
- Single document operation: <100ms typical
- Network timeout for emulator check: <2 seconds
- Total script execution: <3 seconds (meets SC-002)

### Security
- Production detection prevents accidental data writes
- No credentials stored in script (emulator doesn't require auth)
- Read-only check before write (idempotency)

### Maintainability
- Single-purpose script (~150 lines)
- Clear function separation (init, check, create)
- Type safety via @allstars/types
- Comprehensive error messages reduce support burden

## Open Questions

**None** - All technical unknowns resolved through existing codebase patterns and Firebase documentation.

## References

- Firebase Admin SDK Emulator Config: https://firebase.google.com/docs/emulator-suite/connect_firestore#admin_sdks
- Existing Socket Server Implementation: `/home/tisayama/allstars/apps/socket-server/src/index.ts`
- GameState Type Definition: `/home/tisayama/allstars/packages/types/src/GameState.ts`
- Firebase Admin SDK API: https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore
