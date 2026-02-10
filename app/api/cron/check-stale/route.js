import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';
import { processSmartAlerts } from '@/lib/alerts';
import { checkStaleAgents } from '@/lib/cron-jobs/check-stale';

// Force dynamic to prevent static caching of the cron checks
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. Security Check
  if (!isValidCronRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const result = await checkStaleAgents(supabaseAdmin, processSmartAlerts);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Cron job failed:', err);
    // If it's a known error message (from throw new Error(error.message)), use it
    // otherwise generic 500
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
