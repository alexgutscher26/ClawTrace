import { turso } from './turso.js';

/**
 * Adapter to fetch data from Turso using a similar interface to Supabase
 * (Simplified for our specific use cases)
 */
export const tursoAdapter = {
  async getAgents(userId, limit = 50, offset = 0) {
    const res = await turso.execute({
      sql: 'SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [userId, limit, offset],
    });
    return res.rows;
  },

  async getFleets(userId) {
    const res = await turso.execute({
      sql: 'SELECT * FROM fleets WHERE user_id = ?',
      args: [userId],
    });
    return res.rows;
  },

  async getMetrics(agentId) {
    const res = await turso.execute({
      sql: 'SELECT * FROM agent_metrics WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50',
      args: [agentId],
    });
    return res.rows;
  },

  async getStats(userId) {
    try {
      // 1. Agents Stats
      const agentsRes = await turso.execute({
        sql: `SELECT
          count(*) as total_agents,
          sum(case when status = 'healthy' then 1 else 0 end) as healthy,
          sum(case when status = 'idle' then 1 else 0 end) as idle,
          sum(case when status = 'error' then 1 else 0 end) as error,
          sum(case when status = 'offline' then 1 else 0 end) as offline,
          sum(cast(json_extract(metrics_json, '$.cost_usd') as real)) as total_cost,
          sum(cast(json_extract(metrics_json, '$.tasks_completed') as integer)) as total_tasks
        FROM agents
        WHERE user_id = ?`,
        args: [userId],
      });
      const agentStats = agentsRes.rows[0];

      // 2. Fleets Stats
      const fleetsRes = await turso.execute({
        sql: 'SELECT count(*) as total_fleets FROM fleets WHERE user_id = ?',
        args: [userId],
      });
      const totalFleets = fleetsRes.rows[0].total_fleets;

      // 3. Alerts Stats
      const alertsRes = await turso.execute({
        sql: 'SELECT count(*) as unresolved_alerts FROM alerts WHERE user_id = ? AND resolved = 0',
        args: [userId],
      });
      const unresolvedAlerts = alertsRes.rows[0].unresolved_alerts;

      return {
        total_agents: agentStats.total_agents || 0,
        total_fleets: totalFleets || 0,
        healthy: agentStats.healthy || 0,
        idle: agentStats.idle || 0,
        error: agentStats.error || 0,
        offline: agentStats.offline || 0,
        total_cost: agentStats.total_cost || 0,
        total_tasks: agentStats.total_tasks || 0,
        unresolved_alerts: unresolvedAlerts || 0,
      };
    } catch (e) {
      console.error('[Turso Adapter] getStats error:', e);
      return {
        total_agents: 0,
        total_fleets: 0,
        healthy: 0,
        idle: 0,
        error: 0,
        offline: 0,
        total_cost: 0,
        total_tasks: 0,
        unresolved_alerts: 0,
      };
    }
  },
};
