/**
 * useSettings hook for game configuration (T095)
 * Handles GET and PUT operations for game settings with Firestore merge
 */

import { useState, useCallback } from 'react';
import type { GameSettings } from '@allstars/types';
import { api } from '@/lib/api-client';

interface UseSettingsResult {
  settings: GameSettings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: GameSettings) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ settings: GameSettings }>('/admin/settings');
      setSettings(response.settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: GameSettings) => {
    try {
      setLoading(true);
      setError(null);

      // PUT /admin/settings with merge: true (handled by api-server per FR-048)
      await api.put('/admin/settings', {
        settings: newSettings,
        merge: true, // Preserve other gameState fields
      });

      setSettings(newSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
}
