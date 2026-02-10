import { json, OPTIONS, getUser, checkRateLimit } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  const user = await getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return json({ user: { id: user.id, email: user.email } });
}
