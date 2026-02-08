import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidCronRequest, unauthorizedResponse } from '@/lib/cron-auth';

// Force dynamic to prevent static caching of the cron checks
export const dynamic = 'force-dynamic';

/**
 * Handles the GET request to check and update stale agents.
 *
 * This function performs a security check to validate the request. It then calculates the threshold time for stale agents,
 * updates the status of agents that are online but have not sent a heartbeat since five minutes ago, and logs the action.
 * If any errors occur during the update process, it returns an appropriate error response.
 *
 * @param request - The incoming request object.
 * @returns A JSON response indicating the success of the operation, the count of updated agents, and their details.
 * @throws Error If an internal error occurs during the execution of the function.
 */
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

        // Log the action if agents were updated
        if (count > 0) {
            console.log(`[Cron] Marked ${count} agents as offline:`, data.map(a => a.name));
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
