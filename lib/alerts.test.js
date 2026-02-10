import { describe, it, expect, mock, beforeAll, beforeEach } from 'bun:test';

// Unified mock builder
const createMockBuilder = (table) => {
  const builder = {};

  // Chainable methods
  builder.select = mock(() => builder);
  builder.eq = mock(() => builder);
  builder.maybeSingle = mock(() =>
    Promise.resolve({ data: { name: 'Fetched Agent' }, error: null })
  );
  builder.single = mock(() => Promise.resolve({ data: { name: 'Fetched Agent' }, error: null }));
  builder.insert = mock(() => Promise.resolve({ error: null }));
  builder.update = mock(() => builder);

  // Make the builder itself awaitable
  builder.then = (resolve, reject) => {
    // Return appropriate data based on the table
    if (table === 'alert_configs') {
      resolve({
        data: [
          {
            id: 'cfg-1',
            cpu_threshold: 10,
            channel: { active: true, type: 'webhook', config: {} },
          },
        ],
        error: null,
      });
    } else {
      resolve({ data: [], error: null });
    }
  };

  return builder;
};

// Create the mock function for 'from'
const mockFrom = mock((table) => createMockBuilder(table));

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('lib/alerts', () => {
  let processSmartAlerts;

  beforeAll(async () => {
    // Dynamic import to ensure mock is applied
    const module = await import('./alerts.js');
    processSmartAlerts = module.processSmartAlerts;
  });

  beforeEach(() => {
    mockFrom.mockClear();
  });

  it('should fetch configs if not provided', async () => {
    await processSmartAlerts('agent-123', 'healthy', { cpu_usage: 5 });

    // Check that 'alert_configs' was queried
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables).toContain('alert_configs');
  });

  it('should NOT fetch configs if provided', async () => {
    const preloadedConfigs = [
      {
        id: 'cfg-1',
        cpu_threshold: 90,
        channel: { active: true, type: 'webhook', config: {} },
      },
    ];

    // Call with preloaded configs
    await processSmartAlerts('agent-123', 'healthy', { cpu_usage: 5 }, preloadedConfigs);

    // Check that 'alert_configs' was NOT queried
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain('alert_configs');
  });

  it('should NOT fetch agent name if provided', async () => {
    const preloadedConfigs = [
      {
        id: 'cfg-1',
        cpu_threshold: 10, // Force trigger
        channel: { active: true, type: 'webhook', config: {} },
      },
    ];

    // Call with preloaded configs AND agentName
    await processSmartAlerts(
      'agent-123',
      'healthy',
      { cpu_usage: 50 },
      preloadedConfigs,
      'Test Agent Name'
    );

    // Check that 'agents' was NOT queried (which happens in dispatchAlert)
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain('agents');
  });
});
