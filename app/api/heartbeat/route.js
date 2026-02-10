import { supabaseAdmin } from '@/lib/supabase-admin';
import { MODEL_PRICING } from '@/lib/pricing';
import { processSmartAlerts } from '@/lib/alerts';
import {
  DEFAULT_POLICY_PROFILE,
  getPolicy,
} from '@/lib/policies';
import {
  checkRateLimit,
  verifyAgentToken,
  json,
  OPTIONS,
} from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
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
      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: 'Agent not found' }, 404);
      agent = data;
      userId = agent.user_id;
      policyProfile = agent.policy_profile;
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
      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: 'Agent not found' }, 404);
      agent = data;
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

    const { error } = await supabaseAdmin.from('agents').update(update).eq('id', body.agent_id);
    if (error) throw error;

    // Include updated policy in heartbeat response
    const policy = getPolicy(policyProfile || DEFAULT_POLICY_PROFILE);

    // Insert historical metrics for charts
    if (body.metrics) {
      try {
        const { error: metricsError } = await supabaseAdmin.from('agent_metrics').insert({
          agent_id: body.agent_id, // Use ID from body/token
          user_id: userId, // Use userId from token/agent
          cpu_usage: body.metrics.cpu_usage || 0,
          memory_usage: body.metrics.memory_usage || 0,
          latency_ms: body.metrics.latency_ms || 0,
          uptime_hours: body.metrics.uptime_hours || 0,
          tasks_completed: tasksCount,
          errors_count: errorsCount,
          cost_usd: (tasksCount * costPerTask) || 0,
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
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
