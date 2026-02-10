import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const alertId = params.id;

    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { error } = await supabaseAdmin
      .from('alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', user.id);
    if (error) throw error;
    return json({ message: 'Alert resolved' });
  } catch (error) {
    console.error('Resolve Alert Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
