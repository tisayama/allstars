# AllStars Host Control App

Tablet-optimized React web application for controlling the AllStars Wedding Quiz Game. Provides real-time game state monitoring and host action controls.

## Features

### ✅ Implemented (v1.0)

- **Google Authentication** (US4-P1)
  - Secure Google Sign-In with Firebase Auth
  - Session persistence across page reloads
  - Automatic token refresh (5-minute threshold)
  - Protected routes with authentication guards

- **Real-Time Game State Display** (US3-P1)
  - Live Firestore synchronization
  - Display of current phase, question, gong status
  - Participant count monitoring
  - Time remaining countdown
  - Automatic reconnection after network errors

- **Question Progression Controls** (US1-P1)
  - Phase-validated action buttons
  - Start Question → Show Distribution → Show Correct Answer → Show Results
  - Visual feedback for loading states
  - Error handling with retry logic

- **Special Event Triggers** (US2-P2)
  - Gong activation (emergency stop)
  - Revive All Participants
  - Phase-aware button visibility

## Tech Stack

- **React 18.2** - UI framework
- **TypeScript 5.3** - Type safety (strict mode)
- **Vite 5.0** - Build tool and dev server
- **Firebase SDK 10.7+** - Auth and Firestore
- **React Router 6.20** - Client-side routing
- **Sentry 7.90** - Error monitoring
- **Vitest 1.0** - Unit/integration testing
- **Playwright 1.40** - E2E testing

## Project Structure

```
apps/host-app/
├── src/
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── controls/           # Game control components
│   │   │   ├── ActionButton.tsx
│   │   │   └── ControlButtons.tsx
│   │   └── layout/             # Layout components
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useGameState.ts     # Firestore listener hook
│   │   └── useHostActions.ts   # API client hook
│   ├── lib/
│   │   ├── api-client.ts       # Backend API client
│   │   ├── firebase.ts         # Firebase initialization
│   │   └── logger.ts           # Sentry logging
│   ├── pages/
│   │   ├── ControlPanel.tsx    # Main control interface
│   │   └── LoginPage.tsx       # Login page
│   ├── types/
│   │   └── index.ts            # Type re-exports
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── tests/
│   ├── unit/                   # Unit tests (Vitest)
│   ├── integration/            # Integration tests (Vitest + emulators)
│   └── e2e/                    # E2E tests (Playwright)
├── .env.example                # Environment variables template
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
└── package.json
```

## Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm
- Firebase project with Auth and Firestore enabled

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
```

### Environment Variables

Create `.env` file in `apps/host-app/`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Backend API
VITE_API_BASE_URL=https://your-region-your-project.cloudfunctions.net

# Sentry (Optional)
VITE_SENTRY_DSN=https://your-sentry-dsn

# Development: Firebase Emulators
VITE_USE_EMULATOR=true
VITE_EMULATOR_AUTH_URL=http://127.0.0.1:9099
VITE_EMULATOR_FIRESTORE_HOST=127.0.0.1
VITE_EMULATOR_FIRESTORE_PORT=8080
```

## Development

### Start Dev Server

```bash
pnpm dev
```

App runs at: `http://localhost:5173`

### With Firebase Emulators

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
pnpm dev
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

### Formatting

```bash
pnpm format
pnpm format:check
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run specific test file
pnpm test tests/unit/hooks/useAuth.test.ts

# Watch mode
pnpm test
```

### Integration Tests

Requires Firebase emulators running:

```bash
# Start emulators first
firebase emulators:start

# Run integration tests
pnpm test:integration
```

### E2E Tests

```bash
# Install browsers (first time only)
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui
```

### Test Coverage

```bash
pnpm test:coverage
```

## Building

### Production Build

```bash
pnpm build
```

Output: `dist/` directory

Bundle sizes:
- React vendor: ~159KB (gzip: ~52KB)
- Firebase vendor: ~406KB (gzip: ~95KB)
- App code: ~244KB (gzip: ~79KB)
- CSS: ~9.5KB (gzip: ~2.3KB)

### Preview Production Build

```bash
pnpm preview
```

## Usage

### 1. Login

1. Navigate to the app URL
2. Click "Sign in with Google"
3. Authenticate with authorized Google account
4. Redirected to Control Panel

### 2. Connect to Game Session

1. Enter game session ID
2. Click "Connect"
3. Real-time game state loads

### 3. Control Game

**Phase-based actions** (buttons appear based on current phase):

- **ready_for_next**: "Start Question" button
- **accepting_answers**: "Show Distribution" button + "🔔 Trigger Gong"
- **showing_distribution**: "Show Correct Answer" button + "🔔 Trigger Gong"
- **showing_correct_answer**: "Show Results" button
- **showing_results**: "Ready for Next Question" button
- **all_incorrect**: "Revive All Participants" button
- **all_revived**: "Continue Game" button

### 4. Monitor State

Real-time display cards show:
- Current phase
- Active question (number + text)
- Gong status (Active/Inactive)
- Participant count
- Time remaining
- Last update timestamp

## Architecture

### Authentication Flow

```
User → Google Login → Firebase Auth → ID Token → localStorage
                                              ↓
                                    Auto-refresh (5min threshold)
```

### Real-Time State Flow

```
Firestore game-sessions/{sessionId} → onSnapshot listener
                                            ↓
                                    useGameState hook
                                            ↓
                                    React state update
                                            ↓
                                    UI re-render
```

### Host Action Flow

```
User clicks button → useHostActions.triggerAction()
                            ↓
                    Phase validation
                            ↓
                    API client (with retry)
                            ↓
            POST /api/host-action/{sessionId}
                    + Authorization: Bearer {idToken}
                            ↓
                    Backend processes action
                            ↓
                Firestore state update
                            ↓
            Real-time listener triggers UI update
```

## Tablet Optimization

- **Target viewports**: 768px - 1024px (iPad, Android tablets)
- **Touch targets**: Minimum 44x44px (actual: 52-56px)
- **Responsive grid**: Auto-fit columns for state cards
- **Font sizes**: 16-17px for body text (readability)
- **Button padding**: 14-16px (comfortable touch area)
- **Media queries**: Optimized for portrait and landscape orientations

## Error Handling

### Client-Side

- API timeouts: 10 seconds with AbortController
- Retry logic: Exponential backoff (1s, 2s, 4s)
- Network errors: User-friendly messages
- Phase validation: Prevents invalid actions
- Firestore errors: Auto-reconnection

### Logging

All errors logged to Sentry with context:
- Authentication events
- API request failures
- Firestore connection issues
- Game state transitions

## Security

- Firebase Authentication required
- ID tokens included in all API requests
- Protected routes (redirect to login if unauthenticated)
- Token auto-refresh before expiry
- HTTPS enforced in production
- No sensitive data in localStorage (only tokens)

## Browser Support

- Chrome 90+ (recommended for tablets)
- Safari 14+ (iOS/iPadOS)
- Firefox 88+
- Edge 90+

## Performance

- Code splitting (React, Firebase vendors)
- Tree shaking enabled
- Lazy loading for routes
- Optimized bundle sizes
- HMR in development

## Known Limitations

1. **Single session at a time**: Can only control one game session simultaneously
2. **Manual session ID entry**: No session discovery/listing
3. **No offline mode**: Requires active internet connection
4. **Firebase emulator required for local dev**: Cannot use production Firebase in development
5. **TypeScript strict mode + React Router 6**: `tsc --noEmit` shows React Router type errors, but `vite build` works correctly. This is a known React Router 6 + strict TypeScript compatibility issue and does not affect runtime behavior.

## Troubleshooting

### "Not authenticated" error
- Check if ID token is valid: `localStorage.getItem('host-auth')`
- Try logging out and back in
- Verify Firebase Auth configuration

### Real-time updates not working
- Check Firestore emulator is running (dev)
- Verify session ID is correct
- Check browser console for connection errors
- Verify Firestore rules allow read access

### API requests failing
- Check `VITE_API_BASE_URL` environment variable
- Verify backend API is deployed and accessible
- Check network tab for detailed error responses
- Verify ID token is valid and not expired

### Build errors
- Run `pnpm install` to ensure dependencies are up to date
- Check TypeScript errors: `pnpm typecheck`
- Verify all environment variables are set

## Contributing

1. Follow TypeScript strict mode guidelines
2. Write tests for new features (TDD approach)
3. Run linter before committing: `pnpm lint:fix`
4. Format code: `pnpm format`
5. Ensure all tests pass: `pnpm test:unit`

## License

Private - All rights reserved
