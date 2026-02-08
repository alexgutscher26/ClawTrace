#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const https = require('https');
const http = require('http');

// ============ CLI ARGUMENT PARSER ============
function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      args[key.replace(/-/g, '_')] = rest.length > 0 ? rest.join('=') : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0], args };
}

// ============ SYSTEM METRICS COLLECTOR ============
function collectMetrics() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) totalTick += cpu.times[type];
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = Math.round(((totalTick - totalIdle) / totalTick) * 100);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

  return {
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    latency_ms: Math.round(Math.random() * 100 + 50), // simulated for now
    uptime_hours: Math.round(os.uptime() / 3600),
  };
}

// ============ HTTP REQUEST HELPER ============
function apiRequest(method, urlStr, payloadObj, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = payloadObj ? JSON.stringify(payloadObj) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function postHandshake(saasUrl, agentId, agentSecret) {
  return apiRequest('POST', `${saasUrl}/api/agents/handshake`, {
    agent_id: agentId,
    agent_secret: agentSecret,
  });
}

function postHeartbeat(saasUrl, agentId, status, metrics, token) {
  return apiRequest('POST', `${saasUrl}/api/heartbeat`, {
    agent_id: agentId,
    status: status,
    metrics: metrics,
  }, token);
}

// ============ DISPLAY HELPERS ============
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
};

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`${COLORS.dim}[${time}]${COLORS.reset} ${msg}`);
}

/**
 * Prints a banner for the Fleet Monitor.
 */
function printBanner() {
  console.log(`
${COLORS.green}${COLORS.bold}  ⚡ Fleet Monitor${COLORS.reset}`);
  console.log(`${COLORS.dim}  ─────────────────────────────${COLORS.reset}`);
}

function printStatus(metrics) {
  console.log(`  ${COLORS.cyan}CPU${COLORS.reset}    ${metrics.cpu_usage}%`);
  console.log(`  ${COLORS.magenta}MEM${COLORS.reset}    ${metrics.memory_usage}%`);
  console.log(`  ${COLORS.yellow}LAT${COLORS.reset}    ${metrics.latency_ms}ms`);
  console.log(`  ${COLORS.dim}UPTIME ${metrics.uptime_hours}h${COLORS.reset}`);
  console.log();
}

// ============ COMMANDS ============

/**
 * Monitors the agent's status and sends heartbeat signals to the specified SaaS URL.
 *
 * This function initializes a session with the SaaS service by performing a handshake using the provided agent credentials.
 * It then enters a loop to send heartbeat signals at a specified interval, handling session expiration and connection errors gracefully.
 * If required parameters are missing, it logs an error and exits the process.
 *
 * @param args - An object containing the parameters for the monitoring process, including:
 *   - saas_url: The URL of the SaaS service (required).
 *   - agent_id: The UUID of the agent (required).
 *   - agent_secret: The secret for the agent (required).
 *   - interval: The heartbeat interval in seconds (optional, defaults to 300).
 *   - status: The status of the agent (optional, defaults to 'healthy').
 */
async function monitorCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const agentSecret = args.agent_secret;
  const interval = parseInt(args.interval || '300', 10); // default 5 min (300s)
  const status = args.status || 'healthy';

  let sessionToken = null;

  if (!saasUrl || !agentId || !agentSecret) {
    console.error(`${COLORS.red}Error: --saas-url, --agent-id, and --agent-secret are required${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  fleet-monitor monitor --saas-url=https://your-app.com --agent-id=<UUID> --agent-secret=<SECRET>`);
    console.log(`\nOptions:`);
    console.log(`  --saas-url     Your Fleet SaaS URL (required)`);
    console.log(`  --agent-id     Agent UUID from your dashboard (required)`);
    console.log(`  --agent-secret Agent Secret from your dashboard (required)`);
    console.log(`  --interval     Heartbeat interval in seconds (default: 300)`);
    console.log(`  --status       Agent status: healthy, idle, error (default: healthy)`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Starting monitor for agent ${COLORS.bold}${agentId}${COLORS.reset}`);
  log(`${COLORS.dim}SaaS URL: ${saasUrl}${COLORS.reset}`);
  log(`${COLORS.dim}Interval: ${interval}s${COLORS.reset}`);
  console.log();

  async function performHandshake() {
    log(`${COLORS.yellow}Performing secret handshake...${COLORS.reset}`);
    try {
      const result = await postHandshake(saasUrl, agentId, agentSecret);
      if (result.status === 200 && result.body.token) {
        sessionToken = result.body.token;
        log(`${COLORS.green}✓ Handshake successful (Session token received)${COLORS.reset}`);
        return true;
      } else {
        log(`${COLORS.red}✗ Handshake failed (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
        return false;
      }
    } catch (err) {
      log(`${COLORS.red}✗ Handshake connection error: ${err.message}${COLORS.reset}`);
      return false;
    }
  }

  async function sendHeartbeat() {
    if (!sessionToken) {
      const ok = await performHandshake();
      if (!ok) return;
    }

    const metrics = collectMetrics();
    try {
      const result = await postHeartbeat(saasUrl, agentId, status, metrics, sessionToken);
      if (result.status === 200) {
        log(`${COLORS.green}✓ Heartbeat sent${COLORS.reset}`);
        printStatus(metrics);
      } else if (result.status === 401) {
        log(`${COLORS.yellow}! Session expired, retrying handshake...${COLORS.reset}`);
        sessionToken = null;
        await sendHeartbeat(); // recursive retry once
      } else {
        log(`${COLORS.red}✗ Heartbeat failed (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
      }
    } catch (err) {
      log(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    }
  }

  // Initial handshake and start loop
  const initialized = await performHandshake();
  if (initialized) {
    await sendHeartbeat();
    setInterval(sendHeartbeat, interval * 1000);
    log(`${COLORS.dim}Press Ctrl+C to stop${COLORS.reset}`);
  } else {
    log(`${COLORS.red}Fatal: Failed to initialize agent session. Exiting.${COLORS.reset}`);
    process.exit(1);
  }
}

function statusCommand(args) {
  printBanner();
  const metrics = collectMetrics();
  console.log(`\n  ${COLORS.bold}System Status${COLORS.reset}`);
  console.log(`  ${COLORS.dim}────────────────${COLORS.reset}`);
  printStatus(metrics);
  console.log(`  ${COLORS.dim}Hostname:  ${os.hostname()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Platform:  ${os.platform()} ${os.arch()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Node:      ${process.version}${COLORS.reset}`);
  console.log();
}

/**
 * Handles configuration commands based on the provided subcommand.
 *
 * This function checks the subcommand from the args object. If the subcommand is 'push', it calls the configPushCommand function to handle the push operation. If the subcommand is unknown, it logs an error message and displays usage instructions before exiting the process.
 *
 * @param {Object} args - The arguments object containing the subcommand and other parameters.
 */
async function configCommand(args) {
  const subcommand = args._subcommand || args.subcommand;

  if (subcommand === 'push') {
    await configPushCommand(args);
  } else {
    console.error(`${COLORS.red}Unknown config subcommand: ${subcommand || '(none)'}${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  fleet-monitor config push --agent-id=<UUID> --saas-url=<URL> [--config=<JSON> | --config-file=<PATH>]`);
    console.log(`\nExample:`);
    console.log(`  fleet-monitor config push --agent-id=... --config-file=./config.json`);
    process.exit(1);
  }
}

async function configPushCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const agentSecret = args.agent_secret;

  // Config sources
  const configJson = args.config;
  const configFile = args.config_file;

  // Individual flags
  const flagModel = args.model;
  const flagSkills = args.skills;
  const flagProfile = args.profile;
  const flagDataScope = args.data_scope || args.dataScope; // handle snake_case or camelCase arg parsing

  if (!saasUrl || !agentId) {
    console.error(`${COLORS.red}Error: --saas-url and --agent-id are required${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  fleet-monitor config push --agent-id=<UUID> --saas-url=<URL> --agent-secret=<SECRET> [options]`);
    console.log(`\nOptions:`);
    console.log(`  --saas-url      Your Fleet SaaS URL (required)`);
    console.log(`  --agent-id      Agent UUID from your dashboard (required)`);
    console.log(`  --agent-secret  Agent Secret for authentication (required)`);
    console.log(`\nConfiguration Options (choose one method):`);
    console.log(`  1. Individual Flags (Recommended):`);
    console.log(`     --model <name>       e.g. claude-sonnet-4`);
    console.log(`     --skills <list>      Comma-separated, e.g. code,search`);
    console.log(`     --profile <name>     e.g. dev, prod`);
    console.log(`     --data-scope <scope> e.g. full, read-only`);
    console.log(`\n  2. File:`);
    console.log(`     --config-file <path> Path to JSON config file`);
    console.log(`\n  3. JSON String:`);
    console.log(`     --config <json>      Raw JSON string`);
    console.log(`\nExample:`);
    console.log(`  fleet-monitor config push --agent-id=... --model=claude-sonnet-4 --skills=code,search`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Pushing configuration for agent ${COLORS.bold}${agentId}${COLORS.reset}`);
  console.log();

  let config = {};

  // Priority 1: Config File
  if (configFile) {
    try {
      const fileContent = fs.readFileSync(configFile, 'utf8');
      config = JSON.parse(fileContent);
      log(`${COLORS.green}Loaded configuration from ${configFile}${COLORS.reset}`);
    } catch (err) {
      console.error(`${COLORS.red}Error: Failed to read or parse config file${COLORS.reset}`);
      console.error(err.message);
      process.exit(1);
    }
  }
  // Priority 2: JSON String
  else if (configJson) {
    try {
      config = JSON.parse(configJson);
    } catch (err) {
      console.error(`${COLORS.red}Error: Invalid JSON in --config${COLORS.reset}`);
      console.error(err.message);
      process.exit(1);
    }
  }
  // Priority 3: Individual Flags (Merged into default or creating new)
  else if (flagModel || flagSkills || flagProfile || flagDataScope) {
    // If we have flags, we start with what's provided
    if (flagModel) config.model = flagModel;
    if (flagProfile) config.profile = flagProfile;
    if (flagDataScope) config.data_scope = flagDataScope;

    if (flagSkills) {
      config.skills = typeof flagSkills === 'string' ? flagSkills.split(',').map(s => s.trim()) : flagSkills;
    }
  }
  // Priority 4: Default Fallback
  else {
    console.log(`${COLORS.yellow}No configuration provided. Using default template.${COLORS.reset}`);
    config = {
      model: 'gpt-4',
      skills: ['code', 'search'],
      profile: 'dev',
      data_scope: 'full'
    };
  }

  console.log(`${COLORS.cyan}Configuration to push:${COLORS.reset}`);
  console.log(JSON.stringify(config, null, 2));
  console.log();

  // Perform handshake first
  log(`${COLORS.yellow}Authenticating...${COLORS.reset}`);
  let sessionToken = null;
  try {
    const handshakeResult = await postHandshake(saasUrl, agentId, agentSecret);
    if (handshakeResult.status === 200 && handshakeResult.body.token) {
      sessionToken = handshakeResult.body.token;
      log(`${COLORS.green}✓ Authentication successful${COLORS.reset}`);
    } else {
      console.error(`${COLORS.red}✗ Authentication failed (${handshakeResult.status}): ${JSON.stringify(handshakeResult.body)}${COLORS.reset}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }

  // Push config
  log(`${COLORS.yellow}Pushing configuration...${COLORS.reset}`);
  try {
    const result = await apiRequest('PUT', `${saasUrl}/api/agents/${agentId}`, {
      config_json: config
    }, sessionToken);

    if (result.status === 200) {
      log(`${COLORS.green}✓ Configuration pushed successfully!${COLORS.reset}`);
      console.log();
      console.log(`${COLORS.dim}Updated configuration:${COLORS.reset}`);
      console.log(JSON.stringify(result.body.agent.config_json, null, 2));
    } else {
      console.error(`${COLORS.red}✗ Failed to push configuration (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }
}

function helpCommand() {
  printBanner();
  console.log(`
  ${COLORS.bold}Commands:${COLORS.reset}`);
  console.log(`    ${COLORS.green}monitor${COLORS.reset}    Start sending heartbeats to your Fleet dashboard`);
  console.log(`    ${COLORS.green}config${COLORS.reset}     Manage agent configuration`);
  console.log(`    ${COLORS.green}status${COLORS.reset}     Show local system metrics`);
  console.log(`    ${COLORS.green}help${COLORS.reset}       Show this help message`);
  console.log(`
  ${COLORS.bold}Monitor Usage:${COLORS.reset}`);
  console.log(`  fleet-monitor monitor --saas-url=https://your-app.com --agent-id=<UUID> --agent-secret=<SECRET>`);
  console.log(`
  ${COLORS.bold}Config Usage:${COLORS.reset}`);
  console.log(`  fleet-monitor config push --agent-id=<UUID> --saas-url=<URL> --agent-secret=<SECRET> [options]`);
  console.log(`
  ${COLORS.bold}Options:${COLORS.reset}`);
  console.log(`    --saas-url     Your Fleet SaaS URL ${COLORS.red}(required)${COLORS.reset}`);
  console.log(`    --agent-id     Agent UUID from dashboard ${COLORS.red}(required)${COLORS.reset}`);
  console.log(`    --agent-secret Agent Secret from dashboard ${COLORS.red}(required)${COLORS.reset}`);
  console.log(`    --interval     Heartbeat interval in seconds (default: 300)`);
  console.log(`    --status       Agent status to report (default: healthy)`);
  console.log(`    --model        AI Model (e.g. claude-sonnet-4)`);
  console.log(`    --skills       Comma-separated skills (e.g. code,search)`);
  console.log(`    --config-file  Path to JSON configuration file`);
  console.log(`
  ${COLORS.bold}Examples:${COLORS.reset}`);
  console.log(`    ${COLORS.dim}# Start monitoring with 5-minute heartbeat${COLORS.reset}`);
  console.log(`    fleet-monitor monitor --saas-url=https://fleet-monitor.dev --agent-id=abc-123 --agent-secret=secret-123`);
  console.log(``);
  console.log(`    ${COLORS.dim}# Push configuration${COLORS.reset}`);
  console.log(`    fleet-monitor config push --agent-id=abc-123 --saas-url=https://fleet-monitor.dev --agent-secret=secret-123 --config='{"model":"claude-sonnet-4"}'`);
  console.log(``);
  console.log(`    ${COLORS.dim}# Check local system status${COLORS.reset}`);
  console.log(`    fleet-monitor status`);
  console.log();
}

// ============ MAIN ============
const { command, args } = parseArgs(process.argv);

// Handle subcommands for 'config'
if (command === 'config' && process.argv[3]) {
  args._subcommand = process.argv[3];
}

switch (command) {
  case 'monitor':
    monitorCommand(args);
    break;
  case 'config':
    configCommand(args);
    break;
  case 'status':
    statusCommand(args);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    helpCommand();
    break;
  default:
    console.error(`${COLORS.red}Unknown command: ${command}${COLORS.reset}`);
    helpCommand();
    process.exit(1);
}
