import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    // 3. Delete old heartbeat records
    // Assuming table name is 'heartbeats' and created_at is the timestamp column
    const { count, error } = await supabaseAdmin
      .from('heartbeats')
      .delete({ count: 'exact' }) // Request exact count of deleted rows
      .lt('created_at', cutoffIso);

    if (error) {
      console.error('Error cleaning up heartbeats:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`[Cron] Cleaned up ${count} heartbeat records older than 30 days.`);

    return NextResponse.json({
      success: true,
      message: 'Heartbeat cleanup complete',
      deleted_count: count,
      cutoff_date: cutoffIso,
    });
  } catch (err) {
    console.error('Cleanup cron failed:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
