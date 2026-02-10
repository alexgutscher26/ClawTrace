import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'idle',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!agent) return json({ error: 'Agent not found' }, 404);
    return json({ agent, message: 'Agent restart initiated' });
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
