/**
 * Custom Token Service
 * Feature: 001-projector-auth [US1, US2]
 *
 * Generates Firebase custom tokens for projector-app authentication
 * US2: Includes audit logging for all token generation events
 */

import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import type { ProjectorAuthToken } from "@allstars/types";
import { auditLogger } from "./auditLogger";

/**
 * Generates a Firebase custom token for projector authentication
 *
 * @returns ProjectorAuthToken with custom token, expiration, and unique UID
 * @throws Error if Firebase Admin is not initialized
 */
export async function generateCustomToken(): Promise<ProjectorAuthToken> {
  // Generate unique UID for this projector instance
  const uid = `projector-${randomUUID()}`;

  // Custom claims to identify projector role
  const customClaims = {
    role: "projector",
  };

  try {
    // Generate Firebase custom token with role claim
    const token = await admin.auth().createCustomToken(uid, customClaims);

    // Calculate expiration (1 hour from now)
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour in milliseconds

    // Audit log: Token generation success (US2, SC-003)
    auditLogger.logTokenGenerated(uid, expiresAt);

    return {
      token,
      expiresAt,
      uid,
    };
  } catch (error) {
    // Audit log: Token generation failure
    auditLogger.logAuthFailed("Token generation failed", {
      uid,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Re-throw the error
    throw error;
  }
}
