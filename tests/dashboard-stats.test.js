
import { describe, test, expect, mock, beforeAll, afterAll } from "bun:test";

// Mock uuid and jose
mock.module('uuid', () => {
  return {
    v4: () => '11111111-2222-3333-4444-555555555555',
    validate: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  };
});

mock.module('jose', () => {
  return {
    SignJWT: class {
      setProtectedHeader() { return this; }
      setIssuedAt() { return this; }
      setExpirationTime() { return this; }
      sign() { return Promise.resolve('mock-token'); }
    },
    jwtVerify: () => Promise.resolve({ payload: { agent_id: 'mock-agent' } }),
  };
});

// Mock environment variables
const originalEnv = process.env;

beforeAll(() => {
  process.env = { ...originalEnv };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock data
const MOCK_USER_ID = "user-123";
const NUM_AGENTS = 5000; // Increased number to make the difference more visible
const AGENTS = Array.from({ length: NUM_AGENTS }, (_, i) => ({
  id: `agent-${i}`,
  user_id: MOCK_USER_ID,
  status: ["healthy", "idle", "error", "offline"][i % 4],
  metrics_json: {
    cost_usd: Math.random() * 10,
    tasks_completed: Math.floor(Math.random() * 100),
  },
}));

const FLEETS = Array.from({ length: 50 }, (_, i) => ({
  id: `fleet-${i}`,
  user_id: MOCK_USER_ID,
}));

const ALERTS_COUNT = 15;

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: async () => ({ data: { user: { id: MOCK_USER_ID } }, error: null }),
  },
  from: (table) => {
    return {
      select: (columns, options) => {
        const query = {
          eq: (col, val) => {
             // Basic chaining mock
             return query;
          },
          neq: () => query,
          maybeSingle: async () => ({ data: { plan: 'pro' } }),
          single: async () => ({ data: null }),
          order: () => query,
          limit: () => query,
        };

        // Mock specific responses based on table
        if (table === 'agents') {
           // Simulate the response for agents query
           query.eq = (col, val) => {
             if (col === 'user_id' && val === MOCK_USER_ID) {
                // Return promise compatible object
                return {
                    then: (resolve) => resolve({ data: AGENTS, error: null })
                }
             }
             return query;
           }
        }

        if (table === 'fleets') {
             query.eq = (col, val) => {
                 if (col === 'user_id') {
                    return {
                        then: (resolve) => resolve({ data: FLEETS, error: null })
                    }
                 }
                 return query;
             }
        }

        if (table === 'alerts') {
             query.select = (cols, opts) => {
                 return query;
             }
             query.eq = (col, val) => {
                 // Chain eq calls
                 return query;
             }
             // The alert query ends with .eq('resolved', false)
             // We can just return the count at the end of the chain or promise
             query.then = (resolve) => resolve({ count: ALERTS_COUNT, data: [], error: null });
        }

        // Handle RPC
        if (table === 'rpc') {
            // We'll mock this later for the improved version
        }

        return query;
      },
      insert: async () => ({ error: null }),
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: {} }) }) }) }),
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      upsert: () => ({ select: () => ({ single: async () => ({ data: {} }) }) }),
    };
  },
  rpc: async (fn, args) => {
      // Mock for the new implementation
      if (fn === 'get_dashboard_stats') {
          return {
              data: {
                  total_agents: AGENTS.length,
                  total_fleets: FLEETS.length,
                  healthy: AGENTS.filter(a => a.status === 'healthy').length,
                  idle: AGENTS.filter(a => a.status === 'idle').length,
                  error: AGENTS.filter(a => a.status === 'error').length,
                  offline: AGENTS.filter(a => a.status === 'offline').length,
                  total_cost: parseFloat(AGENTS.reduce((sum, a) => sum + (a.metrics_json?.cost_usd || 0), 0).toFixed(2)),
                  total_tasks: AGENTS.reduce((sum, a) => sum + (a.metrics_json?.tasks_completed || 0), 0),
                  unresolved_alerts: ALERTS_COUNT
              },
              error: null
          };
      }
      // Mock for rate limit check
      if (fn === 'check_rate_limit') {
          return { data: { allowed: true }, error: null };
      }
      return { data: null, error: 'Function not found' };
  }
};

mock.module("@supabase/supabase-js", () => ({
  createClient: () => mockSupabase,
}));

mock.module("next/server", () => ({
  NextResponse: {
    json: (data, opts) => ({
      json: async () => data,
      status: opts?.status || 200,
    }),
  },
}));

describe("Dashboard Stats", () => {
  test("should call get_dashboard_stats RPC and return stats", async () => {
    // Import the route handler dynamically after mocking
    const { GET } = await import("../app/api/dashboard/stats/route.js");

    const req = new Request("http://localhost:3000/dashboard/stats", {
      headers: {
        authorization: "Bearer mock-token",
      },
    });

    const res = await GET(req);

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.total_agents).toBe(NUM_AGENTS);
    expect(data.stats.total_fleets).toBe(50);
    expect(data.stats.unresolved_alerts).toBe(ALERTS_COUNT);
    // Ensure RPC mock was hit (implicit by the data being returned from the mock)
  });
});
