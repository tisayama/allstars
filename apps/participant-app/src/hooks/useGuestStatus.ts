import { useState, useEffect } from 'react';
import { getFirestoreInstance } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface GuestStatus {
  status: 'active' | 'dropped';
  rank?: number;
  totalPoints?: number;
  correctAnswers?: number;
}

/**
 * Guest status hook
 *
 * Listens to Firestore for real-time guest status updates.
 * Detects when guest is dropped out of the game.
 */
export function useGuestStatus(guestId: string | null) {
  const [status, setStatus] = useState<GuestStatus>({ status: 'active' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guestId) {
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    try {
      const firestore = getFirestoreInstance();
      const guestRef = doc(firestore, 'guests', guestId);

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        guestRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.warn('Guest document not found:', guestId);
            setError('Guest not found');
            setLoading(false);
            return;
          }

          const data = snapshot.data();
          console.warn('[Firestore] Guest status update:', data);

          setStatus({
            status: data.status || 'active',
            rank: data.rank,
            totalPoints: data.totalPoints,
            correctAnswers: data.correctAnswers,
          });

          setError(null);
          setLoading(false);
        },
        (err) => {
          console.error('[Firestore] Guest status listener error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (err) {
      const error = err as Error;
      console.error('Failed to set up guest status listener:', error);
      setError(error.message);
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }
  }, [guestId]);

  return {
    status: status.status,
    rank: status.rank,
    totalPoints: status.totalPoints,
    correctAnswers: status.correctAnswers,
    isDropped: status.status === 'dropped',
    loading,
    error,
  };
}
