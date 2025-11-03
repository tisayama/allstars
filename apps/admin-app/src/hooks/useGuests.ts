/**
 * useGuests hook for guest management (T067)
 * Handles CRUD operations and bulk CSV import for guests
 */

import { useState, useCallback } from 'react';
import type { Guest } from '@allstars/types';
import { api } from '@/lib/api-client';

interface GuestCreateData {
  name: string;
  tableNumber: number;
  attributes: string[];
}

interface UseGuestsResult {
  guests: Guest[];
  loading: boolean;
  error: string | null;
  fetchGuests: () => Promise<void>;
  createGuest: (data: GuestCreateData) => Promise<Guest>;
  updateGuest: (id: string, data: Partial<GuestCreateData>) => Promise<Guest>;
  deleteGuest: (id: string) => Promise<void>;
  bulkImportGuests: (guests: GuestCreateData[]) => Promise<void>;
}

export function useGuests(): UseGuestsResult {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ guests: Guest[] }>('/admin/guests');
      setGuests(response.guests || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch guests';
      setError(errorMessage);
      console.error('Failed to fetch guests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGuest = useCallback(async (data: GuestCreateData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<Guest>('/admin/guests', data);
      setGuests((prev) => [...prev, response]);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create guest';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGuest = useCallback(async (id: string, data: Partial<GuestCreateData>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.put<Guest>(`/admin/guests/${id}`, data);
      setGuests((prev) =>
        prev.map((g) => (g.id === id ? response : g))
      );
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update guest';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGuest = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      await api.delete(`/admin/guests/${id}`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete guest';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkImportGuests = useCallback(async (guestsData: GuestCreateData[]) => {
    try {
      setLoading(true);
      setError(null);

      // Import guests in batches if needed
      await api.post('/admin/guests/bulk', { guests: guestsData });

      // Refresh the guest list
      await fetchGuests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import guests';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchGuests]);

  return {
    guests,
    loading,
    error,
    fetchGuests,
    createGuest,
    updateGuest,
    deleteGuest,
    bulkImportGuests,
  };
}
