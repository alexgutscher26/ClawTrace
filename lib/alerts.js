import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Evaluates agent metrics and status against alert configurations
 * Triggers alerts if thresholds are exceeded.
 */
export async function processSmartAlerts(
  agentId,
  currentStatus,
  metrics = {},
  preloadedConfigs = null,
  agentName = null
) {
  try {
    // 1. Fetch alert configurations for this agent
    let configs = preloadedConfigs;

    if (!configs) {
      const { data, error } = await supabaseAdmin
        .from('alert_configs')
        .select('*, channel:alert_channels(*)')
        .eq('agent_id', agentId)
        .eq('channel.active', true);

      if (error) {
        console.error('Error fetching alert configs:', error);
        return;
      }
      configs = data;
    }

    if (!configs || configs.length === 0) return;

    for (const config of configs) {
      let triggered = false;
      let reason = '';
      let type = 'metric';

      // Check Cooldown
      if (config.last_triggered_at) {
        const lastTriggered = new Date(config.last_triggered_at);
        const cooldownMs = (config.cooldown_minutes || 60) * 60 * 1000;
        if (Date.now() - lastTriggered.getTime() < cooldownMs) {
          continue; // Still in cooldown
        }
      }

      // 2. Evaluate Status Alerts
      if (config.offline_alert && currentStatus === 'offline') {
        triggered = true;
        reason = 'Agent went offline';
        type = 'critical';
      } else if (config.error_alert && currentStatus === 'error') {
        triggered = true;
        reason = 'Agent reported an internal error';
        type = 'error';
      }

      // 3. Evaluate Metric Thresholds (if active)
      if (!triggered && currentStatus !== 'offline') {
        if (metrics.cpu_usage >= config.cpu_threshold) {
          triggered = true;
          reason = `CPU usage exceeded threshold: ${metrics.cpu_usage}% (limit: ${config.cpu_threshold}%)`;
        } else if (metrics.memory_usage >= config.mem_threshold) {
          triggered = true;
          reason = `Memory usage exceeded threshold: ${metrics.memory_usage}% (limit: ${config.mem_threshold}%)`;
        } else if (metrics.latency_ms >= config.latency_threshold) {
          triggered = true;
          reason = `Latency exceeded threshold: ${metrics.latency_ms}ms (limit: ${config.latency_threshold}ms)`;
        }
      }

      if (triggered) {
        await dispatchAlert(config, agentId, reason, type, metrics, agentName);
      }
    }
  } catch (err) {
    console.error('Error processing smart alerts:', err);
  }
}

async function dispatchAlert(config, agentId, reason, type, metrics, agentName = null) {
  try {
    // 1. Get Agent Name
    if (!agentName) {
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('name')
        .eq('id', agentId)
        .single();
      agentName = agent?.name;
    }

    agentName = agentName || 'Unknown Agent';

    // 2. Log Alert in DB
    await supabaseAdmin.from('alerts').insert({
      user_id: config.user_id,
      agent_id: agentId,
      agent_name: agentName,
      type: type,
      title: `Smart Alert: ${agentName}`,
      message: reason,
      metadata: { metrics, config_id: config.id, channel: config.channel.type },
    });

    // 3. Update cooldown
    await supabaseAdmin
      .from('alert_configs')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', config.id);

    // 4. Send to external channel
    const channel = config.channel;
    const alertBody = {
      title: `⚡ Fleet Alert: ${agentName}`,
      message: reason,
      agent_id: agentId,
      metrics: metrics,
      timestamp: new Date().toISOString(),
    };

    if (channel.type === 'slack') {
      await sendToSlack(channel.config.webhook_url, alertBody);
    } else if (channel.type === 'discord') {
      await sendToDiscord(channel.config.webhook_url, alertBody);
    } else if (channel.type === 'webhook') {
      await sendToWebhook(channel.config.webhook_url, alertBody);
    }
    // Email support coming soon...
  } catch (err) {
    console.error('Error dispatching alert:', err);
  }
}

async function sendToSlack(url, body) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      text: `*${body.title}*\n${body.message}\n_Metric snapshot: CPU ${body.metrics.cpu_usage || 0}%, MEM ${body.metrics.memory_usage || 0}%, LAT ${body.metrics.latency_ms || 0}ms_`,
    }),
  });
}

async function sendToDiscord(url, body) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: body.title,
          description: body.message,
          color: 0xff0000,
          fields: [
            { name: 'CPU', value: `${body.metrics.cpu_usage || 0}%`, inline: true },
            { name: 'Memory', value: `${body.metrics.memory_usage || 0}%`, inline: true },
            { name: 'Latency', value: `${body.metrics.latency_ms || 0}ms`, inline: true },
          ],
          footer: { text: 'ClawFleet Monitor' },
        },
      ],
    }),
  });
}

async function sendToWebhook(url, body) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
