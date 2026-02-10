import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Evaluates agent metrics and status against alert configurations and triggers alerts if thresholds are exceeded.
 *
 * This function fetches alert configurations for a given agent, checks if the agent is in a cooldown period,
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
    // 1. Fetch alert configurations for this agent
    let configs = preloadedConfigs;

    // Fix: If preloadedConfigs is an empty array but we didn't explicitly check for it in the caller,
    // it might mean "not loaded" depending on logic.
    // However, usually we pass null if not loaded.
    // If it's [], it means we loaded it and found nothing.
    // The issue in route.js is it defaults to [] if undefined.
    // We'll treat [] as "valid empty list" but we need to ensure route.js passes null if it didn't fetch.
    // For safety here, if it is null/undefined we fetch.
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

      // Also fetch fleet-level configs if not found or in addition
      // We need agent's fleet_id to do this properly.
      // Assuming agentId is passed, we might need to look up fleet_id if we don't have it.
      // For now, we rely on the direct agent_id match or the caller passing the right configs.
      configs = data;
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
        // Check recent alerts for this agent + config combo
        const timeAgo = new Date(Date.now() - cooldownMs).toISOString();
        const { count } = await supabaseAdmin
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .contains('metadata', { config_id: config.id })
          .gt('created_at', timeAgo);

        if (count > 0) inCooldown = true;
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
 *
 * This asynchronous function retrieves the agent's name if not provided, logs the alert in the database, updates the global cooldown for agent-specific configurations, and sends the alert to the appropriate external channel (Slack, Discord, webhook, or email). It handles errors during the process and logs them for debugging purposes.
 *
 * @param config - The configuration object containing user and channel details.
 * @param agentId - The unique identifier of the agent.
 * @param reason - The reason for dispatching the alert.
 * @param type - The type of alert being dispatched.
 * @param metrics - The metrics associated with the alert.
 * @param [agentName=null] - The name of the agent; defaults to null.
 */
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

    // 3. Update global cooldown only if it's an agent-specific config
    if (config.agent_id) {
      await supabaseAdmin
        .from('alert_configs')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', config.id);
    }

    // 4. Send to external channel
    const channel = config.channel;
    const alertBody = {
      title: `⚡ Fleet Alert: ${agentName}`,
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
    // else if (channel.type === 'email') {
    //   // Placeholder for email service (e.g. Resend/SendGrid)
    //   console.log('Skipping email alert (not configured)');
    // }
  } catch (err) {
    console.error('Error dispatching alert:', err);
  }
}

/**
 * Sends a message to a Slack channel.
 *
 * This function checks if the provided URL is valid before making a POST request to the Slack API.
 * It sends a JSON payload containing a formatted message with the title, message, and metrics such as
 * CPU usage, memory usage, and latency. If the URL is not provided, the function exits early without
 * making a request.
 *
 * @param {string} url - The Slack webhook URL to send the message to.
 * @param {Object} body - The message body containing title, message, metrics, and link.
 * @param {string} body.title - The title of the message.
 * @param {string} body.message - The main content of the message.
 * @param {Object} body.metrics - The performance metrics.
 * @param {number} body.metrics.cpu_usage - The CPU usage percentage.
 * @param {number} body.metrics.memory_usage - The memory usage percentage.
 * @param {number} body.metrics.latency_ms - The latency in milliseconds.
 * @param {string} body.link - The link to view the agent.
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
