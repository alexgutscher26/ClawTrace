import { NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import {
  DEFAULT_POLICY_PROFILE,
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
} from '@/lib/policies';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  checkRateLimit,
  validateInstallParams,
  getTier,
  getScript,
  json,
  OPTIONS,
} from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');
  const agentSecret = searchParams.get('agent_secret');
  let interval = searchParams.get('interval');

  const validation = validateInstallParams(agentId, agentSecret, interval);
  if (validation) return json({ error: validation.error }, validation.status);

  if (!uuidValidate(agentId) || !uuidValidate(agentSecret)) {
    return json({ error: 'Invalid agent_id or agent_secret format' }, 400);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    request.headers.get('origin') ||
    'http://localhost:3000';

  try {
    new URL(baseUrl);
    if (baseUrl.includes('"') || baseUrl.includes("'")) throw new Error('Invalid characters');
  } catch {
    return json({ error: 'Invalid base URL' }, 400);
  }

  // Determine user tier for heartbeat interval
  if (!interval) {
    // Get agent's user_id to determine tier
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .maybeSingle();

    if (agent) {
      const tier = await getTier(agent.user_id);
      const { data: agentFull } = await supabaseAdmin
        .from('agents')
        .select('policy_profile')
        .eq('id', agentId)
        .single();

      const profile = agentFull?.policy_profile || DEFAULT_POLICY_PROFILE;
      let policyInterval = tier === 'free' ? 300 : 60;

      if (profile === POLICY_OPS) policyInterval = 60;
      else if (profile === POLICY_EXEC) policyInterval = 600;
      else if (
        ![POLICY_DEV, POLICY_OPS, POLICY_EXEC].includes(profile) &&
        tier === 'enterprise'
      ) {
        const { data: cp } = await supabaseAdmin
          .from('custom_policies')
          .select('heartbeat_interval')
          .eq('user_id', agent.user_id)
          .eq('name', profile)
          .maybeSingle();
        if (cp) policyInterval = cp.heartbeat_interval;
      }
      interval = policyInterval.toString();
    } else {
      interval = '300';
    }
  }

  const psScript = await getScript('install-agent.ps1', {
    AGENT_ID: agentId,
    BASE_URL: baseUrl,
    AGENT_SECRET: agentSecret,
    INTERVAL: interval,
  });

  return new NextResponse(psScript, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="openclaw-monitor.ps1"',
    },
  });
}
