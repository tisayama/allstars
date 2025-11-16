/**
 * Unit tests for audit logger
 * Feature: 001-projector-auth [US2]
 *
 * Tests structured audit logging for authentication events (SC-003)
 */

import { AuditLogger, AuditEventType } from "../../src/services/auditLogger";

describe("AuditLogger [US2]", () => {
  let logger: AuditLogger;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AuditLogger();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Token generation events", () => {
    it("should log TOKEN_GENERATED event with structured data", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "projector-abc123",
        expiresAt: Date.now() + 3600000,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUDIT"),
        expect.stringContaining("TOKEN_GENERATED"),
        expect.objectContaining({
          uid: "projector-abc123",
          expiresAt: expect.any(Number),
        })
      );
    });

    it("should include timestamp in audit log", () => {
      const beforeTime = Date.now();

      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "projector-xyz",
      });

      const afterTime = Date.now();

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0];
      const logData = logCall[2];

      expect(logData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logData.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should include event type in log", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "test-uid",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          eventType: AuditEventType.TOKEN_GENERATED,
        })
      );
    });
  });

  describe("Authentication failure events", () => {
    it("should log AUTH_FAILED event with reason", () => {
      logger.logEvent(AuditEventType.AUTH_FAILED, {
        reason: "Invalid API key",
        apiKeyPrefix: "abc123...",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUDIT"),
        expect.stringContaining("AUTH_FAILED"),
        expect.objectContaining({
          reason: "Invalid API key",
          apiKeyPrefix: "abc123...",
        })
      );
    });

    it("should include IP address if provided", () => {
      logger.logEvent(AuditEventType.AUTH_FAILED, {
        reason: "Invalid token",
        ipAddress: "192.168.1.100",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ipAddress: "192.168.1.100",
        })
      );
    });
  });

  describe("Socket authentication events", () => {
    it("should log SOCKET_AUTH_SUCCESS event", () => {
      logger.logEvent(AuditEventType.SOCKET_AUTH_SUCCESS, {
        socketId: "socket-123",
        uid: "projector-abc",
        role: "projector",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUDIT"),
        expect.stringContaining("SOCKET_AUTH_SUCCESS"),
        expect.objectContaining({
          socketId: "socket-123",
          uid: "projector-abc",
          role: "projector",
        })
      );
    });

    it("should log SOCKET_AUTH_FAILED event", () => {
      logger.logEvent(AuditEventType.SOCKET_AUTH_FAILED, {
        socketId: "socket-456",
        reason: "Invalid role",
        providedRole: "participant",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUDIT"),
        expect.stringContaining("SOCKET_AUTH_FAILED"),
        expect.objectContaining({
          socketId: "socket-456",
          reason: "Invalid role",
        })
      );
    });

    it("should log SOCKET_DISCONNECTED event", () => {
      logger.logEvent(AuditEventType.SOCKET_DISCONNECTED, {
        socketId: "socket-789",
        uid: "projector-xyz",
        reason: "client namespace disconnect",
        duration: 15000,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUDIT"),
        expect.stringContaining("SOCKET_DISCONNECTED"),
        expect.objectContaining({
          socketId: "socket-789",
          duration: 15000,
        })
      );
    });
  });

  describe("Structured logging format", () => {
    it("should use consistent log format", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "test-uid",
      });

      const logCall = consoleLogSpy.mock.calls[0];

      // Should have 3 parts: prefix, event type, data
      expect(logCall).toHaveLength(3);
      expect(typeof logCall[0]).toBe("string"); // Prefix
      expect(typeof logCall[1]).toBe("string"); // Event type
      expect(typeof logCall[2]).toBe("object"); // Data
    });

    it("should include all required fields", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "test-uid",
      });

      const logData = consoleLogSpy.mock.calls[0][2];

      expect(logData).toHaveProperty("timestamp");
      expect(logData).toHaveProperty("eventType");
      expect(logData).toHaveProperty("uid");
    });

    it("should preserve custom metadata", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "test-uid",
        customField: "custom-value",
        nestedData: { key: "value" },
      });

      const logData = consoleLogSpy.mock.calls[0][2];

      expect(logData.customField).toBe("custom-value");
      expect(logData.nestedData).toEqual({ key: "value" });
    });
  });

  describe("Security considerations", () => {
    it("should NOT log full API keys", () => {
      logger.logEvent(AuditEventType.AUTH_FAILED, {
        apiKey: "full-api-key-should-not-be-logged-123456",
      });

      const logData = consoleLogSpy.mock.calls[0][2];

      // Should not contain full API key
      expect(JSON.stringify(logData)).not.toContain(
        "full-api-key-should-not-be-logged-123456"
      );

      // Should contain only prefix if sanitized
      if (logData.apiKeyPrefix) {
        expect(logData.apiKeyPrefix).toMatch(/\.\.\./);
      }
    });

    it("should NOT log sensitive tokens", () => {
      logger.logEvent(AuditEventType.TOKEN_GENERATED, {
        uid: "test-uid",
        token: "sensitive-firebase-token-abc123xyz",
      });

      const logData = consoleLogSpy.mock.calls[0][2];

      // Token field should not be in logs
      expect(logData).not.toHaveProperty("token");
    });
  });

  describe("Performance", () => {
    it("should not throw errors on logging", () => {
      expect(() => {
        logger.logEvent(AuditEventType.TOKEN_GENERATED, {
          uid: "test-uid",
        });
      }).not.toThrow();
    });

    it("should handle large metadata objects", () => {
      const largeMetadata = {
        uid: "test-uid",
        data: new Array(100).fill({ key: "value" }),
      };

      expect(() => {
        logger.logEvent(AuditEventType.TOKEN_GENERATED, largeMetadata);
      }).not.toThrow();

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe("Event types", () => {
    it("should support all required audit event types", () => {
      const requiredEvents = [
        AuditEventType.TOKEN_GENERATED,
        AuditEventType.AUTH_FAILED,
        AuditEventType.SOCKET_AUTH_SUCCESS,
        AuditEventType.SOCKET_AUTH_FAILED,
        AuditEventType.SOCKET_DISCONNECTED,
      ];

      requiredEvents.forEach((eventType) => {
        expect(typeof eventType).toBe("string");
        expect(eventType.length).toBeGreaterThan(0);
      });
    });
  });
});
