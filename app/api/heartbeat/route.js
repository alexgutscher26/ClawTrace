import { json, OPTIONS, checkRateLimit, supabaseAdmin, verifyAgentToken } from '@/lib/api-utils';
import { getPolicy } from '@/lib/policies';
import { processSmartAlerts } from '@/lib/alerts';
import { MODEL_PRICING } from '@/lib/pricing';

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
  } catch (error) {
    console.error('Heartbeat POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
