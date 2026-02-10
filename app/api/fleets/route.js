import { v4 as uuidv4 } from 'uuid';
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
    const { data: fleets, error } = await supabaseAdmin
      .from('fleets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return json({ fleets });
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
    const body = await request.json();
    const fleet = {
      id: uuidv4(),
      user_id: user.id,
      name: body.name || 'My Fleet',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from('fleets').insert(fleet);
    if (error) throw error;
    return json({ fleet }, 201);
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
