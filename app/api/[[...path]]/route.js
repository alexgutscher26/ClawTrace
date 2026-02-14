import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { unstable_cache } from 'next/cache';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { tursoAdapter } from '@/lib/turso-adapter';
import { turso } from '@/lib/turso';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import { encrypt, decryptAsync } from '@/lib/encryption';
import {
  getPolicy,
  DEFAULT_POLICY_PROFILE,
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
} from '@/lib/policies';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limits';
import { MODEL_PRICING } from '@/lib/pricing';
import { processSmartAlerts } from '@/lib/alerts';
import { promises as fs } from 'fs';
import path from 'path';
import Stripe from 'stripe';

/**
 * Reads a script file and replaces placeholders with specified values.
 */
async function getScript(filename, replacements) {
  const filePath = path.join(process.cwd(), 'lib/scripts', filename);
  let content = await fs.readFile(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

/**
 * Decrypts the agent's configuration and secret asynchronously.
 *
 * This function takes an agent object, checks for the presence of a config_json and agent_secret,
 * and attempts to decrypt them using the async decrypt function to avoid blocking the event loop.
 * If decryption is successful, the decrypted values are parsed and assigned to a new object.
 * In case of any errors during decryption, an error message is logged to the console,
 * and the original values are retained.
 *
 * @param {Object} a - The agent object containing configuration and secret to be decrypted.
 */
const decryptAgent = async (a) => {
  if (!a) return a;
  const decrypted = { ...a };
  try {
    if (a.config_json) {
      const d = await decryptAsync(a.config_json);
      decrypted.config_json = d ? JSON.parse(d) : a.config_json;
    }
    if (a.agent_secret) {
      decrypted.agent_secret = await decryptAsync(a.agent_secret);
    }
    if (a.metrics_json && typeof a.metrics_json === 'string') {
      try {
        decrypted.metrics_json = JSON.parse(a.metrics_json);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  } catch (e) {
    console.error('Failed to decrypt agent:', a.id, e);
  }
  return decrypted;
};

/**
 * Processes items in batches to avoid blocking the event loop.
 *
 * This function takes an array of items and processes them in smaller batches defined by the batchSize parameter.
 * It uses the provided function fn to process each item in the batch concurrently with Promise.all.
 * After processing each batch, it ensures that the event loop remains unblocked by awaiting a setImmediate call
 * before proceeding to the next batch, if there are more items to process.
 *
 * @param {Array} items - The array of items to be processed.
 * @param {number} batchSize - The size of each batch to process.
 * @param {Function} fn - The function to apply to each item in the batch.
 */
async function processInBatches(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  return results;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Retrieves the subscription tier for a given user.
 *
 * This function checks if a userId is provided. If not, it defaults to returning 'free'.
 * If a userId is present, it queries the 'subscriptions' table in the Supabase database
 * to find the user's current plan, ensuring that the subscription status is not 'cancelled'.
 * It returns the plan if found, or 'free' if no valid plan exists.
 *
 * @param {string} userId - The ID of the user whose subscription tier is to be retrieved.
 */
const getTier = unstable_cache(
  async (userId) => {
    if (!userId) return 'free';
    try {
      // 1. Try Turso
      const res = await turso.execute({
        sql: "SELECT plan FROM subscriptions WHERE user_id = ? AND status != 'cancelled' LIMIT 1",
        args: [userId],
      });
      if (res.rows.length > 0) return res.rows[0].plan.toLowerCase();

      // 2. Fallback to Supabase
      const { data } = await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .maybeSingle();

      return (data?.plan || 'free').toLowerCase();
    } catch (e) {
      console.warn('[getTier] Turso/Supabase error:', e.message);
      return 'free';
    }
  },
  ['user-tier'],
  { tags: ['user-tier'], revalidate: 60 }
);

/**
 * Validates parameters for agent installation scripts.
 *
 * This function checks for the presence of agentId and validates its format using uuidValidate.
 * It also validates the agentSecret format if provided and ensures that the interval, if present, is a positive integer.
 * If any validation fails, an error object is returned; otherwise, null is returned.
 *
 * @param agentId - The unique identifier for the agent.
 * @param agentSecret - The secret key associated with the agent.
 * @param interval - An optional parameter representing the interval, expected to be a positive integer.
 * @returns An error object if validation fails, or null if all parameters are valid.
 */
function validateInstallParams(agentId, agentSecret, interval) {
  if (!agentId) {
    return { error: 'Missing agent_id parameter', status: 400 };
  }
  if (!uuidValidate(agentId)) {
    return { error: 'Invalid agent_id format', status: 400 };
  }
  if (agentSecret && !uuidValidate(agentSecret)) {
    return { error: 'Invalid agent_secret format', status: 400 };
  }
  if (interval && !/^\d+$/.test(interval)) {
    return { error: 'Invalid interval format', status: 400 };
  }
  return null;
}

/**
 * Check the rate limit for a given request and identifier.
 *
 * This function retrieves the current rate limit tier for the user and checks the number of available tokens.
 * It updates the token bucket based on the elapsed time since the last refill and either allows or denies the request
 * based on the token availability. If the request is denied, it provides a retry-after duration.
 *
 * @param request - The incoming request object.
 * @param identifier - A unique identifier for the rate limit check.
 * @param type - The type of rate limit to check (default is 'global').
 * @param userId - The ID of the user (optional).
 * @param cachedTier - The cached subscription tier (optional).
 * @returns An object indicating whether the request is allowed and, if not, the error response.
 */
async function checkRateLimit(
  request,
  identifier,
  type = 'global',
  userId = null,
  cachedTier = null
) {
  const tier = (cachedTier || (await getTier(userId)) || 'free').toLowerCase();
  const tierConfig = RATE_LIMIT_CONFIG[tier] || RATE_LIMIT_CONFIG.free;
  const config = tierConfig[type] || RATE_LIMIT_CONFIG.free[type];

  if (!config) {
    console.error('[Rate Limit] Missing config for type:', type);
    return { allowed: true };
  }

  try {
    const key = `${identifier}:${type}`;
    const now = new Date().toISOString();

    // Simplified Turso logic:
    const res = await turso.execute({
      sql: 'SELECT tokens, last_refill FROM api_rate_limits WHERE key = ?',
      args: [key],
    });

    let tokens;
    let lastRefill;

    if (res.rows.length === 0) {
      tokens = Number(config.capacity) - 1;
      lastRefill = now;

      if (!isFinite(tokens)) return { allowed: true };

      await turso.execute({
        sql: 'INSERT INTO api_rate_limits (key, tokens, last_refill) VALUES (?, ?, ?)',
        args: [key, tokens, lastRefill],
      });
    } else {
      const row = res.rows[0];
      let lastRefillDate = new Date(row.last_refill);

      // Sanitize: If DB has invalid date, reset to now
      if (isNaN(lastRefillDate.getTime())) {
        lastRefillDate = new Date();
      }

      const secondsPassed = Math.max(0, (new Date().getTime() - lastRefillDate.getTime()) / 1000);
      const refillRate = Number(config.refillRate || 0);
      const currentTokens = Math.min(
        Number(config.capacity),
        Number(row.tokens || 0) + secondsPassed * refillRate
      );

      if (!isFinite(currentTokens)) return { allowed: true };

      if (currentTokens < 1) {
        return {
          allowed: false,
          response: json(
            {
              error: 'Too many requests',
              type,
              retry_after: Math.ceil((1 - currentTokens) / (refillRate || 0.1)),
            },
            429
          ),
        };
      }

      tokens = currentTokens - 1;
      lastRefill = now;

      if (!isFinite(tokens)) return { allowed: true };

      await turso.execute({
        sql: 'UPDATE api_rate_limits SET tokens = ?, last_refill = ? WHERE key = ?',
        args: [tokens, lastRefill, key],
      });
    }

    return { allowed: true };
  } catch (e) {
    console.error('[Rate Limit] Turso error:', e.message);
    // Fail open
    return { allowed: true };
  }
}

/**
 * Creates a JWT token for the specified agent and fleet.
 */
async function createAgentToken(agentId, fleetId, extraPayload = {}) {
  return await new SignJWT({ agent_id: agentId, fleet_id: fleetId, ...extraPayload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Tokens expire in 24 hours
    .sign(JWT_SECRET);
}

async function verifyAgentToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function getPath(params) {
  const segments = params?.path || [];
  return '/' + segments.join('/');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Handle GET requests for various API endpoints and return appropriate responses.
 *
 * This function processes incoming requests by checking rate limits, serving different responses based on the request path, and managing user authentication. It includes health checks, agent installation scripts, and data retrieval from the database. The function also handles session tokens and errors gracefully, ensuring proper responses for each endpoint.
 *
 * @param request - The incoming request object.
 * @param context - The context object containing parameters and other relevant data.
 * @returns A JSON response based on the requested path and processed data.
 * @throws Error If an internal error occurs during processing.
 */
export async function GET(request, context) {
  const params = await context.params;
  const path = getPath(params);
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // Global IP Rate Limit
    const globalLimit = await checkRateLimit(request, ip, 'global');
    if (!globalLimit.allowed) return globalLimit.response;

    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Serve a shell-based heartbeat script for easy install (Linux + macOS)
    if (path === '/install-agent') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id');
      const agentSecret =
        request.headers.get('x-agent-secret') || searchParams.get('agent_secret') || '';
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.headers.get('origin') ||
        'http://localhost:3000';

      try {
        new URL(baseUrl);
        if (baseUrl.includes('"') || baseUrl.includes("'")) throw new Error('Invalid characters');
      } catch {
        return json({ error: 'Invalid base URL' }, 400);
      }

      // Determine user tier for heartbeat interval
      if (!interval) {
        // Get agent's user_id to determine tier
        let agent = null;
        try {
          const res = await turso.execute({
            sql: 'SELECT user_id, policy_profile FROM agents WHERE id = ?',
            args: [agentId]
          });
          agent = res.rows[0];
        } catch (e) {
          console.error('[Install Agent] Turso error:', e.message);
        }

        if (agent) {
          const tier = await getTier(agent.user_id);

          const profile = agent?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            try {
              const cpRes = await turso.execute({
                sql: 'SELECT heartbeat_interval FROM custom_policies WHERE user_id = ? AND name = ? LIMIT 1',
                args: [agent.user_id, profile]
              });
              if (cpRes.rows.length > 0) {
                policyInterval = cpRes.rows[0].heartbeat_interval;
              }
            } catch (e) {
              console.error('[Install Agent] Custom policy fetch error:', e);
            }
          }
          interval = policyInterval.toString();
        } else {
          interval = '300';
        }
      }

      const script = await getScript('install-agent.sh', {
        AGENT_ID: agentId,
        BASE_URL: baseUrl,
        AGENT_SECRET: agentSecret,
        INTERVAL: interval,
      });

      return new NextResponse(script, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // PowerShell heartbeat script for Windows users
    if (path === '/install-agent-ps') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id');
      const agentSecret =
        request.headers.get('x-agent-secret') || searchParams.get('agent_secret') || '';
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.headers.get('origin') ||
        'http://localhost:3000';

      try {
        new URL(baseUrl);
        if (baseUrl.includes('"') || baseUrl.includes("'")) throw new Error('Invalid characters');
      } catch {
        return json({ error: 'Invalid base URL' }, 400);
      }

      // Determine user tier for heartbeat interval
      if (!interval) {
        // Get agent's user_id to determine tier
        let agent = null;
        try {
          const res = await turso.execute({
            sql: 'SELECT user_id, policy_profile FROM agents WHERE id = ?',
            args: [agentId]
          });
          agent = res.rows[0];
        } catch (e) {
          console.error('[Install Agent] Turso error:', e.message);
        }

        if (agent) {
          const tier = await getTier(agent.user_id);

          const profile = agent?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            try {
              const cpRes = await turso.execute({
                sql: 'SELECT heartbeat_interval FROM custom_policies WHERE user_id = ? AND name = ? LIMIT 1',
                args: [agent.user_id, profile]
              });
              if (cpRes.rows.length > 0) {
                policyInterval = cpRes.rows[0].heartbeat_interval;
              }
            } catch (e) {
              console.error('[Install Agent] Custom policy fetch error:', e);
            }
          }
          interval = policyInterval.toString();
        } else {
          interval = '300';
        }
      }

      const psScript = await getScript('install-agent.ps1', {
        AGENT_ID: agentId,
        BASE_URL: baseUrl,
        AGENT_SECRET: agentSecret,
        INTERVAL: interval,
      });

      return new NextResponse(psScript, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clawtrace-agent.ps1"',
        },
      });
    }

    // Python heartbeat script - cross-platform (Windows, macOS, Linux)
    if (path === '/install-agent-py') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id');
      const agentSecret =
        request.headers.get('x-agent-secret') || searchParams.get('agent_secret') || '';
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.headers.get('origin') ||
        'http://localhost:3000';

      try {
        new URL(baseUrl);
        if (baseUrl.includes('"') || baseUrl.includes("'")) throw new Error('Invalid characters');
      } catch {
        return json({ error: 'Invalid base URL' }, 400);
      }

      // Determine user tier for heartbeat interval
      if (!interval) {
        // Get agent's user_id to determine tier
        let agent = null;
        try {
          const res = await turso.execute({
            sql: 'SELECT user_id, policy_profile FROM agents WHERE id = ?',
            args: [agentId]
          });
          agent = res.rows[0];
        } catch (e) {
          console.error('[Install Agent] Turso error:', e.message);
        }

        if (agent) {
          const tier = await getTier(agent.user_id);

          const profile = agent?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            try {
              const cpRes = await turso.execute({
                sql: 'SELECT heartbeat_interval FROM custom_policies WHERE user_id = ? AND name = ? LIMIT 1',
                args: [agent.user_id, profile]
              });
              if (cpRes.rows.length > 0) {
                policyInterval = cpRes.rows[0].heartbeat_interval;
              }
            } catch (e) {
              console.error('[Install Agent] Custom policy fetch error:', e);
            }
          }
          interval = policyInterval.toString();
        } else {
          interval = '300';
        }
      }

      const pyLines = await getScript('install-agent.py', {
        AGENT_ID: agentId,
        BASE_URL: baseUrl,
        AGENT_SECRET: agentSecret,
        INTERVAL: interval,
      });

      return new NextResponse(pyLines, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clawtrace-agent.py"',
        },
      });
    }

    if (path === '/auth/me') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      return json({ user: { id: user.id, email: user.email } });
    }

    if (path === '/fleets') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      // Try Turso first
      const fleets = await tursoAdapter.getFleets(user.id).catch(() => []);

      return json({ fleets });
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { searchParams } = new URL(request.url);
      const fleet_id = searchParams.get('fleet_id');

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Try Turso first (New records)
      let agents = await tursoAdapter.getAgents(user.id, limit, offset).catch(() => []);

      if (fleet_id) {
        // Filter Turso results by fleet if requested
        agents = agents.filter((a) => a.fleet_id === fleet_id);
      }

      // Optimize: Process decryption in batches to prevent event loop blocking
      const decryptedAgents = await processInBatches(agents, 50, decryptAgent);
      return json({ agents: decryptedAgents });
    }

    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      
      const res = await turso.execute({
        sql: 'SELECT * FROM agents WHERE id = ? AND user_id = ?',
        args: [agentMatch[1], user.id]
      });
      
      if (res.rows.length === 0) return json({ error: 'Agent not found' }, 404);
      const agent = res.rows[0];
      
      return json({ agent: await decryptAgent(agent) });
    }

    const metricsMatch = path.match(/^\/agents\/([^/]+)\/metrics$/);
    if (metricsMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const agentId = metricsMatch[1];

      // Try Turso first (New high-frequency metrics)
      let metrics = await tursoAdapter.getMetrics(agentId).catch(() => []);

      return json({ metrics });
    }

    if (path === '/alert-channels') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let channels = [];
      try {
        const res = await turso.execute({
          sql: 'SELECT * FROM alert_channels WHERE user_id = ? ORDER BY created_at DESC',
          args: [user.id],
        });
        channels = res.rows.map((row) => ({
          ...row,
          active: !!row.active,
          config: row.config ? JSON.parse(row.config) : {},
        }));
      } catch (e) {
        console.error('[Alert Channels] Turso error:', e.message);
      }
      return json({ channels });
    }

    if (path === '/alert-configs') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { searchParams } = new URL(request.url);
      const agent_id = searchParams.get('agent_id');

      let configs = [];
      try {
        let sql = `
          SELECT ac.*, 
                 ch.name as channel_name, 
                 ch.type as channel_type, 
                 ch.config as channel_config, 
                 ch.active as channel_active 
          FROM alert_configs ac 
          LEFT JOIN alert_channels ch ON ac.channel_id = ch.id 
          WHERE ac.user_id = ?
        `;
        const args = [user.id];

        if (agent_id) {
          sql += ' AND ac.agent_id = ?';
          args.push(agent_id);
        }

        sql += ' ORDER BY ac.created_at DESC';

        const res = await turso.execute({ sql, args });

        configs = res.rows.map((row) => ({
          ...row,
          channel: row.channel_id
            ? {
                id: row.channel_id,
                name: row.channel_name,
                type: row.channel_type,
                config: row.channel_config ? JSON.parse(row.channel_config) : {},
                active: !!row.channel_active,
              }
            : null,
        }));
      } catch (e) {
        console.error('[Alert Configs] Turso error:', e.message);
      }
      return json({ configs });
    }

    if (path === '/alerts') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      // Try Turso
      let alerts = [];
      try {
        const res = await turso.execute({
          sql: 'SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
          args: [user.id],
        });
        alerts = res.rows;
      } catch (e) {
        console.error('[Alerts API] Turso error:', e.message);
      }

      return json({ alerts });
    }

    if (path === '/dashboard/stats') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      // Try Turso stats
      const stats = await tursoAdapter.getStats(user.id).catch(() => null);

      return json({
        stats: stats || {
          total_agents: 0,
          total_fleets: 0,
          healthy: 0,
          idle: 0,
          error: 0,
          offline: 0,
          total_cost: 0,
          total_tasks: 0,
          unresolved_alerts: 0,
        },
      });
    }

    // ============ STALE AGENT CRON (MOVED TO /api/cron/check-stale) ============
    // Logic migrated to specialized route handler: app/api/cron/check-stale/route.js

    // ============ BILLING / SUBSCRIPTION ============
    if (path === '/billing') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .maybeSingle();
      // Use Turso for agent count first
      let agentCount = 0;
      try {
        const res = await turso.execute({
          sql: 'SELECT count(*) as count FROM agents WHERE user_id = ?',
          args: [user.id],
        });
        agentCount = res.rows[0].count;
      } catch (e) {
        console.error('[Billing API] Turso error:', e.message);
      }

      const plan = (sub?.plan || 'free').toLowerCase();
      const subscription = sub ? { ...sub, plan } : { plan: 'free', status: 'active' };

      let invoice = null;
      let payment_method = null;

      if (sub?.stripe_customer_id) {
        try {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

          // Fetch upcoming invoice
          try {
            const upcoming = await stripe.invoices.retrieveUpcoming({
              customer: sub.stripe_customer_id,
            });
            if (upcoming) {
              invoice = {
                amount: upcoming.amount_due,
                date: new Date(upcoming.next_payment_attempt * 1000).toISOString(),
                currency: upcoming.currency,
              };
            }
          } catch (e) {
            // No upcoming invoice or error
          }

          // Fetch payment methods
          const methods = await stripe.paymentMethods.list({
            customer: sub.stripe_customer_id,
            type: 'card',
            limit: 1,
          });

          if (methods.data.length > 0) {
            const pm = methods.data[0];
            payment_method = {
              brand: pm.card.brand,
              last4: pm.card.last4,
            };
          }
        } catch (e) {
          console.error('[Billing API] Stripe error:', e.message);
        }
      }

      return json({
        subscription,
        invoice,
        payment_method,
        agent_count: agentCount,
        limits: {
          free: { max_agents: 1, alerts: false, teams: false, heartbeat_min: 300 },
          pro: { max_agents: -1, alerts: true, teams: true, heartbeat_min: 60 },
          enterprise: {
            max_agents: -1,
            alerts: true,
            teams: true,
            custom_policies: true,
            sso: true,
            heartbeat_min: 10,
          },
        },
      });
    }

    // ============ TEAM MANAGEMENT ============
    if (path === '/team') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let { data: team, error } = await supabaseAdmin
        .from('teams')
        .select('*')
        .or(`owner_id.eq.${user.id},members.cs.[{"user_id":"${user.id}"}]`)
        .maybeSingle();

      if (!team && !error) {
        team = {
          id: uuidv4(),
          name: `${user.email?.split('@')[0]}'s Team`,
          owner_id: user.id,
          members: [
            {
              user_id: user.id,
              email: user.email,
              role: 'owner',
              joined_at: new Date().toISOString(),
            },
          ],
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('teams').insert(team);
      }
      return json({ team });
    }

    // ============ CUSTOM POLICIES (ENTERPRISE) ============
    if (path === '/custom-policies') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let policies = [];
      try {
        const res = await turso.execute({
          sql: 'SELECT * FROM custom_policies WHERE user_id = ? ORDER BY created_at DESC',
          args: [user.id],
        });
        policies = res.rows.map((row) => ({
          ...row,
          is_active: !!row.is_active,
          skills: row.skills ? JSON.parse(row.skills) : [],
          tools: row.tools ? JSON.parse(row.tools) : [],
          guardrails: row.guardrails ? JSON.parse(row.guardrails) : {},
        }));
      } catch (e) {
        console.error('[Custom Policies] Turso error:', e.message);
      }
      return json({ policies });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let policy = null;
      try {
        const res = await turso.execute({
          sql: 'SELECT * FROM custom_policies WHERE id = ? AND user_id = ?',
          args: [customPolicyMatch[1], user.id],
        });
        if (res.rows.length > 0) {
          policy = res.rows[0];
          policy.is_active = !!policy.is_active;
          policy.skills = policy.skills ? JSON.parse(policy.skills) : [];
          policy.tools = policy.tools ? JSON.parse(policy.tools) : [];
          policy.guardrails = policy.guardrails ? JSON.parse(policy.guardrails) : {};
        }
      } catch (e) {
        console.error('[Custom Policy] Turso error:', e.message);
      }

      if (!policy) return json({ error: 'Custom policy not found' }, 404);
      return json({ policy });
    }

    // ============ ENTERPRISE BRANDING ============
    if (path === '/enterprise/branding') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: branding } = await supabaseAdmin
        .from('enterprise_branding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return json({ branding: branding || { domain: '', name: '' } });
    }

    // ============ PUBLIC BRANDING (DOMAIN RESOLUTION) ============
    if (path === '/branding/public') {
      const { searchParams } = new URL(request.url);
      const domain = searchParams.get('domain');
      if (!domain) return json({ error: 'Domain required' }, 400);

      const { data: branding } = await supabaseAdmin
        .from('enterprise_branding')
        .select('name, domain') // Public fields only
        .eq('domain', domain)
        .maybeSingle();

      return json({ branding: branding || null });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

/**
 * Handles POST requests for various endpoints related to fleets, agents, alerts, billing, and team management.
 *
 * The function processes the request based on the path, performing actions such as creating fleets and agents,
 * managing agent heartbeats, handling billing through Stripe, and managing team invitations. It includes
 * rate limiting, user authentication, and error handling for various operations, ensuring that each action adheres
 * to user permissions and subscription tiers.
 *
 * @param request - The incoming request object containing headers and body data.
 * @param context - The context object providing parameters and other relevant data.
 * @returns A JSON response indicating the result of the operation, including success messages or error details.
 * @throws Error If an internal error occurs during processing.
 */
export async function POST(request, context) {
  const params = await context.params;
  const path = getPath(params);
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // Global IP Rate Limit
    const globalLimit = await checkRateLimit(request, ip, 'global');
    if (!globalLimit.allowed) return globalLimit.response;

    if (path === '/fleets') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const fleetId = uuidv4();
      const fleet = {
        id: fleetId,
        user_id: user.id,
        name: body.name || 'My Fleet',
        created_at: new Date().toISOString(),
      };

      // 1. Write to Turso (Primary)
      await turso.execute({
        sql: 'INSERT INTO fleets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
        args: [fleet.id, fleet.user_id, fleet.name, fleet.created_at],
      });

      return json({ fleet }, 201);
    }

    // ============ CUSTOM POLICIES (ENTERPRISE) ============
    if (path === '/custom-policies') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier !== 'enterprise') {
        return json({ error: 'Custom policies require an ENTERPRISE plan' }, 403);
      }

      const body = await request.json();
      if (!body.name || !body.label) {
        return json({ error: 'Name and label are required' }, 400);
      }

      const policy = {
        id: uuidv4(),
        user_id: user.id,
        name: body.name.toLowerCase().replace(/\s+/g, '-'),
        label: body.label.toUpperCase(),
        description: body.description || '',
        color: body.color || 'text-blue-400 border-blue-500/30',
        bg: body.bg || 'bg-blue-500/10',
        skills: JSON.stringify(body.skills || []),
        tools: JSON.stringify(body.tools || []),
        data_access: body.data_access || 'restricted',
        heartbeat_interval: parseInt(body.heartbeat_interval) || 300,
        guardrails: JSON.stringify(body.guardrails || {}),
        is_active: 1, // Turso uses 0/1 for boolean
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await turso.execute({
          sql: `INSERT INTO custom_policies (
            id, user_id, name, label, description, color, bg, skills, tools, data_access, heartbeat_interval, guardrails, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            policy.id,
            policy.user_id,
            policy.name,
            policy.label,
            policy.description,
            policy.color,
            policy.bg,
            policy.skills,
            policy.tools,
            policy.data_access,
            policy.heartbeat_interval,
            policy.guardrails,
            policy.is_active,
            policy.created_at,
            policy.updated_at,
          ],
        });
      } catch (e) {
        console.error('[Custom Policy] Turso error:', e.message);
        throw e;
      }

      // Return with parsed JSON for UI
      return json(
        {
          policy: {
            ...policy,
            skills: JSON.parse(policy.skills),
            tools: JSON.parse(policy.tools),
            guardrails: JSON.parse(policy.guardrails),
            is_active: true,
          },
        },
        201
      );
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier === 'free') {
        // Check Turso first for limits
        const res = await turso.execute({
          sql: 'SELECT count(*) as count FROM agents WHERE user_id = ?',
          args: [user.id],
        });
        const count = res.rows[0].count;
        if (count >= 1) {
          return json(
            { error: 'FREE tier is limited to 1 agent node. Upgrade for unlimited scale.' },
            403
          );
        }
      }

      const body = await request.json();
      const plainSecret = uuidv4();
      const policyProfile = body.policy_profile || DEFAULT_POLICY_PROFILE;
      let policy = getPolicy(policyProfile);

      const agentId = uuidv4();
      const agent = {
        id: agentId,
        fleet_id: body.fleet_id,
        user_id: user.id,
        name: body.name || 'New Agent',
        gateway_url: body.gateway_url || '',
        status: 'idle',
        last_heartbeat: null,
        config_json: JSON.stringify({
          profile: policyProfile,
          skills: policy.skills,
          model: body.model || 'claude-sonnet-4',
          data_scope:
            policyProfile === POLICY_DEV
              ? 'full'
              : policyProfile === POLICY_OPS
                ? 'system'
                : 'read-only',
        }),
        metrics_json: JSON.stringify({
          latency_ms: 0,
          tasks_completed: 0,
          errors_count: 0,
          uptime_hours: 0,
          cpu_usage: 0,
          memory_usage: 0,
        }),
        machine_id: body.machine_id || '',
        location: body.location || '',
        model: body.model || 'claude-sonnet-4',
        agent_secret: plainSecret, // Turso stores plaintext or simple encrypted string
        policy_profile: policyProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Write to Turso (Primary)
      await turso.execute({
        sql: `INSERT INTO agents (id, fleet_id, user_id, name, gateway_url, status, last_heartbeat, config_json, metrics_json, machine_id, location, model, agent_secret, policy_profile, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          agent.id,
          agent.fleet_id,
          agent.user_id,
          agent.name,
          agent.gateway_url,
          agent.status,
          agent.last_heartbeat,
          agent.config_json,
          agent.metrics_json,
          agent.machine_id,
          agent.location,
          agent.model,
          agent.agent_secret,
          agent.policy_profile,
          agent.created_at,
          agent.updated_at,
        ],
      });

      // Return plaintext to the UI
      return json(
        {
          agent: {
            ...agent,
            agent_secret: plainSecret,
            config_json: JSON.parse(agent.config_json),
          },
        },
        201
      );
    }

    const restartMatch = path.match(/^\/agents\/([^/]+)\/restart$/);
    if (restartMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      
      const agentId = restartMatch[1];
      const now = new Date().toISOString();
      
      try {
        await turso.execute({
          sql: 'UPDATE agents SET status = ?, last_heartbeat = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          args: ['idle', now, now, agentId, user.id]
        });
        
        const res = await turso.execute({
          sql: 'SELECT * FROM agents WHERE id = ?',
          args: [agentId]
        });
        
        if (res.rows.length === 0) return json({ error: 'Agent not found' }, 404);
        const agent = res.rows[0];
        
        return json({ agent, message: 'Agent restart initiated' });
      } catch (e) {
        throw e;
      }
    }

    if (path === '/agents/handshake') {
      const body = await request.json();

      // Get agent's owner for tier-based handshake limit
      let agent = null;
      try {
        const res = await turso.execute({
          sql: 'SELECT id, fleet_id, agent_secret, user_id, gateway_url, policy_profile FROM agents WHERE id = ?',
          args: [body.agent_id]
        });
        agent = res.rows[0];
      } catch (e) {
        console.error('[HANDSHAKE] Database error:', e);
        throw e;
      }
      
      if (!agent) {
        console.error('[HANDSHAKE] Agent not found:', body.agent_id);
        return json({ error: 'Agent not found' }, 404);
      }

      // Route-specific handshake limit
      const handshakeLimit = await checkRateLimit(request, agent.id, 'handshake', agent.user_id);
      if (!handshakeLimit.allowed) return handshakeLimit.response;

      const decryptedSecret = await decryptAsync(agent.agent_secret);

      if (body.signature) {
        // Hardened Handshake: HMAC-SHA256(agent_id + timestamp, secret)
        const timestamp = parseInt(body.timestamp);
        const now = Math.floor(Date.now() / 1000);

        // Anti-replay: 5 minute window
        if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
          console.error('[HANDSHAKE] Timestamp validation failed');
          return json({ error: 'Signature expired or invalid timestamp' }, 401);
        }

        const expectedSignature = crypto
          .createHmac('sha256', decryptedSecret)
          .update(agent.id + body.timestamp)
          .digest('hex');

        if (expectedSignature !== body.signature) {
          console.error('[HANDSHAKE] Signature mismatch');
          return json({ error: 'Invalid signature' }, 401);
        }
      } else {
        // Legacy Handshake: Plaintext secret (Optional fallback)
        if (!decryptedSecret || decryptedSecret !== body.agent_secret) {
          console.error('[HANDSHAKE] Legacy secret validation failed');
          return json({ error: 'Invalid agent secret' }, 401);
        }
      }

      // Tier-based heartbeat clamping
      const tier = await getTier(agent.user_id);

      const policyProfile = agent.policy_profile || DEFAULT_POLICY_PROFILE;
      const token = await createAgentToken(agent.id, agent.fleet_id, {
        user_id: agent.user_id,
        policy_profile: policyProfile,
        tier,
      });

      let policy = getPolicy(policyProfile);
      if (tier === 'free' && policy.heartbeat_interval < 300) {
        policy.heartbeat_interval = 300; // Force 5m for FREE
      } else if (tier === 'pro' && policy.heartbeat_interval < 60) {
        policy.heartbeat_interval = 60; // Force 1m for PRO
      }

      return json({ token, expires_in: 86400, gateway_url: agent.gateway_url, policy });
    }

    if (path === '/heartbeat') {
      const body = await request.json();

      // Verify JWT
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Missing or invalid session token' }, 401);
      }

      const token = authHeader.split(' ')[1];
      const payload = await verifyAgentToken(token);

      if (!payload || payload.agent_id !== body.agent_id) {
        return json({ error: 'Invalid or expired session' }, 401);
      }

      let agent = null;
      let userId = payload.user_id;
      let tier = payload.tier;
      let policyProfile = payload.policy_profile;

      // Legacy token fallback: Fetch agent to get metadata
      if (!userId) {
        // Try Turso first
        try {
          const tursoRes = await turso.execute({
            sql: 'SELECT * FROM agents WHERE id = ? LIMIT 1',
            args: [body.agent_id],
          });

          if (tursoRes.rows.length > 0) {
            agent = tursoRes.rows[0];
            agent.metrics_json = agent.metrics_json ? JSON.parse(agent.metrics_json) : null;
            userId = agent.user_id;
            policyProfile = agent.policy_profile;
          } else {
             return json({ error: 'Agent not found' }, 404);
          }
        } catch (e) {
          console.error('[Heartbeat] Turso error:', e.message);
          return json({ error: 'Internal server error' }, 500);
        }
      }

      // Route-specific heartbeat limit
      const heartbeatLimit = await checkRateLimit(
        request,
        payload.agent_id,
        'heartbeat',
        userId,
        tier
      );
      if (!heartbeatLimit.allowed) return heartbeatLimit.response;

      const update = {
        status: body.status || 'healthy',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only fetch agent if metrics are present and we haven't fetched it yet
      if (body.metrics && !agent) {
        try {
          const tursoRes = await turso.execute({
            sql: 'SELECT * FROM agents WHERE id = ? LIMIT 1',
            args: [body.agent_id],
          });

          if (tursoRes.rows.length > 0) {
            agent = tursoRes.rows[0];
            agent.metrics_json = agent.metrics_json ? JSON.parse(agent.metrics_json) : null;
          } else {
             return json({ error: 'Agent not found' }, 404);
          }
        } catch (e) {
             console.error('[Heartbeat] Turso error:', e.message);
             return json({ error: 'Internal server error' }, 500);
        }
      }

      let tasksCount = 0;
      let errorsCount = 0;
      let costPerTask = 0.01;

      if (agent && agent.metrics_json) {
        tasksCount = agent.metrics_json.tasks_completed || 0;
        errorsCount = agent.metrics_json.errors_count || 0;
      }

      if (body.metrics && agent) {
        // Calculate uptime based on agent creation time (not machine uptime)
        const createdAt = new Date(agent.created_at);
        const now = new Date();
        const uptimeHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

        // Calculate cost based on model pricing (cost per task)
        costPerTask = MODEL_PRICING[agent.model] || 0.01;
        tasksCount += 1;
        errorsCount = body.status === 'error' ? errorsCount + 1 : errorsCount;
        const totalCost = parseFloat((tasksCount * costPerTask).toFixed(4));

        update.metrics_json = {
          ...agent.metrics_json,
          ...body.metrics,
          tasks_completed: tasksCount,
          errors_count: errorsCount,
          uptime_hours: uptimeHours,
          cost_usd: totalCost,
        };
      }

      // Update machine_id and location if provided
      if (body.machine_id) update.machine_id = body.machine_id;
      if (body.location) update.location = body.location;
      if (body.model) update.model = body.model;

      // Optimize: Update agent and insert metrics in parallel
      // 1. Update Turso (Primary)
      const tursoUpdatePromise = (async () => {
        try {
          const sqlParts = ['status = ?', 'last_heartbeat = ?', 'updated_at = ?'];
          const sqlArgs = [update.status, update.last_heartbeat, update.updated_at];

          if (update.metrics_json) {
            sqlParts.push('metrics_json = ?');
            sqlArgs.push(JSON.stringify(update.metrics_json));
          }
          if (update.machine_id) {
            sqlParts.push('machine_id = ?');
            sqlArgs.push(update.machine_id);
          }
          if (update.location) {
            sqlParts.push('location = ?');
            sqlArgs.push(update.location);
          }
          if (update.model) {
            sqlParts.push('model = ?');
            sqlArgs.push(update.model);
          }

          sqlArgs.push(body.agent_id);
          await turso.execute({
            sql: `UPDATE agents SET ${sqlParts.join(', ')} WHERE id = ?`,
            args: sqlArgs,
          });

          if (body.metrics) {
            await turso.execute({
              sql: `INSERT INTO agent_metrics 
                    (id, agent_id, user_id, cpu_usage, memory_usage, latency_ms, uptime_hours, tasks_completed, errors_count, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                crypto.randomUUID(),
                body.agent_id,
                userId,
                body.metrics.cpu_usage || 0,
                body.metrics.memory_usage || 0,
                body.metrics.latency_ms || 0,
                body.metrics.uptime_hours || 0,
                tasksCount,
                errorsCount,
                update.last_heartbeat,
              ],
            });
          }
        } catch (e) {
          console.error('[Turso Heartbeat] Failed:', e.message);
        }
      })();

      await tursoUpdatePromise;

      // Include updated policy in heartbeat response
      const policy = getPolicy(policyProfile || DEFAULT_POLICY_PROFILE);

      // Trigger smart alerts
      if (body.metrics) {
        const activeConfigs =
          agent.alert_configs?.filter((c) => c.channel && c.channel.active) || null;

        processSmartAlerts(
          body.agent_id,
          update.status,
          body.metrics,
          activeConfigs,
          agent.name
        ).catch((e) => console.error('Alert processing error:', e));
      }

      return json({
        message: 'Heartbeat received',
        status: update.status,
        policy, // Real-time policy syncing
      });
    }

    const resolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
    if (resolveMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      
      try {
        await turso.execute({
          sql: 'UPDATE alerts SET resolved = 1, resolved_at = ? WHERE id = ? AND user_id = ?',
          args: [new Date().toISOString(), resolveMatch[1], user.id]
        });
        return json({ message: 'Alert resolved' });
      } catch (e) {
        console.error('[Resolve Alert] Turso error:', e);
        return json({ error: 'Failed to resolve alert' }, 500);
      }
    }

    if (path === '/seed-demo') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      // 1. Setup Fleet (Turso)
      let fleetId;
      try {
        const fleetRes = await turso.execute({
          sql: 'SELECT * FROM fleets WHERE user_id = ? LIMIT 1',
          args: [user.id]
        });
        
        if (fleetRes.rows.length > 0) {
          fleetId = fleetRes.rows[0].id;
        } else {
          fleetId = uuidv4();
          await turso.execute({
            sql: 'INSERT INTO fleets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
            args: [fleetId, user.id, 'Production Fleet', new Date().toISOString()]
          });
        }
      } catch (e) {
        console.error('Turso fleet fetch/create error:', e);
        return json({ error: 'Failed to setup fleet' }, 500);
      }

      // 2. Clean up existing data (Turso)
      try {
        await turso.batch([
            { sql: 'DELETE FROM agents WHERE user_id = ?', args: [user.id] },
            { sql: 'DELETE FROM alerts WHERE user_id = ?', args: [user.id] },
            { sql: 'DELETE FROM agent_metrics WHERE user_id = ?', args: [user.id] }
        ], 'write');
      } catch (e) {
         console.error('Turso cleanup error:', e);
      }

      const now = new Date();
      const demoAgents = [
        {
          name: 'alpha-coder',
          policy_profile: POLICY_DEV,
          gateway_url: 'http://192.168.1.100:8080',
          status: 'healthy',
          model: 'gpt-4',
          location: 'us-east-1',
          machine_id: 'droplet-alpha-001',
          metrics_json: {
            latency_ms: 120,
            tasks_completed: 847,
            errors_count: 3,
            uptime_hours: 720,
            cost_usd: 45.3,
            cpu_usage: 42,
            memory_usage: 58,
          },
          config_json: {
            profile: POLICY_DEV,
            skills: ['code', 'search', 'deploy'],
            model: 'gpt-4',
            data_scope: 'full',
          },
          last_heartbeat: new Date(now - 120000).toISOString(),
        },
        {
          name: 'beta-researcher',
          policy_profile: POLICY_OPS,
          gateway_url: 'http://10.0.1.50:8080',
          status: 'healthy',
          model: 'claude-3',
          location: 'eu-west-1',
          machine_id: 'droplet-beta-002',
          metrics_json: {
            latency_ms: 180,
            tasks_completed: 523,
            errors_count: 7,
            uptime_hours: 500,
            cost_usd: 32.15,
            cpu_usage: 35,
            memory_usage: 45,
          },
          config_json: {
            profile: POLICY_OPS,
            skills: ['search', 'analyze', 'report'],
            model: 'claude-3',
            data_scope: 'read-only',
          },
          last_heartbeat: new Date(now - 300000).toISOString(),
        },
        {
          name: 'gamma-deployer',
          policy_profile: POLICY_OPS,
          gateway_url: 'http://172.16.0.10:8080',
          status: 'idle',
          model: 'gpt-4',
          location: 'us-west-2',
          machine_id: 'droplet-gamma-003',
          metrics_json: {
            latency_ms: 95,
            tasks_completed: 312,
            errors_count: 1,
            uptime_hours: 360,
            cost_usd: 18.9,
            cpu_usage: 12,
            memory_usage: 30,
          },
          config_json: {
            profile: POLICY_OPS,
            skills: ['deploy', 'monitor', 'rollback'],
            model: 'gpt-4',
            data_scope: 'full',
          },
          last_heartbeat: new Date(now - 600000).toISOString(),
        },
        {
          name: 'delta-monitor',
          policy_profile: POLICY_EXEC,
          gateway_url: 'http://192.168.2.25:8080',
          status: 'error',
          model: 'gpt-3.5-turbo',
          location: 'ap-southeast-1',
          machine_id: 'droplet-delta-004',
          metrics_json: {
            latency_ms: 450,
            tasks_completed: 156,
            errors_count: 28,
            uptime_hours: 168,
            cost_usd: 8.75,
            cpu_usage: 89,
            memory_usage: 92,
          },
          config_json: {
            profile: POLICY_EXEC,
            skills: ['monitor', 'alert'],
            model: 'gpt-3.5-turbo',
            data_scope: 'summary-only',
          },
          last_heartbeat: new Date(now - 1800000).toISOString(),
        },
        {
          name: 'epsilon-analyst',
          policy_profile: POLICY_DEV,
          gateway_url: 'http://10.0.2.100:8080',
          status: 'offline',
          model: 'gpt-4',
          location: 'us-east-2',
          machine_id: 'droplet-epsilon-005',
          metrics_json: {
            latency_ms: 0,
            tasks_completed: 89,
            errors_count: 0,
            uptime_hours: 48,
            cost_usd: 5.2,
            cpu_usage: 0,
            memory_usage: 0,
          },
          config_json: {
            profile: POLICY_DEV,
            skills: ['analyze', 'report', 'visualize'],
            model: 'gpt-4',
            data_scope: 'full',
          },
          last_heartbeat: new Date(now - 7200000).toISOString(),
        },
      ];

      const agentDocs = demoAgents.map((a) => ({
        id: uuidv4(),
        fleet_id: fleetId,
        user_id: user.id,
        ...a,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      // Insert Agents into Turso
      try {
        const agentStatements = agentDocs.map(agent => ({
          sql: `INSERT INTO agents (id, user_id, fleet_id, name, status, model, location, machine_id, gateway_url, config_json, metrics_json, policy_profile, last_heartbeat, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            agent.id,
            agent.user_id,
            agent.fleet_id,
            agent.name,
            agent.status,
            agent.model,
            agent.location,
            agent.machine_id,
            agent.gateway_url,
            JSON.stringify(agent.config_json),
            JSON.stringify(agent.metrics_json),
            agent.policy_profile,
            agent.last_heartbeat,
            agent.created_at,
            agent.updated_at
          ]
        }));
        await turso.batch(agentStatements, 'write');
      } catch (e) {
        console.error('Turso agent insert error:', e);
        return json({ error: 'Failed to insert agents' }, 500);
      }

      const demoAlerts = [
        {
          agent_id: agentDocs[3].id,
          agent_name: 'delta-monitor',
          type: 'high-error',
          message: 'Error rate exceeded threshold: 28 errors in 24h',
          resolved: false,
        },
        {
          agent_id: agentDocs[4].id,
          agent_name: 'epsilon-analyst',
          type: 'downtime',
          message: 'Agent offline - no heartbeat for 2 hours',
          resolved: false,
        },
        {
          agent_id: agentDocs[0].id,
          agent_name: 'alpha-coder',
          type: 'high-latency',
          message: 'Avg latency exceeded 500ms for 5 minutes',
          resolved: true,
          resolved_at: new Date(now - 3600000).toISOString(),
        },
      ];
      
      const alertDocs = demoAlerts.map((a) => ({
        id: uuidv4(),
        user_id: user.id,
        ...a,
        created_at: new Date(now - Math.random() * 86400000).toISOString(),
      }));
      
      // Insert Alerts into Turso
      try {
        const alertStatements = alertDocs.map(alert => ({
          sql: `INSERT INTO alerts (id, user_id, agent_id, agent_name, type, message, resolved, resolved_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            alert.id,
            alert.user_id,
            alert.agent_id,
            alert.agent_name,
            alert.type,
            alert.message,
            alert.resolved ? 1 : 0,
            alert.resolved_at || null,
            alert.created_at
          ]
        }));
        await turso.batch(alertStatements, 'write');
      } catch (e) {
         console.error('Turso alert insert error:', e);
      }

      // Seed metrics history for charts
      const metricsDocs = [];
      const historyHours = 24;

      agentDocs.forEach((agent) => {
        const baseLatency = agent.metrics_json?.latency_ms || 100;
        const baseErrors = agent.metrics_json?.errors_count || 0;
        const baseTasks = agent.metrics_json?.tasks_completed || 0;

        for (let i = 0; i < historyHours; i++) {
          const timeOffset = (historyHours - i) * 3600000;
          const timestamp = new Date(now - timeOffset).toISOString();
          const progress = (i + 1) / historyHours;

          metricsDocs.push({
            agent_id: agent.id,
            user_id: user.id,
            cpu_usage: Math.floor(Math.random() * 60) + 10,
            memory_usage: Math.floor(Math.random() * 50) + 20,
            latency_ms: Math.floor(Math.max(20, baseLatency + (Math.random() - 0.5) * 50)),
            uptime_hours: Math.floor((agent.metrics_json?.uptime_hours || 0) * progress),
            tasks_completed: Math.floor(baseTasks * progress),
            errors_count: Math.floor(baseErrors * progress),
            created_at: timestamp,
          });
        }
      });

      try {
        // Batch insert into Turso
        const statements = metricsDocs.map((m) => ({
          sql: `INSERT INTO agent_metrics 
                (id, agent_id, user_id, cpu_usage, memory_usage, latency_ms, uptime_hours, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            m.agent_id,
            m.user_id,
            m.cpu_usage,
            m.memory_usage,
            m.latency_ms,
            m.uptime_hours,
            m.created_at,
          ],
        }));
        await turso.batch(statements, 'write');
      } catch (e) {
        console.error('Turso metrics seed error:', e.message);
      }

      return json({
        message: 'Demo data loaded',
        agents: agentDocs.length,
        alerts: alertDocs.length,
      });
    }

    // ============ STRIPE CHECKOUT ============
    if (path === '/billing/checkout') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const plan = body.plan || 'pro';
      const isYearly = body.yearly === true;

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const PRICE_IDS = {
        pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
        pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
        enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
        enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
      };

      const priceKey = `${plan}_${isYearly ? 'yearly' : 'monthly'}`;
      const priceId = PRICE_IDS[priceKey];

      if (!priceId) {
        console.error(`Price not found for ${priceKey}`);
        return json({ error: 'Price configuration missing' }, 500);
      }

      try {
        const session = await stripe.checkout.sessions.create({
          customer_email: user.email,
          client_reference_id: user.id,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
          metadata: { user_id: user.id, plan },
          subscription_data: {
            metadata: { user_id: user.id, plan },
          },
          allow_promotion_codes: true,
        });

        return json({ checkout_url: session.url, plan });
      } catch (err) {
        console.error('Stripe Checkout error:', err);
        return json({ error: 'Payment service unavailable', details: err.message }, 500);
      }
    }

    // ============ STRIPE PORTAL ============
    if (path === '/billing/portal') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sub || !sub.stripe_customer_id) {
        return json({ error: 'No active subscription found' }, 404);
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: sub.stripe_customer_id,
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
        });
        return json({ portal_url: session.url });
      } catch (err) {
        console.error('Stripe Portal Error:', err);
        return json({ error: 'Failed to generate portal URL' }, 500);
      }
    }

    // ============ STRIPE CONFIRM ============
    if (path === '/billing/confirm') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const sessionId = body.session_id || body.sessionId;
      if (!sessionId) return json({ error: 'Missing session_id' }, 400);
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const userId = session.client_reference_id || session.metadata?.user_id;
        const plan = session.metadata?.plan || 'pro';
        if (!userId || userId !== user.id) return json({ error: 'Invalid session for user' }, 400);
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        const custId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (!subId) return json({ error: 'No subscription' }, 404);
        const subscription = await stripe.subscriptions.retrieve(subId);
        await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan,
            status: subscription.status || 'active',
            stripe_subscription_id: subId,
            stripe_customer_id: custId || null,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        return json({ ok: true });
      } catch (err) {
        console.error('Stripe Confirm Error:', err);
        return json({ error: 'Failed to confirm', details: err.message }, 500);
      }
    }

    // ============ STRIPE WEBHOOK ============
    if (path === '/billing/webhook' || path === '/webhooks/stripe') {
      const rawBody = await request.text();
      const signature = request.headers.get('stripe-signature');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error(`[Webhook] Signature verification failed: ${err.message}`);
        return json({ error: 'Webhook signature verification failed' }, 400);
      }

      console.log(`[Webhook] Event: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const plan = session.metadata?.plan || 'pro';

        if (userId) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);

          await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: userId,
              plan: plan,
              status: 'active',
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
      } else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (existing) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', existing.user_id);
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id);
      }

      return json({ received: true });
    }

    // ============ TEAM INVITE ============
    if (path === '/team/invite') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: team } = await supabaseAdmin
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!team) return json({ error: 'Only team owners can invite members' }, 403);

      const existing = team.members?.find((m) => m.email === body.email);
      if (existing) return json({ error: 'Member already in team' }, 409);

      const newMembers = [
        ...(team.members || []),
        {
          user_id: null,
          email: body.email,
          role: body.role || 'member',
          invited_by: user.id,
          joined_at: new Date().toISOString(),
        },
      ];
      await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

      return json({ message: 'Invite sent' });
    }

    // ============ ALERT CHANNELS ============
    if (path === '/alert-channels') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier === 'free') {
        return json({ error: 'Alert channels requires a PRO or ENTERPRISE plan' }, 403);
      }

      const body = await request.json();
      const channel = {
        id: uuidv4(),
        user_id: user.id,
        name: body.name,
        type: body.type,
        destination: body.destination || null,
        config: body.config ? JSON.stringify(body.config) : null,
        active: 1,
        created_at: new Date().toISOString(),
      };

      try {
        await turso.execute({
          sql: `INSERT INTO alert_channels (id, user_id, name, type, destination, config, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            channel.id,
            channel.user_id,
            channel.name,
            channel.type,
            channel.destination,
            channel.config,
            channel.active,
            channel.created_at,
          ],
        });
      } catch (e) {
        console.error('[Alert Channel] Turso error:', e.message);
        throw e;
      }

      return json(
        {
          channel: {
            ...channel,
            active: true,
            config: channel.config ? JSON.parse(channel.config) : {},
          },
        },
        201
      );
    }

    // ============ ALERT CONFIGS ============
    if (path === '/alert-configs') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier === 'free') {
        return json({ error: 'Agent alerts require a PRO or ENTERPRISE plan' }, 403);
      }

      const body = await request.json();
      const config = {
        id: uuidv4(),
        user_id: user.id,
        agent_id: body.agent_id,
        fleet_id: body.fleet_id,
        channel_id: body.channel_id,
        cpu_threshold: body.cpu_threshold || 90,
        mem_threshold: body.mem_threshold || 90,
        latency_threshold: body.latency_threshold || 1000,
        offline_alert: body.offline_alert !== undefined ? (body.offline_alert ? 1 : 0) : 1,
        error_alert: body.error_alert !== undefined ? (body.error_alert ? 1 : 0) : 1,
        cooldown_minutes: body.cooldown_minutes || 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await turso.execute({
          sql: `INSERT INTO alert_configs (
            id, user_id, agent_id, fleet_id, channel_id, cpu_threshold, mem_threshold, latency_threshold, offline_alert, error_alert, cooldown_minutes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            config.id,
            config.user_id,
            config.agent_id,
            config.fleet_id,
            config.channel_id,
            config.cpu_threshold,
            config.mem_threshold,
            config.latency_threshold,
            config.offline_alert,
            config.error_alert,
            config.cooldown_minutes,
            config.created_at,
            config.updated_at,
          ],
        });
      } catch (e) {
        console.error('[Alert Config] Turso error:', e.message);
        throw e;
      }

      return json({ config }, 201);
    }

    // ============ TEAM REMOVE MEMBER ============
    if (path === '/team/remove') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: team } = await supabaseAdmin
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!team) return json({ error: 'Only team owners can remove members' }, 403);
      if (body.email === user.email) return json({ error: 'Cannot remove yourself' }, 400);

      const newMembers = team.members?.filter((m) => m.email !== body.email) || [];
      await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

      return json({ message: `Removed ${body.email}` });
    }

    // ============ ENTERPRISE BRANDING ============
    if (path === '/enterprise/branding') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier !== 'enterprise') {
        return json({ error: 'Branding requires an ENTERPRISE plan' }, 403);
      }

      const body = await request.json();
      const { data: branding, error } = await supabaseAdmin
        .from('enterprise_branding')
        .upsert(
          {
            user_id: user.id,
            domain: body.domain,
            name: body.name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return json({ branding });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

/**
 * Handles the PUT request for updating agents, fleets, custom policies, or alert channels.
 *
 * This function extracts the path from the request context and matches it against predefined routes. It checks user authentication and authorization, processes the request body for updates, and interacts with the Supabase database to perform the updates. If the requested resource is not found or if there are any errors during the process, appropriate error responses are returned.
 *
 * @param request - The incoming request object containing the data to be updated.
 * @param context - The context object containing parameters and other relevant data.
 * @returns A JSON response indicating the result of the update operation or an error message.
 * @throws Error If there is an internal server error during the operation.
 */
export async function PUT(request, context) {
  const params = await context.params;
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const agentId = agentMatch[1];
      let user = await getUser(request);
      let isAgent = false;

      // If not user session, check if it's the agent itself updating
      if (!user) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const payload = await verifyAgentToken(token);
          if (payload && payload.agent_id === agentId) {
            isAgent = true;
          }
        }
      }

      if (!user && !isAgent) return json({ error: 'Unauthorized' }, 401);

      const body = await request.json();
      const now = new Date().toISOString();
      const updateFields = { updated_at: now };

      const sqlParts = ['updated_at = ?'];
      const sqlArgs = [now];

      if (body.name !== undefined) {
        updateFields.name = body.name;
        sqlParts.push('name = ?');
        sqlArgs.push(body.name);
      }
      if (body.gateway_url !== undefined) {
        updateFields.gateway_url = body.gateway_url;
        sqlParts.push('gateway_url = ?');
        sqlArgs.push(body.gateway_url);
      }
      if (body.config_json !== undefined) {
        const cfg =
          typeof body.config_json === 'string' ? JSON.parse(body.config_json) : body.config_json;
        updateFields.config_json = encrypt(cfg);
        sqlParts.push('config_json = ?');
        sqlArgs.push(JSON.stringify(cfg));
      }
      if (body.machine_id !== undefined) {
        updateFields.machine_id = body.machine_id;
        sqlParts.push('machine_id = ?');
        sqlArgs.push(body.machine_id);
      }
      if (body.location !== undefined) {
        updateFields.location = body.location;
        sqlParts.push('location = ?');
        sqlArgs.push(body.location);
      }
      if (body.model !== undefined) {
        updateFields.model = body.model;
        sqlParts.push('model = ?');
        sqlArgs.push(body.model);
      }
      if (body.status !== undefined) {
        updateFields.status = body.status;
        sqlParts.push('status = ?');
        sqlArgs.push(body.status);
      }
      if (body.policy_profile !== undefined) {
        updateFields.policy_profile = body.policy_profile;
        sqlParts.push('policy_profile = ?');
        sqlArgs.push(body.policy_profile);
      }

      sqlArgs.push(agentId);

      // 1. Update Turso
      const tursoRes = await turso.execute({
        sql: `UPDATE agents SET ${sqlParts.join(', ')} WHERE id = ?`,
        args: sqlArgs,
      });

      // Get updated agent from Turso to return
      const updatedRes = await turso.execute({
        sql: 'SELECT * FROM agents WHERE id = ?',
        args: [agentId],
      });
      const agent = updatedRes.rows[0];
      if (!agent) return json({ error: 'Agent not found' }, 404);

      return json({
        agent: {
          ...agent,
          config_json: agent.config_json ? JSON.parse(agent.config_json) : null,
          metrics_json: agent.metrics_json ? JSON.parse(agent.metrics_json) : null,
        },
      });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const fleetId = fleetMatch[1];
      const body = await request.json();
      const now = new Date().toISOString();

      // 1. Update Turso
      await turso.execute({
        sql: 'UPDATE fleets SET name = ? WHERE id = ? AND user_id = ?',
        args: [body.name, fleetId, user.id],
      });

      return json({ fleet: { id: fleetId, name: body.name, user_id: user.id } });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const body = await request.json();
      const now = new Date().toISOString();
      const policyId = customPolicyMatch[1];

      const sqlParts = ['updated_at = ?'];
      const args = [now];

      if (body.label !== undefined) {
        sqlParts.push('label = ?');
        args.push(body.label.toUpperCase());
      }
      if (body.description !== undefined) {
        sqlParts.push('description = ?');
        args.push(body.description);
      }
      if (body.color !== undefined) {
        sqlParts.push('color = ?');
        args.push(body.color);
      }
      if (body.bg !== undefined) {
        sqlParts.push('bg = ?');
        args.push(body.bg);
      }
      if (body.skills !== undefined) {
        sqlParts.push('skills = ?');
        args.push(body.skills);
      }
      if (body.tools !== undefined) {
        sqlParts.push('tools = ?');
        args.push(body.tools);
      }
      if (body.data_access !== undefined) {
        sqlParts.push('data_access = ?');
        args.push(body.data_access);
      }
      if (body.heartbeat_interval !== undefined) {
        sqlParts.push('heartbeat_interval = ?');
        args.push(parseInt(body.heartbeat_interval));
      }
      if (body.is_active !== undefined) {
        sqlParts.push('is_active = ?');
        args.push(body.is_active ? 1 : 0);
      }

      args.push(policyId);
      args.push(user.id);

      const { rows } = await turso.execute({
        sql: `UPDATE custom_policies SET ${sqlParts.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`,
        args,
      });

      const policy = rows[0];
      if (!policy) return json({ error: 'Custom policy not found' }, 404);
      return json({ policy });
    }

    const channelMatch = path.match(/^\/alert-channels\/([^/]+)$/);
    if (channelMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const body = await request.json();
      const channelId = channelMatch[1];
      const now = new Date().toISOString();

      const sqlParts = ['updated_at = ?'];
      const args = [now];

      if (body.name !== undefined) {
        sqlParts.push('name = ?');
        args.push(body.name);
      }
      if (body.type !== undefined) {
        sqlParts.push('type = ?');
        args.push(body.type);
      }
      if (body.config !== undefined) {
        sqlParts.push('config = ?');
        args.push(typeof body.config === 'string' ? body.config : JSON.stringify(body.config));
      }
      if (body.active !== undefined) {
        sqlParts.push('active = ?');
        args.push(body.active ? 1 : 0);
      }

      args.push(channelId);
      args.push(user.id);

      const { rows } = await turso.execute({
        sql: `UPDATE alert_channels SET ${sqlParts.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`,
        args,
      });

      const channel = rows[0];
      if (!channel) return json({ error: 'Channel not found' }, 404);
      return json({
        channel: {
          ...channel,
          config: typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config,
          active: Boolean(channel.active),
        },
      });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('PUT Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

/**
 * Handles the deletion of agents, fleets, custom policies, or alert channels based on the request path.
 *
 * The function first extracts the path from the context parameters and matches it against various patterns to determine the resource to delete.
 * It checks for user authorization and deletes associated alerts and resources accordingly.
 * If the resource is not found, it returns an appropriate error message.
 * Any errors during the process are caught and logged, returning a generic internal server error response.
 *
 * @param request - The incoming request object.
 * @param context - The context object containing parameters for the request.
 * @returns A JSON response indicating the result of the deletion operation.
 * @throws Error If an internal server error occurs during the deletion process.
 */
export async function DELETE(request, context) {
  const params = await context.params;
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const agentId = agentMatch[1];

      // Delete alerts first
      await turso.execute({
        sql: 'DELETE FROM alerts WHERE agent_id = ? AND user_id = ?',
        args: [agentId, user.id],
      });

      const res = await turso.execute({
        sql: 'DELETE FROM agents WHERE id = ? AND user_id = ?',
        args: [agentId, user.id],
      });

      if (res.rowsAffected === 0) return json({ error: 'Agent not found' }, 404);
      return json({ message: 'Agent deleted' });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const fleetId = fleetMatch[1];

      // Delete alerts
      await turso.execute({
        sql: 'DELETE FROM alerts WHERE fleet_id = ? AND user_id = ?',
        args: [fleetId, user.id],
      });

      // Delete agents
      await turso.execute({
        sql: 'DELETE FROM agents WHERE fleet_id = ? AND user_id = ?',
        args: [fleetId, user.id],
      });

      // Delete fleet
      const res = await turso.execute({
        sql: 'DELETE FROM fleets WHERE id = ? AND user_id = ?',
        args: [fleetId, user.id],
      });

      if (res.rowsAffected === 0) return json({ error: 'Fleet not found' }, 404);
      return json({ message: 'Fleet and associated agents deleted' });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const res = await turso.execute({
        sql: 'DELETE FROM custom_policies WHERE id = ? AND user_id = ?',
        args: [customPolicyMatch[1], user.id],
      });

      if (res.rowsAffected === 0) return json({ error: 'Custom policy not found' }, 404);
      return json({ message: 'Custom policy deleted' });
    }

    const channelMatch = path.match(/^\/alert-channels\/([^/]+)$/);
    if (channelMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const channelId = channelMatch[1];

      // Delete configs using this channel
      await turso.execute({
        sql: 'DELETE FROM alert_configs WHERE channel_id = ?',
        args: [channelId],
      });

      const res = await turso.execute({
        sql: 'DELETE FROM alert_channels WHERE id = ? AND user_id = ?',
        args: [channelId, user.id],
      });

      if (res.rowsAffected === 0) return json({ error: 'Channel not found' }, 404);
      return json({ message: 'Channel deleted' });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
