interface WaitingScreenProps {
  guestName: string;
  tableNumber: number;
  clockSyncing?: boolean;
  clockSyncError?: string | null;
}

/**
 * Waiting screen component
 *
 * Shown while waiting for the quiz to start.
 * Displays guest info and sync status.
 */
export function WaitingScreen({
  guestName,
  tableNumber,
  clockSyncing = false,
  clockSyncError = null,
}: WaitingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col items-center justify-center p-6 text-white">
      {/* Welcome message */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
        <p className="text-xl opacity-90">{guestName}</p>
        <p className="text-sm opacity-75 mt-1">Table {tableNumber}</p>
      </div>

      {/* Sync status */}
      {clockSyncing && (
        <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-3" />
          <p className="text-sm font-medium">Synchronizing with server...</p>
        </div>
      )}

      {clockSyncError && (
        <div className="bg-error-light text-error-dark rounded-lg p-4 mb-8 max-w-md">
          <p className="font-semibold mb-1">Sync Error</p>
          <p className="text-sm">{clockSyncError}</p>
        </div>
      )}

      {!clockSyncing && !clockSyncError && (
        <>
          {/* Ready indicator */}
          <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success rounded-full mb-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold">You&apos;re all set!</p>
              <p className="text-sm opacity-90 mt-1">Waiting for the quiz to start</p>
            </div>
          </div>

          {/* Animation */}
          <div className="flex space-x-2 mb-8">
            <div
              className="w-3 h-3 bg-white rounded-full animate-pulse"
              style={{ animationDelay: '0s' }}
            />
            <div
              className="w-3 h-3 bg-white rounded-full animate-pulse"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="w-3 h-3 bg-white rounded-full animate-pulse"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="bg-white bg-opacity-10 rounded-lg p-4 max-w-md">
        <p className="text-sm text-center opacity-90">
          Keep your phone ready. Questions will appear automatically when the host starts the game.
        </p>
      </div>
    </div>
  );
}
