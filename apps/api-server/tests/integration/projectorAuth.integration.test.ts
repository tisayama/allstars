/**
 * Integration tests for projector authentication routes
 * Feature: 001-projector-auth [US1]
 *
 * Tests end-to-end flow with Firebase Admin SDK
 */

import request from "supertest";
import express from "express";
import * as admin from "firebase-admin";

// Mock Firebase Admin SDK for integration tests
jest.mock("firebase-admin");

describe("Projector Auth Routes - Integration Tests", () => {
  let app: express.Application;
  let mockCreateCustomToken: jest.Mock;

  beforeAll(async () => {
    // Setup environment
    process.env.PROJECTOR_API_KEY = "integration-test-key-abcdef1234567890";

    // Mock Firebase Admin
    mockCreateCustomToken = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      createCustomToken: mockCreateCustomToken,
    } as any);

    // Create Express app
    app = express();
    app.use(express.json());

    // Import and register routes
    const { default: projectorAuthRoutes } = await import(
      "../../src/routes/projectorAuthRoutes"
    );
    app.use("/api/projector", projectorAuthRoutes);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Token generation flow", () => {
    it("should generate token using Firebase Admin SDK", async () => {
      mockCreateCustomToken.mockResolvedValue("firebase-custom-token-abc123");

      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "integration-test-key-abcdef1234567890")
        .expect(200);

      // Verify Firebase createCustomToken was called
      expect(mockCreateCustomToken).toHaveBeenCalledTimes(1);
      expect(mockCreateCustomToken).toHaveBeenCalledWith(
        expect.stringMatching(/^projector-/),
        { role: "projector" }
      );

      // Verify response
      expect(response.body.token).toBe("firebase-custom-token-abc123");
      expect(response.body.uid).toMatch(/^projector-/);
    });

    it("should handle Firebase Admin SDK errors gracefully", async () => {
      mockCreateCustomToken.mockRejectedValue(
        new Error("Firebase Admin SDK connection failed")
      );

      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "integration-test-key-abcdef1234567890")
        .expect(500);

      expect(response.body).toMatchObject({
        error: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });
  });

  describe("Rate limiting behavior", () => {
    it("should allow multiple requests within reasonable timeframe", async () => {
      mockCreateCustomToken.mockResolvedValue("firebase-token");

      // Make 5 requests in quick succession
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post("/api/projector/auth-token")
          .set("X-API-Key", "integration-test-key-abcdef1234567890")
      );

      const responses = await Promise.all(requests);

      // All should succeed (rate limiting not implemented in MVP)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe("API key validation", () => {
    it("should validate API key before calling Firebase", async () => {
      mockCreateCustomToken.mockClear();

      await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "wrong-key")
        .expect(401);

      // Firebase should NOT be called with invalid API key
      expect(mockCreateCustomToken).not.toHaveBeenCalled();
    });

    it("should validate API key case-sensitively", async () => {
      await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "INTEGRATION-TEST-KEY-ABCDEF1234567890") // Uppercase
        .expect(401);
    });
  });

  describe("Response consistency", () => {
    it("should return consistent token structure on success", async () => {
      mockCreateCustomToken.mockResolvedValue("consistent-token");

      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "integration-test-key-abcdef1234567890")
        .expect(200);

      // Validate all required fields are present
      const requiredFields = ["token", "expiresAt", "uid"];
      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });

      // Validate no extra fields
      const responseKeys = Object.keys(response.body);
      expect(responseKeys).toHaveLength(3);
    });
  });
});
