/**
 * Unit tests for customTokenService
 * Feature: 001-projector-auth
 *
 * Tests Firebase custom token generation for projector authentication
 */

import * as admin from "firebase-admin";

// Mock Firebase Admin SDK
jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => ({
    createCustomToken: jest
      .fn()
      .mockResolvedValue(
        "mock-firebase-custom-token-abc123xyz789-this-is-a-long-jwt-token-string-that-exceeds-100-characters-in-length"
      ),
  })),
  credential: {
    applicationDefault: jest.fn(),
  },
  initializeApp: jest.fn(),
}));

// Mock audit logger
jest.mock("../../src/services/auditLogger", () => ({
  auditLogger: {
    logTokenGenerated: jest.fn(),
    logAuthFailed: jest.fn(),
  },
}));

describe("customTokenService", () => {
  describe("generateCustomToken", () => {
    it("should generate a custom token with projector role claim", async () => {
      // This test will fail until implementation exists
      const { generateCustomToken } = await import(
        "../../src/services/customTokenService"
      );

      const result = await generateCustomToken();

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("uid");
      expect(result.uid).toMatch(/^projector-[a-f0-9-]+$/);
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(100); // JWT tokens are long
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should generate unique UIDs for each call", async () => {
      const { generateCustomToken } = await import(
        "../../src/services/customTokenService"
      );

      const result1 = await generateCustomToken();
      const result2 = await generateCustomToken();

      expect(result1.uid).not.toBe(result2.uid);
    });

    it("should set expiration to 1 hour from now", async () => {
      const { generateCustomToken } = await import(
        "../../src/services/customTokenService"
      );

      const beforeTime = Date.now();
      const result = await generateCustomToken();
      const afterTime = Date.now();

      const oneHourMs = 60 * 60 * 1000;
      expect(result.expiresAt).toBeGreaterThanOrEqual(beforeTime + oneHourMs);
      expect(result.expiresAt).toBeLessThanOrEqual(
        afterTime + oneHourMs + 1000
      ); // +1s tolerance
    });

    it("should throw error if Firebase Admin is not initialized", async () => {
      // Mock uninitialized state
      const mockAuth = jest.fn(() => {
        throw new Error("Firebase Admin not initialized");
      });
      (admin.auth as jest.Mock).mockImplementation(mockAuth as any);

      const { generateCustomToken } = await import(
        "../../src/services/customTokenService"
      );

      await expect(generateCustomToken()).rejects.toThrow();
    });

    it("should include role: projector in custom claims", async () => {
      const mockCreateCustomToken = jest
        .fn()
        .mockResolvedValue("mock-token-string");
      (admin.auth as jest.Mock).mockReturnValue({
        createCustomToken: mockCreateCustomToken,
      } as any);

      const { generateCustomToken } = await import(
        "../../src/services/customTokenService"
      );
      await generateCustomToken();

      // Verify createCustomToken was called with role claim
      expect(mockCreateCustomToken).toHaveBeenCalledWith(
        expect.stringMatching(/^projector-/),
        { role: "projector" }
      );
    });
  });
});
