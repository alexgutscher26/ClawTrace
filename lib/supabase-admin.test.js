import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock @supabase/supabase-js
const mockCreateClient = mock(() => ({}));

mock.module("@supabase/supabase-js", () => {
  return {
    createClient: mockCreateClient,
  };
});

describe("lib/supabase-admin", () => {
  let originalUrl;
  let originalKey;

  beforeEach(() => {
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockCreateClient.mockClear();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  test("should throw error if NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    try {
      await import(`./supabase-admin.js?bust=${Date.now()}`);
      throw new Error("Should have thrown");
    } catch (e) {
      expect(e.message).toContain("Missing SUPABASE_SERVICE_ROLE_KEY or URL");
    }
  });

  test("should throw error if SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "test-url";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      await import(`./supabase-admin.js?bust=${Date.now()}`);
      throw new Error("Should have thrown");
    } catch (e) {
      expect(e.message).toContain("Missing SUPABASE_SERVICE_ROLE_KEY or URL");
    }
  });

  test("should create supabase client if env vars are present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    await import(`./supabase-admin.js?bust=${Date.now()}`);

    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    );
  });
});
