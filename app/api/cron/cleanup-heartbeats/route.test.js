import { describe, test, expect, mock, beforeEach, setSystemTime } from "bun:test";

// Mock next/server
const mockJson = mock((body, init) => {
  return {
    json: body,
    status: init?.status || 200,
    headers: init?.headers,
  };
});

mock.module("next/server", () => {
  return {
    NextResponse: {
      json: mockJson,
    },
  };
});

// Mock lib/cron-auth
const mockIsValidCronRequest = mock(() => true);
const mockUnauthorizedResponse = mock(() => ({
  json: { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
  status: 401
}));

mock.module("@/lib/cron-auth", () => {
  return {
    isValidCronRequest: mockIsValidCronRequest,
    unauthorizedResponse: mockUnauthorizedResponse,
  };
});

// Mock lib/supabase-admin
const mockLt = mock(() => Promise.resolve({ count: 10, error: null }));
const mockDelete = mock(() => ({ lt: mockLt }));
const mockFrom = mock(() => ({ delete: mockDelete }));

const mockSupabaseAdmin = {
  from: mockFrom,
};

mock.module("@/lib/supabase-admin", () => {
  return {
    supabaseAdmin: mockSupabaseAdmin,
  };
});

// Import the module under test
const { GET } = await import("./route.js");

describe("GET /api/cron/cleanup-heartbeats", () => {
  beforeEach(() => {
    // Reset mocks
    mockIsValidCronRequest.mockClear();
    mockUnauthorizedResponse.mockClear();
    mockFrom.mockClear();
    mockDelete.mockClear();
    mockLt.mockClear();
    mockJson.mockClear();

    // Default behaviors
    mockIsValidCronRequest.mockReturnValue(true);
    mockLt.mockResolvedValue({ count: 10, error: null });
  });

  test("should return 401 if request is not a valid cron request", async () => {
    mockIsValidCronRequest.mockReturnValue(false);
    const req = new Request("http://localhost");

    const response = await GET(req);

    expect(mockIsValidCronRequest).toHaveBeenCalledWith(req);
    expect(mockUnauthorizedResponse).toHaveBeenCalled();
    // Since we mocked unauthorizedResponse to return an object, we check that object
    expect(response).toEqual(mockUnauthorizedResponse());
  });

  test("should delete heartbeats older than 30 days and return success", async () => {
    // Set a fixed date
    const now = new Date("2023-10-31T12:00:00Z");
    setSystemTime(now);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const expectedCutoff = thirtyDaysAgo.toISOString();

    const req = new Request("http://localhost");

    const response = await GET(req);

    expect(mockIsValidCronRequest).toHaveBeenCalledWith(req);
    expect(mockFrom).toHaveBeenCalledWith("heartbeats");
    expect(mockDelete).toHaveBeenCalledWith({ count: "exact" });
    expect(mockLt).toHaveBeenCalledWith("created_at", expectedCutoff);

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      success: true,
      message: 'Heartbeat cleanup complete',
      deleted_count: 10,
      cutoff_date: expectedCutoff,
    });

    setSystemTime(); // Restore time
  });

  test("should return 500 if Supabase deletion fails", async () => {
    mockLt.mockResolvedValue({ count: null, error: { message: "Database error" } });

    // Suppress console.error
    const originalConsoleError = console.error;
    console.error = () => {};

    const req = new Request("http://localhost");
    const response = await GET(req);

    // Restore console.error
    console.error = originalConsoleError;

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ success: false, error: "Database error" });
  });

  test("should return 500 if an exception occurs", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    // Suppress console.error
    const originalConsoleError = console.error;
    console.error = () => {};

    const req = new Request("http://localhost");
    const response = await GET(req);

    // Restore console.error
    console.error = originalConsoleError;

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ success: false, error: "Internal Server Error" });
  });
});
