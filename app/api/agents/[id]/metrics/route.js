import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const agentId = params.id;

    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

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
  } catch (error) {
    console.error('Metrics GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
