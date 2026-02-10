
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';
import { processSmartAlerts } from '@/lib/alerts';
import { checkStaleAgents } from '@/lib/cron-jobs/check-stale';

// Force dynamic to prevent static caching of the cron checks
export const dynamic = 'force-dynamic';

/**
 * Handles the GET request for the cron job.
 *
 * This function performs a security check to validate the incoming request. If the request is valid, it proceeds to check for stale agents using the `checkStaleAgents` function, passing in `supabaseAdmin` and `processSmartAlerts`. In case of an error during the process, it logs the error and returns a JSON response with an appropriate error message and a 500 status code.
 *
 * @param {Request} request - The incoming request object to be validated and processed.
 */
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
