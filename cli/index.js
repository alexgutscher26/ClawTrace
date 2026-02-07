#!/usr/bin/env node

const os = require('os');
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

// ============ HTTP POST HELPER ============
function postHeartbeat(saasUrl, agentId, status, metrics) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${saasUrl}/api/heartbeat`);
    const payload = JSON.stringify({
      agent_id: agentId,
      status: status,
      metrics: metrics,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

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
    req.write(payload);
    req.end();
  });
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
${COLORS.green}${COLORS.bold}  ⚡ OpenClaw Fleet Monitor${COLORS.reset}`);
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

async function monitorCommand(args) {
  const saasUrl = args.saas_url;
  const agentId = args.agent_id;
  const interval = parseInt(args.interval || '300', 10); // default 5 min (300s)
  const status = args.status || 'healthy';

  if (!saasUrl || !agentId) {
    console.error(`${COLORS.red}Error: --saas-url and --agent-id are required${COLORS.reset}`);
    console.log(`\nUsage:`);
    console.log(`  openclaw monitor --saas-url=https://your-app.com --agent-id=<UUID>`);
    console.log(`\nOptions:`);
    console.log(`  --saas-url     Your OpenClaw Fleet SaaS URL (required)`);
    console.log(`  --agent-id     Agent UUID from your dashboard (required)`);
    console.log(`  --interval     Heartbeat interval in seconds (default: 300)`);
    console.log(`  --status       Agent status: healthy, idle, error (default: healthy)`);
    process.exit(1);
  }

  printBanner();
  log(`${COLORS.green}Starting monitor for agent ${COLORS.bold}${agentId}${COLORS.reset}`);
  log(`${COLORS.dim}SaaS URL: ${saasUrl}${COLORS.reset}`);
  log(`${COLORS.dim}Interval: ${interval}s${COLORS.reset}`);
  console.log();

  async function sendHeartbeat() {
    const metrics = collectMetrics();
    try {
      const result = await postHeartbeat(saasUrl, agentId, status, metrics);
      if (result.status === 200) {
        log(`${COLORS.green}✓ Heartbeat sent${COLORS.reset}`);
        printStatus(metrics);
      } else {
        log(`${COLORS.red}✗ Heartbeat failed (${result.status}): ${JSON.stringify(result.body)}${COLORS.reset}`);
      }
    } catch (err) {
      log(`${COLORS.red}✗ Connection error: ${err.message}${COLORS.reset}`);
    }
  }

  // Send immediately, then on interval
  await sendHeartbeat();
  setInterval(sendHeartbeat, interval * 1000);

  log(`${COLORS.dim}Press Ctrl+C to stop${COLORS.reset}`);
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

function helpCommand() {
  printBanner();
  console.log(`
  ${COLORS.bold}Commands:${COLORS.reset}`);
  console.log(`    ${COLORS.green}monitor${COLORS.reset}    Start sending heartbeats to your Fleet dashboard`);
  console.log(`    ${COLORS.green}status${COLORS.reset}     Show local system metrics`);
  console.log(`    ${COLORS.green}help${COLORS.reset}       Show this help message`);
  console.log(`
  ${COLORS.bold}Monitor Usage:${COLORS.reset}`);
  console.log(`    openclaw monitor --saas-url=https://your-app.com --agent-id=<UUID>`);
  console.log(`
  ${COLORS.bold}Options:${COLORS.reset}`);
  console.log(`    --saas-url     Your OpenClaw Fleet SaaS URL ${COLORS.red}(required)${COLORS.reset}`);
  console.log(`    --agent-id     Agent UUID from dashboard ${COLORS.red}(required)${COLORS.reset}`);
  console.log(`    --interval     Heartbeat interval in seconds (default: 300)`);
  console.log(`    --status       Agent status to report (default: healthy)`);
  console.log(`
  ${COLORS.bold}Examples:${COLORS.reset}`);
  console.log(`    ${COLORS.dim}# Start monitoring with 5-minute heartbeat${COLORS.reset}`);
  console.log(`    openclaw monitor --saas-url=https://fleet.openclaw.dev --agent-id=abc-123`);
  console.log(``);
  console.log(`    ${COLORS.dim}# Custom interval (60 seconds)${COLORS.reset}`);
  console.log(`    openclaw monitor --saas-url=https://fleet.openclaw.dev --agent-id=abc-123 --interval=60`);
  console.log(``);
  console.log(`    ${COLORS.dim}# Check local system status${COLORS.reset}`);
  console.log(`    openclaw status`);
  console.log();
}

// ============ MAIN ============
const { command, args } = parseArgs(process.argv);

switch (command) {
  case 'monitor':
    monitorCommand(args);
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
