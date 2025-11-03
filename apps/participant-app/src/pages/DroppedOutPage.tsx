interface DroppedOutPageProps {
  guestName: string;
  rank?: number;
  totalPoints?: number;
  correctAnswers?: number;
}

/**
 * Dropped Out Page - Shown when guest is eliminated
 *
 * Displays final stats and spectator mode message.
 */
export function DroppedOutPage({
  guestName,
  rank,
  totalPoints,
  correctAnswers,
}: DroppedOutPageProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center p-6 text-white z-50">
      {/* Elimination message */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-error rounded-full mb-4">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">You&apos;ve Been Eliminated</h1>
        <p className="text-lg opacity-90">{guestName}</p>
      </div>

      {/* Final stats */}
      <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">Final Stats</h2>

        <div className="space-y-4">
          {rank !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Final Rank</span>
              <span className="text-2xl font-bold">#{rank}</span>
            </div>
          )}

          {totalPoints !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Points</span>
              <span className="text-2xl font-bold">{totalPoints}</span>
            </div>
          )}

          {correctAnswers !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Correct Answers</span>
              <span className="text-2xl font-bold">{correctAnswers}</span>
            </div>
          )}
        </div>
      </div>

      {/* Spectator mode message */}
      <div className="bg-primary bg-opacity-20 rounded-lg p-4 max-w-md">
        <p className="text-sm text-center">
          You can continue watching as a spectator. The game will continue with the remaining
          players.
        </p>
      </div>

      {/* Thank you message */}
      <div className="mt-8 text-center opacity-75">
        <p className="text-sm">Thank you for playing!</p>
        <p className="text-xs mt-1">Keep this screen open to watch the rest of the game</p>
      </div>
    </div>
  );
}
