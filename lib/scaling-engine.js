import { turso, generateId } from '@/lib/turso';

/**
 * Predictive Scaling Engine
 *
 * Analyzes fleet metrics and triggers scaling events based on latency thresholds. It fetches enabled fleets, retrieves active agents for each fleet, calculates average latency, and evaluates scaling rules to determine whether to scale up or down based on defined thresholds. The results of the scaling actions are collected and returned.
 *
 * @returns An array of results indicating the scaling actions taken for each fleet.
 */
export async function runScalingCheck() {
  console.log('Running Predictive Scaling Check...');

  // 1. Fetch enabled fleets with scaling config from Turso
  let fleets = [];
  try {
    const res = await turso.execute({
      sql: 'SELECT * FROM fleets WHERE scaling_enabled = 1',
      args: []
    });
    fleets = res.rows;
  } catch (error) {
    console.error('Scaling check failed (Turso fetch):', error);
    return;
  }

  const results = [];

  for (const fleet of fleets) {
    try {
      // 2. Get active agents in this fleet from Turso
      const agentsRes = await turso.execute({
        sql: `SELECT id, status, metrics_json FROM agents 
              WHERE fleet_id = ? 
              AND status IN ('healthy', 'idle', 'busy')`,
        args: [fleet.id]
      });
      const agents = agentsRes.rows;

      const currentCount = agents.length;

      // Calculate Average Latency
      // We use the last reported metric from each agent
      let totalLatency = 0;
      let validAgents = 0;

      for (const agent of agents) {
        // Parse metrics_json if it's a string (Turso stores JSON as string)
        let metrics = agent.metrics_json;
        if (typeof metrics === 'string') {
          try {
            metrics = JSON.parse(metrics);
          } catch (e) {
            metrics = {};
          }
        }
        
        if (metrics && metrics.latency_ms) {
          totalLatency += metrics.latency_ms;
          validAgents++;
        }
      }

      const avgLatency = validAgents > 0 ? totalLatency / validAgents : 0;
      const threshold = fleet.scale_up_threshold_ms || 500;

      // 3. Evaluate Scaling Rules
      // Rule 1: Scale Up if Latency High AND Count < Max
      if (avgLatency > threshold && currentCount < (fleet.max_instances || 5)) {
        await scaleUp(fleet, currentCount, avgLatency);
        results.push({
          fleet: fleet.name,
          action: 'SCALE_UP',
          reason: `Latency ${avgLatency.toFixed(0)}ms > ${threshold}ms`,
        });
      }
      // Rule 2: Scale Down if Latency Low AND Count > Min (and not 0)
      else if (
        avgLatency < (fleet.scale_down_threshold_ms || 200) &&
        currentCount > (fleet.min_instances || 1)
      ) {
        await scaleDown(fleet, currentCount, avgLatency);
        results.push({
          fleet: fleet.name,
          action: 'SCALE_DOWN',
          reason: `Latency ${avgLatency.toFixed(0)}ms (Low Load)`,
        });
      } else {
        results.push({ fleet: fleet.name, action: 'NONE', reason: 'Healthy' });
      }
    } catch (e) {
      console.error(`Error processing fleet ${fleet.id}:`, e);
    }
  }

  return results;
}

/**
 * Provisions a new agent for a given fleet and logs the scaling event.
 */
async function scaleUp(fleet, currentCount, latency) {
  // PROVISION NEW AGENT
  // In a real system, this calls AWS/K8s/DigitalOcean API.
  // Here, we simulate by creating a 'provisioning' agent record.

  const newAgentName = `${fleet.name}-auto-${Date.now().toString().slice(-4)}`;
  const agentId = generateId();
  const agentSecret = 'enc_' + Math.random().toString(36);

  // 1. Create Agent Record in Turso
  try {
      await turso.execute({
          sql: `INSERT INTO agents (id, user_id, fleet_id, name, status, model, gateway_url, agent_secret, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
              agentId,
              fleet.user_id,
              fleet.id,
              newAgentName,
              'provisioning',
              'claude-3-haiku', // Default to cheaper model for scale-out
              'https://api.clawtrace.dev/v1/gateway', // Placeholder
              agentSecret,
              new Date().toISOString(),
              new Date().toISOString()
          ]
      });
  } catch (error) {
    console.error('Failed to provision agent in Turso:', error);
    return;
  }

  // 2. Log Event in Turso
  try {
      await turso.execute({
          sql: `INSERT INTO scaling_events (id, fleet_id, direction, old_count, new_count, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
              generateId(),
              fleet.id,
              'UP',
              currentCount,
              currentCount + 1,
              `Predictive Scale: Latency ${latency.toFixed(0)}ms exceeded threshold. Provisioning ${newAgentName}.`,
              new Date().toISOString()
          ]
      });
  } catch (error) {
      console.error('Failed to log scaling event in Turso:', error);
  }

  console.log(`[SCALE UP] Provisioned ${newAgentName} for fleet ${fleet.name}`);
}

/**
 * Scales down the number of agents in a fleet by terminating the oldest or idle agent.
 */
async function scaleDown(fleet, currentCount, latency) {
  // DEPROVISION AGENT
  // Find the oldest or idle agent to kill

  let victim = null;
  try {
      const res = await turso.execute({
          sql: `SELECT id, name FROM agents 
                WHERE fleet_id = ? 
                AND status != 'busy' 
                ORDER BY created_at DESC 
                LIMIT 1`,
          args: [fleet.id]
      });
      if (res.rows.length > 0) {
          victim = res.rows[0];
      }
  } catch (e) {
      console.error('Failed to find victim agent in Turso:', e);
      return;
  }

  if (!victim) return; // No eligible agents to kill

  // 1. Delete Agent from Turso
  try {
      await turso.execute({
          sql: 'DELETE FROM agents WHERE id = ?',
          args: [victim.id]
      });
  } catch (e) {
      console.error('Failed to delete agent from Turso:', e);
      return;
  }

  // 2. Log Event in Turso
  try {
      await turso.execute({
          sql: `INSERT INTO scaling_events (id, fleet_id, direction, old_count, new_count, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
              generateId(),
              fleet.id,
              'DOWN',
              currentCount,
              currentCount - 1,
              `Scale Down: Latency ${latency.toFixed(0)}ms is low. Terminating ${victim.name}.`,
              new Date().toISOString()
          ]
      });
  } catch (e) {
      console.error('Failed to log scaling event in Turso:', e);
  }

  console.log(`[SCALE DOWN] Terminated ${victim.name} for fleet ${fleet.name}`);
}
