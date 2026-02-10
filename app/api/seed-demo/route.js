import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
} from '@/lib/policies';
import { checkRateLimit, getUser, json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const globalLimit = await checkRateLimit(request, ip, 'global');
  if (!globalLimit.allowed) return globalLimit.response;

  try {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let { data: fleets } = await supabaseAdmin.from('fleets').select('*').eq('user_id', user.id);
    let fleet;
    if (!fleets || fleets.length === 0) {
      fleet = {
        id: uuidv4(),
        user_id: user.id,
        name: 'Production Fleet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('fleets').insert(fleet);
    } else {
      fleet = fleets[0];
    }

    await supabaseAdmin.from('agents').delete().eq('user_id', user.id);
    await supabaseAdmin.from('alerts').delete().eq('user_id', user.id);

    const now = new Date();
    const demoAgents = [
      {
        name: 'alpha-coder',
        policy_profile: POLICY_DEV,
        gateway_url: 'http://192.168.1.100:8080',
        status: 'healthy',
        model: 'gpt-4',
        location: 'us-east-1',
        machine_id: 'droplet-alpha-001',
        metrics_json: {
          latency_ms: 120,
          tasks_completed: 847,
          errors_count: 3,
          uptime_hours: 720,
          cost_usd: 45.3,
          cpu_usage: 42,
          memory_usage: 58,
        },
        config_json: {
          profile: POLICY_DEV,
          skills: ['code', 'search', 'deploy'],
          model: 'gpt-4',
          data_scope: 'full',
        },
        last_heartbeat: new Date(now - 120000).toISOString(),
      },
      {
        name: 'beta-researcher',
        policy_profile: POLICY_OPS,
        gateway_url: 'http://10.0.1.50:8080',
        status: 'healthy',
        model: 'claude-3',
        location: 'eu-west-1',
        machine_id: 'droplet-beta-002',
        metrics_json: {
          latency_ms: 180,
          tasks_completed: 523,
          errors_count: 7,
          uptime_hours: 500,
          cost_usd: 32.15,
          cpu_usage: 35,
          memory_usage: 45,
        },
        config_json: {
          profile: POLICY_OPS,
          skills: ['search', 'analyze', 'report'],
          model: 'claude-3',
          data_scope: 'read-only',
        },
        last_heartbeat: new Date(now - 300000).toISOString(),
      },
      {
        name: 'gamma-deployer',
        policy_profile: POLICY_OPS,
        gateway_url: 'http://172.16.0.10:8080',
        status: 'idle',
        model: 'gpt-4',
        location: 'us-west-2',
        machine_id: 'droplet-gamma-003',
        metrics_json: {
          latency_ms: 95,
          tasks_completed: 312,
          errors_count: 1,
          uptime_hours: 360,
          cost_usd: 18.9,
          cpu_usage: 12,
          memory_usage: 30,
        },
        config_json: {
          profile: POLICY_OPS,
          skills: ['deploy', 'monitor', 'rollback'],
          model: 'gpt-4',
          data_scope: 'full',
        },
        last_heartbeat: new Date(now - 600000).toISOString(),
      },
      {
        name: 'delta-monitor',
        policy_profile: POLICY_EXEC,
        gateway_url: 'http://192.168.2.25:8080',
        status: 'error',
        model: 'gpt-3.5-turbo',
        location: 'ap-southeast-1',
        machine_id: 'droplet-delta-004',
        metrics_json: {
          latency_ms: 450,
          tasks_completed: 156,
          errors_count: 28,
          uptime_hours: 168,
          cost_usd: 8.75,
          cpu_usage: 89,
          memory_usage: 92,
        },
        config_json: {
          profile: POLICY_EXEC,
          skills: ['monitor', 'alert'],
          model: 'gpt-3.5-turbo',
          data_scope: 'summary-only',
        },
        last_heartbeat: new Date(now - 1800000).toISOString(),
      },
      {
        name: 'epsilon-analyst',
        policy_profile: POLICY_DEV,
        gateway_url: 'http://10.0.2.100:8080',
        status: 'offline',
        model: 'gpt-4',
        location: 'us-east-2',
        machine_id: 'droplet-epsilon-005',
        metrics_json: {
          latency_ms: 0,
          tasks_completed: 89,
          errors_count: 0,
          uptime_hours: 48,
          cost_usd: 5.2,
          cpu_usage: 0,
          memory_usage: 0,
        },
        config_json: {
          profile: POLICY_DEV,
          skills: ['analyze', 'report', 'visualize'],
          model: 'gpt-4',
          data_scope: 'full',
        },
        last_heartbeat: new Date(now - 7200000).toISOString(),
      },
    ];

    const agentDocs = demoAgents.map((a) => ({
      id: uuidv4(),
      fleet_id: fleet.id,
      user_id: user.id,
      ...a,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    await supabaseAdmin.from('agents').insert(agentDocs);

    const demoAlerts = [
      {
        agent_id: agentDocs[3].id,
        agent_name: 'delta-monitor',
        type: 'high-error',
        message: 'Error rate exceeded threshold: 28 errors in 24h',
        resolved: false,
      },
      {
        agent_id: agentDocs[4].id,
        agent_name: 'epsilon-analyst',
        type: 'downtime',
        message: 'Agent offline - no heartbeat for 2 hours',
        resolved: false,
      },
      {
        agent_id: agentDocs[0].id,
        agent_name: 'alpha-coder',
        type: 'high-latency',
        message: 'Avg latency exceeded 500ms for 5 minutes',
        resolved: true,
        resolved_at: new Date(now - 3600000).toISOString(),
      },
    ];
    const alertDocs = demoAlerts.map((a) => ({
      id: uuidv4(),
      user_id: user.id,
      ...a,
      created_at: new Date(now - Math.random() * 86400000).toISOString(),
    }));
    await supabaseAdmin.from('alerts').insert(alertDocs);

    // Seed metrics history for charts
    const metricsDocs = [];
    const historyHours = 24;

    agentDocs.forEach((agent) => {
      const baseLatency = agent.metrics_json?.latency_ms || 100;
      const baseErrors = agent.metrics_json?.errors_count || 0;
      const baseTasks = agent.metrics_json?.tasks_completed || 0;

      for (let i = 0; i < historyHours; i++) {
        const timeOffset = (historyHours - i) * 3600000;
        const timestamp = new Date(now - timeOffset).toISOString();
        const progress = (i + 1) / historyHours;

        metricsDocs.push({
          agent_id: agent.id,
          user_id: user.id,
          cpu_usage: Math.floor(Math.random() * 60) + 10,
          memory_usage: Math.floor(Math.random() * 50) + 20,
          latency_ms: Math.floor(Math.max(20, baseLatency + (Math.random() - 0.5) * 50)),
          uptime_hours: Math.floor((agent.metrics_json?.uptime_hours || 0) * progress),
          tasks_completed: Math.floor(baseTasks * progress),
          errors_count: Math.floor(baseErrors * progress),
          created_at: timestamp,
        });
      }
    });

    try {
      await supabaseAdmin.from('agent_metrics').delete().eq('user_id', user.id); // Clear old metrics
      await supabaseAdmin.from('agent_metrics').insert(metricsDocs);
    } catch (e) {
      console.error('Demo metrics seed error (table likely missing):', e);
    }

    return json({
      message: 'Demo data loaded',
      agents: agentDocs.length,
      alerts: alertDocs.length,
    });
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
