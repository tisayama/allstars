import type { GameResults } from '@allstars/types';

interface RankingsDisplayProps {
  results: GameResults;
  isGongActive: boolean;
}

/**
 * Rankings Display Component
 * T070-T074: Conditional rendering based on isGongActive flag
 *
 * - Period-final questions (isGongActive: true): Show only Top 10 (fastest correct)
 * - Non-final questions (isGongActive: false): Show only Worst 10 (slowest correct)
 */
export function RankingsDisplay({ results, isGongActive }: RankingsDisplayProps) {
  // T073: Check if there are period champions
  const hasPeriodChampions = results.periodChampions && results.periodChampions.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Title with period label if applicable */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Rankings
        {hasPeriodChampions && results.period && (
          <span className="block text-base text-yellow-600 mt-2 font-normal">
            {results.period === 'first-half' ? 'First Half' : 'Second Half'} Final
          </span>
        )}
      </h2>

      {/* T071: Hide Top 10 section when isGongActive is false */}
      {/* T073: Display period champion information */}
      {isGongActive && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-green-600">Top 10 (Fastest Correct)</h3>
            {hasPeriodChampions && (
              <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                {results.periodChampions!.length} Champion
                {results.periodChampions!.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {results.top10.map((entry, index) => {
              const isChampion = results.periodChampions?.includes(entry.guestId);

              return (
                <div
                  key={entry.guestId}
                  className={`flex justify-between items-center p-4 rounded-lg transition-colors ${
                    isChampion
                      ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-lg w-10 ${
                        isChampion ? 'text-yellow-700' : 'text-gray-600'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <span
                      className={`text-lg ${
                        isChampion ? 'font-bold text-gray-900' : 'text-gray-800'
                      }`}
                    >
                      {entry.guestName}
                    </span>
                    {isChampion && (
                      <span className="text-2xl ml-2" title="Period Champion">
                        👑
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-semibold text-lg ${
                      isChampion ? 'text-yellow-700' : 'text-green-600'
                    }`}
                  >
                    {(entry.responseTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              );
            })}
            {results.top10.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-lg">No correct answers</p>
            )}
          </div>
        </div>
      )}

      {/* T072: Hide Worst 10 section when isGongActive is true */}
      {!isGongActive && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-red-600 mb-4">Worst 10 (Slowest Correct)</h3>
          <div className="space-y-3">
            {results.worst10.map((entry, index) => (
              <div
                key={entry.guestId}
                className="flex justify-between items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-600 text-lg w-10">#{index + 1}</span>
                  <span className="text-gray-800 text-lg">{entry.guestName}</span>
                </div>
                <span className="text-red-600 font-semibold text-lg">
                  {(entry.responseTimeMs / 1000).toFixed(2)}s
                </span>
              </div>
            ))}
            {results.worst10.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-lg">No entries</p>
            )}
          </div>
        </div>
      )}

      {/* T074: Display error state UI when rankingError is true */}
      {results.rankingError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Ranking Calculation Incomplete</p>
              <p className="text-sm text-yellow-700 mt-1">
                The rankings may not be accurate. This could be due to a temporary error. Consider
                showing the results screen again to recalculate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
