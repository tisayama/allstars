import { useState } from 'react';
import { isValidToken } from '@/utils/qr-parser';

interface ManualTokenEntryProps {
  onTokenSubmit: (token: string) => void;
  loading?: boolean;
}

/**
 * Manual token entry component for guests who cannot scan QR codes.
 *
 * Validates token format before submission.
 */
export function ManualTokenEntry({ onTokenSubmit, loading = false }: ManualTokenEntryProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate token
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError('Please enter a token');
      return;
    }

    if (!isValidToken(trimmedToken)) {
      setError(
        'Invalid token format. Token should be at least 10 characters and contain only letters, numbers, hyphens, and underscores.'
      );
      return;
    }

    // Submit token
    onTokenSubmit(trimmedToken);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Token input */}
        <div>
          <label htmlFor="token-input" className="block text-sm font-medium text-gray-700 mb-2">
            Guest Token
          </label>
          <input
            id="token-input"
            type="text"
            value={token}
            onChange={handleChange}
            placeholder="Enter your token"
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ minHeight: '44px', fontSize: '16px' }} // 16px prevents zoom on iOS
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error-light text-error-dark p-3 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          style={{ minHeight: '44px' }}
        >
          {loading ? 'Joining...' : 'Join Quiz'}
        </button>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          Your token can be found on your invitation. If you don&apos;t have a token, please contact
          the host.
        </p>
      </form>
    </div>
  );
}
