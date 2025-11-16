import { useCallback } from 'react';
import { useProjectorAuth } from '@/hooks/useProjectorAuth';
import { usePhaseAudio } from '@/hooks/usePhaseAudio';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDualChannelUpdates } from '@/hooks/useDualChannelUpdates';
import { ErrorScreen } from '@/components/ErrorScreen';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ReadyForNextPhase } from '@/components/phases/ReadyForNextPhase';
import { AcceptingAnswersPhase } from '@/components/phases/AcceptingAnswersPhase';
import { ShowingDistributionPhase } from '@/components/phases/ShowingDistributionPhase';
import { ShowingCorrectAnswerPhase } from '@/components/phases/ShowingCorrectAnswerPhase';
import { ShowingResultsPhase } from '@/components/phases/ShowingResultsPhase';
import { AllRevivedPhase } from '@/components/phases/AllRevivedPhase';
import { AllIncorrectPhase } from '@/components/phases/AllIncorrectPhase';
import type { GamePhase } from '@/types';

function App() {
  // Use projector authentication hook
  const { user, isLoading: isAuthLoading, error: authError } = useProjectorAuth();

  // WebSocket event handlers
  const handleGongActivated = useCallback(() => {
    console.log('[WebSocket] GONG_ACTIVATED event received');
    // TODO: Play gong sound effect
  }, []);

  const handleStartQuestion = useCallback(
    (payload: { questionId: string; serverStartTime: number }) => {
      console.log('[WebSocket] START_QUESTION event received:', payload);
    },
    []
  );

  const handleGamePhaseChanged = useCallback((payload: { newPhase: string }) => {
    console.log('[WebSocket] GAME_PHASE_CHANGED event received:', payload);
  }, []);

  // Connect to WebSocket for real-time events
  const {
    socket,
    isConnected: websocketConnected,
    isAuthenticated: websocketAuthenticated,
    error: websocketError,
  } = useWebSocket({
    user,
    onGongActivated: handleGongActivated,
    onStartQuestion: handleStartQuestion,
    onGamePhaseChanged: handleGamePhaseChanged,
  });

  // Use dual-channel updates (WebSocket + Firestore with deduplication)
  const { gameState, connectionStatus, error: gameStateError } = useDualChannelUpdates({
    socket,
    isWebSocketAuthenticated: websocketAuthenticated,
  });

  // Automatically play phase-based background music
  usePhaseAudio(gameState?.currentPhase ?? null);

  // Show error screen if authentication failed
  if (authError) {
    return (
      <ErrorScreen
        title="Authentication Error"
        message="Failed to authenticate with Firebase"
        details={authError}
      />
    );
  }

  // Show loading indicator while waiting for authentication
  if (isAuthLoading) {
    return <LoadingIndicator message="Authenticating..." />;
  }

  // Show error screen if gameState listener failed
  if (gameStateError) {
    return (
      <ErrorScreen
        title="Connection Error"
        message="Failed to load game state"
        details={gameStateError}
      />
    );
  }

  // Show loading indicator while waiting for initial game state
  if (!gameState) {
    return <LoadingIndicator message="Connecting to game..." />;
  }

  // Render phase-specific component based on currentPhase
  const renderPhase = () => {
    const phase: GamePhase = gameState.currentPhase;

    switch (phase) {
      case 'ready_for_next':
        return <ReadyForNextPhase gameState={gameState} />;

      case 'accepting_answers':
        return <AcceptingAnswersPhase gameState={gameState} />;

      case 'showing_distribution':
        return <ShowingDistributionPhase gameState={gameState} />;

      case 'showing_correct_answer':
        return <ShowingCorrectAnswerPhase gameState={gameState} />;

      case 'showing_results':
        return <ShowingResultsPhase gameState={gameState} socket={socket} />;

      case 'all_revived':
        return <AllRevivedPhase gameState={gameState} />;

      case 'all_incorrect':
        return <AllIncorrectPhase gameState={gameState} />;

      default:
        return (
          <ErrorScreen
            title="Unknown Phase"
            message={`Unrecognized game phase: ${phase}`}
            details="The game state contains an invalid phase value."
          />
        );
    }
  };

  return (
    <div data-testid="app-container">
      <div data-testid="current-phase" data-phase={gameState.currentPhase}>
        {renderPhase()}
      </div>
      <ConnectionStatus
        firestoreConnected={connectionStatus.firestore}
        websocketConnected={websocketConnected}
        websocketAuthenticated={websocketAuthenticated}
        error={websocketError || gameStateError}
      />
    </div>
  );
}

export default App;
