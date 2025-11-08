# Quick Start: TV-Style Rankings Display

**Feature**: TV-Style Rankings Display for Projector App
**Date**: 2025-11-07
**Branch**: `001-tv-style-rankings`

This guide provides component architecture, integration points, and implementation patterns for the TV-style ranking display feature.

---

## Component Hierarchy

```
<ShowingResultsPhase gameState={gameState}>           [EXISTING - Modified]
  │
  └─► <TVRankingDisplay results={results} isGongActive={isGongActive}>  [NEW]
       │
       ├─► <TVBackground animationsEnabled={animationsEnabled} />  [NEW]
       │
       ├─► <TVBranding                                [NEW]
       │    period={period}
       │    showPeriodChampions={showPeriodChampions}
       │    isConnected={isConnected}
       │   >
       │    └─► <ConnectionIndicator show={showDisconnected} />  [NEW]
       │
       ├─► <RankingList                               [NEW]
       │    type="worst10"
       │    config={worst10Config}
       │    animationsEnabled={animationsEnabled}
       │    questionId={questionId}
       │   >
       │    └─► <RankingEntry                         [NEW]
       │         rank={1-10}
       │         displayName="..."
       │         responseTime={0.00}
       │         isHighlighted={boolean}
       │         highlightColor="red|gold|undefined"
       │         isPeriodChampion={boolean}
       │        />  × 10
       │
       └─► <RankingList type="top10" .../> [only if isGongActive]
            └─► <RankingEntry .../> × 10
```

---

## Component Interfaces

### ShowingResultsPhase (Modified)

**File**: `apps/projector-app/src/components/phases/ShowingResultsPhase.tsx`

```typescript
import type { GameState } from '@allstars/types';
import { TVRankingDisplay } from '../rankings/TVRankingDisplay';

interface ShowingResultsPhaseProps {
  gameState: GameState;
}

export function ShowingResultsPhase({ gameState }: ShowingResultsPhaseProps) {
  const results = gameState.results;
  const isGongActive = gameState.isGongActive;

  // Validation
  if (!results || !isValidGameResults(results)) {
    return <div style={{ padding: '2rem', color: '#ffffff' }}>
      Error: No valid results data available
    </div>;
  }

  // Delegate to new TV-style component
  return <TVRankingDisplay results={results} isGongActive={isGongActive} />;
}
```

**Changes**:
- Replace existing ranking display logic with `<TVRankingDisplay />`
- Keep validation and error handling
- Pass `results` and `isGongActive` props

---

### TVRankingDisplay (New Container)

**File**: `apps/projector-app/src/components/rankings/TVRankingDisplay.tsx`

```typescript
import type { GameResults } from '@allstars/types';
import { useFPSMonitor } from '../../hooks/useFPSMonitor';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { TVBackground } from './TVBackground';
import { TVBranding } from './TVBranding';
import { RankingList } from './RankingList';
import { createWorst10Config, createTop10Config } from '../../utils/rankingHelpers';

interface TVRankingDisplayProps {
  results: GameResults;
  isGongActive: boolean;
}

export function TVRankingDisplay({ results, isGongActive }: TVRankingDisplayProps) {
  // Performance monitoring
  const animationsEnabled = useFPSMonitor(25);

  // Connection monitoring
  const { isConnected, showDisconnected } = useConnectionStatus();

  // Transform data
  const worst10Config = createWorst10Config(results);
  const top10Config = isGongActive ? createTop10Config(results) : null;

  const questionId = results.period || 'default'; // Use period as question identifier

  return (
    <div className="tv-ranking-container">
      {/* Animated gradient background */}
      <TVBackground animationsEnabled={animationsEnabled} />

      {/* Top branding with connection indicator */}
      <TVBranding
        period={results.period}
        showPeriodChampions={top10Config?.showPeriodChampions || false}
        isConnected={isConnected}
      >
        <ConnectionIndicator show={showDisconnected} />
      </TVBranding>

      {/* Main content area */}
      <div className="rankings-content">
        {/* Worst 10 - always shown */}
        <RankingList
          config={worst10Config}
          animationsEnabled={animationsEnabled}
          questionId={questionId}
        />

        {/* Top 10 - only for period-final questions (isGongActive) */}
        {top10Config && (
          <RankingList
            config={top10Config}
            animationsEnabled={animationsEnabled}
            questionId={questionId}
          />
        )}
      </div>
    </div>
  );
}
```

**Responsibilities**:
- Orchestrate sub-components
- Monitor FPS and connection status with hooks
- Transform GameResults to UI configs
- Pass animation flags to children

---

### TVBackground (New)

**File**: `apps/projector-app/src/components/rankings/TVBackground.tsx`

```typescript
interface TVBackgroundProps {
  animationsEnabled: boolean;
}

export function TVBackground({ animationsEnabled }: TVBackgroundProps) {
  return (
    <div className="tv-background-container">
      <div
        className={`tv-gradient ${animationsEnabled ? 'animated' : 'static'}`}
        style={{
          animationPlayState: animationsEnabled ? 'running' : 'paused'
        }}
      />
    </div>
  );
}
```

**CSS** (`src/styles/tv-rankings.css`):
```css
.tv-background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: -1;
}

.tv-gradient {
  position: absolute;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    135deg,
    #0ea5e9 0%,
    #3b82f6 25%,
    #8b5cf6 50%,
    #ec4899 75%,
    #0ea5e9 100%
  );
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
}

.tv-gradient.animated {
  animation: gradientShift 15s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% { transform: translate3d(0%, 0%, 0); }
  50% { transform: translate3d(-50%, -50%, 0); }
}
```

**Responsibilities**:
- Render gradient background
- Conditionally enable/disable animation based on FPS
- GPU-accelerated with `transform: translate3d()`

---

### TVBranding (New)

**File**: `apps/projector-app/src/components/rankings/TVBranding.tsx`

```typescript
import { useState } from 'react';
import type { GamePeriod } from '@allstars/types';

interface TVBrandingProps {
  period?: GamePeriod;
  showPeriodChampions: boolean;
  isConnected: boolean;
  children?: React.ReactNode; // For ConnectionIndicator
}

const LOGO_URL = '/assets/show-logo.png'; // Adjust path as needed
const FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(`
  <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#2a2a2a"/>
    <text x="50%" y="50%" font-size="18" fill="#888" text-anchor="middle" dy=".3em">
      AllStars
    </text>
  </svg>
`)}`;

export function TVBranding({ period, showPeriodChampions, children }: TVBrandingProps) {
  const [logoSrc, setLogoSrc] = useState(LOGO_URL);
  const [hasError, setHasError] = useState(false);

  const handleLogoError = () => {
    if (!hasError) {
      setHasError(true);
      setLogoSrc(FALLBACK_SVG);
    }
  };

  const periodLabel = period === 'first-half' ? '前半' : period === 'second-half' ? '後半' : null;

  return (
    <div className="tv-branding">
      <div className="branding-left">
        {periodLabel && <span className="period-label">{periodLabel}</span>}
      </div>

      <div className="branding-center">
        <img
          src={logoSrc}
          alt="Show Logo"
          className="show-logo"
          onError={handleLogoError}
          style={{ aspectRatio: '2/1', objectFit: 'contain' }}
        />
      </div>

      <div className="branding-right">
        <span className="live-badge">生放送</span>
        {children /* ConnectionIndicator */}
      </div>
    </div>
  );
}
```

**Responsibilities**:
- Display show logo with fallback on error
- Show period identifier (前半/後半)
- Display "生放送" live badge
- Render connection indicator (passed as children)

---

### ConnectionIndicator (New)

**File**: `apps/projector-app/src/components/rankings/ConnectionIndicator.tsx`

```typescript
interface ConnectionIndicatorProps {
  show: boolean;
}

export function ConnectionIndicator({ show }: ConnectionIndicatorProps) {
  if (!show) return null;

  return (
    <div className="connection-indicator">
      <span className="indicator-icon">⚠</span>
      <span className="indicator-text">接続切断</span>
    </div>
  );
}
```

**CSS**:
```css
.connection-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #fca5a5;
}
```

**Responsibilities**:
- Show subtle disconnect warning
- Positioned in corner (non-intrusive)
- Only visible when `show` prop is true

---

### RankingList (New)

**File**: `apps/projector-app/src/components/rankings/RankingList.tsx`

```typescript
import type { RankingDisplayConfig } from '../../utils/rankingHelpers';
import { useRankingAnimation } from '../../hooks/useRankingAnimation';
import { RankingEntry } from './RankingEntry';

interface RankingListProps {
  config: RankingDisplayConfig;
  animationsEnabled: boolean;
  questionId: string;
}

export function RankingList({ config, animationsEnabled, questionId }: RankingListProps) {
  const { shouldAnimate, getStaggerDelay } = useRankingAnimation(questionId);

  return (
    <div className={`ranking-list ranking-list-${config.type}`}>
      {/* Side label (vertical text) */}
      <div className="ranking-label">
        <span className="vertical-text">{config.title}</span>
      </div>

      {/* Ranking entries */}
      <div className="ranking-entries">
        {config.entries.map((entry, index) => (
          <RankingEntry
            key={entry.guestId}
            {...entry}
            shouldAnimate={shouldAnimate && animationsEnabled}
            animationDelay={getStaggerDelay(index)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Responsibilities**:
- Render vertical side label (e.g., "早押しワースト10")
- Manage stagger animation state
- Map entries to RankingEntry components

---

### RankingEntry (New)

**File**: `apps/projector-app/src/components/rankings/RankingEntry.tsx`

```typescript
interface RankingEntryProps {
  rank: number;
  displayName: string;
  responseTime: number;
  isHighlighted: boolean;
  highlightColor?: 'red' | 'gold';
  isPeriodChampion: boolean;
  shouldAnimate: boolean;
  animationDelay: number;
}

export function RankingEntry({
  rank,
  displayName,
  responseTime,
  isHighlighted,
  highlightColor,
  isPeriodChampion,
  shouldAnimate,
  animationDelay,
}: RankingEntryProps) {
  const backgroundColor = highlightColor === 'red'
    ? 'rgba(239, 68, 68, 0.3)'
    : highlightColor === 'gold'
    ? 'rgba(250, 204, 21, 0.3)'
    : 'rgba(59, 130, 246, 0.2)';

  return (
    <div
      className={`ranking-entry ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
      style={{
        backgroundColor,
        animationDelay: shouldAnimate ? `${animationDelay}ms` : '0ms',
      }}
    >
      <span className="rank-number">{rank}</span>
      <span className="participant-name">
        {displayName}
        {isPeriodChampion && <span className="champion-badge">★</span>}
      </span>
      <span className="response-time">{responseTime.toFixed(2)}</span>
    </div>
  );
}
```

**CSS**:
```css
.ranking-entry {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 2rem;
  margin-bottom: 0.5rem;
  border-radius: 0.5rem;
  font-family: 'Noto Sans JP', 'Yu Gothic', sans-serif;
}

.rank-number {
  font-size: 48px;
  font-weight: 700;
  min-width: 80px;
  text-align: center;
  color: #ffffff;
}

.participant-name {
  flex: 1;
  font-size: 36px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.response-time {
  font-size: 40px;
  font-weight: 700;
  color: #fbbf24;
  min-width: 120px;
  text-align: right;
}

.champion-badge {
  margin-left: 0.5rem;
  color: #fbbf24;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 400ms ease-out forwards;
}
```

**Responsibilities**:
- Display rank, name, and time
- Apply color-coded background
- Handle stagger animation timing
- Show champion badge if applicable

---

## Custom Hooks

### useFPSMonitor

**File**: `apps/projector-app/src/hooks/useFPSMonitor.ts`

```typescript
import { useState, useLayoutEffect, useRef } from 'react';

export function useFPSMonitor(threshold = 25): boolean {
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

        // Hysteresis: 25 FPS to degrade, 35 FPS to recover
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

  return !shouldDegrade; // Return animationsEnabled (inverted)
}
```

---

### useRankingAnimation

**File**: `apps/projector-app/src/hooks/useRankingAnimation.ts`

```typescript
import { useEffect, useState } from 'react';

export function useRankingAnimation(questionId: string) {
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
    getStaggerDelay: (index: number) => index * 100, // 100ms per entry
  };
}
```

---

### useConnectionStatus

**File**: `apps/projector-app/src/hooks/useConnectionStatus.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket'; // Existing hook providing socket ref

export function useConnectionStatus() {
  const socketRef = useSocket(); // Get existing socket instance
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
      debounceTimerRef.current = setTimeout(() => {
        setShowDisconnected(true);
      }, 2000);
    } else {
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

---

## Utility Functions

### rankingHelpers.ts

**File**: `apps/projector-app/src/utils/rankingHelpers.ts`

```typescript
import type { GameResults, RankedAnswer } from '@allstars/types';
import { hasPeriodChampions } from '@allstars/types';

export interface RankingEntry {
  rank: number;
  guestId: string;
  displayName: string;
  responseTime: number;
  isHighlighted: boolean;
  highlightColor?: 'red' | 'gold';
  isPeriodChampion: boolean;
}

export interface RankingDisplayConfig {
  title: string;
  entries: RankingEntry[];
  period?: 'first-half' | 'second-half';
  showPeriodChampions: boolean;
  periodChampions: string[];
  type: 'worst10' | 'top10';
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

function toRankingEntry(
  rankedAnswer: RankedAnswer,
  rank: number,
  isHighlighted: boolean,
  highlightColor: 'red' | 'gold' | undefined,
  periodChampions: string[] = []
): RankingEntry {
  return {
    rank,
    guestId: rankedAnswer.guestId,
    displayName: truncate(rankedAnswer.guestName, 50),
    responseTime: Number((rankedAnswer.responseTimeMs / 1000).toFixed(2)),
    isHighlighted,
    highlightColor,
    isPeriodChampion: periodChampions.includes(rankedAnswer.guestId),
  };
}

export function createWorst10Config(results: GameResults): RankingDisplayConfig {
  const entries = results.worst10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      index === results.worst10.length - 1,
      index === results.worst10.length - 1 ? 'red' : undefined,
      results.periodChampions || []
    )
  );

  return {
    title: '早押しワースト10',
    entries,
    period: results.period,
    showPeriodChampions: false,
    periodChampions: [],
    type: 'worst10',
  };
}

export function createTop10Config(results: GameResults): RankingDisplayConfig {
  const entries = results.top10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      index === 0,
      index === 0 ? 'gold' : undefined,
      results.periodChampions || []
    )
  );

  return {
    title: '早押しトップ10',
    entries,
    period: results.period,
    showPeriodChampions: hasPeriodChampions(results),
    periodChampions: results.periodChampions || [],
    type: 'top10',
  };
}
```

---

## Integration Points

### Existing Socket Connection

The projector-app already has a socket connection established in `apps/projector-app/src/hooks/useWebSocket.ts`. The `useConnectionStatus()` hook integrates with this existing socket instance.

**Pattern**:
```typescript
// Existing: useWebSocket.ts provides socket instance
const socketRef = useRef<Socket | null>(null);

// New: useConnectionStatus.ts consumes socket instance
export function useConnectionStatus() {
  const socketRef = useSocket(); // Get existing socket
  // ... monitor connection events
}
```

### GameState Updates

The `ShowingResultsPhase` component already receives `gameState` prop from the parent app. No changes needed to socket event handling — just delegate to new `TVRankingDisplay` component.

---

## File Checklist

### New Files to Create

**Components**:
- [ ] `apps/projector-app/src/components/rankings/TVRankingDisplay.tsx`
- [ ] `apps/projector-app/src/components/rankings/TVBackground.tsx`
- [ ] `apps/projector-app/src/components/rankings/TVBranding.tsx`
- [ ] `apps/projector-app/src/components/rankings/ConnectionIndicator.tsx`
- [ ] `apps/projector-app/src/components/rankings/RankingList.tsx`
- [ ] `apps/projector-app/src/components/rankings/RankingEntry.tsx`

**Hooks**:
- [ ] `apps/projector-app/src/hooks/useFPSMonitor.ts`
- [ ] `apps/projector-app/src/hooks/useRankingAnimation.ts`
- [ ] `apps/projector-app/src/hooks/useConnectionStatus.ts`

**Utils**:
- [ ] `apps/projector-app/src/utils/rankingHelpers.ts`

**Styles**:
- [ ] `apps/projector-app/src/styles/tv-rankings.css`

### Files to Modify

- [ ] `apps/projector-app/src/components/phases/ShowingResultsPhase.tsx` (replace rendering logic)

### Assets Required

- [ ] Show logo image at `/public/assets/show-logo.png` (or configure path in TVBranding component)

---

## Next Steps

1. Review this quickstart guide
2. Proceed to `/speckit.tasks` to generate task breakdown
3. Execute tasks following TDD discipline
4. Run tests and verify on projection hardware
5. Create PR with self-review

**Branch**: `001-tv-style-rankings`
**Documentation**: All artifacts in `/specs/001-tv-style-rankings/`
