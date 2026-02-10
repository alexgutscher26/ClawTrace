import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: stats, error } = await supabaseAdmin.rpc('get_dashboard_stats', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Failed to get dashboard stats:', error);
      return json({ error: 'Failed to fetch statistics' }, 500);
    }

    return json({ stats });
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
