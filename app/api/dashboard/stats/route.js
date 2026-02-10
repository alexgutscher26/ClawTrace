import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
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
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
