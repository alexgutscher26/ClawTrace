import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function PUT(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const body = await request.json();
    const { data: fleet, error } = await supabaseAdmin
      .from('fleets')
      .update({ name: body.name, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!fleet) return json({ error: 'Fleet not found' }, 404);
    return json({ fleet });
  } catch (error) {
    console.error('PUT Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    await supabaseAdmin
      .from('agents')
      .delete()
      .eq('fleet_id', params.id)
      .eq('user_id', user.id);
    await supabaseAdmin
      .from('alerts')
      .delete()
      .eq('fleet_id', params.id)
      .eq('user_id', user.id);
    const { error: deleteError } = await supabaseAdmin
      .from('fleets')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);
    if (deleteError) throw deleteError;
    return json({ message: 'Fleet and associated agents deleted' });
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
