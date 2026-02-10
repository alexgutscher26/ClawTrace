
import { NextResponse } from 'next/server';
import { runScalingCheck } from '@/lib/scaling-engine';

export async function POST(request) {
    // 1. Verify Authentication (This should be protected or use a secret key)
    // For simplicity, we just check headers or assume cron-job style access.
    const cronSecret = request.headers.get('Authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Run Scaling Engine
    try {
        const results = await runScalingCheck();
        return NextResponse.json({ success: true, processed: results });
    } catch (err) {
        console.error('Scaling Cron Job Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
