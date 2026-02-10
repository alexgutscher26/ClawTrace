import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";

// Mock next/server before importing the module under test
mock.module("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({ body, init, status: init?.status || 200 }),
  },
}));

describe("lib/cron-auth", () => {
  let isValidCronRequest;
  let unauthorizedResponse;
  let originalCronSecret;

  beforeAll(async () => {
    // Save original env
    originalCronSecret = process.env.CRON_SECRET;

    // Dynamically import the module so the mock is applied first
    const module = await import("./cron-auth.js");
    isValidCronRequest = module.isValidCronRequest;
    unauthorizedResponse = module.unauthorizedResponse;
  });

  afterAll(() => {
    // Restore original env
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  describe("isValidCronRequest", () => {
    it("should return true for valid Authorization header", () => {
      process.env.CRON_SECRET = "test-secret";
      const req = new Request("http://localhost", {
        headers: { authorization: "Bearer test-secret" },
      });
      expect(isValidCronRequest(req)).toBe(true);
    });

    it("should return false for invalid Authorization header", () => {
      process.env.CRON_SECRET = "test-secret";
      const req = new Request("http://localhost", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      expect(isValidCronRequest(req)).toBe(false);
    });

    it("should return false for missing Authorization header", () => {
      process.env.CRON_SECRET = "test-secret";
      const req = new Request("http://localhost");
      expect(isValidCronRequest(req)).toBe(false);
    });

    it("should return false for malformed Authorization header (missing Bearer)", () => {
      process.env.CRON_SECRET = "test-secret";
      const req = new Request("http://localhost", {
        headers: { authorization: "test-secret" },
      });
      expect(isValidCronRequest(req)).toBe(false);
    });

    it("should return false if CRON_SECRET is not defined in environment", () => {
      delete process.env.CRON_SECRET;
      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = () => {};

      const req = new Request("http://localhost", {
        headers: { authorization: "Bearer test-secret" },
      });
      const result = isValidCronRequest(req);

      // Restore console.error
      console.error = originalConsoleError;

      expect(result).toBe(false);
    });
  });

  describe("unauthorizedResponse", () => {
    it("should return a 401 response with error message", () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: "Unauthorized: Invalid or missing CRON_SECRET",
      });
    });
  });
});
