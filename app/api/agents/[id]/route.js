import {
  json,
  OPTIONS,
  getUser,
  checkRateLimit,
  supabaseAdmin,
  decryptAgent,
  encrypt,
  verifyAgentToken,
} from '@/lib/api-utils';

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

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!agent) return json({ error: 'Agent not found' }, 404);
    return json({ agent: decryptAgent(agent) });
  } catch (error) {
    console.error('Agent GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function PUT(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const agentId = params.id;

    let user = await getUser(request);
    let isAgent = false;

    // If not user session, check if it's the agent itself updating
    if (!user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = await verifyAgentToken(token);
        if (payload && payload.agent_id === agentId) {
          isAgent = true;
        }
      }
    }

    if (!user && !isAgent) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const updateFields = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.gateway_url !== undefined) updateFields.gateway_url = body.gateway_url;
    if (body.config_json !== undefined) updateFields.config_json = encrypt(body.config_json);
    if (body.machine_id !== undefined) updateFields.machine_id = body.machine_id;
    if (body.location !== undefined) updateFields.location = body.location;
    if (body.model !== undefined) updateFields.model = body.model;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.policy_profile !== undefined) updateFields.policy_profile = body.policy_profile;

    let query = supabaseAdmin.from('agents').update(updateFields).eq('id', agentId);

    // If user, ensure ownership
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: agent, error } = await query.select().single();

    if (error) throw error;
    if (!agent) return json({ error: 'Agent not found' }, 404);
    return json({ agent: decryptAgent(agent) });
  } catch (error) {
    console.error('Agent PUT Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const params = await context.params;
    const agentId = params.id;

    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { error: deleteError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    await supabaseAdmin.from('alerts').delete().eq('agent_id', agentId).eq('user_id', user.id);

    return json({ message: 'Agent deleted' });
  } catch (error) {
    console.error('Agent DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
