import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
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
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
