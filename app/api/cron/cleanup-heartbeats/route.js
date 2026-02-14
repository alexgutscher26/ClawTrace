import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * Handles the cleanup of old agent_metrics records.
 *
 * This function performs a security check to validate the incoming request. If the request is valid, it calculates a cutoff date for records older than 30 days and deletes those records from the Turso database. It logs the number of records deleted and returns a JSON response indicating the success of the operation. In case of an error during the process, it logs the error and returns a JSON response with an internal server error status.
 *
 * @param {Request} request - The incoming request object to be validated.
 */
export async function GET(request) {
  // 1. Security Check
  if (!isValidCronRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    // 2. Calculate cutoff date (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffIso = thirtyDaysAgo.toISOString();

    // 3. Delete old agent_metrics records in Turso
    const res = await turso.execute({
        sql: 'DELETE FROM agent_metrics WHERE created_at < ?',
        args: [cutoffIso]
    });

    const count = res.rowsAffected;

    console.log(`[Cron] Cleaned up ${count} agent_metrics records older than 30 days.`);

    return NextResponse.json({
      success: true,
      message: 'Agent metrics cleanup complete',
      deleted_count: count,
      cutoff_date: cutoffIso,
    });
  } catch (err) {
    console.error('Cleanup cron failed:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
