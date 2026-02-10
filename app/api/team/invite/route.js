import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const body = await request.json();
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!team) return json({ error: 'Only team owners can invite members' }, 403);

    const existing = team.members?.find((m) => m.email === body.email);
    if (existing) return json({ error: 'Member already in team' }, 409);

    const newMembers = [
      ...(team.members || []),
      {
        user_id: null,
        email: body.email,
        role: body.role || 'member',
        invited_by: user.id,
        joined_at: new Date().toISOString(),
      },
    ];
    await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

    return json({ message: 'Invite sent' });
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
