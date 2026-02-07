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

    // Serve a shell-based heartbeat script for easy install (Linux + macOS)
    if (path === '/install-agent') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id') || 'YOUR_AGENT_ID';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const script = `#!/bin/bash
# OpenClaw Fleet Monitor - Heartbeat Agent (Linux & macOS)
# Auto-generated for agent: ${agentId}
# Usage: curl -sL "${baseUrl}/api/install-agent?agent_id=${agentId}" | bash

SAAS_URL="${baseUrl}"
AGENT_ID="${agentId}"
INTERVAL=${interval}

echo ""
echo "  OpenClaw Fleet Monitor"
echo "  ─────────────────────────────"
echo "  Agent:    $AGENT_ID"
echo "  SaaS:     $SAAS_URL"
echo "  Interval: \${INTERVAL}s"
echo "  OS:       $(uname -s) $(uname -m)"
echo ""

get_cpu() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use ps to get total CPU
    ps -A -o %cpu | awk '{s+=$1} END {printf "%.0f", s/4}' 2>/dev/null || echo "0"
  elif [ -f /proc/stat ]; then
    # Linux: calculate from /proc/stat
    read -r cpu user nice system idle rest < /proc/stat
    total1=$((user + nice + system + idle))
    idle1=$idle
    sleep 1
    read -r cpu user nice system idle rest < /proc/stat
    total2=$((user + nice + system + idle))
    idle2=$idle
    if [ $((total2 - total1)) -gt 0 ]; then
      echo $(( (100 * ((total2 - total1) - (idle2 - idle1))) / (total2 - total1) ))
    else
      echo "0"
    fi
  else
    echo "0"
  fi
}

get_mem() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use vm_stat and sysctl
    PAGES_ACTIVE=$(vm_stat 2>/dev/null | awk '/Pages active/ {gsub(/\\./, "", $3); print $3}')
    PAGES_WIRED=$(vm_stat 2>/dev/null | awk '/Pages wired/ {gsub(/\\./, "", $4); print $4}')
    PAGES_FREE=$(vm_stat 2>/dev/null | awk '/Pages free/ {gsub(/\\./, "", $3); print $3}')
    PAGES_SPECULATIVE=$(vm_stat 2>/dev/null | awk '/Pages speculative/ {gsub(/\\./, "", $3); print $3}')
    TOTAL=$((PAGES_ACTIVE + PAGES_WIRED + PAGES_FREE + PAGES_SPECULATIVE))
    if [ "$TOTAL" -gt 0 ] 2>/dev/null; then
      echo $(( (PAGES_ACTIVE + PAGES_WIRED) * 100 / TOTAL ))
    else
      echo "0"
    fi
  elif command -v free &> /dev/null; then
    free 2>/dev/null | awk '/Mem/ {printf "%.0f", $3/$2 * 100}' || echo "0"
  else
    echo "0"
  fi
}

get_uptime_hours() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use sysctl kern.boottime
    BOOT=$(sysctl -n kern.boottime 2>/dev/null | awk -F'[= ,]' '{print $4}')
    NOW=$(date +%s)
    if [ -n "$BOOT" ] && [ "$BOOT" -gt 0 ] 2>/dev/null; then
      echo $(( (NOW - BOOT) / 3600 ))
    else
      echo "0"
    fi
  elif [ -f /proc/uptime ]; then
    awk '{printf "%.0f", $1/3600}' /proc/uptime 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

send_heartbeat() {
  CPU=$(get_cpu)
  MEM=$(get_mem)
  UPTIME_H=$(get_uptime_hours)

  # Ensure numeric values
  CPU=\${CPU:-0}
  MEM=\${MEM:-0}
  UPTIME_H=\${UPTIME_H:-0}

  RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST "\${SAAS_URL}/api/heartbeat" \\
    -H "Content-Type: application/json" \\
    -d "{\\"agent_id\\":\\"$AGENT_ID\\",\\"status\\":\\"healthy\\",\\"metrics\\":{\\"cpu_usage\\":$CPU,\\"memory_usage\\":$MEM,\\"uptime_hours\\":$UPTIME_H}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date +%H:%M:%S)] Heartbeat sent  CPU: \${CPU}%  MEM: \${MEM}%  Uptime: \${UPTIME_H}h"
  else
    echo "[$(date +%H:%M:%S)] Failed ($HTTP_CODE): $BODY"
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

      const psScript = [
        '# OpenClaw Fleet Monitor - PowerShell Heartbeat Agent',
        '# Agent: ' + agentId,
        '# Run: powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1',
        '',
        '$SaasUrl = "' + baseUrl + '"',
        '$AgentId = "' + agentId + '"',
        '$Interval = ' + interval,
        '',
        'Write-Host ""',
        'Write-Host "  OpenClaw Fleet Monitor" -ForegroundColor Green',
        'Write-Host "  --------------------------------"',
        'Write-Host "  Agent:    $AgentId"',
        'Write-Host "  SaaS:     $SaasUrl"',
        'Write-Host "  Interval: $($Interval)s"',
        'Write-Host ""',
        '',
        'function Send-Heartbeat {',
        '    $cpuVal = 0',
        '    try {',
        '        $cpuVal = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)',
        '    } catch { $cpuVal = 0 }',
        '',
        '    $memVal = 0',
        '    try {',
        '        $osInfo = Get-CimInstance Win32_OperatingSystem',
        '        $memVal = [math]::Round(($osInfo.TotalVisibleMemorySize - $osInfo.FreePhysicalMemory) / $osInfo.TotalVisibleMemorySize * 100)',
        '    } catch { $memVal = 0 }',
        '',
        '    $uptimeVal = 0',
        '    try {',
        '        $osInfo = Get-CimInstance Win32_OperatingSystem',
        '        $uptimeVal = [math]::Round((New-TimeSpan -Start $osInfo.LastBootUpTime -End (Get-Date)).TotalHours)',
        '    } catch { $uptimeVal = 0 }',
        '',
        '    $body = @{',
        '        agent_id = $AgentId',
        '        status   = "healthy"',
        '        metrics  = @{',
        '            cpu_usage    = [int]$cpuVal',
        '            memory_usage = [int]$memVal',
        '            uptime_hours = [int]$uptimeVal',
        '        }',
        '    } | ConvertTo-Json -Depth 3',
        '',
        '    try {',
        '        $null = Invoke-RestMethod -Uri "$SaasUrl/api/heartbeat" -Method POST -ContentType "application/json" -Body $body',
        '        $time = Get-Date -Format "HH:mm:ss"',
        '        Write-Host "[$time] Heartbeat sent  CPU: $($cpuVal)%  MEM: $($memVal)%" -ForegroundColor Green',
        '    } catch {',
        '        $time = Get-Date -Format "HH:mm:ss"',
        '        Write-Host "[$time] FAIL: $($_.Exception.Message)" -ForegroundColor Red',
        '    }',
        '}',
        '',
        'Write-Host "Starting heartbeat loop (Ctrl+C to stop)..." -ForegroundColor Yellow',
        'Write-Host ""',
        '',
        'while ($true) {',
        '    Send-Heartbeat',
        '    Start-Sleep -Seconds $Interval',
        '}',
      ].join('\n');

      return new NextResponse(psScript, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="openclaw-monitor.ps1"' },
      });
    }

    // Python heartbeat script - cross-platform (Windows, macOS, Linux)
    if (path === '/install-agent-py') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id') || 'YOUR_AGENT_ID';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const pyLines = [
        '#!/usr/bin/env python3',
        '"""OpenClaw Fleet Monitor - Cross-platform Heartbeat Agent"""',
        '# Agent: ' + agentId,
        '# Run: python3 openclaw-monitor.py',
        '',
        'import json, time, urllib.request, platform, os',
        '',
        'SAAS_URL = "' + baseUrl + '"',
        'AGENT_ID = "' + agentId + '"',
        'INTERVAL = ' + interval,
        '',
        'def get_cpu():',
        '    try:',
        '        if platform.system() == "Linux":',
        '            with open("/proc/stat") as f:',
        '                a = [int(x) for x in f.readline().split()[1:]]',
        '            time.sleep(1)',
        '            with open("/proc/stat") as f:',
        '                b = [int(x) for x in f.readline().split()[1:]]',
        '            d = [b[i]-a[i] for i in range(len(a))]',
        '            return int(100*(sum(d)-d[3])/max(sum(d),1))',
        '        elif platform.system() == "Darwin":',
        '            import subprocess',
        '            r = subprocess.run(["ps", "-A", "-o", "%cpu"], capture_output=True, text=True)',
        '            return min(100, int(sum(float(x) for x in r.stdout.strip().split("\\n")[1:] if x.strip()) / (os.cpu_count() or 4)))',
        '        elif platform.system() == "Windows":',
        '            import subprocess',
        '            r = subprocess.run(["wmic", "cpu", "get", "loadpercentage"], capture_output=True, text=True)',
        '            for line in r.stdout.strip().split("\\n"):',
        '                line = line.strip()',
        '                if line.isdigit(): return int(line)',
        '    except: pass',
        '    return 0',
        '',
        'def get_mem():',
        '    try:',
        '        if platform.system() == "Linux":',
        '            with open("/proc/meminfo") as f:',
        '                lines = {l.split(":")[0]: int(l.split(":")[1].strip().split()[0]) for l in f if ":" in l}',
        '            return int((lines["MemTotal"]-lines["MemAvailable"])/lines["MemTotal"]*100)',
        '        elif platform.system() == "Darwin":',
        '            import subprocess',
        '            r = subprocess.run(["vm_stat"], capture_output=True, text=True)',
        '            d = {}',
        '            for line in r.stdout.split("\\n"):',
        '                if ":" in line:',
        '                    k,v = line.split(":",1)',
        '                    d[k.strip()] = int(v.strip().rstrip("."))',
        '            active = d.get("Pages active",0)+d.get("Pages wired down",0)',
        '            total = active+d.get("Pages free",0)+d.get("Pages speculative",0)',
        '            return int(active/max(total,1)*100)',
        '        elif platform.system() == "Windows":',
        '            import subprocess',
        '            r = subprocess.run(["wmic", "os", "get", "FreePhysicalMemory,TotalVisibleMemorySize", "/value"], capture_output=True, text=True)',
        '            vals = {}',
        '            for line in r.stdout.strip().split("\\n"):',
        '                if "=" in line:',
        '                    k,v = line.strip().split("=")',
        '                    vals[k] = int(v)',
        '            if vals: return int((vals["TotalVisibleMemorySize"]-vals["FreePhysicalMemory"])/vals["TotalVisibleMemorySize"]*100)',
        '    except: pass',
        '    return 0',
        '',
        'def get_uptime():',
        '    try:',
        '        if platform.system() == "Linux":',
        '            with open("/proc/uptime") as f: return int(float(f.read().split()[0])/3600)',
        '        elif platform.system() == "Darwin":',
        '            import subprocess',
        '            r = subprocess.run(["sysctl", "-n", "kern.boottime"], capture_output=True, text=True)',
        '            import re; m = re.search(r"sec = (\\d+)", r.stdout)',
        '            if m: return int((time.time()-int(m.group(1)))/3600)',
        '        elif platform.system() == "Windows":',
        '            return int(time.monotonic()/3600)',
        '    except: pass',
        '    return 0',
        '',
        'def send_heartbeat():',
        '    cpu, mem, uptime = get_cpu(), get_mem(), get_uptime()',
        '    data = json.dumps({"agent_id": AGENT_ID, "status": "healthy", "metrics": {"cpu_usage": cpu, "memory_usage": mem, "uptime_hours": uptime}}).encode()',
        '    req = urllib.request.Request(f"{SAAS_URL}/api/heartbeat", data=data, headers={"Content-Type": "application/json"}, method="POST")',
        '    try:',
        '        with urllib.request.urlopen(req, timeout=10) as resp:',
        '            t = time.strftime("%H:%M:%S")',
        '            print(f"[{t}] Heartbeat sent  CPU: {cpu}%  MEM: {mem}%  Uptime: {uptime}h")',
        '    except Exception as e:',
        '        t = time.strftime("%H:%M:%S")',
        '        print(f"[{t}] FAIL: {e}")',
        '',
        'if __name__ == "__main__":',
        '    print()',
        '    print("  OpenClaw Fleet Monitor")',
        '    print("  --------------------------------")',
        '    print(f"  Agent:    {AGENT_ID}")',
        '    print(f"  SaaS:     {SAAS_URL}")',
        '    print(f"  Interval: {INTERVAL}s")',
        '    print(f"  OS:       {platform.system()} {platform.machine()}")',
        '    print()',
        '    print("Starting heartbeat loop (Ctrl+C to stop)...")',
        '    print()',
        '    while True:',
        '        send_heartbeat()',
        '        time.sleep(INTERVAL)',
      ].join('\n');

      return new NextResponse(pyLines, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="openclaw-monitor.py"' },
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

    // ============ STALE AGENT CRON ============
    if (path === '/cron/check-stale') {
      const db = await getDb();
      const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 min
      const staleAgents = await db.collection('agents').find({
        status: { $in: ['healthy', 'idle'] },
        last_heartbeat: { $lt: staleThreshold.toISOString() }
      }).toArray();

      let updated = 0;
      for (const agent of staleAgents) {
        await db.collection('agents').updateOne({ id: agent.id }, { $set: { status: 'offline', updated_at: new Date().toISOString() } });
        const existingAlert = await db.collection('alerts').findOne({ agent_id: agent.id, type: 'downtime', resolved: false });
        if (!existingAlert) {
          await db.collection('alerts').insertOne({
            id: uuidv4(), agent_id: agent.id, agent_name: agent.name, user_id: agent.user_id,
            type: 'downtime', message: `Agent offline - no heartbeat for 10+ minutes`, resolved: false,
            created_at: new Date().toISOString(),
          });
        }
        updated++;
      }
      return json({ checked: staleAgents.length, updated, timestamp: new Date().toISOString() });
    }

    // ============ BILLING / SUBSCRIPTION ============
    if (path === '/billing') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      const sub = await db.collection('subscriptions').findOne({ user_id: user.id, status: { $ne: 'cancelled' } });
      const agentCount = await db.collection('agents').countDocuments({ user_id: user.id });
      return json({
        subscription: sub || { plan: 'free', status: 'active' },
        agent_count: agentCount,
        limits: {
          free: { max_agents: 1, alerts: false, teams: false },
          pro: { max_agents: -1, alerts: true, teams: true },
          enterprise: { max_agents: -1, alerts: true, teams: true, custom_policies: true, sso: true },
        }
      });
    }

    // ============ TEAM MANAGEMENT ============
    if (path === '/team') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const db = await getDb();
      let team = await db.collection('teams').findOne({ $or: [{ owner_id: user.id }, { 'members.user_id': user.id }] });
      if (!team) {
        team = { id: uuidv4(), name: `${user.email?.split('@')[0]}'s Team`, owner_id: user.id, members: [{ user_id: user.id, email: user.email, role: 'owner', joined_at: new Date().toISOString() }], created_at: new Date().toISOString() };
        await db.collection('teams').insertOne(team);
      }
      return json({ team });
    }

    return json({ error: 'Not found' }, 404);
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
