import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  DEFAULT_POLICY_PROFILE,
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
  getPolicy,
} from '@/lib/policies';
import { encrypt } from '@/lib/encryption';
import {
  checkRateLimit,
  getUser,
  getTier,
  processInBatches,
  decryptAgent,
  json,
  OPTIONS,
} from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { searchParams } = new URL(request.url);
    const fleet_id = searchParams.get('fleet_id');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('agents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);
    if (fleet_id) query = query.eq('fleet_id', fleet_id);

    const {
      data: agents,
      error,
      count,
    } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (error) throw error;

    // Optimize: Process decryption in batches to prevent event loop blocking
    const decryptedAgents = await processInBatches(agents, 50, decryptAgent);
    return json({ agents: decryptedAgents });
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
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
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
