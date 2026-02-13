import { turso } from './turso';

/**
 * Adapter to fetch data from Turso using a similar interface to Supabase
 * (Simplified for our specific use cases)
 */
export const tursoAdapter = {
    async getAgents(userId, limit = 50, offset = 0) {
        const res = await turso.execute({
            sql: 'SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            args: [userId, limit, offset]
        });
        return res.rows;
    },

    async getFleets(userId) {
        const res = await turso.execute({
            sql: 'SELECT * FROM fleets WHERE user_id = ?',
            args: [userId]
        });
        return res.rows;
    },

    async getMetrics(agentId) {
        const res = await turso.execute({
            sql: 'SELECT * FROM agent_metrics WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50',
            args: [agentId]
        });
        return res.rows;
    },

    async getStats(userId) {
        const agents = await turso.execute({
            sql: 'SELECT count(*) as count, status FROM agents WHERE user_id = ? GROUP BY status',
            args: [userId]
        });
        const metrics = await turso.execute({
            sql: 'SELECT avg(cpu_usage) as cpu, avg(memory_usage) as mem FROM agent_metrics WHERE user_id = ?',
            args: [userId]
        });
        return {
            agents: agents.rows,
            metrics: metrics.rows[0]
        };
    }
};
