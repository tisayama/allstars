import type { GameState } from '@/types';
import type { Socket } from 'socket.io-client';
import { TVRankingDisplay } from '../rankings/TVRankingDisplay';

interface ShowingResultsPhaseProps {
  gameState: GameState;
  socket: Socket | null;
}

/**
 * Ranking results display using TV-style graphics
 * Delegates to TVRankingDisplay for all visual rendering
 */
export function ShowingResultsPhase({ gameState, socket }: ShowingResultsPhaseProps) {
  const results = gameState.results;
  const isPeriodFinal = gameState.isGongActive;
  const questionId = gameState.currentQuestion?.questionId;

  // Delegate to TVRankingDisplay for all rendering
  return (
    <TVRankingDisplay
      results={results}
      isGongActive={isPeriodFinal}
      socket={socket}
      questionId={questionId}
    />
  );
}
