/**
 * SettingsPage component (T096)
 * Configuration page for game settings (dropout and ranking rules)
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { GameSettings } from '@allstars/types';
import { useSettings } from '@/hooks/useSettings';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function SettingsPage() {
  const { settings, loading, error, fetchSettings, updateSettings } = useSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<GameSettings>({
    defaultValues: {
      defaultDropoutRule: 'period',
      defaultRankingRule: 'time',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: GameSettings) => {
    try {
      setSaveSuccess(false);
      setSaveError(null);

      await updateSettings(data);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (loading && !settings) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Game Settings</h2>
        <p className="text-gray-600 mt-1">
          Configure default game rules for the quiz
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchSettings}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md" data-testid="settings-saved-message">
          <p className="text-green-700">✓ Settings updated successfully</p>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">Error: {saveError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Default Dropout Rule */}
          <div>
            <label htmlFor="defaultDropoutRule" className="block text-sm font-medium text-gray-700 mb-2">
              Default Drop-out Rule
            </label>
            <select
              id="defaultDropoutRule"
              {...register('defaultDropoutRule')}
              data-testid="dropout-rule-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="period">Period-based (drop out at end of each period)</option>
              <option value="worst_one">Worst One (drop slowest/worst after each question)</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              How players are eliminated during the game
            </p>
          </div>

          {/* Default Ranking Rule */}
          <div>
            <label htmlFor="defaultRankingRule" className="block text-sm font-medium text-gray-700 mb-2">
              Default Ranking Rule
            </label>
            <select
              id="defaultRankingRule"
              {...register('defaultRankingRule')}
              data-testid="ranking-rule-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="time">Time-based (fastest correct answers win)</option>
              <option value="point">Point-based (most points win)</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              How players are ranked and winners are determined
            </p>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              ℹ️ About Game Settings
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>These settings apply to new games by default</li>
              <li>Settings are stored in the gameState/live Firestore document</li>
              <li>Updates use merge operation to preserve other game data</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => reset(settings || undefined)}
              disabled={isSubmitting || !settings}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="save-settings-btn"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
