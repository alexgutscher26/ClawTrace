import { turso, generateId } from './turso.js';

/**
 * Evaluates agent metrics and status against alert configurations and triggers alerts if thresholds are exceeded.
 *
 * This function fetches alert configurations for a given agent from Turso, checks if the agent is in a cooldown period,
 * evaluates the current status and metrics against the defined thresholds, and dispatches alerts if necessary.
 * It handles both agent-specific and fleet-wide configurations, ensuring that alerts are triggered appropriately
 * based on the agent's current state and historical alert data.
 *
 * @param agentId - The unique identifier of the agent.
 * @param currentStatus - The current status of the agent (e.g., 'offline', 'error').
 * @param metrics - An object containing the current metrics of the agent (default is an empty object).
 * @param preloadedConfigs - Optional preloaded alert configurations for the agent (default is null).
 * @param agentName - Optional name of the agent (default is null).
 */
export async function processSmartAlerts(
  agentId,
  currentStatus,
  metrics = {},
  preloadedConfigs = null,
  agentName = null
) {
  try {
    // 1. Fetch alert configurations for this agent from Turso
    let configs = preloadedConfigs;

    if (!configs) {
      // Fetch configs from Turso
      const res = await turso.execute({
        sql: 'SELECT * FROM alert_configs WHERE agent_id = ?',
        args: [agentId],
      });

      const rawConfigs = res.rows;
      if (rawConfigs.length === 0) return;

      // We need to fetch the channels from Turso to check if they are active
      // and to get the webhook URLs.
      const channelIds = [...new Set(rawConfigs.map((c) => c.channel_id))];

      if (channelIds.length > 0) {
        // Construct placeholders for IN clause
        const placeholders = channelIds.map(() => '?').join(',');

        try {
          const channelsRes = await turso.execute({
            sql: `SELECT * FROM alert_channels WHERE id IN (${placeholders}) AND active = 1`,
            args: channelIds,
          });

          const channels = channelsRes.rows;

          // Map channels to configs
          configs = rawConfigs
            .map((c) => {
              const channel = channels.find((ch) => ch.id === c.channel_id);
              if (!channel) return null;
              return { ...c, channel };
            })
            .filter((c) => c !== null);
        } catch (e) {
          console.error('Error fetching alert channels from Turso:', e);
          return;
        }
      } else {
        configs = [];
      }
    }

    if (!configs || configs.length === 0) return;

    for (const config of configs) {
      let triggered = false;
      let reason = '';
      let type = 'metric';

      const cooldownMs = (config.cooldown_minutes || 60) * 60 * 1000;

      // Squelch / Cooldown Logic
      let inCooldown = false;

      // If it's a specific agent config, we can trust last_triggered_at
      if (config.agent_id && config.last_triggered_at) {
        const lastTriggered = new Date(config.last_triggered_at);
        if (Date.now() - lastTriggered.getTime() < cooldownMs) {
          inCooldown = true;
        }
      }
      // If it's a fleet-wide config, we must check alert history for THIS agent to avoid squelching others
      else if (config.fleet_id) {
        // Check recent alerts for this agent + config combo in Turso
        const timeAgo = new Date(Date.now() - cooldownMs).toISOString();
        const res = await turso.execute({
          sql: `SELECT count(*) as count FROM alerts 
                WHERE agent_id = ? 
                AND metadata LIKE ? 
                AND created_at > ?`,
          args: [agentId, `%"config_id":"${config.id}"%`, timeAgo],
        });

        if (res.rows[0].count > 0) inCooldown = true;
      }

      if (inCooldown) continue;

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
        const reasons = [];

        if (metrics.cpu_usage >= config.cpu_threshold) {
          reasons.push(
            `CPU usage exceeded threshold: ${metrics.cpu_usage}% (limit: ${config.cpu_threshold}%)`
          );
        }
        if (metrics.memory_usage >= config.mem_threshold) {
          reasons.push(
            `Memory usage exceeded threshold: ${metrics.memory_usage}% (limit: ${config.mem_threshold}%)`
          );
        }
        if (metrics.latency_ms >= config.latency_threshold) {
          reasons.push(
            `Latency exceeded threshold: ${metrics.latency_ms}ms (limit: ${config.latency_threshold}ms)`
          );
        }

        if (reasons.length > 0) {
          triggered = true;
          reason = reasons.join('\n');
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

/**
 * Dispatch an alert based on the provided configuration and agent details.
 */
async function dispatchAlert(config, agentId, reason, type, metrics, agentName = null) {
  try {
    // 1. Get Agent Name from Turso if not provided
    if (!agentName) {
      const res = await turso.execute({
        sql: 'SELECT name FROM agents WHERE id = ?',
        args: [agentId],
      });
      if (res.rows.length > 0) {
        agentName = res.rows[0].name;
      }
    }

    agentName = agentName || 'Unknown Agent';

    // 2. Log Alert in Turso
    const alertId = generateId();
    await turso.execute({
      sql: `INSERT INTO alerts (id, user_id, agent_id, agent_name, type, title, message, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        alertId,
        config.user_id,
        agentId,
        agentName,
        type,
        `Smart Alert: ${agentName}`,
        reason,
        JSON.stringify({ metrics, config_id: config.id, channel: config.channel.type }),
        new Date().toISOString(),
      ],
    });

    // 3. Update global cooldown only if it's an agent-specific config in Turso
    if (config.agent_id) {
      await turso.execute({
        sql: 'UPDATE alert_configs SET last_triggered_at = ? WHERE id = ?',
        args: [new Date().toISOString(), config.id],
      });
    }

    // 4. Send to external channel
    const channel = config.channel;
    const alertBody = {
      title: `⚡ ClawTrace Alert: ${agentName}`,
      message: reason,
      agent_id: agentId,
      metrics: metrics,
      timestamp: new Date().toISOString(),
      link: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/agents/${agentId}`,
      severity: type,
    };

    if (channel.type === 'slack') {
      await sendToSlack(channel.config.webhook_url, alertBody);
    } else if (channel.type === 'discord') {
      await sendToDiscord(channel.config.webhook_url, alertBody);
    } else if (channel.type === 'webhook') {
      await sendToWebhook(channel.config.webhook_url, alertBody);
    }
  } catch (err) {
    console.error('Error dispatching alert:', err);
  }
}

/**
 * Sends a message to a Slack channel.
 */
async function sendToSlack(url, body) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      text: `*${body.title}*\n${body.message}\n_Metric snapshot: CPU ${body.metrics.cpu_usage || 0}%, MEM ${body.metrics.memory_usage || 0}%, LAT ${body.metrics.latency_ms || 0}ms_\n<${body.link}|View Agent>`,
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
          footer: { text: 'ClawTrace Monitor' },
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
