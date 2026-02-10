import { json, OPTIONS, getUser, checkRateLimit, supabaseAdmin, uuidv4 } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let { data: team, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .or(`owner_id.eq.${user.id},members.cs.[{"user_id":"${user.id}"}]`)
      .maybeSingle();

    if (!team && !error) {
      team = {
        id: uuidv4(),
        name: `${user.email?.split('@')[0]}'s Team`,
        owner_id: user.id,
        members: [
          {
            user_id: user.id,
            email: user.email,
            role: 'owner',
            joined_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('teams').insert(team);
    }
    return json({ team });
  } catch (error) {
    console.error('Team GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
