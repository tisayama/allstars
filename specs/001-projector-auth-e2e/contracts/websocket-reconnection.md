# Test Contract: WebSocket Reconnection

**Test Scenario**: WebSocket exponential backoff reconnection after network disruption

**Priority**: P2

**Related Requirements**: FR-003, FR-011

## Test Cases

### TC-RECON-001: Exponential Backoff Timing

**Given**: Projector app is connected to WebSocket server

**When**: Connection is forcibly disconnected via server test endpoint

**Then**:
- [ ] Reconnection attempts follow exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
- [ ] Each attempt is logged to console
- [ ] Jitter (±50%) is applied to prevent thundering herd
- [ ] Maximum 10 attempts before giving up (FR-003)

**Assertion Example**:
```typescript
const reconnectAttempts = await metricsCollector.recordReconnectionAttempts();

// Disconnect WebSocket
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

// Wait for reconnection attempts
await page.waitForTimeout(120000); // 2 minutes max

const delays = reconnectAttempts.slice(1).map((time, i) =>
  time - reconnectAttempts[i]
);

// Verify exponential backoff (with 50% jitter tolerance)
expect(delays[0]).toBeGreaterThanOrEqual(500);  // 1s ± 50%
expect(delays[0]).toBeLessThanOrEqual(1500);

expect(delays[1]).toBeGreaterThanOrEqual(1000); // 2s ± 50%
expect(delays[1]).toBeLessThanOrEqual(3000);

expect(delays[2]).toBeGreaterThanOrEqual(2000); // 4s ± 50%
expect(delays[2]).toBeLessThanOrEqual(6000);
```

---

### TC-RECON-002: Successful Reconnection

**Given**: WebSocket is disconnected

**When**: Network is restored within 10 attempts

**Then**:
- [ ] App successfully reconnects (FR-003)
- [ ] Reconnection completes within 10 seconds (SC-003)
- [ ] Connection status UI updates to "Connected"
- [ ] No data loss during reconnection window

**Assertion Example**:
```typescript
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);
await page.waitForTimeout(2000); // Ensure disconnect processed

const startTime = Date.now();
await networkSimulator.setState(NetworkState.ONLINE);

const reconnectTime = await networkSimulator.measureReconnectionTime();

expect(reconnectTime).toBeLessThan(10000); // SC-003
expect(await projectorPage.isWebSocketConnected()).toBe(true);
```

---

### TC-RECON-003: Reconnection Status UI

**Given**: WebSocket reconnection is in progress

**When**: User observes connection status indicator

**Then**:
- [ ] Status shows "Reconnecting" with attempt count (e.g., "Reconnecting... (3/10)")
- [ ] Status updates on each attempt
- [ ] Visual indicator (spinner, icon) shows activity
- [ ] Console logs include attempt number for debugging

**Assertion Example**:
```typescript
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

const statusText = await projectorPage.getConnectionStatus();
expect(statusText).toContain('Reconnecting');
expect(statusText).toMatch(/\(\d+\/10\)/); // Attempt count
```

---

### TC-RECON-004: Reconnection Failure After Max Attempts

**Given**: WebSocket server is permanently unavailable

**When**: 10 reconnection attempts fail

**Then**:
- [ ] App stops retrying after 10 attempts
- [ ] Error status displayed: "Failed to reconnect to server"
- [ ] App continues operating via Firestore fallback
- [ ] No infinite retry loop

**Assertion Example**:
```typescript
// Keep server offline for entire test
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

// Wait for all 10 attempts to exhaust (~2 minutes)
await page.waitForTimeout(130000);

const errorMessage = await projectorPage.getErrorMessage();
expect(errorMessage).toContain('Failed to reconnect');

const metrics = await metricsCollector.collectReconnectionMetrics();
expect(metrics.attemptCount).toBe(10);
expect(metrics.reconnectSuccess).toBe(false);
```

---

### TC-RECON-005: Network Simulation Accuracy

**Given**: Network simulator is configured

**When**: Disconnect command is issued

**Then**:
- [ ] WebSocket closes within 100ms
- [ ] `disconnect` event fires on client
- [ ] Reconnection attempts begin within 1 second
- [ ] Simulation does not affect Firestore connection (for dual-channel fallback)

**Assertion Example**:
```typescript
const disconnectTime = Date.now();

await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

const disconnectEventTime = await page.evaluate(() => {
  return (window as any).__WEBSOCKET_DISCONNECT_TIME__;
});

expect(disconnectEventTime - disconnectTime).toBeLessThan(100);

// Firestore should still work
await seeder.seedGameState({ currentPhase: 'showing_question' });
await expect(projectorPage.phaseIndicator).toHaveText('showing_question');
```

---

## Performance Requirements

| Metric | Target | Source |
|--------|--------|--------|
| Reconnection time (after restore) | <10s | SC-003 |
| First retry delay | 1s ± 50% | FR-003 |
| Max retry delay | 60s | FR-003 |
| Max retry attempts | 10 | FR-003 |

## Exponential Backoff Schedule

| Attempt | Base Delay | With Jitter (±50%) | Cumulative Time |
|---------|------------|---------------------|-----------------|
| 1 | 1s | 0.5s - 1.5s | 0.5s - 1.5s |
| 2 | 2s | 1s - 3s | 1.5s - 4.5s |
| 3 | 4s | 2s - 6s | 3.5s - 10.5s |
| 4 | 8s | 4s - 12s | 7.5s - 22.5s |
| 5 | 16s | 8s - 24s | 15.5s - 46.5s |
| 6 | 32s | 16s - 48s | 31.5s - 94.5s |
| 7 | 60s (capped) | 30s - 90s | 61.5s - 184.5s |
| 8 | 60s | 30s - 90s | 91.5s - 274.5s |
| 9 | 60s | 30s - 90s | 121.5s - 364.5s |
| 10 | 60s | 30s - 90s | 151.5s - 454.5s |

**Maximum Wait Time**: ~7.5 minutes (454.5s) before giving up

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Disconnect during reconnection | Reset backoff, start from 1s delay |
| Server restarts mid-reconnect | Resume reconnection seamlessly |
| Multiple disconnects (flaky network) | Each disconnect resets backoff timer |
| Client browser goes to sleep | Wake triggers immediate reconnection attempt |

## Success Criteria Mapping

- **SC-003**: Reconnection succeeds within 10s after network restoration ✅ (TC-RECON-002)
