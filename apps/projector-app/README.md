# Projector App - Broadcast Display Client

Read-only broadcast client for AllStars wedding quiz game event. Displays game state reactively on projector screens.

## Tech Stack

- **React 18.2** - UI framework
- **TypeScript 5.3** - Type safety
- **Vite 5.0** - Build tool and dev server
- **Firebase SDK 10.x** - Firestore (state) + Storage (audio assets)
- **Socket.io-client 4.x** - WebSocket for synchronized events
- **Web Audio API** - Audio playback with crossfading

## Project Structure

```
apps/projector-app/
├── src/
│   ├── components/          # React components
│   │   ├── phases/          # Phase-specific UI screens
│   │   │   ├── ReadyForNextPhase.tsx
│   │   │   ├── AcceptingAnswersPhase.tsx
│   │   │   ├── ShowingDistributionPhase.tsx
│   │   │   ├── ShowingCorrectAnswerPhase.tsx
│   │   │   ├── ShowingResultsPhase.tsx
│   │   │   ├── AllRevivedPhase.tsx
│   │   │   └── AllIncorrectPhase.tsx
│   │   ├── ConnectionStatus.tsx    # Real-time connection status display
│   │   ├── ErrorBoundary.tsx       # Error boundary for graceful error handling
│   │   ├── ErrorScreen.tsx
│   │   └── LoadingIndicator.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useGameState.ts        # Firestore game state listener
│   │   ├── useAnswerCount.ts      # Real-time answer counting
│   │   ├── usePhaseAudio.ts       # Phase-based background music
│   │   ├── useAudioPlayer.ts      # Web Audio API wrapper
│   │   └── useWebSocket.ts        # WebSocket connection with auth
│   ├── lib/                 # Core libraries
│   │   ├── audioManager.ts  # Web Audio API wrapper
│   │   ├── config.ts        # Environment configuration
│   │   └── firebase.ts      # Firebase initialization (Firestore, Storage, Auth)
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx              # Root component with phase routing
│   └── main.tsx             # Entry point
├── tests/                   # Test files (114 tests)
│   ├── unit/
│   │   ├── components/      # Component tests
│   │   └── hooks/           # Hook tests
│   ├── integration/
│   └── e2e/
└── public/
    └── index.html
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Firebase emulators (Firestore, Storage)
- Socket-server running on :3001

### Installation

```bash
# From repository root
pnpm install

# Or install just projector-app
pnpm install --filter @allstars/projector-app
```

### Development

```bash
# Start dev server (http://localhost:5173)
cd apps/projector-app
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format
```

### Environment Variables

Create `.env.development`:

```env
# Firebase (Emulator Mode)
VITE_USE_EMULATORS=true
VITE_FIREBASE_PROJECT_ID=allstars-dev
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=demo-storage-bucket

# Socket Server
VITE_SOCKET_SERVER_URL=http://localhost:3001

# Audio Assets
VITE_AUDIO_ASSETS_BUCKET=gs://allstars-dev.appspot.com
```

## Implementation Status

### Phase 1: Setup ✅ Complete
- Project structure created
- Build tools configured (Vite, TypeScript, ESLint, Prettier)
- Dependencies installed

### Phase 2: Infrastructure ✅ Complete
- Type definitions created
- Configuration system implemented
- Firebase SDK initialized with emulator support (Firestore, Storage, Auth)
- Audio manager implemented (Web Audio API)
- Base components created (ErrorScreen, LoadingIndicator, ConnectionStatus)

### Phase 3: Game State Management ✅ Complete
- useGameState hook with Firestore real-time listener
- Phase-specific UI components for all 7 game phases
- Phase routing in App.tsx

### Phase 4: Answer Count Tracking ✅ Complete
- useAnswerCount hook with Firestore collection listener
- Real-time answer counting for active questions
- Answer counts displayed in AcceptingAnswersPhase

### Phase 5: Audio Integration ✅ Complete
- useAudioPlayer hook wrapping Web Audio API
- usePhaseAudio hook for automatic BGM playback
- Phase-based background music with crossfading

### Phase 6: WebSocket Event Synchronization ✅ Complete
- useWebSocket hook with socket.io-client
- Firebase Authentication integration for WebSocket auth
- Event handlers for GONG_ACTIVATED, START_QUESTION, GAME_PHASE_CHANGED
- ConnectionStatus component displays both Firestore and WebSocket status

### Phase 7: Polish ✅ Complete
- ErrorBoundary component for graceful error handling
- Performance review and optimization (code splitting, memoization)
- Production build configuration verified
- Documentation updated

## Test Coverage

- **114 unit tests** covering all hooks and components
- All tests passing
- TypeScript compilation: ✓ No errors
- ESLint: ✓ No warnings

## Architecture

### Data Flow

```
Firestore (gameState/live)
    ↓ onSnapshot
useGameState hook
    ↓ state updates
App.tsx (phase router)
    ↓ render
Phase Components (ready_for_next, accepting_answers, etc.)
```

### Audio Flow

```
Firebase Storage
    ↓ pre-load on init
AudioManager (Web Audio API)
    ↓ triggered by phase changes / WebSocket events
Audio playback (BGM loops, SFX one-shots)
```

### WebSocket Flow

```
Socket.io Server (:3001)
    ↓ connect + authenticate
useWebSocket hook
    ↓ event handlers
App.tsx / Phase Components
```

**Implemented Events:**
- `AUTH_REQUIRED` - Server requests authentication
- `authenticate` - Client sends Firebase ID token
- `AUTH_SUCCESS` / `AUTH_FAILED` - Authentication result
- `GONG_ACTIVATED` - Synchronized gong sound trigger
- `START_QUESTION` - Question start notification with timing
- `GAME_PHASE_CHANGED` - Phase transition notification

## Testing Strategy

- **Unit**: Hook logic, utility functions, components
- **Integration**: Firestore listeners, WebSocket connections
- **E2E**: Full phase transitions with Playwright

## Performance Targets

- State update latency: <500ms (Firestore propagation)
- Audio playback latency: <100ms (Web Audio API)
- WebSocket sync: <50ms (client-to-client)

## References

- [Feature Spec](../../specs/001-projector-app/spec.md)
- [Implementation Plan](../../specs/001-projector-app/plan.md)
- [Quickstart Guide](../../specs/001-projector-app/quickstart.md)
- [Data Model](../../specs/001-projector-app/data-model.md)
- [WebSocket Contracts](../../specs/001-projector-app/contracts/websocket-events.md)
