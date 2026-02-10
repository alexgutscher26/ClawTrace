import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    return json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
