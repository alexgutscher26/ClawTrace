import crypto from 'crypto';
import {
  json,
  OPTIONS,
  checkRateLimit,
  supabaseAdmin,
  decrypt,
  createAgentToken,
  getTier,
} from '@/lib/api-utils';
import { getPolicy, DEFAULT_POLICY_PROFILE } from '@/lib/policies';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const body = await request.json();

    // Get agent's owner for tier-based handshake limit
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, fleet_id, agent_secret, user_id, gateway_url, policy_profile')
      .eq('id', body.agent_id)
      .maybeSingle();

    if (error) {
      console.error('[HANDSHAKE] Database error:', error);
      throw error;
    }
    if (!agent) {
      console.error('[HANDSHAKE] Agent not found:', body.agent_id);
      return json({ error: 'Agent not found' }, 404);
    }

    // Route-specific handshake limit
    const handshakeLimit = await checkRateLimit(request, agent.id, 'handshake', agent.user_id);
    if (!handshakeLimit.allowed) return handshakeLimit.response;

    const decryptedSecret = decrypt(agent.agent_secret);

    if (body.signature) {
      // Hardened Handshake: HMAC-SHA256(agent_id + timestamp, secret)
      const timestamp = parseInt(body.timestamp);
      const now = Math.floor(Date.now() / 1000);

      // Anti-replay: 5 minute window
      if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
        console.error('[HANDSHAKE] Timestamp validation failed');
        return json({ error: 'Signature expired or invalid timestamp' }, 401);
      }

      const expectedSignature = crypto
        .createHmac('sha256', decryptedSecret)
        .update(agent.id + body.timestamp)
        .digest('hex');

      if (expectedSignature !== body.signature) {
        console.error('[HANDSHAKE] Signature mismatch');
        return json({ error: 'Invalid signature' }, 401);
      }
    } else {
      // Legacy Handshake: Plaintext secret (Optional fallback)
      if (!decryptedSecret || decryptedSecret !== body.agent_secret) {
        console.error('[HANDSHAKE] Legacy secret validation failed');
        return json({ error: 'Invalid agent secret' }, 401);
      }
    }

    const token = await createAgentToken(agent.id, agent.fleet_id);
    const policyProfile = agent.policy_profile || DEFAULT_POLICY_PROFILE;
    let policy = getPolicy(policyProfile);

    // Tier-based heartbeat clamping
    const tier = await getTier(agent.user_id);
    if (tier === 'free' && policy.heartbeat_interval < 300) {
      policy.heartbeat_interval = 300; // Force 5m for FREE
    } else if (tier === 'pro' && policy.heartbeat_interval < 60) {
      policy.heartbeat_interval = 60; // Force 1m for PRO
    }

    return json({ token, expires_in: 86400, gateway_url: agent.gateway_url, policy });
  } catch (error) {
    console.error('Handshake POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
