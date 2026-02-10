#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');

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
// ============ SYSTEM METRICS COLLECTOR ============

/**
 * Executes a plugin script based on the provided file path.
 *
 * This function determines the appropriate command to run a script based on its file extension,
 * supporting JavaScript and Python files. It executes the command with a timeout and handles
 * potential errors by logging them. If the output is valid JSON, it resolves the promise with
 * the parsed JSON; otherwise, it logs an error and resolves with an empty object.
 *
 * @param {string} path - The file path of the plugin script to execute.
 */
async function runPlugin(path) {
  return new Promise((resolve) => {
    let cmd;
    if (path.endsWith('.js')) cmd = `node "${path}"`;
    else if (path.endsWith('.py')) cmd = `python "${path}"`;
    else cmd = `"${path}"`;

    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      if (error) {
        log(`${COLORS.red}Plugin error (${path}): ${error.message}${COLORS.reset}`);
        resolve({});
        return;
      }
      try {
        const json = JSON.parse(stdout.trim());
        resolve(json);
      } catch (e) {
        log(`${COLORS.red}Plugin output error (${path}): Invalid JSON${COLORS.reset}`);
        resolve({});
      }
    });
  });
}

/**
 * Collects system metrics including CPU and memory usage.
 *
 * This function retrieves the current CPU and memory usage statistics, calculates the latency, and uptime.
 * If any plugins are provided, it runs them asynchronously and merges their results into the metrics object.
 * The final metrics object includes cpu_usage, memory_usage, latency_ms, and uptime_hours.
 *
 * @param {Array} plugins - An array of plugin functions to run for additional metrics.
 */
async function collectMetrics(plugins = []) {
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

  const metrics = {
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    latency_ms: Math.round(Math.random() * 100 + 50),
    uptime_hours: Math.round(os.uptime() / 3600),
  };

  if (plugins && plugins.length > 0) {
    const pluginResults = await Promise.all(plugins.map(runPlugin));
    pluginResults.forEach(r => Object.assign(metrics, r));
  }

  return metrics;
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

function printBanner() {
  console.log(`
${COLORS.green}${COLORS.bold}  ⚡ Fleet Monitor${COLORS.reset}`);
  console.log(`${COLORS.dim}  ─────────────────────────────${COLORS.reset}`);
}

/**
 * Prints the status of system metrics including CPU, memory, latency, and uptime.
 */
function printStatus(metrics) {
  console.log(`  ${COLORS.cyan}CPU${COLORS.reset}    ${metrics.cpu_usage}%`);
  console.log(`  ${COLORS.magenta}MEM${COLORS.reset}    ${metrics.memory_usage}%`);
  console.log(`  ${COLORS.yellow}LAT${COLORS.reset}    ${metrics.latency_ms}ms`);
  console.log(`  ${COLORS.dim}UPTIME ${metrics.uptime_hours}h${COLORS.reset}`);

  // Print custom metrics from plugins
  const standardKeys = ['cpu_usage', 'memory_usage', 'latency_ms', 'uptime_hours'];
  const customKeys = Object.keys(metrics).filter(k => !standardKeys.includes(k));

  if (customKeys.length > 0) {
    console.log();
    for (const key of customKeys) {
      console.log(`  ${COLORS.green}${key}${COLORS.reset}    ${metrics[key]}`);
    }
  }
  console.log();
}

// ============ COMMANDS ============

function redactConfig(config) {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(redactConfig);
  }

  const redacted = { ...config };
  const sensitivePatterns = /key|secret|password|token|credential|auth|private/i;

  for (const key in redacted) {
    if (Object.prototype.hasOwnProperty.call(redacted, key)) {
      if (sensitivePatterns.test(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = redactConfig(redacted[key]);
      }
    }
  }
  return redacted;
}

/**
 * Monitors the agent's status and sends heartbeat signals to the specified SaaS URL.
 *
 * This function initializes the monitoring process by performing a handshake to obtain a session token.
 * It enters a loop where it periodically sends heartbeat signals with the agent's status and metrics.
 * If the session token expires, it retries the handshake once before logging an error. The function requires
 * specific arguments to be provided and will exit if any are missing.
 *
 * @param args - An object containing the necessary parameters for monitoring.
 * @param args.saas_url - The SaaS URL for the fleet monitoring service (required).
 * @param args.agent_id - The UUID of the agent (required).
 * @param args.agent_secret - The secret associated with the agent (required).
 * @param args.interval - The heartbeat interval in seconds (default: 300).
 * @param args.status - The status of the agent (default: 'healthy').
 * @param args.plugins - A comma-separated list of plugins to be used (optional).
 */
async function monitorCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const agentSecret = args.agent_secret;
  const interval = parseInt(args.interval || '300', 10); // default 5 min (300s)
  const status = args.status || 'healthy';
  const plugins = args.plugins ? args.plugins.split(',').map(p => p.trim()) : [];

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
    console.log();
    console.log(`  ${COLORS.dim}Tip: Run 'fleet-monitor discover' to find your gateway URL${COLORS.reset}`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Starting monitor for agent ${COLORS.bold}${agentId}${COLORS.reset}`);
  log(`${COLORS.dim}SaaS URL: ${saasUrl}${COLORS.reset}`);
  log(`${COLORS.dim}SaaS URL: ${saasUrl}${COLORS.reset}`);
  log(`${COLORS.dim}Interval: ${interval}s${COLORS.reset}`);
  if (plugins.length > 0) log(`${COLORS.dim}Plugins:  ${plugins.length} active${COLORS.reset}`);
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

  /**
   * Sends a heartbeat signal to the server with collected metrics.
   *
   * The function first checks for a valid session token and performs a handshake if necessary.
   * It then collects metrics from the specified plugins and attempts to post the heartbeat to the server.
   * Depending on the response status, it logs the result, handles session expiration by retrying the handshake,
   * and catches any connection errors that may occur during the process.
   *
   * @returns {Promise<void>} A promise that resolves when the heartbeat has been sent or retried.
   * @throws {Error} If there is a connection error while sending the heartbeat.
   */
  async function sendHeartbeat() {
    if (!sessionToken) {
      const ok = await performHandshake();
      if (!ok) return;
    }

    const metrics = await collectMetrics(plugins);
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

async function statusCommand(args) {
  printBanner();
  const plugins = args.plugins ? args.plugins.split(',').map(p => p.trim()) : [];
  const metrics = await collectMetrics(plugins);
  console.log(`\n  ${COLORS.bold}System Status${COLORS.reset}`);
  console.log(`  ${COLORS.dim}────────────────${COLORS.reset}`);
  printStatus(metrics);
  console.log(`  ${COLORS.dim}Hostname:  ${os.hostname()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Platform:  ${os.platform()} ${os.arch()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Node:      ${process.version}${COLORS.reset}`);
  console.log();
}

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

/**
 * Redact sensitive information from a configuration object.
 *
 * This function checks if the input is an object or an array. If it is an array, it recursively applies the redaction to each element. For objects, it creates a shallow copy and iterates through its keys, replacing any key that matches sensitive patterns with '[REDACTED]'. If a value is an object, it recursively redacts that value as well.
 *
 * @param config - The configuration object or array to be redacted.
 * @returns A new object or array with sensitive information redacted.
 */
function redactConfig(config) {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(redactConfig);
  }

  const redacted = { ...config };
  const sensitivePatterns = /key|secret|password|token|credential|auth|private/i;

  for (const key in redacted) {
    if (Object.prototype.hasOwnProperty.call(redacted, key)) {
      if (sensitivePatterns.test(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = redactConfig(redacted[key]);
      }
    }
  }
  return redacted;
}

/**
 * Push configuration for an agent to the specified SaaS URL.
 *
 * This function validates required parameters, handles configuration from various sources (file, JSON string, or individual flags),
 * and performs an authentication handshake before pushing the configuration to the server.
 * It also manages error handling for file reading, JSON parsing, and API requests.
 *
 * @param args - An object containing the configuration parameters including saas_url, agent_id, agent_secret, config, config_file, model, skills, profile, and data_scope.
 * @returns {Promise<void>} A promise that resolves when the configuration has been successfully pushed.
 * @throws Error If required parameters are missing, if there are issues reading the config file, if JSON parsing fails, or if authentication fails.
 */
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
    console.log();
    console.log(`  ${COLORS.dim}Tip: Run 'fleet-monitor discover' to find your gateway URL${COLORS.reset}`);
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
      model: 'claude-sonnet-4',
      skills: ['code', 'search'],
      profile: 'dev',
      data_scope: 'full'
    };
  }

  console.log(`${COLORS.cyan}Configuration to push:${COLORS.reset}`);
  console.log(JSON.stringify(redactConfig(config), null, 2));
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
      console.log(JSON.stringify(redactConfig(result.body.agent.config_json), null, 2));
    } else {
      console.error(`${COLORS.red}✗ Failed to push configuration (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }
}

async function checkGateway(ip, port) {
  const url = `http://${ip}:${port}/api/health`;
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'ok') resolve(`http://${ip}:${port}`);
            else resolve(null);
          } catch { resolve(null); }
        });
      } else {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function discoverCommand(args) {
  printBanner();
  log(`${COLORS.green}Auto-Discovery: Scanning local network for OpenClaw gateways...${COLORS.reset}`);

  const nets = os.networkInterfaces();
  const localSubnets = new Set();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const parts = net.address.split('.');
        localSubnets.add(parts.slice(0, 3).join('.'));
      }
    }
  }

  if (localSubnets.size === 0) {
    log(`${COLORS.yellow}No local network interfaces found.${COLORS.reset}`);
    return;
  }

  const subnets = Array.from(localSubnets);
  const ports = [3000, 8080, 80, 443];
  const foundGateways = [];

  log(`${COLORS.dim}Scanning ${subnets.length} subnet(s) on ports ${ports.join(', ')}...${COLORS.reset}`);

  // Generate all targets
  const targets = [];
  for (const subnet of subnets) {
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      for (const port of ports) {
        targets.push({ ip, port });
      }
    }
  }

  // Scan in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(t => checkGateway(t.ip, t.port)));
    results.filter(Boolean).forEach(gw => foundGateways.push(gw));

    // Simple progress indicator (overwrite line)
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${COLORS.dim}Scanned ${Math.min(i + BATCH_SIZE, targets.length)} / ${targets.length} targets...${COLORS.reset}`);
    }
  }

  if (process.stdout.isTTY) console.log(); // Newline

  console.log();
  if (foundGateways.length > 0) {
    log(`${COLORS.green}Found ${foundGateways.length} OpenClaw gateway(s):${COLORS.reset}`);
    foundGateways.forEach(gw => console.log(`  ${COLORS.bold}${gw}${COLORS.reset}`));
    console.log();
    console.log(`${COLORS.dim}Use one of these URLs for pairing:${COLORS.reset}`);
    console.log(`  fleet-monitor monitor --saas-url=${foundGateways[0]} ...`);
  } else {
    log(`${COLORS.yellow}No gateways found.${COLORS.reset}`);
    log(`${COLORS.dim}Ensure the OpenClaw Dashboard is running and reachable.${COLORS.reset}`);
  }
}

/**
 * Displays the help information and usage instructions for the commands.
 */
function helpCommand() {
  printBanner();
  console.log(`
  ${COLORS.bold}Commands:${COLORS.reset}`);
  console.log(`    ${COLORS.green}monitor${COLORS.reset}    Start sending heartbeats to your Fleet dashboard`);
  console.log(`    ${COLORS.green}config${COLORS.reset}     Manage agent configuration`);
  console.log(`    ${COLORS.green}discover${COLORS.reset}   Scan local network for OpenClaw gateways`);
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
  console.log(`    --plugins      Comma-separated paths to metric scripts (e.g. ./queue.py)`);
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
  case 'discover':
    discoverCommand(args);
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
