
import { NextResponse } from 'next/server';
import { runScalingCheck } from '@/lib/scaling-engine';

/**
 * Handles the POST request for the scaling engine.
 *
 * This function verifies the authentication of the request using a secret key from the headers.
 * If the authentication is successful, it proceeds to run the scaling check and returns the results.
 * In case of an error during the scaling process, it logs the error and returns a 500 status with the error message.
 *
 * @param {Request} request - The incoming request object containing headers for authentication.
 */
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
