import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, getTier, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
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
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
