import { describe, test, expect, mock, beforeEach, setSystemTime, beforeAll, afterAll } from "bun:test";

// Mock environment variables
const originalEnv = process.env;

beforeAll(() => {
  process.env = { ...originalEnv };
  process.env.CRON_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock next/server with proper async json() method
mock.module("next/server", () => ({
  NextResponse: {
    json: (data, opts) => ({
      json: async () => data,
      status: opts?.status || 200,
    }),
  },
}));

// Mock lib/supabase-admin
// Mock Supabase chain
const mockLt = mock(async () => ({ count: 10, error: null }));
const mockDelete = mock(() => ({ lt: mockLt }));
const mockFrom = mock(() => ({ delete: mockDelete }));

mock.module("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

describe("GET /api/cron/cleanup-heartbeats", () => {
  beforeEach(() => {
    // Reset mocks
    mockFrom.mockClear();
    mockDelete.mockClear();
    mockLt.mockClear();

    // Default behaviors
    mockLt.mockResolvedValue({ count: 10, error: null });
    // Restore implementation of mockFrom if it was overridden
    mockFrom.mockImplementation(() => ({ delete: mockDelete }));
  });

  test("should return 401 if request is not a valid cron request", async () => {
    // Import dynamically to get the mocked module
    const { GET } = await import("./route.js?bust=" + Date.now());

    // Missing header
    const req1 = new Request("http://localhost");
    const res1 = await GET(req1);
    expect(res1.status).toBe(401);

    // Invalid header
    const req2 = new Request("http://localhost", {
      headers: { authorization: "Bearer invalid-secret" },
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(401);
  });

  test("should delete heartbeats older than 30 days and return success", async () => {
    const { GET } = await import("./route.js?bust=" + Date.now());

    // Set a fixed date
    const now = new Date("2023-10-31T12:00:00Z");
    setSystemTime(now);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const expectedCutoff = thirtyDaysAgo.toISOString();

    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer test-secret" },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deleted_count).toBe(10);
    expect(data.cutoff_date).toBe(expectedCutoff);

    expect(mockFrom).toHaveBeenCalledWith("heartbeats");
    expect(mockDelete).toHaveBeenCalledWith({ count: "exact" });
    expect(mockLt).toHaveBeenCalledWith("created_at", expectedCutoff);

    setSystemTime(); // Restore time
  });

  test("should return 500 if Supabase deletion fails", async () => {
    const { GET } = await import("./route.js?bust=" + Date.now());

    mockLt.mockResolvedValue({ count: null, error: { message: "Database error" } });

    // Suppress console.error
    const originalConsoleError = console.error;
    console.error = () => {};

    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    const data = await res.json();

    // Restore console.error
    console.error = originalConsoleError;

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database error");
  });

  test("should return 500 if an exception occurs", async () => {
    const { GET } = await import("./route.js?bust=" + Date.now());

    mockFrom.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    // Suppress console.error
    const originalConsoleError = console.error;
    console.error = () => {};

    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    const data = await res.json();

    // Restore console.error
    console.error = originalConsoleError;

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal Server Error");
  });
});
