import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

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
