import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import { encrypt, decrypt } from '@/lib/encryption';
import {
  getPolicy,
  DEFAULT_POLICY_PROFILE,
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
} from '@/lib/policies';
import { processSmartAlerts } from '@/lib/alerts';
import { promises as fs } from 'fs';
import path from 'path';

async function getScript(filename, replacements) {
  const filePath = path.join(process.cwd(), 'lib/scripts', filename);
  let content = await fs.readFile(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

/**
 * Decrypts the agent's configuration and secret.
 *
 * This function takes an agent object, checks for the presence of a config_json and agent_secret,
 * and attempts to decrypt them using the decrypt function. If decryption is successful, the
 * decrypted values are parsed and assigned to a new object. In case of any errors during decryption,
 * an error message is logged to the console, and the original values are retained.
 *
 * @param {Object} a - The agent object containing configuration and secret to be decrypted.
 */
const decryptAgent = (a) => {
  if (!a) return a;
  const decrypted = { ...a };
  try {
    if (a.config_json) {
      const d = decrypt(a.config_json);
      decrypted.config_json = d ? JSON.parse(d) : a.config_json;
    }
    if (a.agent_secret) decrypted.agent_secret = decrypt(a.agent_secret);
  } catch (e) {
    console.error('Failed to decrypt agent:', a.id, e);
  }
  return decrypted;
};

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
async function getTier(userId) {
  if (!userId) return 'free';
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle();
  return (data?.plan || 'free').toLowerCase();
}

/**
 * Validates parameters for agent installation scripts.
 *
 * This function checks for the presence of agentId and agentSecret, ensuring they are not empty.
 * It also validates the format of these parameters using uuidValidate. Additionally, if an interval is provided,
 * it checks that the interval is a positive integer. If any validation fails, an error object is returned;
 * otherwise, null is returned.
 *
 * @param agentId - The unique identifier for the agent.
 * @param agentSecret - The secret key associated with the agent.
 * @param interval - An optional parameter representing the interval, expected to be a positive integer.
 * @returns An error object if validation fails, or null if all parameters are valid.
 */
function validateInstallParams(agentId, agentSecret, interval) {
  if (!agentId || !agentSecret) {
    return { error: 'Missing agent_id or agent_secret parameter', status: 400 };
  }
  if (!uuidValidate(agentId) || !uuidValidate(agentSecret)) {
    return { error: 'Invalid agent_id or agent_secret format', status: 400 };
  }
  if (interval && !/^\d+$/.test(interval)) {
    return { error: 'Invalid interval format', status: 400 };
  }
  return null;
}


/**
 * Configuration for rate limiting based on subscription tiers.
 * 
 * capacity: Maximum number of request tokens in the bucket.
 * refillRate: The rate at which tokens are refilled per second.
 */
const RATE_LIMIT_CONFIG = {
  free: {
    global: { capacity: 60, refillRate: 1 }, // 60 requests burst, 1 req/sec
    agent_heartbeat: { capacity: 10, refillRate: 0.2 }, // 1 heartbeat every 5s
  },
  pro: {
    global: { capacity: 600, refillRate: 10 }, // 600 requests burst, 10 req/sec
    agent_heartbeat: { capacity: 100, refillRate: 2 },
  },
  enterprise: {
    global: { capacity: 6000, refillRate: 100 }, // High throughput
    agent_heartbeat: { capacity: 1000, refillRate: 20 },
  },
};

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
 * @returns An object indicating whether the request is allowed and, if not, the error response.
 */
async function checkRateLimit(request, identifier, type = 'global', userId = null) {
  const tier = await getTier(userId);
  const tierConfig = RATE_LIMIT_CONFIG[tier] || RATE_LIMIT_CONFIG.free;
  const config = tierConfig[type] || RATE_LIMIT_CONFIG.free[type];

  // Optimize: Use atomic DB transaction via RPC to handle concurrency
  // This replaces the previous read-modify-write pattern which was prone to race conditions
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_path: type,
    p_capacity: config.capacity,
    p_refill_rate: config.refillRate,
  });

  if (error) {
    console.error('Rate limit RPC error:', error);
    // Fail open on DB error to prevent blocking service
    return { allowed: true };
  }

  if (!data.allowed) {
    return {
      allowed: false,
      response: json(
        {
          error: 'Too many requests',
          type,
          retry_after: Math.ceil(data.retry_after),
        },
        429
      ),
    };
  }

  return { allowed: true };
}

/**
 * Creates a JWT token for the specified agent and fleet.
 */
async function createAgentToken(agentId, fleetId) {
  return await new SignJWT({ agent_id: agentId, fleet_id: fleetId })
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
 * This function processes incoming requests, checks rate limits, and serves different responses based on the request path.
 * It includes health checks, agent installation scripts, user authentication, and data retrieval from the database.
 * The function also manages session tokens and handles errors gracefully.
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
      const agentSecret = searchParams.get('agent_secret');
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      if (!validateUuid(agentId) || !validateUuid(agentSecret)) {
        return json({ error: 'Invalid agent_id or agent_secret format' }, 400);
      }

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
        const { data: agent } = await supabaseAdmin
          .from('agents')
          .select('user_id')
          .eq('id', agentId)
          .maybeSingle();

        if (agent) {
          const tier = await getTier(agent.user_id);
          const { data: agentFull } = await supabaseAdmin
            .from('agents')
            .select('policy_profile')
            .eq('id', agentId)
            .single();

          const profile = agentFull?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            const { data: cp } = await supabaseAdmin
              .from('custom_policies')
              .select('heartbeat_interval')
              .eq('user_id', agent.user_id)
              .eq('name', profile)
              .maybeSingle();
            if (cp) policyInterval = cp.heartbeat_interval;
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
      const agentSecret = searchParams.get('agent_secret');
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      if (!validateUuid(agentId) || !validateUuid(agentSecret)) {
        return json({ error: 'Invalid agent_id or agent_secret format' }, 400);
      }

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
        const { data: agent } = await supabaseAdmin
          .from('agents')
          .select('user_id')
          .eq('id', agentId)
          .maybeSingle();

        if (agent) {
          const tier = await getTier(agent.user_id);
          const { data: agentFull } = await supabaseAdmin
            .from('agents')
            .select('policy_profile')
            .eq('id', agentId)
            .single();

          const profile = agentFull?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            const { data: cp } = await supabaseAdmin
              .from('custom_policies')
              .select('heartbeat_interval')
              .eq('user_id', agent.user_id)
              .eq('name', profile)
              .maybeSingle();
            if (cp) policyInterval = cp.heartbeat_interval;
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
          'Content-Disposition': 'attachment; filename="openclaw-monitor.ps1"',
        },
      });
    }

    // Python heartbeat script - cross-platform (Windows, macOS, Linux)
    if (path === '/install-agent-py') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id');
      const agentSecret = searchParams.get('agent_secret');
      let interval = searchParams.get('interval');

      const validation = validateInstallParams(agentId, agentSecret, interval);
      if (validation) return json({ error: validation.error }, validation.status);

      if (!validateUuid(agentId) || !validateUuid(agentSecret)) {
        return json({ error: 'Invalid agent_id or agent_secret format' }, 400);
      }

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
        const { data: agent } = await supabaseAdmin
          .from('agents')
          .select('user_id')
          .eq('id', agentId)
          .maybeSingle();

        if (agent) {
          const tier = await getTier(agent.user_id);
          const { data: agentFull } = await supabaseAdmin
            .from('agents')
            .select('policy_profile')
            .eq('id', agentId)
            .single();

          const profile = agentFull?.policy_profile || DEFAULT_POLICY_PROFILE;
          let policyInterval = tier === 'free' ? 300 : 60;

          if (profile === POLICY_OPS) policyInterval = 60;
          else if (profile === POLICY_EXEC) policyInterval = 600;
          else if (
            ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
            tier === 'enterprise'
          ) {
            const { data: cp } = await supabaseAdmin
              .from('custom_policies')
              .select('heartbeat_interval')
              .eq('user_id', agent.user_id)
              .eq('name', profile)
              .maybeSingle();
            if (cp) policyInterval = cp.heartbeat_interval;
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
          'Content-Disposition': 'attachment; filename="openclaw-monitor.py"',
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
      const { data: fleets, error } = await supabaseAdmin
        .from('fleets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ fleets });
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { searchParams } = new URL(request.url);
      const fleet_id = searchParams.get('fleet_id');
      let query = supabaseAdmin.from('agents').select('*').eq('user_id', user.id);
      if (fleet_id) query = query.eq('fleet_id', fleet_id);
      const { data: agents, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return json({ agents: agents.map(decryptAgent) });
    }

    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agentMatch[1])
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent: decryptAgent(agent) });
    }

    const metricsMatch = path.match(/^\/agents\/([^/]+)\/metrics$/);
    if (metricsMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const agentId = metricsMatch[1];
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: metrics, error } = await supabaseAdmin
        .from('agent_metrics')
        .select('created_at, latency_ms, errors_count, tasks_completed, cpu_usage, memory_usage')
        .eq('agent_id', agentId)
        .eq('user_id', user.id) // Ensure ownership
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return json({ metrics });
    }

    if (path === '/alert-channels') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: channels, error } = await supabaseAdmin
        .from('alert_channels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ channels });
    }

    if (path === '/alert-configs') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { searchParams } = new URL(request.url);
      const agent_id = searchParams.get('agent_id');
      let query = supabaseAdmin
        .from('alert_configs')
        .select('*, channel:alert_channels(*)')
        .eq('user_id', user.id);
      if (agent_id) query = query.eq('agent_id', agent_id);
      const { data: configs, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return json({ configs });
    }

    if (path === '/alerts') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: alerts, error } = await supabaseAdmin
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ alerts });
    }

    if (path === '/dashboard/stats') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const [agentsRes, fleetsRes, alertsRes] = await Promise.all([
        supabaseAdmin.from('agents').select('*').eq('user_id', user.id),
        supabaseAdmin.from('fleets').select('*').eq('user_id', user.id),
        supabaseAdmin
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('resolved', false),
      ]);

      const agents = agentsRes.data || [];
      const fleets = fleetsRes.data || [];
      const unresolvedAlerts = alertsRes.count || 0;

      const stats = {
        total_agents: agents.length,
        total_fleets: fleets.length,
        healthy: agents.filter((a) => a.status === 'healthy').length,
        idle: agents.filter((a) => a.status === 'idle').length,
        error: agents.filter((a) => a.status === 'error').length,
        offline: agents.filter((a) => a.status === 'offline').length,
        total_cost: parseFloat(
          agents.reduce((sum, a) => sum + (a.metrics_json?.cost_usd || 0), 0).toFixed(2)
        ),
        total_tasks: agents.reduce((sum, a) => sum + (a.metrics_json?.tasks_completed || 0), 0),
        unresolved_alerts: unresolvedAlerts,
      };
      return json({ stats });
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
      const { count: agentCount } = await supabaseAdmin
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const plan = (sub?.plan || 'free').toLowerCase();
      const subscription = sub ? { ...sub, plan } : { plan: 'free', status: 'active' };

      return json({
        subscription,
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

      const { data: policies, error } = await supabaseAdmin
        .from('custom_policies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return json({ policies: policies || [] });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const { data: policy, error } = await supabaseAdmin
        .from('custom_policies')
        .select('*')
        .eq('id', customPolicyMatch[1])
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
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
 * managing agent heartbeats, handling billing through Lemon Squeezy, and managing team invitations. It includes
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
      const fleet = {
        id: uuidv4(),
        user_id: user.id,
        name: body.name || 'My Fleet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('fleets').insert(fleet);
      if (error) throw error;
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
        skills: body.skills || [],
        tools: body.tools || [],
        data_access: body.data_access || 'restricted',
        heartbeat_interval: parseInt(body.heartbeat_interval) || 300,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin.from('custom_policies').insert(policy);
      if (error) throw error;
      return json({ policy }, 201);
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const tier = await getTier(user.id);
      if (tier === 'free') {
        const { count } = await supabaseAdmin
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
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

      // Check for custom policy if enterprise user
      if (![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(policyProfile)) {
        const { data: customPolicy } = await supabaseAdmin
          .from('custom_policies')
          .select('*')
          .eq('user_id', user.id)
          .eq('name', policyProfile)
          .eq('is_active', true)
          .maybeSingle();

        if (customPolicy) {
          policy = getPolicy(policyProfile, customPolicy);
        }
      }

      const agent = {
        id: uuidv4(),
        fleet_id: body.fleet_id,
        user_id: user.id,
        name: body.name || 'New Agent',
        gateway_url: body.gateway_url || '',
        status: 'idle',
        last_heartbeat: null,
        config_json: encrypt(
          body.config_json || {
            profile: policyProfile,
            skills: policy.skills,
            model: body.model || 'claude-sonnet-4',
            data_scope:
              policyProfile === POLICY_DEV
                ? 'full'
                : policyProfile === POLICY_OPS
                  ? 'system'
                  : 'read-only',
          }
        ),
        metrics_json: {
          latency_ms: 0,
          tasks_completed: 0,
          errors_count: 0,
          uptime_hours: 0,
          cost_usd: 0,
          cpu_usage: 0,
          memory_usage: 0,
        },
        machine_id: body.machine_id || '',
        location: body.location || '',
        model: body.model || 'claude-sonnet-4',
        agent_secret: JSON.stringify(encrypt(plainSecret)), // Encrypt returns object, must stringify for DB
        policy_profile: policyProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('agents').insert(agent);
      if (error) throw error;

      // Return plaintext to the UI
      return json(
        {
          agent: {
            ...agent,
            agent_secret: plainSecret,
            config_json: body.config_json || {
              profile: DEFAULT_POLICY_PROFILE,
              skills: ['code', 'search'],
              model: 'claude-sonnet-4',
              data_scope: 'full',
            },
          },
        },
        201
      );
    }

    const restartMatch = path.match(/^\/agents\/([^/]+)\/restart$/);
    if (restartMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .update({
          status: 'idle',
          last_heartbeat: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', restartMatch[1])
        .eq('user_id', user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent, message: 'Agent restart initiated' });
    }

    if (path === '/agents/handshake') {
      const body = await request.json();

      // Get agent's owner for tier-based handshake limit
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('id, fleet_id, agent_secret, user_id, gateway_url, policy_profile')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (error) {
        console.error('[HANDSHAKE] Database error:', error);
        throw error;
      }
      if (!agent) {
        console.error('[HANDSHAKE] Agent not found:', body.agent_id);
        return json({ error: 'Agent not found' }, 404);
      }

      // Route-specific handshake limit
      const handshakeLimit = await checkRateLimit(request, agent.id, 'handshake', agent.user_id);
      if (!handshakeLimit.allowed) return handshakeLimit.response;

      const decryptedSecret = decrypt(agent.agent_secret);

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

      const token = await createAgentToken(agent.id, agent.fleet_id);
      const policyProfile = agent.policy_profile || DEFAULT_POLICY_PROFILE;
      let policy = getPolicy(policyProfile);

      // Tier-based heartbeat clamping
      const tier = await getTier(agent.user_id);
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

      const { data: agent, error: fetchError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!agent) return json({ error: 'Agent not found' }, 404);

      // Route-specific heartbeat limit - passing agent's owner ID for tier check
      const heartbeatLimit = await checkRateLimit(
        request,
        payload.agent_id,
        'heartbeat',
        agent.user_id
      );
      if (!heartbeatLimit.allowed) return heartbeatLimit.response;

      const update = {
        status: body.status || 'healthy',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      let tasksCount = agent.metrics_json?.tasks_completed || 0;
      let errorsCount = agent.metrics_json?.errors_count || 0;

      if (body.metrics) {
        // Calculate uptime based on agent creation time (not machine uptime)
        const createdAt = new Date(agent.created_at);
        const now = new Date();
        const uptimeHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

        // Calculate cost based on model pricing (cost per task)
        const costPerTask = MODEL_PRICING[agent.model] || 0.01;
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

      const { error } = await supabaseAdmin.from('agents').update(update).eq('id', body.agent_id);
      if (error) throw error;

      // Include updated policy in heartbeat response
      const policy = getPolicy(agent.policy_profile);

      // Insert historical metrics for charts
      if (body.metrics) {
        try {
          const { error: metricsError } = await supabaseAdmin.from('agent_metrics').insert({
            agent_id: agent.id,
            user_id: agent.user_id,
            cpu_usage: body.metrics.cpu_usage || 0,
            memory_usage: body.metrics.memory_usage || 0,
            latency_ms: body.metrics.latency_ms || 0,
            uptime_hours: body.metrics.uptime_hours || 0,
            tasks_completed: tasksCount,
            errors_count: errorsCount,
          });
          if (metricsError) {
            console.error('Failed to insert metrics:', metricsError);
          }
        } catch (e) {
          console.error('Metrics insertion exception:', e);
        }
      }

      // Trigger smart alerts
      if (body.metrics) {
        processSmartAlerts(body.agent_id, update.status, body.metrics).catch((e) =>
          console.error('Alert processing error:', e)
        );
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
      const { error } = await supabaseAdmin
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', resolveMatch[1])
        .eq('user_id', user.id);
      if (error) throw error;
      return json({ message: 'Alert resolved' });
    }

    if (path === '/seed-demo') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let { data: fleets } = await supabaseAdmin.from('fleets').select('*').eq('user_id', user.id);
      let fleet;
      if (!fleets || fleets.length === 0) {
        fleet = {
          id: uuidv4(),
          user_id: user.id,
          name: 'Production Fleet',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('fleets').insert(fleet);
      } else {
        fleet = fleets[0];
      }

      await supabaseAdmin.from('agents').delete().eq('user_id', user.id);
      await supabaseAdmin.from('alerts').delete().eq('user_id', user.id);

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
        fleet_id: fleet.id,
        user_id: user.id,
        ...a,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabaseAdmin.from('agents').insert(agentDocs);

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
      await supabaseAdmin.from('alerts').insert(alertDocs);

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
        await supabaseAdmin.from('agent_metrics').delete().eq('user_id', user.id); // Clear old metrics
        await supabaseAdmin.from('agent_metrics').insert(metricsDocs);
      } catch (e) {
        console.error('Demo metrics seed error (table likely missing):', e);
      }

      return json({
        message: 'Demo data loaded',
        agents: agentDocs.length,
        alerts: alertDocs.length,
      });
    }

    // ============ LEMON SQUEEZY CHECKOUT ============
    if (path === '/billing/checkout') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const plan = body.plan || 'pro';
      const isYearly = body.yearly === true;

      const LEMON_KEY = process.env.LEMON_SQUEEZY_API_KEY;
      const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || '139983';

      // Mapping plans to LS Variants (Verified Variant IDs for Store 288152)
      const VARIANTS = {
        pro_monthly: '1291188',
        pro_yearly: '1291221',
        enterprise_monthly: '1291241',
        enterprise_yearly: '1291250',
      };

      const variantKey = `${plan}_${isYearly ? 'yearly' : 'monthly'}`;
      const VARIANT_ID = VARIANTS[variantKey] || VARIANTS.pro_monthly;

      try {
        const checkoutRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LEMON_KEY}`,
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
          body: JSON.stringify({
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  custom: {
                    user_id: user.id,
                    plan: plan,
                  },
                },
                product_options: {
                  redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
                },
              },
              relationships: {
                store: {
                  data: {
                    type: 'stores',
                    id: String(STORE_ID),
                  },
                },
                variant: {
                  data: {
                    type: 'variants',
                    id: String(VARIANT_ID),
                  },
                },
              },
            },
          }),
        });
        const checkoutData = await checkoutRes.json();
        const checkoutUrl = checkoutData?.data?.attributes?.url;
        if (!checkoutUrl) throw new Error(JSON.stringify(checkoutData));
        return json({ checkout_url: checkoutUrl, plan });
      } catch (err) {
        console.error('Lemon Squeezy error:', err);
        return json({ error: 'Payment service unavailable', details: err.message }, 500);
      }
    }

    // ============ LEMON SQUEEZY WEBHOOK ============
    if (path === '/billing/webhook') {
      const crypto = await import('node:crypto');
      const rawBody = await request.text();
      const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
      const signature = Buffer.from(request.headers.get('x-signature') || '', 'utf8');

      if (!crypto.timingSafeEqual(digest, signature)) {
        return json({ error: 'Invalid signature.' }, 400);
      }

      const body = JSON.parse(rawBody);
      const eventName = body.meta.event_name;
      const customData = body.meta.custom_data;

      if (!customData || !customData.user_id) {
        console.error('Webhook received without custom_data.user_id:', body);
        return json({ error: 'Missing user_id in custom data.' }, 400);
      }

      if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
        const attrs = body?.data?.attributes || {};
        const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: customData.user_id,
            plan: customData.plan || 'pro',
            status: attrs.status === 'active' ? 'active' : attrs.status,
            lemon_subscription_id: String(body?.data?.id),
            lemon_customer_id: String(attrs.customer_id),
            variant_id: String(attrs.variant_id),
            current_period_end: attrs.renews_at,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (upsertError) {
          console.error('Supabase Upsert Error:', upsertError);
        } else {
          console.log('Subscription upserted successfully for user:', customData.user_id);
        }
      }

      if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        const attrs = body?.data?.attributes || {};
        // Only cancel if the subscription ID matches (prevent overwriting modern sub with old expired one)
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('user_id', customData.user_id)
          .eq('lemon_subscription_id', String(body?.data?.id));
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
        config: body.config || {},
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('alert_channels').insert(channel);
      if (error) throw error;
      return json({ channel }, 201);
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
        offline_alert: body.offline_alert !== undefined ? body.offline_alert : true,
        error_alert: body.error_alert !== undefined ? body.error_alert : true,
        cooldown_minutes: body.cooldown_minutes || 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('alert_configs').insert(config);
      if (error) throw error;
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
      const updateFields = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) updateFields.name = body.name;
      if (body.gateway_url !== undefined) updateFields.gateway_url = body.gateway_url;
      if (body.config_json !== undefined) updateFields.config_json = encrypt(body.config_json);
      if (body.machine_id !== undefined) updateFields.machine_id = body.machine_id;
      if (body.location !== undefined) updateFields.location = body.location;
      if (body.model !== undefined) updateFields.model = body.model;
      if (body.status !== undefined) updateFields.status = body.status;
      if (body.policy_profile !== undefined) updateFields.policy_profile = body.policy_profile;

      let query = supabaseAdmin.from('agents').update(updateFields).eq('id', agentId);

      // If user, ensure ownership
      if (user) {
        query = query.eq('user_id', user.id);
      }

      const { data: agent, error } = await query.select().single();

      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent: decryptAgent(agent) });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: fleet, error } = await supabaseAdmin
        .from('fleets')
        .update({ name: body.name, updated_at: new Date().toISOString() })
        .eq('id', fleetMatch[1])
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!fleet) return json({ error: 'Fleet not found' }, 404);
      return json({ fleet });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const body = await request.json();
      const updateFields = { updated_at: new Date().toISOString() };

      if (body.label !== undefined) updateFields.label = body.label.toUpperCase();
      if (body.description !== undefined) updateFields.description = body.description;
      if (body.color !== undefined) updateFields.color = body.color;
      if (body.bg !== undefined) updateFields.bg = body.bg;
      if (body.skills !== undefined) updateFields.skills = body.skills;
      if (body.tools !== undefined) updateFields.tools = body.tools;
      if (body.data_access !== undefined) updateFields.data_access = body.data_access;
      if (body.heartbeat_interval !== undefined)
        updateFields.heartbeat_interval = parseInt(body.heartbeat_interval);
      if (body.is_active !== undefined) updateFields.is_active = body.is_active;

      const { data: policy, error } = await supabaseAdmin
        .from('custom_policies')
        .update(updateFields)
        .eq('id', customPolicyMatch[1])
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!policy) return json({ error: 'Custom policy not found' }, 404);
      return json({ policy });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('PUT Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  const params = await context.params;
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { error: deleteError } = await supabaseAdmin
        .from('agents')
        .delete()
        .eq('id', agentMatch[1])
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;
      await supabaseAdmin
        .from('alerts')
        .delete()
        .eq('agent_id', agentMatch[1])
        .eq('user_id', user.id);
      return json({ message: 'Agent deleted' });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      await supabaseAdmin
        .from('agents')
        .delete()
        .eq('fleet_id', fleetMatch[1])
        .eq('user_id', user.id);
      await supabaseAdmin
        .from('alerts')
        .delete()
        .eq('fleet_id', fleetMatch[1])
        .eq('user_id', user.id);
      const { error: deleteError } = await supabaseAdmin
        .from('fleets')
        .delete()
        .eq('id', fleetMatch[1])
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;
      return json({ message: 'Fleet and associated agents deleted' });
    }

    const customPolicyMatch = path.match(/^\/custom-policies\/([^/]+)$/);
    if (customPolicyMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { error: deleteError } = await supabaseAdmin
        .from('custom_policies')
        .delete()
        .eq('id', customPolicyMatch[1])
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;
      return json({ message: 'Custom policy deleted' });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
