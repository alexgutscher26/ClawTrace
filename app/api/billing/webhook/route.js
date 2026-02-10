import { json, OPTIONS, supabaseAdmin, checkRateLimit } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  // Include rate limit check as in original code
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const crypto = await import('node:crypto');
    const rawBody = await request.text();
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(request.headers.get('x-signature') || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      return json({ error: 'Invalid signature.' }, 400);
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta.event_name;
    const customData = body.meta.custom_data;

    if (!customData || !customData.user_id) {
      console.error('Webhook received without custom_data.user_id:', body);
      return json({ error: 'Missing user_id in custom data.' }, 400);
    }

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const attrs = body?.data?.attributes || {};
      const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert(
        {
          user_id: customData.user_id,
          plan: customData.plan || 'pro',
          status: attrs.status === 'active' ? 'active' : attrs.status,
          lemon_subscription_id: String(body?.data?.id),
          lemon_customer_id: String(attrs.customer_id),
          variant_id: String(attrs.variant_id),
          current_period_end: attrs.renews_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (upsertError) {
        console.error('Supabase Upsert Error:', upsertError);
      } else {
        console.log('Subscription upserted successfully for user:', customData.user_id);
      }
    }

    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const attrs = body?.data?.attributes || {};
      // Only cancel if the subscription ID matches (prevent overwriting modern sub with old expired one)
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', customData.user_id)
        .eq('lemon_subscription_id', String(body?.data?.id));
    }

    return json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
