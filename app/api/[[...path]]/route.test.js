import { describe, test, expect, mock, beforeAll } from 'bun:test';

// Mock dependencies
mock.module('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
  validate: (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str),
}));

mock.module('jose', () => {
  return {
    SignJWT: class {
      setProtectedHeader() { return this; }
      setIssuedAt() { return this; }
      setExpirationTime() { return this; }
      sign() { return Promise.resolve('mock_token'); }
    },
    jwtVerify: () => Promise.resolve({ payload: { agent_id: '123' } }),
  };
});

const { v4: uuidv4 } = await import('uuid');

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyToMock...';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

// Mock supabase-js
mock.module('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      rpc: () => Promise.resolve({ data: { allowed: true }, error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            neq: () => ({ maybeSingle: () => Promise.resolve({ data: { plan: 'free' } }) }),
            maybeSingle: () => Promise.resolve({ data: { user_id: 'user123' } }),
            single: () => Promise.resolve({ data: { policy_profile: 'dev' } }),
          }),
        }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    }),
  };
});

// Mock next/server
const MockNextResponse = class {
  constructor(body, init) {
    this.body = body;
    this.init = init;
    this.status = init?.status || 200;
    this.headers = new Map(Object.entries(init?.headers || {}));
  }
  static json(data, init) {
    return { json: data, status: init?.status || 200 };
  }
};

mock.module('next/server', () => {
  return {
    NextResponse: MockNextResponse,
  };
});

// Import the GET handler
const { GET } = await import('./route.js');

describe('Vulnerability Fix Verification', () => {
  test('Should reject malicious agent_id with 400', async () => {
    const maliciousAgentId = '"; echo "INJECTED"; "';
    const agentSecret = uuidv4();

    const req = {
      headers: {
        get: (name) => {
          if (name === 'x-forwarded-for') return '127.0.0.1';
          return null;
        },
      },
      url: `http://localhost:3000/api/install-agent?agent_id=${encodeURIComponent(maliciousAgentId)}&agent_secret=${agentSecret}&interval=60`,
    };

    const context = {
      params: Promise.resolve({ path: ['install-agent'] }),
    };

    const response = await GET(req, context);

    // It should be a JSON response with 400 error
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Invalid agent_id format' });
  });

  test('Should reject invalid interval with 400', async () => {
    const validAgentId = uuidv4();
    const validAgentSecret = uuidv4();
    const maliciousInterval = '60; rm -rf /';

    const req = {
      headers: {
        get: (name) => {
          if (name === 'x-forwarded-for') return '127.0.0.1';
          return null;
        },
      },
      url: `http://localhost:3000/api/install-agent?agent_id=${validAgentId}&agent_secret=${validAgentSecret}&interval=${encodeURIComponent(maliciousInterval)}`,
    };

    const context = {
      params: Promise.resolve({ path: ['install-agent'] }),
    };

    const response = await GET(req, context);

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Invalid interval format' });
  });

  test('Should accept valid UUID agent_id and secret', async () => {
    const validAgentId = uuidv4();
    const validAgentSecret = uuidv4();

    const req = {
      headers: {
        get: (name) => {
          if (name === 'x-forwarded-for') return '127.0.0.1';
          return null;
        },
      },
      url: `http://localhost:3000/api/install-agent?agent_id=${validAgentId}&agent_secret=${validAgentSecret}&interval=60`,
    };

    const context = {
      params: Promise.resolve({ path: ['install-agent'] }),
    };

    const response = await GET(req, context);

    expect(response.status).toBe(200);
    expect(response.body).toContain(`AGENT_ID="${validAgentId}"`);
    expect(response.body).toContain(`AGENT_SECRET="${validAgentSecret}"`);
  });
});
