# Test Contract: Dual-Channel Fallback

**Test Scenario**: Firestore fallback when WebSocket fails + deduplication when both channels active

**Priority**: P2

**Related Requirements**: FR-004, FR-005, FR-010

## Test Cases

### TC-FALLBACK-001: Firestore Fallback Latency

**Given**: Both WebSocket and Firestore channels are active

**When**: WebSocket disconnects

**Then**:
- [ ] Game state updates continue via Firestore (FR-004)
- [ ] Fallback latency is <500ms (SC-004)
- [ ] No user-visible disruption
- [ ] UI continues updating in real-time

**Assertion Example**:
```typescript
// Ensure both channels active
await projectorPage.waitForAuthentication();
expect(await projectorPage.isWebSocketConnected()).toBe(true);

// Disconnect WebSocket
const disconnectTime = Date.now();
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

// Trigger game state update via Firestore
await seeder.seedGameState({ currentPhase: 'showing_question' });

// Wait for UI to reflect update
await projectorPage.waitForPhase('showing_question');
const updateTime = Date.now();

const latency = updateTime - disconnectTime;
expect(latency).toBeLessThan(500); // SC-004
```

---

### TC-FALLBACK-002: WebSocket Resumption Without Duplicates

**Given**: App is receiving updates via Firestore fallback

**When**: WebSocket reconnects

**Then**:
- [ ] App resumes using WebSocket as primary channel
- [ ] No duplicate updates rendered (FR-005)
- [ ] Deduplication logic prevents double-processing
- [ ] Smooth transition (no UI flicker)

**Assertion Example**:
```typescript
// Start with Firestore-only
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

// Trigger update while on Firestore
await seeder.seedGameState({ currentPhase: 'showing_question' });
await projectorPage.waitForPhase('showing_question');

// Reconnect WebSocket
await networkSimulator.setState(NetworkState.ONLINE);
await page.waitForTimeout(2000); // Allow WebSocket to reconnect

// Trigger another update (should arrive via both channels)
await seeder.seedGameState({ currentPhase: 'showing_distribution' });

// Verify no duplicate rendering
const metrics = await metricsCollector.collectFallbackMetrics();
expect(metrics.deduplicationRate).toBe(1.0); // 100% deduplication (SC-006)
```

---

### TC-FALLBACK-003: Concurrent Update Deduplication

**Given**: Both WebSocket and Firestore channels are active and healthy

**When**: Game state update is triggered (arrives via both channels within 100ms)

**Then**:
- [ ] Only one update is processed (FR-005)
- [ ] Console logs show "Deduplicating" message
- [ ] Deduplication rate is 100% (SC-006)
- [ ] No duplicate renders in UI

**Assertion Example**:
```typescript
const consoleLogs = [];
projectorPage.page.on('console', msg => {
  if (msg.text().includes('Deduplicating')) {
    consoleLogs.push(msg.text());
  }
});

// Trigger update that will arrive via both channels
await seeder.seedGameState({ currentPhase: 'showing_question' });

// Wait for both channels to process
await page.waitForTimeout(500);

// Verify deduplication occurred
expect(consoleLogs.length).toBeGreaterThan(0);

const metrics = await metricsCollector.collectFallbackMetrics();
expect(metrics.duplicateCount).toBeGreaterThan(0);
expect(metrics.deduplicationRate).toBe(1.0); // SC-006
```

---

### TC-FALLBACK-004: Firestore-Only Operation

**Given**: WebSocket server is permanently offline

**When**: Game state updates are triggered via Firestore

**Then**:
- [ ] App continues operating normally (FR-004)
- [ ] All updates arrive within <500ms
- [ ] No WebSocket error messages spam console
- [ ] Connection status shows "WebSocket disconnected, using Firestore"

**Assertion Example**:
```typescript
await networkSimulator.setState(NetworkState.FIRESTORE_ONLY);

// Trigger multiple updates
for (const phase of ['showing_question', 'showing_distribution', 'showing_results']) {
  const updateTime = Date.now();
  await seeder.seedGameState({ currentPhase: phase });
  await projectorPage.waitForPhase(phase);
  const latency = Date.now() - updateTime;

  expect(latency).toBeLessThan(500);
}

const status = await projectorPage.getConnectionStatus();
expect(status).toContain('Firestore');
expect(status).not.toContain('WebSocket connected');
```

---

### TC-FALLBACK-005: Firestore Connection Failure (WebSocket Active)

**Given**: WebSocket is connected and Firestore listener fails

**When**: Game state updates are triggered

**Then**:
- [ ] App continues operating via WebSocket only
- [ ] No disruption to user experience
- [ ] Error is logged but not shown to user
- [ ] WebSocket remains primary source

**Assertion Example**:
```typescript
// Block Firestore requests
await page.route('**/localhost:8080/**', route => route.abort());

// WebSocket should still work
await seeder.seedGameState({ currentPhase: 'showing_question' });

// Verify update arrives via WebSocket
await projectorPage.waitForPhase('showing_question');

const status = await projectorPage.getConnectionStatus();
expect(status).toContain('WebSocket connected');
```

---

### TC-FALLBACK-006: Update Deduplication Time Window

**Given**: Both channels are active

**When**: Same update arrives from WebSocket and Firestore with 100ms gap

**Then**:
- [ ] Both updates are deduplicated based on timestamp
- [ ] Deduplication window is 1 second (matches implementation)
- [ ] After 1 second, same update can be processed again (cache expiry)

**Assertion Example**:
```typescript
const updatePayload = { currentPhase: 'showing_question', timestamp: Date.now() };

// Send via WebSocket
await fetch('http://localhost:3001/test/trigger-update', {
  method: 'POST',
  body: JSON.stringify(updatePayload)
});

// Wait 100ms, then send via Firestore
await page.waitForTimeout(100);
await seeder.seedGameState(updatePayload);

// Verify only one render
const metrics = await metricsCollector.collectFallbackMetrics();
expect(metrics.totalUpdates).toBe(1);
expect(metrics.duplicateCount).toBe(1); // One duplicate detected

// Wait for cache expiry (1s)
await page.waitForTimeout(1100);

// Same update should now be processed again
await seeder.seedGameState(updatePayload);
const metricsAfter = await metricsCollector.collectFallbackMetrics();
expect(metricsAfter.totalUpdates).toBe(2); // New update processed
```

---

## Performance Requirements

| Metric | Target | Source |
|--------|--------|--------|
| Firestore fallback latency | <500ms | SC-004 |
| Deduplication rate | 100% | SC-006 |
| Transition time (WS → Firestore) | <100ms | Implementation detail |
| Cache expiry window | 1s | Implementation (useDualChannelUpdates.ts:99) |

## Deduplication Algorithm

```typescript
// Deduplication key format
const key = `${update.type}_${update.timestamp}`;

// Cache window
const DEDUPLICATION_WINDOW = 1000; // 1 second

// Logic
if (recentUpdates.has(key)) {
  return false; // Skip duplicate
}

recentUpdates.add(key);
setTimeout(() => recentUpdates.delete(key), DEDUPLICATION_WINDOW);
return true; // Process update
```

**Key Characteristics**:
- Time-based cache (1 second expiry)
- Update type + timestamp composite key
- Memory-efficient (automatic cleanup)
- No false negatives (legitimate rapid updates work)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Both channels offline | Show error, retry both |
| Firestore slower than WebSocket | WebSocket wins, Firestore deduplicated |
| WebSocket faster than Firestore | Both process, second deduplicated |
| Clock skew between client/server | Timestamp tolerance ±1s acceptable |
| Rapid phase changes (<1s apart) | Each unique timestamp processed |

## Success Criteria Mapping

- **SC-004**: Firestore fallback delivers updates with <500ms latency ✅ (TC-FALLBACK-001)
- **SC-006**: 100% deduplication when both channels active ✅ (TC-FALLBACK-002, TC-FALLBACK-003)
