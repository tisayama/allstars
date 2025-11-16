/**
 * Unit tests for apiKeyMiddleware
 * Feature: 001-projector-auth
 *
 * Tests X-API-Key header validation for projector token endpoint
 */

import type { Request, Response, NextFunction } from "express";

describe("apiKeyMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Set environment variable for tests
    process.env.PROJECTOR_API_KEY = "test-api-key-1234567890abcdef";
  });

  describe("validateApiKey", () => {
    it("should call next() when valid API key is provided", async () => {
      const { validateApiKey } = await import(
        "../../src/middleware/apiKeyMiddleware"
      );

      mockRequest.headers = {
        "x-api-key": "test-api-key-1234567890abcdef",
      };

      validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 401 when API key is missing", async () => {
      const { validateApiKey } = await import(
        "../../src/middleware/apiKeyMiddleware"
      );

      mockRequest.headers = {};

      validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "UNAUTHORIZED",
        message: "API key is required in X-API-Key header",
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when API key is invalid", async () => {
      const { validateApiKey } = await import(
        "../../src/middleware/apiKeyMiddleware"
      );

      mockRequest.headers = {
        "x-api-key": "wrong-api-key",
      };

      validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "UNAUTHORIZED",
        message: "Invalid API key",
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle case-insensitive header names", async () => {
      const { validateApiKey } = await import(
        "../../src/middleware/apiKeyMiddleware"
      );

      mockRequest.headers = {
        "X-API-KEY": "test-api-key-1234567890abcdef", // Uppercase
      };

      validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should return 500 if PROJECTOR_API_KEY env var is not set", async () => {
      delete process.env.PROJECTOR_API_KEY;

      const { validateApiKey } = await import(
        "../../src/middleware/apiKeyMiddleware"
      );

      mockRequest.headers = {
        "x-api-key": "any-key",
      };

      validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "INTERNAL_ERROR",
        message: "Server configuration error",
        statusCode: 500,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
