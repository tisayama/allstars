import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { useClockSync } from '@/hooks/useClockSync';
import { useGuestStatus } from '@/hooks/useGuestStatus';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { AnswerButtons } from '@/components/game/AnswerButtons';
import { WaitingScreen } from '@/components/status/WaitingScreen';
import { DroppedOutPage } from './DroppedOutPage';

/**
 * Game Page - Main quiz interface
 *
 * Handles all game phases:
 * - waiting: Waiting for quiz to start
 * - answering: Display question and answer buttons
 * - reveal: Show correct answer
 * - ended: Game over
 */
export function GamePage() {
  const { guestProfile } = useAuth();
  const { syncing, error: syncError } = useClockSync();
  const {
    phase,
    currentQuestion,
    selectedChoice,
    correctChoice,
    answerLocked,
    submitting,
    error: gameError,
    submitAnswer,
    isReady,
  } = useGameState(guestProfile?.guestId ?? null);
  const { isDropped, rank, totalPoints, correctAnswers } = useGuestStatus(
    guestProfile?.guestId ?? null
  );

  // Shouldn't happen due to ProtectedRoute, but handle gracefully
  if (!guestProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Authentication required</p>
        </div>
      </div>
    );
  }

  /**
   * Render drop-out overlay if guest is eliminated
   * This overlay appears on top of any current game phase
   */
  const renderDroppedOutOverlay = () => {
    if (!isDropped) return null;

    return (
      <DroppedOutPage
        guestName={guestProfile.name}
        {...(rank !== undefined && { rank })}
        {...(totalPoints !== undefined && { totalPoints })}
        {...(correctAnswers !== undefined && { correctAnswers })}
      />
    );
  };

  /**
   * Waiting phase - show waiting screen
   */
  if (phase === 'waiting') {
    return (
      <>
        <WaitingScreen
          guestName={guestProfile.name}
          tableNumber={guestProfile.tableNumber}
          clockSyncing={syncing}
          clockSyncError={syncError}
        />
        {renderDroppedOutOverlay()}
      </>
    );
  }

  /**
   * Answering phase - show question and answer buttons
   */
  if (phase === 'answering' && currentQuestion) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex flex-col p-4">
          {/* Header */}
          <header className="bg-primary text-white py-4 px-4 rounded-lg shadow-md mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{guestProfile.name}</p>
                <p className="text-xs opacity-75">Table {guestProfile.tableNumber}</p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isReady ? 'bg-success' : 'bg-warning'
                }`}
              >
                {isReady ? 'Ready' : 'Syncing...'}
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            <QuestionDisplay question={currentQuestion} />

            {/* Error message */}
            {gameError && (
              <div className="bg-error-light text-error-dark p-4 rounded-lg mb-4 text-sm">
                <p className="font-semibold mb-1">Submission Error</p>
                <p>{gameError}</p>
              </div>
            )}

            {/* Answer buttons */}
            <AnswerButtons
              choices={currentQuestion.choices}
              selectedChoice={selectedChoice}
              correctChoice={null}
              locked={answerLocked || submitting}
              onSelectAnswer={submitAnswer}
            />

            {/* Submission status */}
            {submitting && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <p className="text-sm text-gray-600 mt-2">Submitting answer...</p>
              </div>
            )}

            {answerLocked && !submitting && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Answer locked. Waiting for results...</p>
              </div>
            )}
          </main>
        </div>
        {renderDroppedOutOverlay()}
      </>
    );
  }

  /**
   * Reveal phase - show correct answer
   */
  if (phase === 'reveal' && currentQuestion) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex flex-col p-4">
          {/* Header */}
          <header className="bg-primary text-white py-4 px-4 rounded-lg shadow-md mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{guestProfile.name}</p>
                <p className="text-xs opacity-75">Table {guestProfile.tableNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">Results</p>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            <QuestionDisplay question={currentQuestion} />

            {/* Result message */}
            <div
              className={`p-4 rounded-lg mb-4 text-center ${
                selectedChoice === correctChoice
                  ? 'bg-success-light text-success-dark'
                  : 'bg-error-light text-error-dark'
              }`}
            >
              <p className="text-2xl font-bold mb-1">
                {selectedChoice === correctChoice ? 'Correct!' : 'Incorrect'}
              </p>
              <p className="text-sm">
                {selectedChoice === correctChoice
                  ? 'Great job! You got it right!'
                  : 'Better luck on the next question!'}
              </p>
            </div>

            {/* Answer buttons with results */}
            <AnswerButtons
              choices={currentQuestion.choices}
              selectedChoice={selectedChoice}
              correctChoice={correctChoice}
              locked={true}
              onSelectAnswer={() => {}}
              showResults={true}
            />

            {/* Next question indicator */}
            <div className="mt-6 text-center">
              <div className="inline-flex space-x-2">
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">Waiting for next question...</p>
            </div>
          </main>
        </div>
        {renderDroppedOutOverlay()}
      </>
    );
  }

  /**
   * Ended phase - game over
   */
  if (phase === 'ended') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center p-6 text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Game Over!</h1>
            <p className="text-xl opacity-90 mb-2">Thank you for playing!</p>
            <p className="text-sm opacity-75">Final results will be announced by the host.</p>
          </div>
        </div>
        {renderDroppedOutOverlay()}
      </>
    );
  }

  // Fallback for unexpected phase
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
      {renderDroppedOutOverlay()}
    </>
  );
}
