import { checkRateLimit, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  return json({ status: 'ok', timestamp: new Date().toISOString() });
}
