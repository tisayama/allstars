# AllStars Participant App

Mobile web application for wedding guests to participate in real-time quiz games.

## Features

- **QR Code Authentication**: Quick join via Firebase Anonymous Login
- **Real-Time Quiz**: Answer questions with WebSocket synchronization
- **Clock Sync**: 5-ping algorithm for fair timing (<50ms accuracy)
- **Haptic Feedback**: Vibration patterns for tap/success/failure
- **Drop-Out Monitoring**: Real-time status updates via Firestore
- **Offline Resilience**: Answer queuing with exponential backoff retry

## Tech Stack

- **Frontend**: React 18.2, TypeScript 5.3, Vite 5.0
- **Styling**: Tailwind CSS 3.4
- **State**: React hooks (useAuth, useClockSync, useWebSocket, useGameState, useGuestStatus)
- **Backend**: Firebase SDK 10.7+ (Auth, Firestore, Crashlytics)
- **Real-Time**: Socket.io Client 4.8
- **QR Scanning**: html5-qrcode 2.3.8
- **Testing**: Vitest 1.0, @testing-library/react 14.0, Playwright 1.40

## Quick Start

See [quickstart guide](/specs/005-participant-app/quickstart.md) for detailed setup instructions.

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Build for production
pnpm build
```

## Development

- **Port**: 5173 (configurable in vite.config.ts)
- **Node Version**: >=18.0.0
- **Package Manager**: pnpm >=8.0.0

## Project Structure

```
src/
├── components/     # React components (auth, game, status, shared)
├── hooks/          # Custom hooks for business logic
├── lib/            # SDK integrations (Firebase, API client)
├── utils/          # Pure functions (clock sync, answer queue)
└── pages/          # Route components

tests/
├── unit/           # Unit tests for utils, lib, hooks
├── integration/    # Integration tests for flows
├── component/      # Component tests with @testing-library
└── e2e/            # E2E tests with Playwright
```

## Performance Targets

- **Load Time**: <3s on 3G (1.6 Mbps, 300ms RTT)
- **Answer Latency**: <200ms (p90)
- **Clock Accuracy**: <50ms (p95)
- **Bundle Size**: <428KB main bundle (gzipped <117KB)

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (with timeout 300s)
- `pnpm test` - Run unit and integration tests (with timeout 120s)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report (target: 80%+)
- `pnpm test:component` - Run component tests
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm lint` - Run ESLint (max 0 warnings)
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...

# API Configuration
VITE_API_BASE_URL=...
VITE_SOCKET_SERVER_URL=...

# Feature Flags
VITE_USE_EMULATORS=false
VITE_DISABLE_VIBRATION=false
VITE_LOG_LEVEL=info
```

## Testing

### Unit Tests

```bash
pnpm test tests/unit/utils/clock-sync.test.ts
```

### Component Tests

```bash
pnpm test:component
```

### E2E Tests

```bash
pnpm test:e2e
```

### Coverage

Target: 80%+ for critical functions (clock sync, answer submission, reconnection logic)

```bash
pnpm test:coverage
```

## Mobile Testing

For testing on physical devices, use ngrok to expose local server over HTTPS (required for camera access):

```bash
ngrok http 5173
```

Then access the ngrok HTTPS URL on your mobile device.

## Constitution Compliance

This app follows the AllStars monorepo constitution:

- **Principle I**: Monorepo structure with `apps/participant-app/`
- **Principle II**: TDD with Red-Green-Refactor cycle, 80%+ coverage
- **Principle III**: Consumes OpenAPI-documented APIs
- **Principle IV**: ESLint + Prettier, all tests pass before commits
- **Principle V**: Timeout wrappers on build (300s) and test (120s) scripts

## Documentation

- [Feature Spec](/specs/005-participant-app/spec.md)
- [Implementation Plan](/specs/005-participant-app/plan.md)
- [Task Breakdown](/specs/005-participant-app/tasks.md)
- [Quickstart Guide](/specs/005-participant-app/quickstart.md)
- [API Contracts](/specs/005-participant-app/contracts/participant-api.yaml)
- [WebSocket Events](/specs/005-participant-app/contracts/websocket-events.ts)

## License

Private - AllStars Platform
