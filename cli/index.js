#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { performance } = require('perf_hooks');

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

function measureLatency(saasUrl) {
  return new Promise((resolve) => {
    const start = performance.now();
    const url = new URL(saasUrl);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(saasUrl, { timeout: 5000 }, (res) => {
      resolve(Math.round(performance.now() - start));
      res.resume();
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

async function getDiskUsage() {
  return new Promise((resolve) => {
    const cmd = os.platform() === 'win32'
      ? 'wmic logicaldisk get size,freespace,caption'
      : 'df -h / | tail -1';

    exec(cmd, (err, stdout) => {
      if (err) return resolve(0);
      if (os.platform() === 'win32') {
        const lines = stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1]);
            const total = parseInt(parts[2]);
            return resolve(Math.round(((total - free) / total) * 100));
          }
        }
        resolve(0);
      } else {
        const match = stdout.match(/(\d+)%/);
        resolve(match ? parseInt(match[1]) : 0);
      }
    });
  });
}

async function getDiskIO() {
  return { read_kbps: 0, write_kbps: 0 }; // Placeholder
}

async function collectMetrics(saasUrl, plugins = []) {
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

  const latency = await measureLatency(saasUrl);
  const diskUsage = await getDiskUsage();

  const metrics = {
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    latency_ms: latency,
    uptime_hours: Math.round(os.uptime() / 3600),
    disk_usage: diskUsage,
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

/**
 * Prints a banner for ClawTrace Monitor to the console.
 */
function printBanner() {
  console.log(`
${COLORS.green}${COLORS.bold}  ⚡ ClawTrace Monitor${COLORS.reset}`);
  console.log(`${COLORS.dim}  ─────────────────────────────${COLORS.reset}`);
}

function printStatus(metrics) {
  console.log(`  ${COLORS.cyan}CPU${COLORS.reset}    ${metrics.cpu_usage}%`);
  console.log(`  ${COLORS.magenta}MEM${COLORS.reset}    ${metrics.memory_usage}%`);
  console.log(`  ${COLORS.yellow}LAT${COLORS.reset}    ${metrics.latency_ms}ms`);
  console.log(`  ${COLORS.dim}UPTIME ${metrics.uptime_hours}h${COLORS.reset}`);
  if (metrics.disk_usage !== undefined) console.log(`  ${COLORS.cyan}DISK${COLORS.reset}   ${metrics.disk_usage}%`);

  const standardKeys = ['cpu_usage', 'memory_usage', 'latency_ms', 'uptime_hours', 'disk_usage'];
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
  if (typeof config !== 'object' || config === null) return config;
  if (Array.isArray(config)) return config.map(redactConfig);
  const redacted = { ...config };
  const sensitivePatterns = /key|secret|password|token|credential|auth|private/i;
  for (const key in redacted) {
    if (Object.prototype.hasOwnProperty.call(redacted, key)) {
      if (sensitivePatterns.test(key)) redacted[key] = '[REDACTED]';
      else if (typeof redacted[key] === 'object') redacted[key] = redactConfig(redacted[key]);
    }
  }
  return redacted;
}

async function monitorCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const agentSecret = args.agent_secret;
  const interval = parseInt(args.interval || '300', 10);
  const status = args.status || 'healthy';
  const plugins = args.plugins ? args.plugins.split(',').map(p => p.trim()) : [];

  let sessionToken = null;

  if (!saasUrl || !agentId || !agentSecret) {
    console.error(`${COLORS.red}Error: --saas-url, --agent-id, and --agent-secret are required${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  clawtrace monitor --saas-url=https://your-app.com --agent-id=<UUID> --agent-secret=<SECRET>`);
    console.log(`\nOptions:`);
    console.log(`  --saas-url     Your ClawTrace SaaS URL (required)`);
    console.log(`  --agent-id     Agent UUID from your dashboard (required)`);
    console.log(`  --agent-secret Agent Secret from your dashboard (required)`);
    console.log(`  --interval     Heartbeat interval in seconds (default: 300)`);
    console.log(`  --status       Agent status: healthy, idle, error (default: healthy)`);
    console.log();
    console.log(`  ${COLORS.dim}Tip: Run 'clawtrace discover' to find your gateway URL${COLORS.reset}`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Starting monitor for agent ${COLORS.bold}${agentId}${COLORS.reset}`);
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

  async function sendHeartbeat() {
    if (!sessionToken) {
      if (!(await performHandshake())) return;
    }
    const metrics = await collectMetrics(saasUrl, plugins);
    try {
      const result = await postHeartbeat(saasUrl, agentId, status, metrics, sessionToken);
      if (result.status === 200) {
        log(`${COLORS.green}✓ Heartbeat sent${COLORS.reset}`);
        printStatus(metrics);
      } else if (result.status === 401) {
        log(`${COLORS.yellow}! Session expired, retrying handshake...${COLORS.reset}`);
        sessionToken = null;
        await sendHeartbeat();
      } else {
        log(`${COLORS.red}✗ Heartbeat failed (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
      }
    } catch (err) {
      log(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    }
  }

  if (await performHandshake()) {
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
  const metrics = await collectMetrics(args.saas_url || 'http://localhost:3000', plugins);
  console.log(`\n  ${COLORS.bold}System Status${COLORS.reset}`);
  console.log(`  ${COLORS.dim}────────────────${COLORS.reset}`);
  printStatus(metrics);
  console.log(`  ${COLORS.dim}Hostname:  ${os.hostname()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Platform:  ${os.platform()} ${os.arch()}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Node:      ${process.version}${COLORS.reset}`);
  console.log();
}

/**
 * Push the configuration for a specified agent to the SaaS platform.
 *
 * This function validates the required parameters, reads the configuration from a file or JSON string,
 * and authenticates with the SaaS platform using a handshake. If successful, it sends a PUT request
 * to update the agent's configuration. Error handling is included for both the handshake and the
 * configuration push process.
 *
 * @param args - An object containing the parameters for the configuration push, including:
 *   - saas_url: The URL of the SaaS platform.
 *   - agent_id: The unique identifier for the agent.
 *   - agent_secret: The secret key for the agent.
 *   - config: The configuration in JSON format.
 *   - config_file: The path to a configuration file.
 *   - model: The model to be used.
 *   - skills: A comma-separated list of skills.
 */
async function configPushCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const agentSecret = args.agent_secret;
  const configJson = args.config;
  const configFile = args.config_file;
  const flagModel = args.model;
  const flagSkills = args.skills;

  if (!saasUrl || !agentId) {
    console.error(`${COLORS.red}Error: --saas-url and --agent-id are required${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  clawtrace config push --agent-id=<UUID> --saas-url=<URL> --agent-secret=<SECRET> [options]`);
    console.log(`\nExample:`);
    console.log(`  clawtrace config push --agent-id=... --model=claude-sonnet-4 --skills=code,search`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Pushing configuration for agent ${COLORS.bold}${agentId}${COLORS.reset}`);

  let config = {};
  if (configFile) {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } else if (configJson) {
    config = JSON.parse(configJson);
  } else {
    if (flagModel) config.model = flagModel;
    if (flagSkills) config.skills = flagSkills.split(',').map(s => s.trim());
  }

  log(`${COLORS.yellow}Authenticating...${COLORS.reset}`);
  try {
    const handshake = await postHandshake(saasUrl, agentId, agentSecret);
    if (handshake.status === 200 && handshake.body.token) {
      const result = await apiRequest('PUT', `${saasUrl}/api/agents/${agentId}`, { config_json: config }, handshake.body.token);
      if (result.status === 200) {
        log(`${COLORS.green}✓ Configuration pushed successfully!${COLORS.reset}`);
      } else {
        log(`${COLORS.red}✗ Failed to push (${result.status})${COLORS.reset}`);
      }
    }
  } catch (err) {
    log(`${COLORS.red}✗ Error: ${err.message}${COLORS.reset}`);
  }
}

/**
 * Handles the configuration command based on the provided subcommand.
 */
async function configCommand(args) {
  const subcommand = args._subcommand || args.subcommand;
  if (subcommand === 'push') await configPushCommand(args);
  else {
    console.log(`Usage: clawtrace config push ...`);
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
            if (JSON.parse(data).status === 'ok') resolve(`http://${ip}:${port}`);
            else resolve(null);
          } catch { resolve(null); }
        });
      } else resolve(null);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Discover ClawTrace gateways on the local network.
 *
 * This function scans the local network interfaces to identify IPv4 addresses, constructs subnets, and checks for active gateways on specified ports. It utilizes asynchronous calls to check each potential gateway and logs the results. If gateways are found, their addresses are printed; otherwise, a message indicating no gateways were found is logged.
 *
 * @param args - The arguments passed to the function, which may influence its behavior.
 */
async function discoverCommand(args) {
  printBanner();
  log(`${COLORS.green}Scanning local network for ClawTrace gateways...${COLORS.reset}`);
  const nets = os.networkInterfaces();
  const subnets = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) subnets.push(net.address.split('.').slice(0, 3).join('.'));
    }
  }
  const ports = [3000, 8080];
  const found = [];
  for (const subnet of subnets) {
    for (let i = 1; i < 255; i++) {
      const results = await Promise.all(ports.map(p => checkGateway(`${subnet}.${i}`, p)));
      results.filter(Boolean).forEach(r => found.push(r));
    }
  }
  if (found.length > 0) found.forEach(f => console.log(`Found: ${f}`));
  else log('No gateways found.');
}

function installServiceCommand(args) {
  log('Service installation persistence coming soon to this version.');
}

/**
 * Displays the help information and available commands.
 */
const helpCommand = () => {
  printBanner();
  console.log(`
  ${COLORS.bold}Commands:${COLORS.reset}
    monitor           Start sending heartbeats
    config            Manage configuration
    discover          Scan for gateways
    status            Show system metrics
    help              Show this help
  
  ${COLORS.bold}Usage:${COLORS.reset}
    clawtrace monitor --saas-url=<URL> --agent-id=<ID> --agent-secret=<SECRET>
    
  ${COLORS.bold}Or with Bun:${COLORS.reset}
    bun x clawtrace monitor ...
  `);
};

const { command, args } = parseArgs(process.argv);
if (command === 'config' && process.argv[3]) args._subcommand = process.argv[3];

switch (command) {
  case 'monitor': monitorCommand(args); break;
  case 'config': configCommand(args); break;
  case 'status': statusCommand(args); break;
  case 'discover': discoverCommand(args); break;
  case 'install-service': installServiceCommand(args); break;
  case 'help': case '--help': case '-h': case undefined: helpCommand(); break;
  default:
    console.error(`Unknown command: ${command}`);
    helpCommand();
    process.exit(1);
}
