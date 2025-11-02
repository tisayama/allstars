/**
 * Guest service
 * Business logic for guest/participant management
 */

import { db } from '../utils/firestore';
import { COLLECTIONS } from '../models/firestoreCollections';
import { Guest } from '@allstars/types';

/**
 * List all guests
 * Returns all registered wedding guests
 */
export async function listGuests(): Promise<Guest[]> {
  const snapshot = await db.collection(COLLECTIONS.GUESTS).get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      status: data.status,
      attributes: data.attributes || [],
      authMethod: data.authMethod,
    } as Guest;
  });
}

/**
 * Get a guest by ID
 */
export async function getGuestById(guestId: string): Promise<Guest | null> {
  const guestDoc = await db.collection(COLLECTIONS.GUESTS).doc(guestId).get();

  if (!guestDoc.exists) {
    return null;
  }

  const data = guestDoc.data();
  return {
    id: guestDoc.id,
    name: data!.name,
    status: data!.status,
    attributes: data!.attributes || [],
    authMethod: data!.authMethod,
  } as Guest;
}

/**
 * Revive all dropped guests
 * Sets all guests back to 'active' status
 */
export async function reviveAllGuests(): Promise<number> {
  const snapshot = await db
    .collection(COLLECTIONS.GUESTS)
    .where('status', '==', 'dropped')
    .get();

  if (snapshot.empty) {
    return 0;
  }

  // Use batch update for efficiency
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: 'active' });
  });

  await batch.commit();
  return snapshot.size;
}

/**
 * Create a new guest
 * Used for participant registration
 */
export async function createGuest(data: {
  id: string;
  name: string;
  attributes?: string[];
  authMethod: 'google' | 'anonymous';
}): Promise<Guest> {
  const guestRef = db.collection(COLLECTIONS.GUESTS).doc(data.id);

  await guestRef.set({
    name: data.name,
    status: 'active',
    attributes: data.attributes || [],
    authMethod: data.authMethod,
  });

  return {
    id: data.id,
    name: data.name,
    status: 'active',
    attributes: data.attributes || [],
    authMethod: data.authMethod,
  };
}
