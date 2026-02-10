
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { checkStaleAgents } from "@/lib/cron-jobs/check-stale";

// Mock dependencies
const mockSupabaseAdmin = {
  from: mock(() => mockSupabaseAdmin),
  update: mock(() => mockSupabaseAdmin),
  eq: mock(() => mockSupabaseAdmin),
  lt: mock(() => mockSupabaseAdmin),
  select: mock(() => Promise.resolve({ data: [], error: null })),
};

const mockProcessSmartAlerts = mock(() => Promise.resolve());

describe("checkStaleAgents", () => {
  beforeEach(() => {
    mockSupabaseAdmin.from.mockClear();
    mockSupabaseAdmin.update.mockClear();
    mockSupabaseAdmin.eq.mockClear();
    mockSupabaseAdmin.lt.mockClear();
    mockSupabaseAdmin.select.mockClear();
    mockProcessSmartAlerts.mockClear();
  });

  test("should update stale agents and return success", async () => {
    // Setup mock return
    mockSupabaseAdmin.select.mockResolvedValue({ data: [], error: null });

    const result = await checkStaleAgents(mockSupabaseAdmin, mockProcessSmartAlerts);

    expect(result.success).toBe(true);
    expect(result.updated_count).toBe(0);
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("agents");
    expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({ status: "offline" });
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith("status", "online");
    expect(mockSupabaseAdmin.lt).toHaveBeenCalled();
    expect(mockProcessSmartAlerts).not.toHaveBeenCalled();
  });

  test("should trigger alerts for updated agents", async () => {
    const staleAgents = [
      { id: "agent-1", name: "Agent 1" },
      { id: "agent-2", name: "Agent 2" },
    ];
    mockSupabaseAdmin.select.mockResolvedValue({ data: staleAgents, error: null });

    const result = await checkStaleAgents(mockSupabaseAdmin, mockProcessSmartAlerts);

    expect(result.success).toBe(true);
    expect(result.updated_count).toBe(2);
    expect(result.updated_agents).toEqual(staleAgents);

    expect(mockProcessSmartAlerts).toHaveBeenCalledTimes(2);
    expect(mockProcessSmartAlerts).toHaveBeenCalledWith("agent-1", "offline", {});
    expect(mockProcessSmartAlerts).toHaveBeenCalledWith("agent-2", "offline", {});
  });

  test("should throw error on database failure", async () => {
    mockSupabaseAdmin.select.mockResolvedValue({ data: null, error: { message: "DB Failure" } });

    try {
      await checkStaleAgents(mockSupabaseAdmin, mockProcessSmartAlerts);
      // Fail if no error
      expect(true).toBe(false);
    } catch (e) {
      expect(e.message).toBe("DB Failure");
    }
  });
});
