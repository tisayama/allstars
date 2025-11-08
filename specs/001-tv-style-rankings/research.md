# Research Findings: TV-Style Rankings Display

**Feature**: TV-Style Rankings Display for Projector App
**Date**: 2025-11-07
**Branch**: `001-tv-style-rankings`

This document consolidates research findings from Phase 0 to resolve technical unknowns before implementation.

---

## R1: CSS Gradient Animation Performance

### Decision
Use **transform-based GPU acceleration** with oversized gradient elements instead of direct background property animation.

### Rationale
Direct `background` or `background-position` animation triggers continuous paint/repaint cycles consuming excessive CPU resources (20-40 FPS at 1080p). Transform-based approaches achieve 60 FPS by leveraging GPU compositor layers.

### Implementation Pattern

```css
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.animated-gradient {
  position: absolute;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    #0ea5e9 0%,    /* Teal */
    #3b82f6 25%,   /* Blue */
    #8b5cf6 50%,   /* Purple */
    #ec4899 75%,   /* Pink */
    #0ea5e9 100%   /* Back to teal */
  );

  /* GPU acceleration triggers */
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;

  /* Smooth animation */
  animation: gradientShift 15s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% { transform: translate3d(0%, 0%, 0); }
  50% { transform: translate3d(-50%, -50%, 0); }
}
```

### Key Optimization Principles
- **Only animate `transform` and `opacity`**: GPU-accelerated, no reflow/repaint
- **Use `translate3d()` not `translateX/Y`**: Z-axis explicitly triggers GPU layer promotion
- **Apply `will-change: transform` sparingly**: Optimizes but consumes GPU memory
- **Use `backface-visibility: hidden`**: Forces element onto compositing layer

### Particle Effects
- **<50 particles**: Use CSS animations
- **50-500 particles**: Use Canvas 2D API
- **500+ particles**: Requires WebGL (add complexity)

For projection displays, CSS animations are sufficient for decorative bubbles/particles.

### Alternatives Considered
- **JavaScript `requestAnimationFrame`**: More control but worse performance than CSS compositor thread
- **Canvas/WebGL gradients**: Overkill for simple gradient shifts, adds bundle size
- **CSS `background-position` animation**: Severe performance penalty (rejected)

---

## R2: React Performance Monitoring Patterns

### Decision
Implement custom `useFPSMonitor()` hook using **rolling time-window approach** with `requestAnimationFrame` and dual-threshold hysteresis.

### Rationale
Time-based sampling (vs frame-count averaging) provides accurate real-world performance measurement, handles variable refresh rates (60Hz/120Hz), and naturally adapts to display capabilities.

### Implementation Pattern

```typescript
function useFPSMonitor(threshold = 25) {
  const [shouldDegrade, setShouldDegrade] = useState(false);
  const frameTimestamps = useRef<number[]>([]);
  const degradeStartTime = useRef<number | null>(null);
  const recoverStartTime = useRef<number | null>(null);
  const rafId = useRef<number>();

  useLayoutEffect(() => {
    const measure = (timestamp: number) => {
      const timestamps = frameTimestamps.current;
      timestamps.push(timestamp);

      // Keep 2-second rolling window
      while (timestamps[0] < timestamp - 2000) {
        timestamps.shift();
      }

      if (timestamps.length >= 2) {
        const elapsed = (timestamp - timestamps[0]) / 1000;
        const avgFPS = timestamps.length / elapsed;

        // Dual-threshold hysteresis: 25 FPS to degrade, 35 FPS to recover
        if (avgFPS < threshold) {
          if (!degradeStartTime.current) {
            degradeStartTime.current = timestamp;
          } else if (timestamp - degradeStartTime.current >= 2000) {
            setShouldDegrade(true);
          }
          recoverStartTime.current = null;
        } else if (avgFPS > threshold + 10) {
          if (!recoverStartTime.current) {
            recoverStartTime.current = timestamp;
          } else if (timestamp - recoverStartTime.current >= 2000) {
            setShouldDegrade(false);
          }
          degradeStartTime.current = null;
        }
      }

      rafId.current = requestAnimationFrame(measure);
    };

    rafId.current = requestAnimationFrame(measure);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [threshold]);

  return shouldDegrade;
}
```

### Debouncing Strategy
**Dual-threshold hysteresis** prevents animation flickering:
- Degrade when FPS < 25 for 2 consecutive seconds
- Recover when FPS > 35 for 2 consecutive seconds
- 10 FPS gap prevents rapid toggling

### Edge Cases
- **Component unmounting**: `useLayoutEffect` ensures synchronous cleanup before next frame
- **Tab visibility**: Consider pausing monitoring when `document.hidden === true`
- **Initial load**: Ignore first 2 seconds to avoid penalizing shader compilation
- **Variable refresh rates**: Time-based sampling automatically handles 60/120/144Hz displays

### Alternatives Considered
- **Existing libraries** (`use-fps`, `react-fps`): Add dependencies, less control over degradation logic
- **React Profiler API**: Developer tool, not suitable for production performance monitoring
- **Simple frame counting**: Inaccurate on variable refresh rate displays

---

## R3: Socket.io Connection State Management

### Decision
Use React `useEffect` + `useState` pattern with **debounced indicator visibility** (2-second delay for disconnect, immediate hide on reconnect).

### Rationale
Socket.io v4.x provides robust connection lifecycle events. React hooks naturally handle event subscription/cleanup. Debouncing prevents UI flicker during transient network issues.

### Socket.io v4.x Events
- `connect`: Connection successfully established
- `disconnect`: Connection lost (provides reason)
- `connect_error`: Connection attempt failed
- `reconnect`: Successful automatic reconnection
- `reconnect_attempt`: Before each reconnection attempt
- `reconnect_failed`: All reconnection attempts exhausted

### Implementation Pattern

```typescript
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export function useConnectionStatus(socketRef: React.RefObject<Socket | null>) {
  const [isConnected, setIsConnected] = useState(false);
  const [showDisconnected, setShowDisconnected] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor connection events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socketRef]);

  // Debounced indicator visibility
  useEffect(() => {
    if (!isConnected) {
      // Show indicator after 2 seconds of sustained disconnect
      debounceTimerRef.current = setTimeout(() => {
        setShowDisconnected(true);
      }, 2000);
    } else {
      // Hide immediately on reconnect
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setShowDisconnected(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isConnected]);

  return { isConnected, showDisconnected };
}
```

### Debouncing Logic
- **2-second delay before showing**: Prevents flicker during transient disconnections
- **Immediate hide on reconnect**: Provides instant feedback when connection restored
- **Cleanup on unmount**: Prevents state updates on unmounted components

### Existing Codebase Patterns
Reviewed `apps/projector-app/src/hooks/useWebSocket.ts` and found consistent pattern:
- Use `useRef` to persist socket instance
- Register listeners in `useEffect` with empty dependencies `[]`
- Always cleanup with `socket.off(event, handler)` using named handlers

### Alternatives Considered
- **No debouncing**: Causes UI flicker during brief network blips
- **Longer delay (5+ seconds)**: Users unaware of disconnection issues
- **Exponential backoff**: Over-complex for simple indicator display

---

## R4: Japanese Text Rendering on Projection Displays

### Decision
Use **Noto Sans JP** (weights 500-700) from Google Fonts CDN with optimized rendering hints and fallback to system fonts.

### Rationale
Noto Sans JP provides excellent legibility at large sizes, complete character coverage (kanji, hiragana, katakana), and automatic subsetting via Google Fonts for optimized loading.

### Font Configuration

```css
font-family: 'Noto Sans JP', 'Yu Gothic', 'YuGothic', 'Hiragino Sans',
             'Hiragino Kaku Gothic Pro', 'Meiryo', 'MS Gothic', sans-serif;
font-weight: 500-700; /* Medium to bold */
letter-spacing: 0.05em-0.15em; /* Increased breathing room */
line-height: 1.5-1.7; /* 150-170% for Japanese */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

**Note**: Avoid `text-rendering: optimizeLegibility` on body text (performance impact). Use only for headings if needed.

### Font Size Guidelines

For 15-meter viewing distance on 1920×1080 displays:
- **Minimum: 36-48px** (spec baseline)
- **Optimal: 48-64px** (comfortable extended viewing)
- **Rule of thumb**: 4mm text height per meter of viewing distance

Scaling by distance:
- 5m: 24-36px sufficient
- 10m: 36-48px (spec minimum)
- 15m: 48-64px (optimal)
- 20m: 64-80px minimum

### Loading Strategy

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700&display=swap" rel="stylesheet">
```

- Use `font-display: swap` to show system fonts immediately while web fonts load
- Google Fonts automatically subsets Noto Sans JP into 120 parts for optimized delivery
- Preconnect DNS resolution improves initial load time

### Alternatives Considered
- **Yu Gothic**: Good alternative but inconsistent rendering across platforms
- **Hiragino Sans**: macOS-only, not available on Windows
- **Self-hosting WOFF2**: More control but adds build complexity
- **System fonts only**: Inconsistent appearance across devices

---

## R5: Stagger Animation Implementation in React

### Decision
Use **hybrid CSS animations with React hook state management** for one-time playback control.

### Rationale
CSS animations provide optimal performance (compositor thread) while React state enables precise control over one-time-per-question playback. Avoids library overhead (20-40KB) for simple stagger effects.

### Implementation Pattern

```typescript
// hooks/useRankingAnimation.ts
import { useEffect, useState } from 'react';

export const useRankingAnimation = (questionId: string) => {
  const [playedQuestions, setPlayedQuestions] = useState<Set<string>>(new Set());
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!playedQuestions.has(questionId)) {
      setShouldAnimate(true);
      setPlayedQuestions(prev => new Set(prev).add(questionId));

      // Cleanup flag after animation completes (10 entries × 100ms + base duration)
      const timeout = setTimeout(() => setShouldAnimate(false), 1500);
      return () => clearTimeout(timeout);
    } else {
      setShouldAnimate(false);
    }
  }, [questionId]);

  return {
    shouldAnimate,
    getStaggerDelay: (index: number) => index * 100
  };
};

// Component usage
const { shouldAnimate, getStaggerDelay } = useRankingAnimation(questionId);

return rankings.map((entry, index) => (
  <div
    key={entry.guestId}
    className={shouldAnimate ? 'animate-fade-in-up' : 'opacity-100'}
    style={{
      animationDelay: shouldAnimate ? `${getStaggerDelay(index)}ms` : '0ms'
    }}
  >
    {/* ranking content */}
  </div>
));
```

### CSS Animation

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 400ms ease-out forwards;
}
```

### Timing Recommendations
- **Stagger delay**: 100ms per entry for 10 items (~1s total duration)
- **Base animation**: 400ms (smooth but not sluggish)
- **Avoid**: <50ms (chaotic), >150ms (laggy)

### State Management
- Use React state (not localStorage) — animations should reset on page refresh
- `Set` lookup is O(1) for checking played questions
- `useEffect` dependency on `questionId` ensures automatic reset

### Alternatives Considered
- **React Spring / Framer Motion**: Adds 20-40KB bundle overhead for simple effect
- **IntersectionObserver**: Unnecessary since rankings always visible when mounted
- **JavaScript RAF animation**: More complex, worse performance than CSS

---

## R6: Graceful Asset Loading Fallback Patterns

### Decision
Use **state-based `onError` handler** with CSS `aspect-ratio` for layout stability and SVG data URI placeholders.

### Rationale
Modern CSS `aspect-ratio` property prevents Cumulative Layout Shift (CLS). State-based error handling prevents infinite re-render loops. SVG data URIs require no additional HTTP requests.

### Implementation Pattern

```typescript
interface ImageWithFallbackProps {
  src: string;
  fallback: string;
  alt: string;
}

export function ImageWithFallback({ src, fallback, alt }: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleError = () => {
    if (!hasError) { // Prevent infinite loop if fallback also fails
      setHasError(true);
      setImgSrc(fallback);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      aspectRatio: '16/9', // Reserve space, prevent CLS
      position: 'relative',
      backgroundColor: '#2a2a2a'
    }}>
      <img
        src={imgSrc}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        onError={handleError}
      />
    </div>
  );
}
```

### SVG Placeholder Pattern

```typescript
const SVG_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
  <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#2a2a2a"/>
    <text x="50%" y="50%" font-size="24" fill="#888"
          text-anchor="middle" dy=".3em">
      Show Logo
    </text>
  </svg>
`)}`;
```

### Layout Stability Techniques
- **Modern approach**: CSS `aspect-ratio` property (all major browsers 2021+)
- **Legacy approach**: HTML `width`/`height` attributes for aspect ratio calculation
- **Reserve space**: Always set container dimensions before image loads

### Error Boundary Considerations
**Error boundaries do NOT catch image loading failures** (these are DOM events, not React errors). Use local `onError` handling within components. Existing `ErrorBoundary` in projector-app is suitable for component-level failures, not asset loading.

### Alternatives Considered
- **Throw errors on image failure**: Would trigger error boundary, block entire UI (rejected)
- **CSS `::before` fallback**: Less flexible than component state approach
- **No placeholder**: Poor UX with layout shift and blank space

---

## D1: GameState Data Structure

### Summary
The `GameResults` type from `@allstars/types` package provides the exact contract for ranking data consumed by the projector-app.

### Data Structure

```typescript
// From @allstars/types/src/GameState.ts

export interface RankedAnswer {
  /** Participant (guest) ID */
  guestId: string;
  /** Participant display name (pre-formatted with nickname) */
  guestName: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
}

export interface GameResults {
  /** Top 10 fastest correct answers (ascending order by responseTimeMs) */
  top10: RankedAnswer[];

  /** Worst 10 slowest incorrect answers (descending order by responseTimeMs) */
  worst10: RankedAnswer[];

  /** Participant IDs of period champions (fastest correct on period-final) */
  periodChampions?: string[];

  /** Period identifier matching currentQuestion.period */
  period?: GamePeriod; // 'first-half' | 'second-half'

  /** True if ranking calculation failed after all retry attempts */
  rankingError?: boolean;
}
```

### Key Findings

1. **Display names are pre-formatted**: `guestName` field contains full display string (e.g., "土屋桂子(ウィッツ)")
   - No need to concatenate name + nickname in projector-app
   - Aligns with spec requirement (FR-002 clarification)

2. **Response times in milliseconds**: Convert to seconds with 2 decimals for display
   - Formula: `(responseTimeMs / 1000).toFixed(2)`

3. **Arrays are pre-sorted**:
   - `top10`: Ascending order (fastest first)
   - `worst10`: Descending order (slowest first)
   - No sorting needed in UI layer

4. **Period champions are optional**: Check existence with `hasPeriodChampions()` helper
   - Display champion badge only when array has entries
   - Supports multiple champions (ties)

5. **Error handling**: `rankingError` flag indicates calculation failures
   - When true, arrays are empty
   - Show graceful error message in UI

### Helper Functions Available

```typescript
// Type guards from @allstars/types
isValidGameResults(results: unknown): results is GameResults
hasRankingError(results: GameResults): boolean
hasPeriodChampions(results: GameResults): boolean
getDisplayRanking(results: GameResults, isGongActive: boolean): 'top10' | 'worst10'
```

### Integration Points
- **Source**: Socket.io `gameState` event with full `GameState` payload
- **Access**: `gameState.results` property (may be null/undefined)
- **Consumer**: `ShowingResultsPhase` component receives via props

---

## D2: Existing Phase Component Patterns

### Summary
Analyzed existing phase components in `apps/projector-app/src/components/phases/` to extract established patterns for consistency.

### Component Structure Pattern

```typescript
// Standard phase component interface
interface PhaseProps {
  gameState: GameState;
}

export function PhaseName({ gameState }: PhaseProps) {
  // Extract needed data from gameState
  const results = gameState.results;
  const currentQuestion = gameState.currentQuestion;

  // Null/undefined checks
  if (!results) {
    return <ErrorState />;
  }

  // Render phase content
  return <div>{/* phase UI */}</div>;
}
```

### Styling Approach
**Inline styles are the established pattern** (not CSS modules):

```typescript
<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: '3rem',
  }}
>
```

**Rationale**: Simple, colocated, no CSS module configuration needed. Consistent across all phase components.

### Props Interface Pattern
- All phase components receive `gameState: GameState` prop
- Extract needed fields within component (destructuring)
- Perform null/undefined checks before rendering

### Animation Patterns
Current codebase has minimal animations:
- Primarily CSS transitions for opacity/transform
- No complex animation libraries in use
- Follows web platform standards

### Error Handling
- Check for null/undefined data before render
- Return simple error message `<div>` if data missing
- No error boundaries within phase components (handled at app level)

### File Organization
```
apps/projector-app/src/components/phases/
├── ShowingResultsPhase.tsx      # Rankings display (to be modified)
├── AcceptingAnswersPhase.tsx    # Question display
├── ShowingDistributionPhase.tsx # Answer distribution
└── [other phases...]
```

### Reusable Patterns for New Components
1. **Container-based layout**: Flexbox with `minHeight: 100vh`, centered content
2. **Color scheme**: Dark backgrounds (#1a1a1a), bright accent colors (#4a9eff, #fbbf24)
3. **Typography**: Large font sizes (2-3rem headings), high contrast
4. **Spacing**: Generous padding (3rem), consistent gaps between sections
5. **Type safety**: Strict TypeScript, explicit prop interfaces

---

## Summary of Decisions

| Research Area | Decision | Key Technology |
|---------------|----------|----------------|
| R1: Gradient Animation | Transform-based GPU acceleration | CSS `translate3d()`, `will-change` |
| R2: FPS Monitoring | Rolling time-window with hysteresis | `requestAnimationFrame`, `useLayoutEffect` |
| R3: Socket Connection | Debounced indicator (2s delay) | Socket.io events, `useEffect` |
| R4: Japanese Fonts | Noto Sans JP 500-700 weights | Google Fonts CDN, `font-display: swap` |
| R5: Stagger Animation | CSS + React state hybrid | CSS `@keyframes`, `Set` tracking |
| R6: Asset Fallback | `onError` with aspect-ratio | SVG data URI, `aspect-ratio` CSS |
| D1: Data Structure | GameResults from @allstars/types | `RankedAnswer[]`, pre-formatted names |
| D2: Component Patterns | Inline styles, gameState props | React functional components |

All technical unknowns resolved. Ready to proceed to Phase 1: Design & Contracts.
