import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'openclaw_fleet';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(DB_NAME);
  return cachedDb;
}

async function getUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function getPath(params) {
  const segments = params?.path || [];
  return '/' + segments.join('/');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request, { params }) {
  const path = getPath(params);
  try {
    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Serve a shell-based heartbeat script for easy install
    if (path === '/install-agent') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id') || 'YOUR_AGENT_ID';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const script = `#!/bin/bash
# OpenClaw Fleet Monitor - Heartbeat Agent
# Auto-generated for agent: ${agentId}
# Usage: curl -sL "${baseUrl}/api/install-agent?agent_id=${agentId}" | bash

SAAS_URL="${baseUrl}"
AGENT_ID="${agentId}"
INTERVAL=${interval}

echo ""
echo "  ⚡ OpenClaw Fleet Monitor"
echo "  ─────────────────────────────"
echo "  Agent:    $AGENT_ID"
echo "  SaaS:     $SAAS_URL"
echo "  Interval: \${INTERVAL}s"
echo ""

send_heartbeat() {
  CPU=0
  MEM=0

  if command -v top &> /dev/null; then
    CPU=$(top -bn1 2>/dev/null | grep -i "cpu" | head -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9.]+$/) {print int($i); exit}}' 2>/dev/null || echo "0")
  fi

  if command -v free &> /dev/null; then
    MEM=$(free 2>/dev/null | grep Mem | awk '{printf "%.0f", $3/$2 * 100}' 2>/dev/null || echo "0")
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    MEM=$(vm_stat 2>/dev/null | awk '/Pages active/ {active=$3} /Pages wired/ {wired=$4} /Pages free/ {free=$3} END {printf "%.0f", (active+wired)/(active+wired+free)*100}' 2>/dev/null || echo "0")
  fi

  UPTIME_H=$(awk '{printf "%.0f", $1/3600}' /proc/uptime 2>/dev/null || echo "0")

  RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST "\${SAAS_URL}/api/heartbeat" \\
    -H "Content-Type: application/json" \\
    -d "{\\"agent_id\\":\\"$AGENT_ID\\",\\"status\\":\\"healthy\\",\\"metrics\\":{\\"cpu_usage\\":$CPU,\\"memory_usage\\":$MEM,\\"uptime_hours\\":$UPTIME_H}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date +%H:%M:%S)] ✓ Heartbeat sent  CPU: \${CPU}%  MEM: \${MEM}%"
  else
    echo "[$(date +%H:%M:%S)] ✗ Failed ($HTTP_CODE): $BODY"
  fi
}

echo "Starting heartbeat loop (Ctrl+C to stop)..."
echo ""

while true; do
  send_heartbeat
  sleep $INTERVAL
done
`;
      return new NextResponse(script, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // PowerShell heartbeat script for Windows users
    if (path === '/install-agent-ps') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id') || 'YOUR_AGENT_ID';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const script = `# OpenClaw Fleet Monitor - PowerShell Heartbeat Agent
# Agent: ${agentId}
# Save as openclaw-monitor.ps1 and run: powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1

$SaasUrl = "${baseUrl}"
$AgentId = "${agentId}"
$Interval = ${interval}

Write-Host ""
Write-Host "  [char]9889 OpenClaw Fleet Monitor" -ForegroundColor Green
Write-Host "  --------------------------------"
Write-Host "  Agent:    $AgentId"
Write-Host "  SaaS:     $SaasUrl"
Write-Host "  Interval: $\{Interval\}s"
Write-Host ""

function Send-Heartbeat {
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    if ($null -eq $cpu) { $cpu = 0 }

    $os = Get-CimInstance Win32_OperatingSystem
    $mem = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100)

    $uptime = [math]::Round((New-TimeSpan -Start $os.LastBootUpTime -End (Get-Date)).TotalHours)

    $body = @{
        agent_id = $AgentId
        status   = "healthy"
        metrics  = @{
            cpu_usage    = [int]$cpu
            memory_usage = [int]$mem
            uptime_hours = [int]$uptime
        }
    } | ConvertTo-Json -Depth 3

    try {
        $response = Invoke-RestMethod -Uri "$SaasUrl/api/heartbeat" -Method POST -ContentType "application/json" -Body $body
        $time = Get-Date -Format "HH:mm:ss"
        Write-Host "[$time] OK Heartbeat sent  CPU: $\{cpu\}%  MEM: $\{mem\}%" -ForegroundColor Green
    } catch {
        $time = Get-Date -Format "HH:mm:ss"
        Write-Host "[$time] FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Starting heartbeat loop (Ctrl+C to stop)..." -ForegroundColor Yellow
Write-Host ""

while ($true) {
    Send-Heartbeat
    Start-Sleep -Seconds $Interval
}
`;
      return new NextResponse(script, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="openclaw-monitor.ps1"` },
      });
    }

    if (path === '/auth/me') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      return json({ user: { id: user.id, email: user.email } });
    }

    if (path === '/fleets') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const fleets = await db.collection('fleets').find({ user_id: user.id }).sort({ created_at: -1 }).toArray();
      return json({ fleets });
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const { searchParams } = new URL(request.url);
      const fleet_id = searchParams.get('fleet_id');
      const query = { user_id: user.id };
      if (fleet_id) query.fleet_id = fleet_id;
      const agents = await db.collection('agents').find(query).sort({ created_at: -1 }).toArray();
      return json({ agents });
    }

    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const agent = await db.collection('agents').findOne({ id: agentMatch[1], user_id: user.id });
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent });
    }

    if (path === '/alerts') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const alerts = await db.collection('alerts').find({ user_id: user.id }).sort({ created_at: -1 }).limit(50).toArray();
      return json({ alerts });
    }

    if (path === '/dashboard/stats') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const agents = await db.collection('agents').find({ user_id: user.id }).toArray();
      const fleets = await db.collection('fleets').find({ user_id: user.id }).toArray();
      const unresolvedAlerts = await db.collection('alerts').countDocuments({ user_id: user.id, resolved: false });
      const stats = {
        total_agents: agents.length,
        total_fleets: fleets.length,
        healthy: agents.filter(a => a.status === 'healthy').length,
        idle: agents.filter(a => a.status === 'idle').length,
        error: agents.filter(a => a.status === 'error').length,
        offline: agents.filter(a => a.status === 'offline').length,
        total_cost: parseFloat(agents.reduce((sum, a) => sum + (a.metrics_json?.cost_usd || 0), 0).toFixed(2)),
        total_tasks: agents.reduce((sum, a) => sum + (a.metrics_json?.tasks_completed || 0), 0),
        unresolved_alerts: unresolvedAlerts,
      };
      return json({ stats });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request, { params }) {
  const path = getPath(params);
  try {
    if (path === '/fleets') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const db = await getDb();
      const fleet = {
        id: uuidv4(),
        user_id: user.id,
        name: body.name || 'My Fleet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection('fleets').insertOne(fleet);
      return json({ fleet }, 201);
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const db = await getDb();
      const agent = {
        id: uuidv4(),
        fleet_id: body.fleet_id,
        user_id: user.id,
        name: body.name || 'New Agent',
        gateway_url: body.gateway_url || '',
        status: 'idle',
        last_heartbeat: null,
        config_json: body.config_json || { profile: 'dev', skills: ['code', 'search'], model: 'gpt-4', data_scope: 'full' },
        metrics_json: { latency_ms: 0, tasks_completed: 0, errors_count: 0, uptime_hours: 0, cost_usd: 0, cpu_usage: 0, memory_usage: 0 },
        machine_id: body.machine_id || '',
        location: body.location || '',
        model: body.model || 'gpt-4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection('agents').insertOne(agent);
      return json({ agent }, 201);
    }

    const restartMatch = path.match(/^\/agents\/([^/]+)\/restart$/);
    if (restartMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const agent = await db.collection('agents').findOneAndUpdate(
        { id: restartMatch[1], user_id: user.id },
        { $set: { status: 'idle', last_heartbeat: new Date().toISOString(), updated_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent, message: 'Agent restart initiated' });
    }

    if (path === '/heartbeat') {
      const body = await request.json();
      const db = await getDb();
      const agent = await db.collection('agents').findOne({ id: body.agent_id });
      if (!agent) return json({ error: 'Agent not found' }, 404);
      const update = {
        status: body.status || 'healthy',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (body.metrics) {
        update.metrics_json = { ...agent.metrics_json, ...body.metrics };
      }
      await db.collection('agents').updateOne({ id: body.agent_id }, { $set: update });
      return json({ message: 'Heartbeat received', status: update.status });
    }

    const resolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
    if (resolveMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      await db.collection('alerts').updateOne(
        { id: resolveMatch[1], user_id: user.id },
        { $set: { resolved: true, resolved_at: new Date().toISOString() } }
      );
      return json({ message: 'Alert resolved' });
    }

    if (path === '/seed-demo') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();

      let fleets = await db.collection('fleets').find({ user_id: user.id }).toArray();
      let fleet;
      if (fleets.length === 0) {
        fleet = { id: uuidv4(), user_id: user.id, name: 'Production Fleet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await db.collection('fleets').insertOne(fleet);
      } else {
        fleet = fleets[0];
      }

      await db.collection('agents').deleteMany({ user_id: user.id });
      await db.collection('alerts').deleteMany({ user_id: user.id });

      const now = new Date();
      const demoAgents = [
        { name: 'alpha-coder', gateway_url: 'http://192.168.1.100:8080', status: 'healthy', model: 'gpt-4', location: 'us-east-1', machine_id: 'droplet-alpha-001', metrics_json: { latency_ms: 120, tasks_completed: 847, errors_count: 3, uptime_hours: 720, cost_usd: 45.30, cpu_usage: 42, memory_usage: 58 }, config_json: { profile: 'dev', skills: ['code', 'search', 'deploy'], model: 'gpt-4', data_scope: 'full' }, last_heartbeat: new Date(now - 120000).toISOString() },
        { name: 'beta-researcher', gateway_url: 'http://10.0.1.50:8080', status: 'healthy', model: 'claude-3', location: 'eu-west-1', machine_id: 'droplet-beta-002', metrics_json: { latency_ms: 180, tasks_completed: 523, errors_count: 7, uptime_hours: 500, cost_usd: 32.15, cpu_usage: 35, memory_usage: 45 }, config_json: { profile: 'ops', skills: ['search', 'analyze', 'report'], model: 'claude-3', data_scope: 'read-only' }, last_heartbeat: new Date(now - 300000).toISOString() },
        { name: 'gamma-deployer', gateway_url: 'http://172.16.0.10:8080', status: 'idle', model: 'gpt-4', location: 'us-west-2', machine_id: 'droplet-gamma-003', metrics_json: { latency_ms: 95, tasks_completed: 312, errors_count: 1, uptime_hours: 360, cost_usd: 18.90, cpu_usage: 12, memory_usage: 30 }, config_json: { profile: 'ops', skills: ['deploy', 'monitor', 'rollback'], model: 'gpt-4', data_scope: 'full' }, last_heartbeat: new Date(now - 600000).toISOString() },
        { name: 'delta-monitor', gateway_url: 'http://192.168.2.25:8080', status: 'error', model: 'gpt-3.5-turbo', location: 'ap-southeast-1', machine_id: 'droplet-delta-004', metrics_json: { latency_ms: 450, tasks_completed: 156, errors_count: 28, uptime_hours: 168, cost_usd: 8.75, cpu_usage: 89, memory_usage: 92 }, config_json: { profile: 'exec', skills: ['monitor', 'alert'], model: 'gpt-3.5-turbo', data_scope: 'summary-only' }, last_heartbeat: new Date(now - 1800000).toISOString() },
        { name: 'epsilon-analyst', gateway_url: 'http://10.0.2.100:8080', status: 'offline', model: 'gpt-4', location: 'us-east-2', machine_id: 'droplet-epsilon-005', metrics_json: { latency_ms: 0, tasks_completed: 89, errors_count: 0, uptime_hours: 48, cost_usd: 5.20, cpu_usage: 0, memory_usage: 0 }, config_json: { profile: 'dev', skills: ['analyze', 'report', 'visualize'], model: 'gpt-4', data_scope: 'full' }, last_heartbeat: new Date(now - 7200000).toISOString() },
      ];

      const agentDocs = demoAgents.map(a => ({
        id: uuidv4(), fleet_id: fleet.id, user_id: user.id,
        ...a, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }));
      await db.collection('agents').insertMany(agentDocs);

      const demoAlerts = [
        { agent_id: agentDocs[3].id, agent_name: 'delta-monitor', type: 'high-error', message: 'Error rate exceeded threshold: 28 errors in 24h', resolved: false },
        { agent_id: agentDocs[4].id, agent_name: 'epsilon-analyst', type: 'downtime', message: 'Agent offline - no heartbeat for 2 hours', resolved: false },
        { agent_id: agentDocs[0].id, agent_name: 'alpha-coder', type: 'high-latency', message: 'Avg latency exceeded 500ms for 5 minutes', resolved: true, resolved_at: new Date(now - 3600000).toISOString() },
      ];
      const alertDocs = demoAlerts.map(a => ({
        id: uuidv4(), user_id: user.id, ...a,
        created_at: new Date(now - Math.random() * 86400000).toISOString(),
      }));
      await db.collection('alerts').insertMany(alertDocs);

      return json({ message: 'Demo data loaded', agents: agentDocs.length, alerts: alertDocs.length });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function PUT(request, { params }) {
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const db = await getDb();
      const updateFields = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) updateFields.name = body.name;
      if (body.gateway_url !== undefined) updateFields.gateway_url = body.gateway_url;
      if (body.config_json !== undefined) updateFields.config_json = body.config_json;
      if (body.machine_id !== undefined) updateFields.machine_id = body.machine_id;
      if (body.location !== undefined) updateFields.location = body.location;
      if (body.model !== undefined) updateFields.model = body.model;
      if (body.status !== undefined) updateFields.status = body.status;
      const agent = await db.collection('agents').findOneAndUpdate(
        { id: agentMatch[1], user_id: user.id },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const db = await getDb();
      const fleet = await db.collection('fleets').findOneAndUpdate(
        { id: fleetMatch[1], user_id: user.id },
        { $set: { name: body.name, updated_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (!fleet) return json({ error: 'Fleet not found' }, 404);
      return json({ fleet });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('PUT Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(request, { params }) {
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const result = await db.collection('agents').deleteOne({ id: agentMatch[1], user_id: user.id });
      if (result.deletedCount === 0) return json({ error: 'Agent not found' }, 404);
      await db.collection('alerts').deleteMany({ agent_id: agentMatch[1], user_id: user.id });
      return json({ message: 'Agent deleted' });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      await db.collection('agents').deleteMany({ fleet_id: fleetMatch[1], user_id: user.id });
      await db.collection('alerts').deleteMany({ fleet_id: fleetMatch[1], user_id: user.id });
      const result = await db.collection('fleets').deleteOne({ id: fleetMatch[1], user_id: user.id });
      if (result.deletedCount === 0) return json({ error: 'Fleet not found' }, 404);
      return json({ message: 'Fleet and associated agents deleted' });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
