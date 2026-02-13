import { turso } from './turso';
import { supabase } from './supabase';

/**
 * Direct Turso logic for high-performance agent operations
 */
export const agentDb = {
    /**
     * Update agent heartbeat and status
     */
    async updateHeartbeat(agentId, status) {
        const now = new Date().toISOString();
        return await turso.execute({
            sql: 'UPDATE agents SET last_heartbeat = ?, status = ?, updated_at = ? WHERE id = ?',
            args: [now, status, now, agentId]
        });
    },

    /**
     * Log telemetry metrics
     */
    async logMetrics(agentId, userId, metrics) {
        return await turso.execute({
            sql: `INSERT INTO agent_metrics 
            (id, agent_id, user_id, cpu_usage, memory_usage, latency_ms, uptime_hours, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                crypto.randomUUID(),
                agentId,
                userId,
                metrics.cpu || 0,
                metrics.mem || 0,
                metrics.latency || 0,
                metrics.uptime || 0,
                new Date().toISOString()
            ]
        });
    }
};
