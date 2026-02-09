import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';
import { processSmartAlerts } from '@/lib/alerts';

// Force dynamic to prevent static caching of the cron checks
export const dynamic = 'force-dynamic';

export async function GET(request) {
    // 1. Security Check
    if (!isValidCronRequest(request)) {
        return unauthorizedResponse();
    }

    try {
        // 2. Calculate the threshold time (5 minutes ago)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // 3. Find and update stale agents
        // We want agents that are currently 'online' but haven't sent a heartbeat since fiveMinutesAgo
        const { data, error } = await supabaseAdmin
            .from('agents')
            .update({ status: 'offline' })
            .eq('status', 'online')
            .lt('last_heartbeat', fiveMinutesAgo)
            .select('id, name, last_heartbeat');

        if (error) {
            console.error('Error updating stale agents:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const count = data ? data.length : 0;

        // Log the action and trigger alerts if agents were updated
        if (count > 0) {
            console.log(`[Cron] Marked ${count} agents as offline:`, data.map(a => a.name));

            // Trigger Smart Alerts for each offline agent
            for (const agent of data) {
                // Since this is a cron and we don't have current metrics, we pass empty metrics
                // processSmartAlerts will check the offline_alert flag
                processSmartAlerts(agent.id, 'offline', {}).catch(e =>
                    console.error(`Alert processing error for ${agent.name}:`, e)
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Checked for stale agents.`,
            updated_count: count,
            updated_agents: data
        });

    } catch (err) {
        console.error('Cron job failed:', err);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
