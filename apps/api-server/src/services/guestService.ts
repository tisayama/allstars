/**
 * Guest service
 * Business logic for guest/participant management
 */

import { db } from "../utils/firestore";
import { COLLECTIONS } from "../models/firestoreCollections";
import { Guest } from "@allstars/types";

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
      tableNumber: data.tableNumber,
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
    tableNumber: data!.tableNumber,
  } as Guest;
}

/**
 * Revive all dropped guests
 * Sets all guests back to 'active' status
 */
export async function reviveAllGuests(): Promise<number> {
  const snapshot = await db
    .collection(COLLECTIONS.GUESTS)
    .where("status", "==", "dropped")
    .get();

  if (snapshot.empty) {
    return 0;
  }

  // Use batch update for efficiency
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "active" });
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
  authMethod: "google" | "anonymous";
  tableNumber?: number;
}): Promise<Guest> {
  const guestRef = db.collection(COLLECTIONS.GUESTS).doc(data.id);

  const guestData: any = {
    name: data.name,
    status: "active",
    attributes: data.attributes || [],
    authMethod: data.authMethod,
  };

  if (data.tableNumber !== undefined) {
    guestData.tableNumber = data.tableNumber;
  }

  await guestRef.set(guestData);

  return {
    id: data.id,
    name: data.name,
    status: "active",
    attributes: data.attributes || [],
    authMethod: data.authMethod,
    tableNumber: data.tableNumber,
  };
}

/**
 * Create a new guest for admin (auto-generates ID)
 */
export async function createGuestAdmin(data: {
  name: string;
  attributes?: string[];
  tableNumber?: number;
}): Promise<Guest> {
  const guestRef = db.collection(COLLECTIONS.GUESTS).doc();

  const guestData: any = {
    name: data.name,
    status: "active",
    attributes: data.attributes || [],
    authMethod: "anonymous",
  };

  if (data.tableNumber !== undefined) {
    guestData.tableNumber = data.tableNumber;
  }

  await guestRef.set(guestData);

  return {
    id: guestRef.id,
    name: data.name,
    status: "active",
    attributes: data.attributes || [],
    authMethod: "anonymous",
    tableNumber: data.tableNumber,
  };
}

/**
 * Update a guest
 */
export async function updateGuest(
  guestId: string,
  data: {
    name?: string;
    attributes?: string[];
    tableNumber?: number;
  }
): Promise<Guest> {
  const guestRef = db.collection(COLLECTIONS.GUESTS).doc(guestId);
  const guestDoc = await guestRef.get();

  if (!guestDoc.exists) {
    throw new Error("Guest not found");
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.attributes !== undefined) updateData.attributes = data.attributes;
  if (data.tableNumber !== undefined) updateData.tableNumber = data.tableNumber;

  await guestRef.update(updateData);

  const updatedDoc = await guestRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: guestId,
    name: updatedData.name,
    status: updatedData.status,
    attributes: updatedData.attributes || [],
    authMethod: updatedData.authMethod,
    tableNumber: updatedData.tableNumber,
  };
}

/**
 * Delete a guest
 */
export async function deleteGuest(guestId: string): Promise<void> {
  await db.collection(COLLECTIONS.GUESTS).doc(guestId).delete();
}

/**
 * Bulk create guests
 */
export async function bulkCreateGuests(
  guestsData: Array<{
    name: string;
    attributes?: string[];
    tableNumber?: number;
  }>
): Promise<Guest[]> {
  const batch = db.batch();
  const guests: Guest[] = [];

  guestsData.forEach((data) => {
    const guestRef = db.collection(COLLECTIONS.GUESTS).doc();
    const guestData: any = {
      name: data.name,
      status: "active",
      attributes: data.attributes || [],
      authMethod: "anonymous",
    };

    if (data.tableNumber !== undefined) {
      guestData.tableNumber = data.tableNumber;
    }

    batch.set(guestRef, guestData);

    guests.push({
      id: guestRef.id,
      name: data.name,
      status: "active",
      attributes: data.attributes || [],
      authMethod: "anonymous",
      tableNumber: data.tableNumber,
    });
  });

  await batch.commit();
  return guests;
}
