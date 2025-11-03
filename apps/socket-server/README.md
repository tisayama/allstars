# Socket Server

Real-time WebSocket server for game state synchronization using Socket.io and Firebase Firestore.

## Features

- **Real-time Event Broadcasting**: Instant synchronization of game state changes to all connected clients
- **Firebase Authentication**: Stateless JWT token verification with 10-second connection timeout
- **Degraded State Handling**: Gracefully rejects new connections when Firestore listener is unhealthy
- **Prometheus Metrics**: Connection count, auth failures, broadcast latency, and listener status
- **Type-Safe Events**: Full TypeScript support with contract-based event validation

## Quick Start

### Prerequisites

- Node.js >=18.0.0
- pnpm >=8.0.0
- Firebase project with Firestore enabled

### Installation

```bash
# From monorepo root
pnpm install

# Navigate to socket-server
cd apps/socket-server
```

### Environment Variables

Create `.env` file (see `.env.example`):

```bash
PORT=8080
GOOGLE_CLOUD_PROJECT=your-project-id
LOG_LEVEL=INFO
```

### Development

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Lint code
pnpm lint

# Build
pnpm build

# Start server
pnpm start
```

## Architecture

### Event Flow

```
Firestore gameState/live → Listener → Validator → EventMapper → Broadcaster → Socket.io Clients
```

### Event Types

- **START_QUESTION**: Broadcast when `currentPhase = "accepting_answers"`
- **GAME_PHASE_CHANGED**: Broadcast on phase transitions (idle, showing_distribution, showing_results, etc.)
- **GONG_ACTIVATED**: Broadcast when `isGongActive = true` (final question indicator)
- **IDLE_STATE**: Sent to clients connecting before game starts

### Authentication Flow

1. Client connects to server
2. Server sends `AUTH_REQUIRED` event with 10-second timeout
3. Client sends `authenticate` event with Firebase ID token
4. Server verifies token and admits client to `gameRoom` or disconnects on failure

### Degraded State

When the Firestore listener encounters an error:
- Server marks itself as **unhealthy**
- New connections are rejected with `AUTH_FAILED: Server is in degraded state`
- Existing connections are maintained
- Server automatically recovers when Firestore reconnects

## Project Structure

```
apps/socket-server/
├── src/
│   ├── auth/              # Firebase Auth token verification
│   ├── events/            # Event mapping and broadcasting
│   ├── listeners/         # Firestore listener setup
│   ├── middleware/        # Socket.io authentication middleware
│   ├── monitoring/        # Prometheus metrics
│   ├── utils/             # Logger, validator, health state
│   ├── server.ts          # Express + Socket.io server setup
│   └── index.ts           # Entry point
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── contract/          # Contract tests for event payloads
└── scripts/               # Deployment scripts
```

## API Endpoints

- `GET /` - Server info
- `GET /healthz` - Health check for Cloud Run
- `GET /metrics` - Prometheus metrics (OR-001 through OR-004)

## Metrics

### Exposed Metrics

- `socket_connections_total` (Gauge) - Active WebSocket connections
- `auth_failures_total{reason}` (Counter) - Failed authentication attempts
- `broadcast_latency_seconds{event_type}` (Histogram) - Firestore → client broadcast latency
- `firestore_listener_status` (Gauge) - Listener connection state (0=disconnected, 1=connected, 2=error)

### Performance Targets

- **Broadcast Latency**: <100ms p99 for 200+ concurrent connections
- **Auth Timeout**: 10 seconds per connection
- **Phase Sync**: <150ms p95 delivery

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test -- tests/unit/events/eventMapper.test.ts

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

### Test Coverage

- **116 total tests** (89 unit/contract + 27 integration)
- **Coverage threshold**: 80% (branches, functions, lines, statements)

## Deployment

### Docker Build

```bash
docker build -t socket-server .
docker run -p 8080:8080 \
  -e GOOGLE_CLOUD_PROJECT=your-project \
  -e LOG_LEVEL=INFO \
  socket-server
```

### Cloud Run

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

**Important**: Enable **session affinity** in Cloud Run to maintain WebSocket connections.

## Development Guidelines

### TDD Approach

This project follows strict Test-Driven Development:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Code Quality

- **ESLint**: Enforces TypeScript best practices
- **Prettier**: Auto-formatting on commit
- **Type Safety**: Strict TypeScript configuration
- **Error Handling**: All async functions have try-catch blocks

### Adding New Events

1. Define payload type in `/packages/types/src/SocketEvents.ts`
2. Add validator in `src/utils/validator.ts`
3. Write unit tests in `tests/unit/events/eventMapper.test.ts`
4. Implement mapping in `src/events/eventMapper.ts`
5. Add contract test in `tests/contract/`
6. Add integration test in `tests/integration/`

## Troubleshooting

### Firestore Listener Errors

Check listener status metric:
```bash
curl localhost:8080/metrics | grep firestore_listener_status
```

- `0` = Disconnected (server in degraded state)
- `1` = Connected (healthy)
- `2` = Error state

### High Auth Failure Rate

Check failure reasons:
```bash
curl localhost:8080/metrics | grep auth_failures_total
```

Common reasons:
- `timeout` - Client didn't authenticate within 10 seconds
- `invalid_token` - Malformed or expired token
- `degraded_state` - Server listener is unhealthy

### Broadcast Latency Issues

Check histogram:
```bash
curl localhost:8080/metrics | grep broadcast_latency
```

Typical causes:
- Firestore network latency
- High client count (>200 connections)
- CPU throttling in Cloud Run

## License

Proprietary - All Rights Reserved
