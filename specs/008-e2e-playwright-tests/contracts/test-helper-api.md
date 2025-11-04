# Test Helper API Contracts

**Feature**: 008-e2e-playwright-tests
**Date**: 2025-01-04
**Purpose**: Define interfaces for E2E test helper utilities

## Overview

This document defines the API contracts for E2E test helper modules. Unlike production REST APIs (which use OpenAPI in `/packages/openapi/`), these are **TypeScript module APIs** for test infrastructure utilities. These contracts ensure consistent interfaces for test helpers across all test scenarios.

---

## Helper Modules

### 1. EmulatorManager

**Module**: `tests/e2e/helpers/emulatorManager.ts`

**Purpose**: Manage Firebase Emulator lifecycle (start, stop, health check)

**Interface**:
```typescript
export interface EmulatorConfig {
  /** Firestore emulator port (default: 8080) */
  firestorePort: number;

  /** Auth emulator port (default: 9099) */
  authPort: number;

  /** Firebase project ID for emulators (default: "test") */
  projectId: string;

  /** Whether to show emulator UI (default: false for CI) */
  showUI: boolean;
}

export interface EmulatorManager {
  /**
   * Start Firebase Emulators with specified configuration
   * @param config - Emulator configuration
   * @param timeoutMs - Maximum time to wait for startup (default: 30000)
   * @throws Error if emulators fail to start within timeout
   */
  start(config: Partial<EmulatorConfig>, timeoutMs?: number): Promise<void>;

  /**
   * Stop Firebase Emulators gracefully
   * @param timeoutMs - Maximum time to wait for shutdown (default: 10000)
   */
  stop(timeoutMs?: number): Promise<void>;

  /**
   * Clear all data from Firestore emulator
   */
  clearData(): Promise<void>;

  /**
   * Check if emulators are ready to accept connections
   * @returns true if both Firestore and Auth emulators are responsive
   */
  isReady(): Promise<boolean>;
}
```

**Usage Example**:
```typescript
const emulatorManager = new EmulatorManagerImpl();
await emulatorManager.start({ showUI: false });
await emulatorManager.clearData();
// ... run tests ...
await emulatorManager.stop();
```

---

### 2. AppLauncher

**Module**: `tests/e2e/helpers/appLauncher.ts`

**Purpose**: Launch and manage application processes

**Interface**:
```typescript
export type AppName = 'admin-app' | 'host-app' | 'projector-app' | 'participant-app' | 'api-server' | 'socket-server';

export interface AppLaunchConfig {
  /** App name */
  name: AppName;

  /** Working directory for app (e.g., "/home/user/allstars/apps/api-server") */
  cwd: string;

  /** Launch command (e.g., "pnpm dev") */
  command: string;

  /** Launch command arguments */
  args?: string[];

  /** Environment variables to set */
  env?: Record<string, string>;

  /** Health check URL (e.g., "http://localhost:3000/health") */
  healthUrl: string;

  /** Port number the app listens on */
  port: number;
}

export interface AppLauncher {
  /**
   * Launch an application and wait for it to be ready
   * @param config - App launch configuration
   * @param timeoutMs - Maximum time to wait for app readiness (default: 30000)
   * @returns Process handle for cleanup
   * @throws Error if app fails to become ready within timeout
   */
  launch(config: AppLaunchConfig, timeoutMs?: number): Promise<ChildProcess>;

  /**
   * Launch multiple apps in parallel
   * @param configs - Array of app launch configurations
   * @param timeoutMs - Maximum time to wait for all apps (default: 60000)
   * @returns Array of process handles in same order as configs
   */
  launchMany(configs: AppLaunchConfig[], timeoutMs?: number): Promise<ChildProcess[]>;

  /**
   * Stop an application gracefully
   * @param process - Process handle from launch()
   * @param timeoutMs - Maximum time to wait for shutdown (default: 5000)
   */
  stop(process: ChildProcess, timeoutMs?: number): Promise<void>;

  /**
   * Stop multiple applications in parallel
   * @param processes - Array of process handles
   * @param timeoutMs - Maximum time to wait for all shutdowns (default: 10000)
   */
  stopMany(processes: ChildProcess[], timeoutMs?: number): Promise<void>;
}
```

**Usage Example**:
```typescript
const launcher = new AppLauncherImpl();
const apiServerProcess = await launcher.launch({
  name: 'api-server',
  cwd: '/home/user/allstars/apps/api-server',
  command: 'pnpm',
  args: ['dev'],
  healthUrl: 'http://localhost:3000/health',
  port: 3000,
  env: { FIRESTORE_EMULATOR_HOST: 'localhost:8080' },
});
```

---

### 3. HealthChecker

**Module**: `tests/e2e/helpers/healthChecker.ts`

**Purpose**: Poll health endpoints until apps are ready

**Interface**:
```typescript
export interface HealthCheckConfig {
  /** URL to check (e.g., "http://localhost:3000/health") */
  url: string;

  /** Maximum time to wait for health check to pass (default: 30000) */
  timeoutMs?: number;

  /** Initial polling interval in ms (default: 100) */
  initialIntervalMs?: number;

  /** Maximum polling interval in ms (default: 2000) */
  maxIntervalMs?: number;

  /** HTTP timeout for each individual request (default: 1000) */
  requestTimeoutMs?: number;
}

export interface HealthChecker {
  /**
   * Wait for a health endpoint to return HTTP 200
   * Uses exponential backoff for polling
   * @param config - Health check configuration
   * @throws Error if health check doesn't pass within timeout
   */
  waitForReady(config: HealthCheckConfig): Promise<void>;

  /**
   * Wait for multiple health endpoints to be ready in parallel
   * @param configs - Array of health check configurations
   * @returns void if all pass, throws Error with details of first failure
   */
  waitForMany(configs: HealthCheckConfig[]): Promise<void>;

  /**
   * Check health endpoint once (no retry)
   * @param url - Health endpoint URL
   * @param timeoutMs - Request timeout (default: 1000)
   * @returns true if healthy (HTTP 200), false otherwise
   */
  checkOnce(url: string, timeoutMs?: number): Promise<boolean>;
}
```

**Usage Example**:
```typescript
const healthChecker = new HealthCheckerImpl();
await healthChecker.waitForMany([
  { url: 'http://localhost:3000/health' }, // api-server
  { url: 'http://localhost:3001/health' }, // socket-server
  { url: 'http://localhost:5173/health' }, // participant-app (Vite)
]);
```

---

### 4. CollectionPrefixGenerator

**Module**: `tests/e2e/helpers/collectionPrefix.ts`

**Purpose**: Generate unique collection prefixes for parallel test execution

**Interface**:
```typescript
export interface CollectionPrefixGenerator {
  /**
   * Generate a unique collection prefix for this test run
   * Format: `test_${timestamp}_${uuid}_`
   * @returns Unique prefix string ending with underscore
   */
  generate(): string;

  /**
   * Parse a collection prefix to extract metadata
   * @param prefix - Collection prefix to parse
   * @returns Metadata object with timestamp and UUID
   */
  parse(prefix: string): {
    timestamp: number;
    uuid: string;
    isValid: boolean;
  };

  /**
   * Apply prefix to a collection name
   * @param prefix - Collection prefix
   * @param collectionName - Base collection name (e.g., "guests")
   * @returns Prefixed collection name (e.g., "test_1704369600_a1b2_guests")
   */
  apply(prefix: string, collectionName: string): string;
}
```

**Usage Example**:
```typescript
const generator = new CollectionPrefixGeneratorImpl();
const prefix = generator.generate(); // "test_1704369600000_a1b2c3d4_"

const guestsCollection = generator.apply(prefix, 'guests');
// "test_1704369600000_a1b2c3d4_guests"

await admin.firestore().collection(guestsCollection).add({ name: 'Guest A' });
```

---

### 5. TestDataSeeder

**Module**: `tests/e2e/helpers/testDataSeeder.ts`

**Purpose**: Seed Firestore emulator with test data using factories

**Interface**:
```typescript
import { TestQuestion, TestGuest, TestGameState } from '../fixtures';

export interface TestDataSeeder {
  /**
   * Seed Firestore with test questions
   * @param questions - Array of test questions
   * @param collectionPrefix - Collection prefix for isolation
   * @returns Array of created question IDs
   */
  seedQuestions(questions: TestQuestion[], collectionPrefix: string): Promise<string[]>;

  /**
   * Seed Firestore with test guests
   * @param guests - Array of test guests
   * @param collectionPrefix - Collection prefix for isolation
   * @returns Array of created guest IDs with join tokens
   */
  seedGuests(guests: TestGuest[], collectionPrefix: string): Promise<Array<{
    guestId: string;
    joinToken: string;
    joinUrl: string;
  }>>;

  /**
   * Set initial game state in Firestore
   * @param gameState - Initial game state
   * @param collectionPrefix - Collection prefix for isolation
   */
  seedGameState(gameState: TestGameState, collectionPrefix: string): Promise<void>;

  /**
   * Clear all test data for a specific collection prefix
   * @param collectionPrefix - Collection prefix to clear
   */
  clearTestData(collectionPrefix: string): Promise<void>;
}
```

**Usage Example**:
```typescript
const seeder = new TestDataSeederImpl();
const prefix = generator.generate();

await seeder.seedQuestions([QUESTION_4CHOICE_EASY], prefix);
const guestIds = await seeder.seedGuests([GUEST_A, GUEST_B, GUEST_C], prefix);
await seeder.seedGameState(STATE_READY_FOR_NEXT, prefix);

// ... run tests ...

await seeder.clearTestData(prefix);
```

---

## Contract Validation

### Unit Testing Requirements

Per TDD principles (Constitution Principle II), each helper module MUST have unit tests before implementation:

```typescript
// tests/e2e/helpers.test.ts
describe('EmulatorManager', () => {
  it('should start emulators within timeout', async () => {
    // Test implementation
  });

  it('should throw error if emulators fail to start', async () => {
    // Test implementation
  });

  it('should clear data successfully', async () => {
    // Test implementation
  });
});

describe('AppLauncher', () => {
  it('should launch app and wait for health check', async () => {
    // Test implementation
  });

  it('should throw error if app not ready within timeout', async () => {
    // Test implementation
  });
});

// ... tests for all other helpers
```

### Type Safety

All helper APIs MUST:
- Export TypeScript interfaces with JSDoc comments
- Use strict TypeScript mode (no `any` types)
- Export types for use in test scenarios
- Align with existing types from `/packages/types/` where applicable

---

## Summary

These test helper APIs provide consistent, type-safe interfaces for E2E test infrastructure. All helpers follow these principles:

1. **Explicit timeouts**: Every async operation has configurable timeout (Constitution Principle V)
2. **Error handling**: Clear error messages with context for debugging
3. **TDD approach**: Unit tests written before implementation
4. **Type safety**: Full TypeScript typing with interfaces
5. **Reusability**: Helpers shared across all test scenarios

**Next Phase**: Create `quickstart.md` to document how to use these helpers in practice.
