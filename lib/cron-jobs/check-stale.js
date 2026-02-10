/**
 * Core logic for checking stale agents.
 *
 * @param {object} supabaseAdmin - The Supabase admin client
 * @param {function} processSmartAlerts - Function to process alerts (agentId, status, metrics)
 * @returns {Promise<object>} Result object with count and updated agents
 */
export async function checkStaleAgents(supabaseAdmin, processSmartAlerts) {
  // 1. Calculate the threshold time (5 minutes ago)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 2. Find and update stale agents
  // We want agents that are currently 'online' but haven't sent a heartbeat since fiveMinutesAgo
  const { data, error } = await supabaseAdmin
    .from('agents')
    .update({ status: 'offline' })
    .eq('status', 'online')
    .lt('last_heartbeat', fiveMinutesAgo)
    .select('id, name, last_heartbeat');

  if (error) {
    throw new Error(error.message);
  }

  const count = data ? data.length : 0;

  // Log the action and trigger alerts if agents were updated
  if (count > 0) {
    console.log(
      `[Cron] Marked ${count} agents as offline:`,
      data.map((a) => a.name)
    );

    // Trigger Smart Alerts for each offline agent
    for (const agent of data) {
      // Since this is a cron and we don't have current metrics, we pass empty metrics
      // processSmartAlerts will check the offline_alert flag
      // We catch errors here to prevent one failure from stopping the loop,
      // although Promise.allSettled might be better if we wanted parallelism.
      // But sequential is safer for rate limits.
      processSmartAlerts(agent.id, 'offline', {}).catch((e) =>
        console.error(`Alert processing error for ${agent.name}:`, e)
      );
    }
  }

  return {
    success: true,
    message: `Checked for stale agents.`,
    updated_count: count,
    updated_agents: data,
  };
}
