# Test Contract: Authentication Flow

**Test Scenario**: Browser-based Firebase Anonymous Authentication

**Priority**: P1

**Related Requirements**: FR-001, FR-002, FR-009, FR-013, FR-014

## Test Cases

### TC-AUTH-001: Initial Authentication

**Given**: Firebase Auth Emulator is running and projector app is loaded

**When**: App initializes

**Then**:
- [ ] App displays loading indicator within 100ms
- [ ] Authentication completes within 3 seconds (FR-001)
- [ ] User object is marked as anonymous
- [ ] User has valid UID (format: `[a-zA-Z0-9-]{20,}`)
- [ ] Auth status UI shows "Authenticated"

**Assertion Example**:
```typescript
const startTime = Date.now();
await projectorPage.goto();
await projectorPage.waitForAuthentication(3000);
const authTime = Date.now() - startTime;

expect(authTime).toBeLessThan(3000); // FR-001
expect(await projectorPage.isAuthenticated()).toBe(true);
```

---

### TC-AUTH-002: Session Persistence

**Given**: Projector app has successfully authenticated

**When**: User refreshes the browser

**Then**:
- [ ] Session is restored without re-authentication (FR-002)
- [ ] Same UID is maintained
- [ ] No additional AUTH_REQUIRED events emitted
- [ ] App is ready within 1 second (no 3s auth delay)

**Assertion Example**:
```typescript
const uidBefore = await projectorPage.getUserId();
await projectorPage.page.reload();
const uidAfter = await projectorPage.getUserId();

expect(uidBefore).toBe(uidAfter);
expect(await projectorPage.isAuthenticated()).toBe(true);
```

---

### TC-AUTH-003: State Transition Verification

**Given**: App is loading

**When**: Authentication progresses

**Then**:
- [ ] State transitions: unauthenticated → authenticating → authenticated (FR-013)
- [ ] Each state is observable in UI
- [ ] No intermediate state skipped
- [ ] State changes emit console logs for debugging

**Assertion Example**:
```typescript
const stateTransitions = [];
projectorPage.page.on('console', msg => {
  if (msg.text().includes('Auth state:')) {
    stateTransitions.push(msg.text());
  }
});

await projectorPage.goto();
await projectorPage.waitForAuthentication();

expect(stateTransitions).toContain('Auth state: unauthenticated');
expect(stateTransitions).toContain('Auth state: authenticating');
expect(stateTransitions).toContain('Auth state: authenticated');
```

---

### TC-AUTH-004: Authentication Failure Handling

**Given**: Firebase Auth Emulator is not running OR returns error

**When**: App attempts authentication

**Then**:
- [ ] Error is caught and displayed (FR-014)
- [ ] Error message is actionable (e.g., "Connect to Firebase Emulator on localhost:9099")
- [ ] App does not crash
- [ ] Retry mechanism is triggered

**Assertion Example**:
```typescript
// Stop emulator before test
await stopFirebaseEmulator();

await projectorPage.goto();
const errorMessage = await projectorPage.getErrorMessage();

expect(errorMessage).toContain('Firebase');
expect(errorMessage).toContain('localhost:9099');
expect(await projectorPage.isAuthenticated()).toBe(false);
```

---

### TC-AUTH-005: Emulator Connection Validation

**Given**: Firebase Auth Emulator URL is configured

**When**: App initializes

**Then**:
- [ ] App connects to localhost:9099, NOT production Firebase (FR-009)
- [ ] No network requests to firebaseapp.com or googleapis.com domains
- [ ] Console logs confirm emulator connection

**Assertion Example**:
```typescript
const networkRequests = [];
projectorPage.page.on('request', req => {
  networkRequests.push(req.url());
});

await projectorPage.goto();
await projectorPage.waitForAuthentication();

const productionRequests = networkRequests.filter(url =>
  url.includes('firebaseapp.com') || url.includes('googleapis.com')
);

expect(productionRequests).toHaveLength(0); // No production requests
expect(networkRequests.some(url => url.includes('localhost:9099'))).toBe(true);
```

---

## Performance Requirements

| Metric | Target | Source |
|--------|--------|--------|
| Initial authentication | <3s | FR-001, SC-001 |
| Session restoration | <1s | FR-002 |
| UI feedback latency | <100ms | UX best practice |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Emulator offline during init | Show error, retry every 5s |
| Token expires mid-session | Auto-refresh transparently |
| Multiple tabs open | Each tab gets independent anonymous user |
| Browser sleep/wake cycle | Revalidate auth on wake |

## Success Criteria Mapping

- **SC-001**: E2E tests verify authentication completes in under 3 seconds ✅ (TC-AUTH-001)
- **SC-008**: 100% coverage of auth state transitions ✅ (TC-AUTH-003)
