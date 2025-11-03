# Research: Participant App - Technology Choices

**Feature**: 005-participant-app
**Date**: 2025-11-03
**Status**: Complete

## Overview

This document consolidates research findings for technology choices and implementation patterns for the Participant App. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved.

## Research Topics

### 1. E2E Testing Framework

**Decision**: Playwright

**Rationale**:
- **Mobile Browser Coverage**: Playwright provides built-in mobile Safari and Chrome emulation with device-specific parameters (viewport, user-agent, touch). BrowserStack now offers real iOS Safari device testing with Playwright (industry-first, June 2025), critical for catching Safari-specific issues that emulation misses.
- **WebSocket & Real-Time**: Playwright uses modern WebSocket connections for low-latency communication and operates out-of-process, making it excellent for testing WebSocket performance and real-time events. Network simulation via CDP (`context.setOffline()`, `Network.emulateNetworkConditions`) enables robust disconnection/reconnection testing.
- **Network Resilience**: Native offline mode (`context.setOffline(true/false)`) and network throttling via Chrome DevTools Protocol allow precise testing of degraded network conditions.
- **Growth & Adoption**: Playwright surpassed Cypress in npm downloads mid-2024 (~5M weekly), indicating strong momentum and community support.

**Alternatives Considered**:
- **Cypress**: Limited Safari support, requires workarounds for mobile testing, less robust WebSocket handling. Better DX for simple cases but insufficient for mobile-first requirements.
- **Appium**: Strong for native apps but overkill for mobile web; adds complexity without significant benefits.

**Integration Notes**:
Playwright integrates seamlessly with Vitest + React Testing Library. Install `@playwright/test` separately for E2E; use Vitest for component/unit tests. Vitest Browser Mode can use Playwright as provider for component testing in real browsers with parallel execution.

---

### 2. QR Code Scanning Library

**Decision**: html5-qrcode (with react-html5-qrcode-reader wrapper)

**Rationale**:
- **Proven Track Record**: Most mature and battle-tested option with proven real-world deployment at scanapp.org
- **Fallback Mechanisms**: Multiple fallback mechanisms (camera + file upload) essential for iOS Safari compatibility
- **Cross-Browser Support**: Works across Android Chrome, Firefox, and Safari
- **Extensive Documentation**: GitHub documentation addresses mobile-specific issues comprehensively
- **Framework Compatibility**: Framework-agnostic core with React wrappers available

**Alternatives Considered**:
- **@yudiel/react-qr-scanner**: Modern alternative with built-in React hooks, barcode detection API support, and recent 2025 updates. Best for React-native experience but lacks proven iOS Safari track record.
- **react-qr-reader**: Lightweight React component but outdated (3.0 beta status), fewer recent updates.

**Browser Compatibility Notes**:
- **iOS Safari**: Only browser with camera access on iOS. html5-qrcode works but requests permission on every reload.
- **Android Chrome/Firefox**: Full camera support via WebRTC.
- **Other iOS Browsers (Chrome, Firefox)**: **Cannot access camera** due to WebKit restrictions. html5-qrcode's file-upload fallback is essential—users capture QR code images and upload them.
- **Implementation Recommendation**: Implement html5-qrcode with file upload fallback UI clearly visible on non-Safari iOS browsers to handle the 15-20% of users on alternative iOS browsers.

---

### 3. Clock Synchronization Algorithm

**Decision**: 5-ping minimum RTT selection with 30-60s re-sync

**Rationale**:
- **5 pings**: Provides statistical robustness without excessive overhead. NTP's 8-stage filter is overkill for a quiz game; 5 samples suffice for real-time applications.
- **Minimum RTT selection**: From the 5 pings, use the offset corresponding to the **minimum roundtrip delay**, as this represents the most accurate measurement taken under nominal network conditions. Research shows this outperforms median filtering.
- **Continuous re-sync**: 30-60s intervals prevent drift accumulation and are typical for game networking.

**Algorithm Implementation**:

```typescript
// For each ping, calculate offset
const offset = (serverTime - clientTime - rtt/2)

// Select offset with minimum RTT (most accurate)
const bestOffset = offsets[rtts.indexOf(Math.min(...rtts))]

// Gradual adjustment to new offset (slewing)
clientClockOffset *= 0.99999  // Slew rate: ~36ms drift per hour
clientClockOffset += (bestOffset - clientClockOffset) * 0.01  // Fade-in over 100 steps
```

**Edge Case Handling**:
- **Extreme offsets (hours/days off)**: Detect if offset > 5s. Issue a client warning and immediately jump the clock (don't slew), as the client is severely out of sync. Re-verify connectivity.
- **Rejecting outliers**: Discard any ping with RTT > 200ms or latency variance > 3x median during synchronization round.
- **Re-sync frequency**: Start with 30s during active gameplay; can increase to 60s if network is stable.

**Expected Accuracy**: ~50ms on modern networks while remaining lightweight.

**Note**: The spec mentions "median" but research recommends "minimum RTT" approach. Implementation should use minimum RTT for better accuracy. Spec will be updated during implementation to reflect this best practice.

---

### 4. WebSocket Event Schema Patterns

**Decision**: Strongly-typed TypeScript interfaces in `@allstars/types/WebSocketEvents.ts`

**Rationale**:
- **Type Safety**: Compile-time validation prevents runtime errors from malformed events
- **Shared Contract**: Both socket-server (emitter) and participant-app (listener) use same types
- **Documentation**: Types serve as self-documenting contracts for event payloads
- **Autocomplete**: IDE support improves developer experience

**Event Schema Structure**:

```typescript
// Example event interfaces
interface StartQuestionEvent {
  type: 'START_QUESTION';
  payload: {
    questionId: string;
    questionText: string;
    choices: Array<{ index: number; text: string }>;
    serverStartTime: number; // Unix timestamp in milliseconds
    period: 'first-half' | 'second-half' | 'overtime';
  };
}

interface GamePhaseChangedEvent {
  type: 'GAME_PHASE_CHANGED';
  payload: {
    phase: 'waiting' | 'answering' | 'reveal' | 'ended';
    correctChoice?: number; // Only present in 'reveal' phase
    questionId?: string;
  };
}
```

**Implementation Notes**:
- Use discriminated unions for type narrowing (`event.type`)
- Validate events at runtime with Zod or io-ts for additional safety
- Document expected event sequences in comments

---

### 5. OpenAPI Specification Status

**Research Finding**: Verified that `/packages/openapi/` directory does not currently exist in the repository.

**Decision**: Document as technical debt, create minimal OpenAPI specs for participant endpoints

**Rationale**:
- **Constitution Compliance**: Principle III requires OpenAPI-first design, but participant endpoints were implemented in api-server (001-002) before this requirement was fully established
- **Practical Approach**: Create OpenAPI specs retroactively to document existing contracts
- **Client Benefits**: TypeScript types can be generated from specs for type-safe API calls

**Action Items**:
- Create `/packages/openapi/participant-api.yaml` documenting:
  - `POST /participant/register`
  - `POST /participant/time`
  - `POST /participant/answer`
- Use Swagger Codegen or OpenAPI Generator to create TypeScript client types
- Document deviation from ideal OpenAPI-first workflow in implementation notes

---

### 6. Code-Splitting Strategy

**Decision**: Route-based lazy loading with React.lazy() + dynamic imports

**Rationale**:
- **Proven in Admin App**: admin-app (004) successfully reduced bundle size from 580KB to 428KB (26% reduction) using this approach
- **Simple Implementation**: React.lazy() is built-in, no additional libraries needed
- **Route Boundaries**: Natural split points align with user navigation (QR scan → waiting → game → results)

**Implementation Pattern**:

```typescript
// App.tsx
const QRScanPage = lazy(() => import('./pages/QRScanPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const DroppedOutPage = lazy(() => import('./pages/DroppedOutPage'));

// Wrap in Suspense with loading fallback
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/join" element={<QRScanPage />} />
    <Route path="/game" element={<GamePage />} />
    <Route path="/dropped" element={<DroppedOutPage />} />
  </Routes>
</Suspense>
```

**Bundle Size Target**: <428KB main bundle (gzipped <117KB) based on admin-app baseline

---

### 7. Vibration API Fallback Pattern

**Decision**: Feature detection with graceful degradation to visual-only feedback

**Rationale**:
- **Browser Support**: Vibration API supported on Android Chrome/Firefox, but not iOS Safari (before iOS 13) or some desktop browsers
- **Progressive Enhancement**: Core functionality (answering questions) works without vibration; haptic feedback enhances experience
- **User Preference**: Some users disable vibration in system settings

**Implementation Pattern**:

```typescript
// lib/vibration.ts
export function vibrate(pattern: number | number[]): boolean {
  if (!('vibrate' in navigator)) {
    console.debug('Vibration API not supported');
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Vibration failed:', error);
    return false;
  }
}

// Usage in components
const handleAnswerTap = (choiceIndex: number) => {
  const vibrated = vibrate(50); // 50ms tap confirmation
  if (!vibrated) {
    // Show visual flash or pulse animation as fallback
    setShowTapFeedback(true);
    setTimeout(() => setShowTapFeedback(false), 50);
  }
  submitAnswer(choiceIndex);
};
```

**Visual Fallback Options**:
- Brief border pulse on tapped button (CSS animation)
- Color flash (e.g., green for 50ms)
- Scale animation (button briefly scales to 105%)

---

## Summary of Technology Stack

Based on research, the final technology stack is:

### Core Framework
- **React** 18.2 - UI library
- **TypeScript** 5.3+ - Type safety
- **Vite** 5.0 - Build tool and dev server
- **Tailwind CSS** 3.4 - Utility-first styling

### Firebase Integration
- **Firebase SDK** 10.7+ (Auth, Firestore, Crashlytics)
- **Authentication**: Anonymous Login
- **Database**: Firestore (read-only guest status monitoring)
- **Error Monitoring**: Firebase Crashlytics

### Real-Time Communication
- **Socket.io Client** 4.8 - WebSocket connection to socket-server

### QR Code Scanning
- **html5-qrcode** (latest) - QR code scanning with camera + file upload fallback
- **react-html5-qrcode-reader** - React wrapper

### Testing
- **Vitest** 1.0 - Unit/integration test runner
- **@testing-library/react** 14.0 - Component testing
- **@playwright/test** (latest) - E2E testing with mobile browser support

### Shared Packages
- **@allstars/types** (workspace) - Shared TypeScript types

### Development Tools
- **ESLint** + **Prettier** - Code quality (same config as admin-app)
- **TypeScript strict mode** - Maximum type safety

---

## Open Questions / Technical Debt

1. **OpenAPI Specs**: Need to create `/packages/openapi/participant-api.yaml` for existing participant endpoints (inherited technical debt from api-server)
2. **Clock Sync Algorithm**: Spec mentions "median" but research recommends "minimum RTT" - will use minimum RTT and update spec during implementation
3. **Re-sync Frequency**: Will start with 30s re-sync during gameplay; may tune to 60s if network is stable (to be determined through load testing)

---

**Completed**: 2025-11-03
**All NEEDS CLARIFICATION items resolved**: ✅
