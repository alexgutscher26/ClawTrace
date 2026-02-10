import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin } from '@/lib/api-utils';

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
    if (!team) return json({ error: 'Only team owners can remove members' }, 403);
    if (body.email === user.email) return json({ error: 'Cannot remove yourself' }, 400);

    const newMembers = team.members?.filter((m) => m.email !== body.email) || [];
    await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

    return json({ message: `Removed ${body.email}` });
  } catch (error) {
    console.error('Team Remove Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
