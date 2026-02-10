import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin, getTier } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: branding } = await supabaseAdmin
      .from('enterprise_branding')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    return json({ branding: branding || { domain: '', name: '' } });
  } catch (error) {
    console.error('Branding GET Error:', error);
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
      return json({ error: 'Branding requires an ENTERPRISE plan' }, 403);
    }

    const body = await request.json();
    const { data: branding, error } = await supabaseAdmin
      .from('enterprise_branding')
      .upsert(
        {
          user_id: user.id,
          domain: body.domain,
          name: body.name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return json({ branding });
  } catch (error) {
    console.error('Branding POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
