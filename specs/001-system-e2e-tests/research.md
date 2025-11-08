# E2E Testing Framework Research for AllStars Game Platform

**Phase 0 Output** | **Date**: 2025-11-08 | **Feature**: [spec.md](./spec.md)

## Decision: Playwright

**Recommended Framework**: Playwright Test (already implemented in the project)

## Executive Summary

After comprehensive research comparing Playwright, Cypress, WebdriverIO, and Puppeteer for the AllStars game platform requirements, **Playwright** emerges as the optimal choice. The project has already begun implementing Playwright (version 1.56.1), which aligns perfectly with the technical requirements for multi-application coordination, Firebase emulator integration, and TypeScript/React testing.

---

## Rationale

### 1. Multi-Browser/Multi-Page Support (Critical Requirement)

**Playwright: EXCELLENT**
- Native support for controlling multiple browser contexts simultaneously
- Can spawn multiple isolated browser contexts within a single test scenario
- Perfect for testing 4 React/Vite apps (admin, host, participant, projector) concurrently
- Worker-based isolation ensures no state leakage between contexts
- Example from AllStars codebase shows this pattern in existing E2E tests:
  ```typescript
  const projectorContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const guest1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ```

**Cypress: POOR** - Limited to single-tab interaction, not suitable for simultaneous multi-application testing

**WebdriverIO: GOOD** - Supports multi-context but requires additional setup

**Puppeteer: FAIR** - Supports multiple contexts but lacks built-in testing framework features

### 2. TypeScript Support Quality

**Playwright: EXCELLENT**
- First-class TypeScript support with comprehensive type definitions
- Built-in TypeScript configuration
- AllStars project successfully using TypeScript 5.3+ throughout

### 3. Firebase Emulator Integration

**Playwright: EXCELLENT**
- Flexible environment variable configuration
- Already implemented in AllStars with `FIRESTORE_EMULATOR_HOST: 'localhost:8080'`
- Seamless integration in existing E2E global setup
- No special configuration needed beyond environment variables

### 4. Performance for Large Test Suites

**Playwright: EXCELLENT**
- Parallel execution by default (fullyParallel configuration)
- Worker-based architecture provides true isolation
- Configurable workers (2 on CI, CPU cores locally)
- Faster test execution compared to alternatives

### 5. Debugging Capabilities

**Playwright: EXCELLENT**
- Built-in trace viewer with timeline
- Screenshot capture: `screenshot: 'only-on-failure'`
- Video recording: `video: 'retain-on-failure'`
- `trace: 'on-first-retry'` provides detailed debugging context
- Rich developer-friendly debugging tools

### 6. Community Support & Maintenance

**Playwright: EXCELLENT**
- Actively maintained by Microsoft
- Growing community with comprehensive documentation
- Regular updates (AllStars using latest v1.56.1)

### 7. Monorepo Compatibility

**Playwright: EXCELLENT**
- Can be installed at root level with shared configuration
- Test directory organization at root `/tests/e2e/`
- Global setup/teardown orchestrating all apps
- PNPM workspace integration works smoothly

---

## Alternatives Considered

### Cypress
**Rejected Reason**: Single-tab limitation is a critical blocker for AllStars' requirement to test 4 applications simultaneously. While Cypress excels at rapid feedback and debugging for single-page applications, it cannot efficiently coordinate across host, projector, participant, and admin apps in a single test scenario.

**Best Use Case**: Teams focused exclusively on single-page React applications with Chromium-based browser testing and real-time debugging needs.

### WebdriverIO
**Rejected Reason**: While capable, WebdriverIO lacks the streamlined multi-context testing and out-of-the-box features that Playwright provides. It would require significantly more configuration and custom setup to achieve the same level of multi-app coordination.

**Best Use Case**: Teams requiring multi-language support beyond JavaScript/TypeScript or those already invested in WebDriver ecosystem.

### Puppeteer
**Rejected Reason**: Puppeteer is a browser automation library, not a complete testing framework. It would require building a custom test orchestration layer on top. Additionally, it only supports Chromium browsers, missing the cross-browser coverage that Playwright provides.

**Best Use Case**: Pure browser automation tasks, web scraping, or PDF generation where a full testing framework is unnecessary.

---

## Best Practices

### 1. E2E Test Organization in Monorepos

**Recommended Structure**:
```
/allstars/
├── tests/e2e/
│   ├── scenarios/           # Test files organized by user story
│   │   ├── admin-setup.spec.ts
│   │   ├── participant-flow.spec.ts
│   │   ├── projector-display.spec.ts
│   │   ├── host-control.spec.ts
│   │   └── full-game-flow.spec.ts
│   ├── fixtures/            # Test data and reusable fixtures
│   │   ├── index.ts
│   │   └── factories.ts
│   ├── helpers/             # Utility classes
│   │   ├── appLauncher.ts
│   │   ├── emulatorManager.ts
│   │   ├── healthChecker.ts
│   │   ├── testDataSeeder.ts
│   │   └── collectionPrefix.ts
│   ├── globalSetup.ts       # Infrastructure orchestration
│   ├── globalTeardown.ts
│   └── fixtures.ts          # Custom Playwright fixtures
└── playwright.config.ts     # Centralized configuration
```

**Key Principles**:
- Keep E2E tests in separate `/tests` folder (enforces boundaries)
- Use scenario-based organization (aligns with user stories)
- Centralize helpers and fixtures for reusability
- Single config at root for consistent test execution

### 2. Test Data Management and Fixtures

**Data Factory Pattern**: Use factory functions for creating test data

**Test Isolation Strategy**:
- Each test creates its own data with unique collection prefixes
- Clear emulator data in globalSetup for clean slate
- Use custom Playwright fixtures to inject data seeders
- Each test is self-contained and doesn't rely on pre-existing data

**Implementation Pattern**:
```typescript
// Custom fixtures provide seeder and collectionPrefix
test('Host starts question', async ({ browser, seeder, collectionPrefix }) => {
  await seeder.seedQuestions([question], collectionPrefix);
  const guests = await seeder.seedGuests([guestA, guestB], collectionPrefix);
  await seeder.seedGameState(initialState, collectionPrefix);
  // Test proceeds with isolated data
});
```

### 3. Firebase Emulator Lifecycle Management

**Best Practices for 2025**:
1. **Start Once, Clear Between Tests**: Start emulator in globalSetup, clear data per test suite
2. **Environment Variables**: Use `FIRESTORE_EMULATOR_HOST` for seamless SDK connection
3. **Health Checks**: Verify emulator readiness before launching apps
4. **Graceful Shutdown**: SIGTERM in globalTeardown, SIGKILL as fallback
5. **Isolated Test Project**: Use dedicated project ID ('test') separate from dev/prod

**Implementation Pattern**:
```typescript
// In globalSetup.ts
emulatorManager = new EmulatorManager();
await emulatorManager.start({
  firestorePort: 8080,
  authPort: 9099,
  projectId: 'stg-wedding-allstars',
  showUI: !process.env.CI,
}, 30000);

await emulatorManager.clearData(); // Clean slate before tests
```

### 4. Screenshot and Video Capture

**Optimal Configuration**:
```typescript
// In playwright.config.ts
use: {
  trace: 'on-first-retry',        // Detailed timeline only on retry
  screenshot: 'only-on-failure',  // Visual state at failure point
  video: 'retain-on-failure',     // Keep videos for failed tests only
}
```

**Benefits**:
- Storage optimization (don't record successful tests)
- Detailed debugging context for failures
- CI/CD artifact upload for failed test analysis

### 5. Parallel vs Sequential Execution

**Recommended Configuration**:
```typescript
fullyParallel: true,  // Test files run in parallel
workers: process.env.CI ? 2 : undefined,  // 2 workers on CI, CPU cores locally
retries: process.env.CI ? 2 : 1,  // 3 total attempts on CI
```

**Categorization Strategy**:
- **Parallel-Safe**: Stateless tests, isolated data scenarios
- **Sequential Candidates**: Tests with shared global state dependencies

**Use `test.describe.serial()` only when tests have dependencies**

### 6. Test Isolation Strategies

**Data Isolation Pattern**:
```typescript
// Collection prefix per test ensures isolation
test('Game flow', async ({ seeder, collectionPrefix }) => {
  // collectionPrefix = "test_abc123"
  await seeder.seedQuestions([...], collectionPrefix);
  // Data written to "test_abc123_questions" collection
});
```

**Key Principles**:
1. **Data Isolation**: Each test uses unique collection prefix
2. **Browser Context Isolation**: Each user/app gets separate context
3. **Test Data Factory**: Programmatic data creation vs shared fixtures
4. **No Shared State**: Tests don't depend on execution order
5. **Cleanup Strategy**: Clear data in setup, not teardown (faster, fail-safe)

### 7. Multi-App Coordination Pattern

**Recommended Pattern**:
```typescript
// 1. Create isolated contexts for each app
const projectorContext = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const hostContext = await browser.newContext({
  viewport: { width: 1280, height: 720 }
});
const participantContext = await browser.newContext({
  viewport: { width: 390, height: 844 }
});

// 2. Navigate to respective apps
const projectorPage = await projectorContext.newPage();
const hostPage = await hostContext.newPage();
const participantPage = await participantContext.newPage();

await projectorPage.goto('http://work-ubuntu:5175'); // projector-app
await hostPage.goto('http://work-ubuntu:5174');      // host-app
await participantPage.goto('http://work-ubuntu:5173'); // participant-app

// 3. Coordinate actions across apps
await hostPage.click('[data-testid="start-question-btn"]');

// Verify real-time sync to projector
await expect(projectorPage.locator('[data-testid="question-text"]'))
  .toHaveText(question.questionText);

// Verify participants can respond
await expect(participantPage.locator('[data-testid="answer-button-A"]'))
  .toBeEnabled();

// 4. Cleanup
await projectorContext.close();
await hostContext.close();
await participantContext.close();
```

---

## Integration Notes

### Firebase Emulator Integration

**Configuration**:
```typescript
// Environment variables set in app launcher
env: {
  FIRESTORE_EMULATOR_HOST: 'localhost:8080',
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
}
```

**Integration Pattern**:
1. Start emulators (30s timeout with `timeout 30 firebase emulators:start`)
2. Verify health via HTTP checks
3. Clear existing data for clean slate
4. Launch apps with emulator env vars
5. Run tests
6. Cleanup apps then emulators in globalTeardown

### Hostname Configuration (work-ubuntu)

**Implementation Options**:

**Option 1: /etc/hosts Entry (Recommended)**
```bash
sudo sh -c 'echo "127.0.0.1 work-ubuntu" >> /etc/hosts'
```

**Option 2: Playwright BaseURL Configuration**
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://work-ubuntu',
  },
});

// In tests, use relative URLs
await page.goto('/'); // Resolves to http://work-ubuntu:5173
```

**Option 3: Environment Variables in App Configs**
```typescript
// In globalSetup.ts
const baseHost = process.env.TEST_HOST || 'work-ubuntu';
const appConfigs: AppLaunchConfig[] = [
  {
    name: 'participant-app',
    healthUrl: `http://${baseHost}:5173`,
    // ...
  }
];
```

**Verification**:
```bash
# Test hostname resolution
ping work-ubuntu
# Should resolve to 127.0.0.1

# Test app access
curl http://work-ubuntu:5173
# Should return app HTML
```

### Shell Command Safety (Constitution Requirement)

**All shell commands MUST use timeout mechanisms**:

```typescript
// Emulator startup
await exec('timeout 60 firebase emulators:start --only firestore,auth');

// App startup
await exec('timeout 30 pnpm run dev');

// Test execution
await exec('timeout 300 pnpm run test:e2e'); // 5 min limit

// Cleanup
await exec('timeout 10 firebase emulators:stop');
```

**Timeout Values**:
- Emulator start: 60 seconds
- App startup: 30 seconds per app
- Test execution: 300 seconds (5 minutes per spec requirement)
- Cleanup: 10 seconds

---

## Framework Comparison Matrix

| Feature | Playwright | Cypress | WebdriverIO | Puppeteer |
|---------|-----------|---------|-------------|-----------|
| **Multi-App Testing** | ✅ Excellent | ❌ Poor | ✅ Good | ⚠️ Fair |
| **TypeScript Support** | ✅ Excellent | ✅ Good | ✅ Good | ✅ Good |
| **Firebase Emulator** | ✅ Excellent | ✅ Good | ✅ Good | ✅ Good |
| **Performance** | ✅ Excellent | ✅ Good | ✅ Good | ⚠️ Fair |
| **Debugging** | ✅ Excellent | ✅ Excellent | ✅ Good | ⚠️ Fair |
| **Community** | ✅ Excellent | ✅ Excellent | ✅ Good | ✅ Good |
| **Monorepo** | ✅ Excellent | ✅ Good | ✅ Good | ✅ Good |
| **Browser Coverage** | ✅ All | ⚠️ Limited | ✅ All | ❌ Chromium only |
| **Built-in Test Runner** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Parallel Execution** | ✅ Out-of-box | ⚠️ Config needed | ⚠️ Config needed | ❌ Custom setup |
| **AllStars Fit** | ✅ Perfect | ❌ Blocker | ⚠️ Extra setup | ❌ Incomplete |

---

## Conclusion

**Playwright is the definitive choice for AllStars** based on:

1. **Critical Requirement**: Multi-context testing for 4 simultaneous apps (Cypress fails this requirement)
2. **TypeScript Integration**: First-class TypeScript support aligns with existing monorepo stack
3. **Performance**: Parallel execution, worker isolation, and fast test execution
4. **Debugging**: Comprehensive trace viewer, screenshots, and video capture
5. **Future-Proof**: Active Microsoft support, cross-browser coverage, modern architecture

**Implementation Recommendation**:
- Use Playwright 1.56.1+ (current stable version)
- Configure work-ubuntu hostname via /etc/hosts or baseURL
- Follow existing E2E test patterns in the codebase
- Implement test tagging for parallel/sequential categorization
- Add CI/CD pipeline with artifact upload for failed tests

**Risk Assessment**: ✅ LOW
- Playwright already proven in similar monorepo setups
- Strong community and Microsoft backing
- All requirements met or exceeded
- No blocking issues identified

---

## Technical Specifications

**Language/Version**: TypeScript 5.3+ / Node.js 18+
**Framework**: Playwright Test 1.56.1+
**Browser Targets**: Chromium, Firefox, WebKit
**Test Runner**: Playwright Test (built-in)
**Parallel Execution**: Yes (configurable workers)
**Fixture Support**: Custom fixtures for seeder, collectionPrefix
**Timeout Configuration**: Global timeout: 30s, expect timeout: 5s
**Retry Strategy**: 2 retries on CI, 1 retry locally

---

**Document Version**: 1.0
**Date**: 2025-11-08
**Research Phase**: Phase 0 - Complete
**Next Phase**: Phase 1 - Data Model & Contracts
