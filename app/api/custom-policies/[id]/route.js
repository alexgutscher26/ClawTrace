import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: policy, error } = await supabaseAdmin
      .from('custom_policies')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!policy) return json({ error: 'Custom policy not found' }, 404);
    return json({ policy });
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function PUT(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const updateFields = { updated_at: new Date().toISOString() };

    if (body.label !== undefined) updateFields.label = body.label.toUpperCase();
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.color !== undefined) updateFields.color = body.color;
    if (body.bg !== undefined) updateFields.bg = body.bg;
    if (body.skills !== undefined) updateFields.skills = body.skills;
    if (body.tools !== undefined) updateFields.tools = body.tools;
    if (body.data_access !== undefined) updateFields.data_access = body.data_access;
    if (body.heartbeat_interval !== undefined)
      updateFields.heartbeat_interval = parseInt(body.heartbeat_interval);
    if (body.is_active !== undefined) updateFields.is_active = body.is_active;

    const { data: policy, error } = await supabaseAdmin
      .from('custom_policies')
      .update(updateFields)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!policy) return json({ error: 'Custom policy not found' }, 404);
    return json({ policy });
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
    const { error: deleteError } = await supabaseAdmin
      .from('custom_policies')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);
    if (deleteError) throw deleteError;
    return json({ message: 'Custom policy deleted' });
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
