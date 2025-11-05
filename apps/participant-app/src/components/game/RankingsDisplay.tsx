import type { GameResults } from '@allstars/types';

interface RankingsDisplayProps {
  results: GameResults;
  isGongActive: boolean;
  currentGuestId?: string;
}

/**
 * Rankings Display Component
 * T065-T069: Conditional rendering based on isGongActive flag
 *
 * - Period-final questions (isGongActive: true): Show only Top 10 (fastest correct)
 * - Non-final questions (isGongActive: false): Show only Worst 10 (slowest correct)
 */
export function RankingsDisplay({ results, isGongActive, currentGuestId }: RankingsDisplayProps) {
  // T068: Check if there are period champions
  const hasPeriodChampions = results.periodChampions && results.periodChampions.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {/* Title with period label if applicable */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Rankings
        {hasPeriodChampions && results.period && (
          <span className="block text-sm text-yellow-600 mt-1">
            {results.period === 'first-half' ? 'First Half' : 'Second Half'} Final
          </span>
        )}
      </h2>

      {/* T066: Hide Top 10 section when isGongActive is false */}
      {/* T068: Display period champion indicator */}
      {isGongActive && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-600 mb-2 text-center">
            Top 10 (Fastest Correct)
          </h3>
          <div className="space-y-2">
            {results.top10.map((entry, index) => {
              const isChampion = results.periodChampions?.includes(entry.guestId);
              const isCurrentGuest = entry.guestId === currentGuestId;

              return (
                <div
                  key={entry.guestId}
                  className={`flex justify-between items-center p-3 rounded ${
                    isChampion
                      ? 'bg-yellow-50 border-2 border-yellow-400'
                      : isCurrentGuest
                        ? 'bg-blue-50 border-2 border-blue-400'
                        : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 w-8">{index + 1}.</span>
                    <span className={`${isCurrentGuest ? 'font-bold' : ''}`}>
                      {entry.guestName}
                      {isCurrentGuest && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                    </span>
                    {isChampion && (
                      <span className="text-xl" title="Period Champion">
                        👑
                      </span>
                    )}
                  </div>
                  <span className="text-green-600 font-semibold">
                    {(entry.responseTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              );
            })}
            {results.top10.length === 0 && (
              <p className="text-center text-gray-500 py-4">No correct answers</p>
            )}
          </div>
        </div>
      )}

      {/* T067: Hide Worst 10 section when isGongActive is true */}
      {!isGongActive && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2 text-center">
            Worst 10 (Slowest Correct)
          </h3>
          <div className="space-y-2">
            {results.worst10.map((entry, index) => {
              const isCurrentGuest = entry.guestId === currentGuestId;

              return (
                <div
                  key={entry.guestId}
                  className={`flex justify-between items-center p-3 rounded ${
                    isCurrentGuest ? 'bg-blue-50 border-2 border-blue-400' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 w-8">{index + 1}.</span>
                    <span className={`${isCurrentGuest ? 'font-bold' : ''}`}>
                      {entry.guestName}
                      {isCurrentGuest && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                    </span>
                  </div>
                  <span className="text-red-600 font-semibold">
                    {(entry.responseTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              );
            })}
            {results.worst10.length === 0 && (
              <p className="text-center text-gray-500 py-4">No entries</p>
            )}
          </div>
        </div>
      )}

      {/* T069: Display error state UI when rankingError is true */}
      {results.rankingError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Ranking calculation incomplete. Rankings may not be accurate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
