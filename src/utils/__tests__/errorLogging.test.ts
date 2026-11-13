import { describe, it, expect } from "vitest";
import { extractErrorInfo, logError } from "../errorLogging";

describe("errorLogging", () => {
  describe("extractErrorInfo", () => {
    it("extracts from Error instances", () => {
      const err = new Error("Database timeout");
      const info = extractErrorInfo(err);
      expect(info.message).toBe("Database timeout");
      expect(info.stack).toBeDefined();
    });

    it("extracts from plain object with message, code, details", () => {
      const err = {
        message: "JWT expired",
        code: "PGRST301",
        details: "Token is no longer valid",
      };
      const info = extractErrorInfo(err);
      expect(info.message).toBe("JWT expired");
      expect(info.code).toBe("PGRST301");
      expect(info.details).toBe("Token is no longer valid");
    });

    it("extracts from OAuth / API style errors with error_description", () => {
      const err = {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      };
      const info = extractErrorInfo(err);
      expect(info.message).toBe("Invalid login credentials");
    });

    it("extracts from string rejection", () => {
      const info = extractErrorInfo("Network connection dropped");
      expect(info.message).toBe("Network connection dropped");
    });

    it("handles null and undefined gracefully", () => {
      expect(extractErrorInfo(null).message).toBe("Unknown error");
      expect(extractErrorInfo(undefined).message).toBe("Unknown error");
    });
  });

  describe("logError", () => {
    it("combines context label with underlying error without overwriting it", () => {
      const err = new Error("Failed to load project records");
      const errorData = logError(err, "Unhandled promise rejection", {
        report: false,
      });

      expect(errorData.message).toBe("Unhandled promise rejection: Failed to load project records");
      expect(errorData.metadata?.originalError).toBe("Failed to load project records");
    });

    it("handles plain object rejections in logError", () => {
      const err = { message: "Permission denied for schema public", code: "42501" };
      const errorData = logError(err, "Unhandled promise rejection", {
        report: false,
      });

      expect(errorData.message).toBe("Unhandled promise rejection: Permission denied for schema public");
      expect(errorData.metadata?.errorCode).toBe("42501");
    });

    it("uses errorMessage when default 'An error occurred' is passed as message", () => {
      const err = new Error("Specific failure");
      const errorData = logError(err, "An error occurred", {
        report: false,
      });

      expect(errorData.message).toBe("Specific failure");
    });
  });
});
