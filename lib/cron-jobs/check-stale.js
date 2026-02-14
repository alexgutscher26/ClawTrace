import { turso } from '@/lib/turso';

/**
 * Core logic for checking stale agents.
 */
export async function checkStaleAgents(processSmartAlerts) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 1. Update in Turso (Primary)
  // Get the IDs first so we can trigger alerts
  const staleRes = await turso.execute({
    sql: 'SELECT id, name FROM agents WHERE status = ? AND last_heartbeat < ?',
    args: ['online', fiveMinutesAgo],
  });

  const staleAgents = staleRes.rows;
  const count = staleAgents.length;

  if (count > 0) {
    const ids = staleAgents.map((a) => a.id);

    // Batch update to offline in Turso
    await turso.execute({
      sql: `UPDATE agents SET status = 'offline', updated_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      args: [new Date().toISOString(), ...ids],
    });

    console.log(
      `[Cron] Marked ${count} agents as offline in Turso:`,
      staleAgents.map((a) => a.name)
    );

    // 3. Trigger Alerts
    for (const agent of staleAgents) {
      processSmartAlerts(agent.id, 'offline', {}).catch((e) =>
        console.error(`Alert processing error for ${agent.name}:`, e)
      );
    }
  }

  return {
    success: true,
    message: `Checked for stale agents.`,
    updated_count: count,
    updated_agents: staleAgents,
  };
}
