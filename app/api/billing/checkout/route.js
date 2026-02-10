import { json, OPTIONS, getUser, checkRateLimit } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const body = await request.json();
    const plan = body.plan || 'pro';
    const isYearly = body.yearly === true;

    const LEMON_KEY = process.env.LEMON_SQUEEZY_API_KEY;
    const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || '139983';

    // Mapping plans to LS Variants (Verified Variant IDs for Store 288152)
    const VARIANTS = {
      pro_monthly: '1291188',
      pro_yearly: '1291221',
      enterprise_monthly: '1291241',
      enterprise_yearly: '1291250',
    };

    const variantKey = `${plan}_${isYearly ? 'yearly' : 'monthly'}`;
    const VARIANT_ID = VARIANTS[variantKey] || VARIANTS.pro_monthly;

    const checkoutRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LEMON_KEY}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                user_id: user.id,
                plan: plan,
              },
            },
            product_options: {
              redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: String(STORE_ID),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: String(VARIANT_ID),
              },
            },
          },
        },
      }),
    });
    const checkoutData = await checkoutRes.json();
    const checkoutUrl = checkoutData?.data?.attributes?.url;
    if (!checkoutUrl) throw new Error(JSON.stringify(checkoutData));
    return json({ checkout_url: checkoutUrl, plan });
  } catch (err) {
    console.error('Lemon Squeezy error:', err);
    return json({ error: 'Payment service unavailable', details: err.message }, 500);
  }
}
