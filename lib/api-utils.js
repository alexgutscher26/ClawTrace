import { NextResponse } from 'next/server';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import { encrypt, decrypt } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { promises as fs } from 'fs';
import path from 'path';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limits';

export { supabaseAdmin, encrypt, decrypt, uuidv4, uuidValidate, RATE_LIMIT_CONFIG };

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function getScript(filename, replacements) {
  const filePath = path.join(process.cwd(), 'lib/scripts', filename);
  let content = await fs.readFile(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

export const decryptAgent = (a) => {
  if (!a) return a;
  const decrypted = { ...a };
  try {
    if (a.config_json) {
      const d = decrypt(a.config_json);
      decrypted.config_json = d ? JSON.parse(d) : a.config_json;
    }
    if (a.agent_secret) decrypted.agent_secret = decrypt(a.agent_secret);
  } catch (e) {
    console.error('Failed to decrypt agent:', a.id, e);
  }
  return decrypted;
};

export async function getTier(userId) {
  if (!userId) return 'free';
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle();
  return (data?.plan || 'free').toLowerCase();
}

export function validateInstallParams(agentId, agentSecret, interval) {
  if (!agentId || !agentSecret) {
    return { error: 'Missing agent_id or agent_secret parameter', status: 400 };
  }
  if (!uuidValidate(agentId) || !uuidValidate(agentSecret)) {
    return { error: 'Invalid agent_id or agent_secret format', status: 400 };
  }
  if (interval && !/^\d+$/.test(interval)) {
    return { error: 'Invalid interval format', status: 400 };
  }
  return null;
}

export async function checkRateLimit(request, identifier, type = 'global', userId = null) {
  const tier = await getTier(userId);
  const tierConfig = RATE_LIMIT_CONFIG[tier] || RATE_LIMIT_CONFIG.free;

  // Handle potential key mismatch if any, but lib/rate-limits.js uses 'heartbeat' which matches usage
  const config = tierConfig[type] || RATE_LIMIT_CONFIG.free[type];

  if (!config) {
    console.warn(`Rate limit config missing for type: ${type}`);
    return { allowed: true }; // Fail open
  }

  // Optimize: Use atomic DB transaction via RPC to handle concurrency
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_path: type,
    p_capacity: config.capacity,
    p_refill_rate: config.refillRate,
  });

  if (error) {
    console.error('Rate limit RPC error:', error);
    // Fail open on DB error to prevent blocking service
    return { allowed: true };
  }

  if (!data.allowed) {
    return {
      allowed: false,
      response: json(
        {
          error: 'Too many requests',
          type,
          retry_after: Math.ceil(data.retry_after),
        },
        429
      ),
    };
  }

  return { allowed: true };
}

export async function createAgentToken(agentId, fleetId) {
  return await new SignJWT({ agent_id: agentId, fleet_id: fleetId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Tokens expire in 24 hours
    .sign(JWT_SECRET);
}

export async function verifyAgentToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
}
