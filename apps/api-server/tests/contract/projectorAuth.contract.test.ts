/**
 * Contract tests for POST /api/projector/auth-token
 * Feature: 001-projector-auth [US1]
 *
 * Validates API endpoint against OpenAPI specification
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock Firebase Admin SDK
jest.mock("firebase-admin", () => ({
  auth: vi.fn(() => ({
    createCustomToken: jest
      .fn()
      .mockResolvedValue("mock-firebase-custom-token"),
  })),
  credential: {
    applicationDefault: jest.fn(),
  },
  initializeApp: jest.fn(),
}));

describe("POST /api/projector/auth-token - Contract Tests", () => {
  let app: express.Application;

  beforeAll(async () => {
    // Set required environment variables
    process.env.PROJECTOR_API_KEY =
      "test-api-key-1234567890abcdef1234567890abcdef";

    // Create Express app with routes
    app = express();
    app.use(express.json());

    // Import and register routes (will fail until implemented)
    const { default: projectorAuthRoutes } = await import(
      "../../src/routes/projectorAuthRoutes"
    );
    app.use("/api/projector", projectorAuthRoutes);
  });

  describe("Request validation", () => {
    it("should accept POST request with valid X-API-Key header", async () => {
      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "test-api-key-1234567890abcdef1234567890abcdef")
        .expect("Content-Type", /json/);

      expect(response.status).toBe(200);
    });

    it("should reject request without X-API-Key header (401)", async () => {
      const response = await request(app)
        .post("/api/projector/auth-token")
        .expect(401)
        .expect("Content-Type", /json/);

      expect(response.body).toMatchObject({
        error: "UNAUTHORIZED",
        message: expect.stringContaining("API key"),
        statusCode: 401,
      });
    });

    it("should reject request with invalid X-API-Key (401)", async () => {
      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "wrong-key")
        .expect(401)
        .expect("Content-Type", /json/);

      expect(response.body).toMatchObject({
        error: "UNAUTHORIZED",
        statusCode: 401,
      });
    });
  });

  describe("Response validation against OpenAPI spec", () => {
    it("should return 200 with TokenGenerationResponse schema", async () => {
      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "test-api-key-1234567890abcdef1234567890abcdef")
        .expect(200);

      // Validate response schema matches OpenAPI spec
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("expiresAt");
      expect(response.body).toHaveProperty("uid");

      // Validate types
      expect(typeof response.body.token).toBe("string");
      expect(typeof response.body.expiresAt).toBe("number");
      expect(typeof response.body.uid).toBe("string");

      // Validate token length (JWT tokens are typically 200+ chars)
      expect(response.body.token.length).toBeGreaterThan(10);

      // Validate UID format (projector-{uuid})
      expect(response.body.uid).toMatch(/^projector-[a-f0-9-]+$/);

      // Validate expiresAt is in future
      expect(response.body.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should return expiresAt approximately 1 hour from now", async () => {
      const beforeTime = Date.now();

      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "test-api-key-1234567890abcdef1234567890abcdef")
        .expect(200);

      const afterTime = Date.now();
      const oneHourMs = 60 * 60 * 1000;

      expect(response.body.expiresAt).toBeGreaterThanOrEqual(
        beforeTime + oneHourMs
      );
      expect(response.body.expiresAt).toBeLessThanOrEqual(
        afterTime + oneHourMs + 2000
      ); // +2s tolerance
    });

    it("should generate unique UIDs on successive calls", async () => {
      const response1 = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "test-api-key-1234567890abcdef1234567890abcdef")
        .expect(200);

      const response2 = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "test-api-key-1234567890abcdef1234567890abcdef")
        .expect(200);

      expect(response1.body.uid).not.toBe(response2.body.uid);
    });
  });

  describe("Error response validation", () => {
    it("should return 500 with ErrorResponse schema on internal error", async () => {
      // Temporarily clear PROJECTOR_API_KEY to trigger config error
      const originalKey = process.env.PROJECTOR_API_KEY;
      delete process.env.PROJECTOR_API_KEY;

      const response = await request(app)
        .post("/api/projector/auth-token")
        .set("X-API-Key", "any-key")
        .expect(500);

      expect(response.body).toMatchObject({
        error: "INTERNAL_ERROR",
        message: expect.any(String),
        statusCode: 500,
      });

      // Restore
      process.env.PROJECTOR_API_KEY = originalKey;
    });
  });
});
