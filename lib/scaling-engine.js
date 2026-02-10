
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Predictive Scaling Engine
 * Analyzes fleet metrics and triggers scaling events based on latency thresholds.
 */
export async function runScalingCheck() {
    console.log('Running Predictive Scaling Check...');

    // 1. Fetch enabled fleets with scaling config
    const { data: fleets, error } = await supabaseAdmin
        .from('fleets')
        .select('*')
        .eq('scaling_enabled', true);

    if (error) {
        console.error('Scaling check failed:', error);
        return;
    }

    const results = [];

    for (const fleet of fleets) {
        try {
            // 2. Get active agents in this fleet
            const { data: agents } = await supabaseAdmin
                .from('agents')
                .select('id, status, metrics_json')
                .eq('fleet_id', fleet.id)
                .in('status', ['healthy', 'idle', 'busy']);

            const currentCount = agents.length;

            // Calculate Average Latency
            // We use the last reported metric from each agent
            let totalLatency = 0;
            let validAgents = 0;

            for (const agent of agents) {
                if (agent.metrics_json && agent.metrics_json.latency_ms) {
                    totalLatency += agent.metrics_json.latency_ms;
                    validAgents++;
                }
            }

            const avgLatency = validAgents > 0 ? totalLatency / validAgents : 0;
            const threshold = fleet.scale_up_threshold_ms || 500;

            // 3. Evaluate Scaling Rules
            // Rule 1: Scale Up if Latency High AND Count < Max
            if (avgLatency > threshold && currentCount < (fleet.max_instances || 5)) {
                await scaleUp(fleet, currentCount, avgLatency);
                results.push({ fleet: fleet.name, action: 'SCALE_UP', reason: `Latency ${avgLatency.toFixed(0)}ms > ${threshold}ms` });
            }
            // Rule 2: Scale Down if Latency Low AND Count > Min (and not 0)
            else if (avgLatency < (fleet.scale_down_threshold_ms || 200) && currentCount > (fleet.min_instances || 1)) {
                await scaleDown(fleet, currentCount, avgLatency);
                results.push({ fleet: fleet.name, action: 'SCALE_DOWN', reason: `Latency ${avgLatency.toFixed(0)}ms (Low Load)` });
            } else {
                results.push({ fleet: fleet.name, action: 'NONE', reason: 'Healthy' });
            }

        } catch (e) {
            console.error(`Error processing fleet ${fleet.id}:`, e);
        }
    }

    return results;
}

async function scaleUp(fleet, currentCount, latency) {
    // PROVISION NEW AGENT
    // In a real system, this calls AWS/K8s/DigitalOcean API.
    // Here, we simulate by creating a 'provisioning' agent record.

    const newAgentName = `${fleet.name}-auto-${Date.now().toString().slice(-4)}`;

    // 1. Create Agent Record
    const { data: newAgent, error } = await supabaseAdmin
        .from('agents')
        .insert({
            user_id: fleet.user_id,
            fleet_id: fleet.id,
            name: newAgentName,
            status: 'provisioning', // Special status
            model: 'claude-3-haiku', // Default to cheaper model for scale-out
            gateway_url: 'https://api.fleet.sh/v1/gateway', // Placeholder
            agent_secret: 'enc_' + Math.random().toString(36),
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to provision agent:', error);
        return;
    }

    // 2. Log Event
    await supabaseAdmin.from('scaling_events').insert({
        fleet_id: fleet.id,
        direction: 'UP',
        old_count: currentCount,
        new_count: currentCount + 1,
        reason: `Predictive Scale: Latency ${latency.toFixed(0)}ms exceeded threshold. Provisioning ${newAgentName}.`
    });

    console.log(`[SCALE UP] Provisioned ${newAgentName} for fleet ${fleet.name}`);
}

async function scaleDown(fleet, currentCount, latency) {
    // DEPROVISION AGENT
    // Find the oldest or idle agent to kill

    const { data: victim } = await supabaseAdmin
        .from('agents')
        .select('id, name')
        .eq('fleet_id', fleet.id)
        .neq('status', 'busy') // Don't kill busy agents
        .order('created_at', { ascending: false }) // LIFO or FIFO? Let's kill newest (scaler) first
        .limit(1)
        .single();

    if (!victim) return; // No eligible agents to kill

    // 1. Delete Agent
    await supabaseAdmin.from('agents').delete().eq('id', victim.id);

    // 2. Log Event
    await supabaseAdmin.from('scaling_events').insert({
        fleet_id: fleet.id,
        direction: 'DOWN',
        old_count: currentCount,
        new_count: currentCount - 1,
        reason: `Scale Down: Latency ${latency.toFixed(0)}ms is low. Terminating ${victim.name}.`
    });

    console.log(`[SCALE DOWN] Terminated ${victim.name} for fleet ${fleet.name}`);
}
