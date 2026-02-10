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

    const { data: policies, error } = await supabaseAdmin
      .from('custom_policies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return json({ policies: policies || [] });
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
    if (tier !== 'enterprise') {
      return json({ error: 'Custom policies require an ENTERPRISE plan' }, 403);
    }

    const body = await request.json();
    if (!body.name || !body.label) {
      return json({ error: 'Name and label are required' }, 400);
    }

    const policy = {
      id: uuidv4(),
      user_id: user.id,
      name: body.name.toLowerCase().replace(/\s+/g, '-'),
      label: body.label.toUpperCase(),
      description: body.description || '',
      color: body.color || 'text-blue-400 border-blue-500/30',
      bg: body.bg || 'bg-blue-500/10',
      skills: body.skills || [],
      tools: body.tools || [],
      data_access: body.data_access || 'restricted',
      heartbeat_interval: parseInt(body.heartbeat_interval) || 300,
      guardrails: body.guardrails || {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('custom_policies').insert(policy);
    if (error) throw error;
    return json({ policy }, 201);
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
