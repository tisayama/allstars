# Research: Real-Time Game State Synchronization Server

**Feature**: socket-server | **Date**: 2025-11-03
**Purpose**: Technical research and decision rationale for WebSocket-based game state broadcast system

## Overview

This document captures research findings, technology decisions, and architectural patterns for implementing a real-time synchronization server that broadcasts Firestore game state changes to 200+ concurrent WebSocket clients with <100ms latency.

## Key Technical Decisions

### Decision 1: Socket.io vs Native WebSocket

**Decision**: Use Socket.io 4.x

**Rationale**:
- **Automatic Reconnection**: Built-in exponential backoff reconnection logic (FR-011, User Story 5)
- **Room/Namespace Support**: Native broadcast room implementation (FR-003) without manual connection tracking
- **Fallback Transport**: Automatic long-polling fallback if WebSocket blocked by corporate firewalls
- **Binary Protocol**: Optimized binary framing reduces message overhead vs JSON-only WebSocket
- **Production Battle-Tested**: Used by Slack, Microsoft, Trello for real-time features

**Alternatives Considered**:
- **Native WebSocket (ws library)**: Rejected - requires manual reconnection logic, room management, and connection state tracking. Increases implementation complexity and bug surface area.
- **Server-Sent Events (SSE)**: Rejected - unidirectional only (no client→server auth messages), limited browser connection pool (6 per domain), no binary support.
- **gRPC Streaming**: Rejected - poor browser support, requires HTTP/2, overkill for simple broadcast pattern.

**Implementation Notes**:
- Use Socket.io with `transports: ['websocket', 'polling']` for maximum compatibility
- Enable `perMessageDeflate: false` to reduce CPU overhead (already using binary protocol)
- Set `pingTimeout: 60000, pingInterval: 25000` to detect stale connections

---

### Decision 2: Firebase Admin SDK for Authentication

**Decision**: Verify Firebase Auth ID tokens using `admin.auth().verifyIdToken()`

**Rationale**:
- **Zero Additional Infrastructure**: Reuses existing Firebase Auth from api-server
- **Stateless Validation**: No session storage required; tokens are cryptographically verified
- **Built-in Expiration**: Tokens expire after 1 hour (FR-013 automatic disconnect)
- **Role Claims Support**: Can check custom claims if future role-based filtering needed

**Alternatives Considered**:
- **Custom JWT Validation**: Rejected - requires maintaining Firebase public keys, implementing rotation logic, and handling edge cases already solved by Admin SDK.
- **API Server Proxy Auth**: Rejected - adds network hop latency (violates <100ms requirement), creates single point of failure, complicates deployment.

**Implementation Notes**:
- Call `verifyIdToken()` in Socket.io middleware before admitting connection
- Cache decoded tokens for session duration (avoid re-verification on every event)
- Log authentication failures with sanitized user ID (OR-002)

---

### Decision 3: Firestore onSnapshot for State Watching

**Decision**: Use Firestore SDK's `onSnapshot()` listener on `gameState/live` document

**Rationale**:
- **Real-Time Push**: Server receives updates instantly when api-server writes (no polling)
- **Automatic Reconnection**: SDK handles network interruptions and reconnects transparently
- **Consistent Read**: Guarantees strong consistency (no stale state broadcast risk)
- **Snapshot Metadata**: Provides `hasPendingWrites` flag to distinguish local vs server updates

**Alternatives Considered**:
- **Firestore REST API Polling**: Rejected - introduces 500ms+ polling delay (violates <100ms), wastes quota on unchanged reads, poor scalability.
- **Cloud Firestore Triggers**: Rejected - adds unnecessary Cloud Function (extra deployment), increases latency (function cold start), requires pub/sub integration.
- **Firebase Realtime Database**: Rejected - project already uses Firestore, migration not justified, no better real-time characteristics for this use case.

**Implementation Notes**:
- Initialize listener once on server startup (singleton pattern)
- Implement retry logic with exponential backoff if listener fails (FR-011)
- Enter degraded state on disconnect: stop accepting new clients, maintain existing connections (clarification 1)
- Validate document structure before broadcasting (FR-011c)

---

### Decision 4: Cloud Run with Session Affinity

**Decision**: Deploy to Cloud Run with session affinity enabled

**Rationale**:
- **Managed Scaling**: Automatic instance provisioning based on connection count
- **Zero Downtime Deploys**: Gradual traffic migration preserves existing connections
- **Session Affinity**: Routes client to same instance for WebSocket stickiness (FR-012)
- **Cost Efficiency**: Pay only for active instances, scale to zero during off-hours

**Alternatives Considered**:
- **Cloud Functions**: Rejected - no WebSocket support, 9-minute timeout insufficient for long-lived connections.
- **GKE (Kubernetes)**: Rejected - operational complexity (manual scaling, load balancer config, health checks), overkill for single service.
- **Compute Engine VMs**: Rejected - manual scaling, no zero-downtime deploys, higher ops burden.

**Implementation Notes**:
- Set `sessionAffinity: true` in Cloud Run service config
- Configure health check endpoint `/healthz` (Express server alongside Socket.io)
- Set max instances to prevent quota exhaustion (start with 10, monitor)
- Use Cloud Run CPU/memory metrics for auto-scaling triggers

---

### Decision 5: In-Memory Metrics with Prometheus Client

**Decision**: Use `prom-client` library to expose Prometheus-format metrics

**Rationale**:
- **Standard Format**: Prometheus metrics widely supported (Google Cloud Monitoring, Grafana)
- **Low Overhead**: In-memory counters/gauges with no external service dependency
- **Real-Time Visibility**: Metrics available immediately (no aggregation delay)
- **Histogram Support**: Native p95/p99 latency tracking (OR-003)

**Alternatives Considered**:
- **Cloud Logging Only**: Rejected - log-based metrics have 1-5 minute delay, expensive for high-cardinality metrics.
- **Google Cloud Monitoring API**: Rejected - requires API calls per metric update (increases latency), quota limits, overkill for simple counters.
- **StatsD/DataDog**: Rejected - adds external service dependency, increases network overhead, not necessary for MVP.

**Implementation Notes**:
- Expose metrics at `/metrics` endpoint (standard Prometheus scrape target)
- Track OR-001: `socket_connections_total` gauge
- Track OR-002: `socket_auth_failures_total` counter
- Track OR-003: `socket_broadcast_latency_seconds` histogram (0.001 to 1.0 sec buckets)
- Track OR-004: `firestore_listener_status` gauge (0=disconnected, 1=connected, 2=error)

---

## Architectural Patterns

### Pattern 1: Single Firestore Listener with Broadcast Fan-Out

**Pattern**: One `onSnapshot()` listener → N Socket.io client broadcasts

**Justification**:
- Minimizes Firestore read operations (1 listener vs N clients polling)
- Centralizes state change detection logic
- Enables consistent broadcast timing (all clients get same event simultaneously)

**Implementation**:
```typescript
const unsubscribe = firestore
  .collection('gameState')
  .doc('live')
  .onSnapshot((snapshot) => {
    const data = snapshot.data();
    const event = mapToSocketEvent(data);
    io.to('gameRoom').emit(event.type, event.payload);
  });
```

---

### Pattern 2: Degraded State Pattern

**Pattern**: Stop accepting new connections when Firestore listener fails, but keep existing connections alive

**Justification**:
- Prevents clients from connecting and receiving no updates (poor UX)
- Allows existing clients to maintain connection for faster recovery
- Avoids thundering herd on reconnect (200+ clients don't all reconnect simultaneously)

**Implementation**:
```typescript
let isHealthy = true;

io.use((socket, next) => {
  if (!isHealthy) {
    next(new Error('Server in degraded state'));
  } else {
    next();
  }
});

firestoreListener.on('error', () => {
  isHealthy = false;
  metrics.firestoreStatus.set(0);
});
```

---

### Pattern 3: Event Mapping Strategy

**Pattern**: Map Firestore document changes to specific Socket.io events based on `currentPhase` field

**Justification**:
- Clients can subscribe to specific events (e.g., projector only cares about GONG)
- Type-safe event payloads (each event has distinct TypeScript interface)
- Extensible (new phases add new events without breaking existing clients)

**Implementation**:
```typescript
function mapToSocketEvent(gameState: GameState): SocketEvent {
  if (!gameState || !gameState.currentPhase) {
    return { type: 'IDLE_STATE', payload: {} };
  }

  switch (gameState.currentPhase) {
    case 'accepting_answers':
      return {
        type: 'START_QUESTION',
        payload: {
          questionId: gameState.currentQuestionId,
          serverStartTime: Date.now(),
        },
      };
    case 'showing_distribution':
    case 'showing_correct_answer':
    case 'showing_results':
    case 'all_revived':
      return {
        type: 'GAME_PHASE_CHANGED',
        payload: { newPhase: gameState.currentPhase },
      };
    default:
      if (gameState.isGongActive) {
        return { type: 'GONG_ACTIVATED', payload: {} };
      }
      return { type: 'GAME_PHASE_CHANGED', payload: { newPhase: gameState.currentPhase } };
  }
}
```

---

## Performance Considerations

### Latency Budget Breakdown

**Target**: <100ms event delivery (p99)

**Budget Allocation**:
- Firestore snapshot delivery: ~20ms (observed, Google infrastructure)
- Event mapping + validation: ~5ms (in-process, negligible)
- Socket.io broadcast: ~10ms (network send buffer write)
- Network transmission: ~50ms (client RTT, varies by connection)
- Client processing: ~15ms (event handler, out of scope)

**Total**: ~100ms (tight but achievable with optimizations)

**Optimizations**:
- Use binary protocol (Socket.io default)
- Minimize event payload size (only essential fields)
- Avoid JSON.stringify in hot path (Socket.io handles serialization)
- Pre-allocate broadcast buffer (reduce GC pressure)

---

### Connection Scaling Strategy

**Target**: 200+ connections per instance

**Socket.io Configuration**:
- `maxHttpBufferSize: 1e6` (1MB, sufficient for auth token)
- `pingTimeout: 60000` (60 seconds, balance between stale detection and false positives)
- `pingInterval: 25000` (25 seconds, 2.4x safety margin)
- `upgradeTimeout: 10000` (10 seconds, allow slow clients to upgrade to WebSocket)

**Node.js Tuning**:
- `--max-old-space-size=512` (Cloud Run default, sufficient for stateless server)
- No UV_THREADPOOL_SIZE change needed (Socket.io is single-threaded event loop)

**Monitoring**:
- Alert if connection count exceeds 180 (90% capacity)
- Auto-scale to new instance at 200 connections

---

## Security Considerations

### Authentication Flow

1. Client connects to Socket.io server
2. Server immediately sends `auth_required` event
3. Client responds with `authenticate` event containing Firebase ID token
4. Server calls `admin.auth().verifyIdToken(token)` (async)
5. If valid: join client to `gameRoom`, send `auth_success`
6. If invalid: disconnect with `auth_failed` error (OR-002)

**Timeout**: Disconnect if no auth message received within 10 seconds

---

### Token Refresh Strategy

**Problem**: Firebase ID tokens expire after 1 hour (FR-013)

**Solution**: Clients are responsible for refreshing tokens and re-authenticating before expiration (per assumption A-004). Server disconnects expired tokens on next ping-pong cycle.

**Implementation**:
- Server does NOT track token expiration timestamps (stateless)
- Clients MUST re-send auth message with refreshed token every 50 minutes
- Server accepts re-authentication on existing connection (updates cached user ID)

---

## Error Handling Strategy

### Malformed Game State (FR-011c)

**Scenario**: Firestore document has unexpected structure (typo in field name, missing required field)

**Handling**:
1. Validate document against TypeScript interface using Zod schema
2. If invalid: log error with document snapshot ID, skip broadcast
3. Emit internal metric `firestore_validation_errors_total`
4. Do NOT disconnect clients (degraded gracefully)

**Example**:
```typescript
const gameStateSchema = z.object({
  currentPhase: z.string(),
  currentQuestionId: z.string().optional(),
  isGongActive: z.boolean().optional(),
});

try {
  const validated = gameStateSchema.parse(snapshot.data());
  broadcastEvent(validated);
} catch (error) {
  logger.error('Invalid game state', { snapshotId: snapshot.id, error });
  metrics.validationErrors.inc();
  // Skip this update, wait for next valid one
}
```

---

### Firestore Listener Disconnect (FR-011a)

**Scenario**: Network interruption between Socket.io server and Firestore

**Handling**:
1. `onSnapshot` error callback fires
2. Set `isHealthy = false` (stops new client connections)
3. Log error with timestamp (OR-004)
4. Existing clients stay connected (no events received)
5. SDK automatically retries with exponential backoff (5s, 10s, 20s, ...)
6. When reconnected: set `isHealthy = true`, resume broadcasts

**No Manual Intervention**: Firebase SDK handles reconnection; server just observes status

---

## Testing Strategy

### Unit Tests (TDD)

**Test Files**:
- `auth/tokenVerifier.test.ts`: Mock Firebase Admin SDK, test valid/invalid/expired tokens
- `events/eventMapper.test.ts`: Test all `currentPhase` values map to correct events
- `utils/validator.test.ts`: Test Zod schema against malformed documents

**Mocking**:
- Use `jest.mock('firebase-admin')` to avoid real Firebase calls
- Mock Firestore snapshot objects with test data

---

### Integration Tests

**Test Files**:
- `integration/connection.test.ts`: Test full Socket.io connection lifecycle (connect, auth, disconnect)
- `integration/broadcast.test.ts`: Test Firestore change triggers Socket.io event (use Firestore emulator)
- `integration/reconnection.test.ts`: Test client reconnects after disconnect, rejoins room

**Setup**:
- Start Socket.io server on random port
- Use `socket.io-client` to create test clients
- Use Firebase Emulator Suite for Firestore (no real Firebase project)

---

### Contract Tests

**Test Files**:
- `contract/eventSchemas.test.ts`: Validate event payloads match TypeScript interfaces in `/packages/types/`

**Approach**:
- Generate JSON schemas from TypeScript types using `typescript-json-schema`
- Validate sample event payloads against schemas
- Ensures clients can safely consume events without runtime type errors

---

## Deployment Considerations

### Cloud Run Configuration

**Container**:
- Base image: `node:18-alpine` (minimal, fast startup)
- Multi-stage build: `npm ci --production` to minimize image size
- Health check: `curl http://localhost:8080/healthz` (HTTP GET)

**Service Config**:
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: socket-server
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/sessionAffinity: true  # Required for WebSocket
    spec:
      containers:
      - image: gcr.io/allstars/socket-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: FIRESTORE_EMULATOR_HOST
          value: ""  # Use real Firestore in production
        resources:
          limits:
            memory: 512Mi
            cpu: 1
```

---

### Environment Variables

**Required**:
- `PORT`: HTTP port for Socket.io server (default 8080)
- `GOOGLE_CLOUD_PROJECT`: Firebase project ID
- `FIRESTORE_COLLECTION`: Collection name (default "gameState")
- `FIRESTORE_DOCUMENT`: Document ID (default "live")

**Optional**:
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `MAX_CONNECTIONS`: Connection limit per instance (default 200)
- `AUTH_TIMEOUT_MS`: Auth message timeout (default 10000)

---

### Monitoring & Alerting

**Cloud Monitoring Metrics**:
- `socket_connections_total` > 180: Scale warning
- `socket_auth_failures_total` rate > 10/minute: Possible attack
- `socket_broadcast_latency_seconds` p99 > 0.15: Performance degradation
- `firestore_listener_status` = 0 for >60s: Critical failure

**Log-Based Alerts**:
- `severity >= ERROR`: Immediate Slack notification
- `firestore_validation_errors_total` > 5: Investigate data corruption

---

## Open Questions (Resolved in Clarifications)

1. ~~Firestore listener disconnect behavior~~ → **RESOLVED**: Stop new connections, maintain existing (Clarification 1)
2. ~~Rapid update handling~~ → **RESOLVED**: Broadcast all updates immediately (Clarification 2)
3. ~~Pre-game connection state~~ → **RESOLVED**: Send IDLE_STATE event (Clarification 3)
4. ~~Malformed data handling~~ → **RESOLVED**: Log and skip, maintain connections (Clarification 4)
5. ~~Observability metrics~~ → **RESOLVED**: 4 metrics defined (Clarification 5)

---

## References

- [Socket.io 4.x Documentation](https://socket.io/docs/v4/)
- [Firebase Admin SDK - Node.js](https://firebase.google.com/docs/admin/setup)
- [Cloud Run - Session Affinity](https://cloud.google.com/run/docs/configuring/session-affinity)
- [Prometheus Client for Node.js](https://github.com/siimon/prom-client)
- [Firestore onSnapshot() Method](https://firebase.google.com/docs/firestore/query-data/listen)

---

**Document Version**: 1.0 | **Last Updated**: 2025-11-03
