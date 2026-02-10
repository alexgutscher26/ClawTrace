import { describe, expect, test, mock, beforeEach, afterEach, setSystemTime } from "bun:test";

// --- Mock Setup ---

// We need to control the data returned by the config query
let mockConfigs = [];

// 1. Config Query Chain: .select(...).eq(...).eq(...)
const configQueryChain = {
  eq: mock().mockReturnThis(),
  then: (resolve) => resolve({ data: mockConfigs, error: null }),
};
// Ensure eq returns itself so chaining works: .eq().eq()
configQueryChain.eq.mockReturnValue(configQueryChain);


// 2. Agent Query Chain: .select(...).eq(...).single()
const agentQueryChain = {
  eq: mock().mockReturnThis(),
  single: mock().mockResolvedValue({ data: { name: "Test Agent" }, error: null }),
};
agentQueryChain.eq.mockReturnValue(agentQueryChain);


// 3. Update Config Chain: .update(...).eq(...)
const updateConfigChain = {
  eq: mock().mockResolvedValue({ error: null }),
};


// 4. Insert Alert Chain: .insert(...)
const insertAlertChain = {
  then: (resolve) => resolve({ error: null }),
};


// 5. Builders returned by .from(table)
const configBuilder = {
  select: mock().mockReturnValue(configQueryChain),
  update: mock().mockReturnValue(updateConfigChain),
};

const agentBuilder = {
  select: mock().mockReturnValue(agentQueryChain),
};

const alertsBuilder = {
  insert: mock().mockReturnValue(insertAlertChain),
};

// 6. Main mockFrom function
const mockFrom = mock((table) => {
  if (table === "alert_configs") return configBuilder;
  if (table === "agents") return agentBuilder;
  if (table === "alerts") return alertsBuilder;
  return {};
});

// Mock the module
mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Import the function under test
const { processSmartAlerts } = await import("./alerts");

// Mock Fetch
global.fetch = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));


// --- Tests ---

describe("processSmartAlerts", () => {
  beforeEach(() => {
    // Reset mocks
    mockFrom.mockClear();
    configBuilder.select.mockClear();
    configBuilder.update.mockClear();
    configQueryChain.eq.mockClear();
    agentBuilder.select.mockClear();
    agentQueryChain.eq.mockClear();
    agentQueryChain.single.mockClear();
    alertsBuilder.insert.mockClear();
    updateConfigChain.eq.mockClear();
    global.fetch.mockClear();

    // Reset data
    mockConfigs = [];
  });

  afterEach(() => {
    setSystemTime();
  });

  test("should do nothing if no configs found", async () => {
    mockConfigs = [];

    await processSmartAlerts("agent-123", "online", {});

    expect(mockFrom).toHaveBeenCalledWith("alert_configs");
    expect(configBuilder.select).toHaveBeenCalled();
    expect(alertsBuilder.insert).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("should skip alert if in cooldown", async () => {
    const now = new Date("2023-01-01T12:00:00Z");
    setSystemTime(now);
    const recentTrigger = new Date(now.getTime() - 1000 * 60 * 30).toISOString(); // 30 mins ago

    mockConfigs = [
      {
        id: "config-1",
        agent_id: "agent-123",
        cooldown_minutes: 60,
        last_triggered_at: recentTrigger,
        cpu_threshold: 80,
        channel: { active: true, type: "slack", config: { webhook_url: "http://slack.com" } },
      },
    ];

    await processSmartAlerts("agent-123", "online", { cpu_usage: 90 });

    expect(alertsBuilder.insert).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("should trigger offline alert", async () => {
    mockConfigs = [
      {
        id: "config-1",
        agent_id: "agent-123",
        offline_alert: true,
        last_triggered_at: null,
        channel: { active: true, type: "slack", config: { webhook_url: "http://slack.com" } },
      },
    ];

    await processSmartAlerts("agent-123", "offline", {});

    expect(mockFrom).toHaveBeenCalledWith("agents");
    expect(alertsBuilder.insert).toHaveBeenCalled();
    expect(configBuilder.update).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("http://slack.com", expect.any(Object));
  });

  test("should trigger CPU threshold alert", async () => {
    mockConfigs = [
      {
        id: "config-1",
        agent_id: "agent-123",
        cpu_threshold: 80,
        last_triggered_at: null,
        channel: { active: true, type: "discord", config: { webhook_url: "http://discord.com" } },
      },
    ];

    await processSmartAlerts("agent-123", "online", { cpu_usage: 85, memory_usage: 20 });

    expect(alertsBuilder.insert).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("http://discord.com", expect.any(Object));

    const insertCall = alertsBuilder.insert.mock.calls[0][0];
    expect(insertCall.message).toContain("CPU usage exceeded");
  });

  test("should trigger Memory threshold alert", async () => {
    mockConfigs = [
      {
        id: "config-1",
        agent_id: "agent-123",
        mem_threshold: 80,
        last_triggered_at: null,
        channel: { active: true, type: "webhook", config: { webhook_url: "http://hook.com" } },
      },
    ];

    await processSmartAlerts("agent-123", "online", { cpu_usage: 10, memory_usage: 90 });

    expect(alertsBuilder.insert).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("http://hook.com", expect.any(Object));

    const insertCall = alertsBuilder.insert.mock.calls[0][0];
    expect(insertCall.message).toContain("Memory usage exceeded");
  });
});
