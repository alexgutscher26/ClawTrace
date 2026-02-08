import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import { encrypt, decrypt } from '@/lib/encryption';

const decryptAgent = (a) => {
  if (!a) return a;
  const decrypted = { ...a };
  try {
    if (a.config_json) {
      const d = decrypt(a.config_json);
      decrypted.config_json = d ? JSON.parse(d) : a.config_json;
    }
    if (a.agent_secret) decrypted.agent_secret = decrypt(a.agent_secret);
  } catch (e) {
    console.error('Failed to decrypt agent:', a.id, e);
  }
  return decrypted;
};

const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret-for-development-only');

const RATE_LIMIT_CONFIG = {
  free: {
    global: { capacity: 60, refillRate: 1 }, // 60 req / min
    handshake: { capacity: 5, refillRate: 5 / 600 }, // 5 req / 10 min
    heartbeat: { capacity: 3, refillRate: 1 / 300 }, // 1 req / 5 min
  },
  pro: {
    global: { capacity: 600, refillRate: 10 }, // 600 req / min
    handshake: { capacity: 50, refillRate: 50 / 600 }, // 50 req / 10 min
    heartbeat: { capacity: 10, refillRate: 1 / 60 }, // 1 req / min
  }
};

async function getTier(userId) {
  if (!userId) return 'free';
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle();
  return data?.plan || 'free';
}

async function checkRateLimit(request, identifier, type = 'global', userId = null) {
  const tier = await getTier(userId);
  const config = RATE_LIMIT_CONFIG[tier][type] || RATE_LIMIT_CONFIG.free[type];
  const now = Date.now() / 1000; // seconds

  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('path', type)
    .maybeSingle();

  let bucket = data?.bucket || { tokens: config.capacity, last_refill: now };

  if (data) {
    const elapsed = now - bucket.last_refill;
    bucket.tokens = Math.min(config.capacity, bucket.tokens + (elapsed * config.refillRate));
    bucket.last_refill = now;
  }

  if (bucket.tokens < 1) {
    return {
      allowed: false,
      response: json({
        error: 'Too many requests',
        type,
        retry_after: Math.ceil((1 - bucket.tokens) / config.refillRate)
      }, 429)
    };
  }

  bucket.tokens -= 1;

  if (data) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ bucket, updated_at: new Date().toISOString() })
      .eq('id', data.id);
  } else {
    await supabaseAdmin
      .from('rate_limits')
      .insert({ identifier, path: type, bucket });
  }

  return { allowed: true };
}

async function createAgentToken(agentId, fleetId) {
  return await new SignJWT({ agent_id: agentId, fleet_id: fleetId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Tokens expire in 24 hours
    .sign(JWT_SECRET);
}

async function verifyAgentToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

/**
 * Handle GET requests for various API endpoints and return appropriate responses.
 *
 * This function processes incoming requests, checks rate limits, and serves different responses based on the request path.
 * It includes health checks, agent installation scripts, and user-related data retrieval, while managing session tokens and error handling.
 *
 * @param request - The incoming request object.
 * @param context - The context object containing parameters and other relevant data.
 * @returns A JSON response based on the requested path and processed data.
 * @throws Error If an internal error occurs during processing.
 */
export async function GET(request, context) {
  const params = await context.params;
  const path = getPath(params);
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // Global IP Rate Limit
    const globalLimit = await checkRateLimit(request, ip, 'global');
    if (!globalLimit.allowed) return globalLimit.response;

    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Serve a shell-based heartbeat script for easy install (Linux + macOS)
    if (path === '/install-agent') {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agent_id');
      const agentSecret = searchParams.get('agent_secret');

      if (!agentId || !agentSecret) {
        return json({ error: 'Missing agent_id or agent_secret parameter' }, 400);
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const script = `#!/bin/bash
# OpenClaw Fleet Monitor - Heartbeat Agent (Linux & macOS)
# Auto-generated for agent: ${agentId}
# Usage: curl -sL "${baseUrl}/api/install-agent?agent_id=${agentId}&agent_secret=${agentSecret}" | bash

SAAS_URL="${baseUrl}"
AGENT_ID="${agentId}"
AGENT_SECRET="${agentSecret}"
INTERVAL=${interval}
SESSION_TOKEN=""
GATEWAY_URL=""

echo ""
echo "  OpenClaw Fleet Monitor"
echo "  ─────────────────────────────"
echo "  Agent:    $AGENT_ID"
echo "  SaaS:     $SAAS_URL"
echo "  Interval: \${INTERVAL}s"
echo "  OS:       $(uname -s) $(uname -m)"
echo ""

perform_handshake() {
  echo "[$(date +%H:%M:%S)] Performing handshake..."
  RESPONSE=$(curl -s -X POST "\${SAAS_URL}/api/agents/handshake" \\
    -H "Content-Type: application/json" \\
    -d "{\\"agent_id\\":\\"$AGENT_ID\\",\\"agent_secret\\":\\"$AGENT_SECRET\\"}")
  
  # Extract token and gateway_url using simple grep/cut
  SESSION_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  GATEWAY_URL=$(echo "$RESPONSE" | grep -o '"gateway_url":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$SESSION_TOKEN" ]; then
    echo "[$(date +%H:%M:%S)] Handshake successful"
    if [ -n "$GATEWAY_URL" ]; then echo -e "   \\033[0;36mProbing active: $GATEWAY_URL\\033[0m"; fi
    return 0
  else
    echo "[$(date +%H:%M:%S)] Handshake failed: $RESPONSE"
    return 1
  fi
}

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

  if [ -z "$SESSION_TOKEN" ]; then
    perform_handshake || return 1
  fi

  STATUS="healthy"
  LATENCY=0
  if [ -n "$GATEWAY_URL" ]; then
    START=$(date +%s%3N)
    if curl -s -f -I -m 5 "$GATEWAY_URL" > /dev/null; then
      END=$(date +%s%3N)
      LATENCY=$((END - START))
    else
      STATUS="error"
    fi
  fi

  CPU=$(get_cpu)
  MEM=$(get_mem)
  UPTIME_H=$(get_uptime_hours)

  # Ensure numeric values
  CPU=\${CPU:-0}
  MEM=\${MEM:-0}
  UPTIME_H=\${UPTIME_H:-0}

  # Update URL to use /api/heartbeat with token
  RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST "\${SAAS_URL}/api/heartbeat" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $SESSION_TOKEN" \\
    -d "{\\"agent_id\\":\\"$AGENT_ID\\",\\"status\\":\\"$STATUS\\",\\"metrics\\":{\\"cpu_usage\\":$CPU,\\"memory_usage\\":$MEM,\\"uptime_hours\\":$UPTIME_H,\\"latency_ms\\":$LATENCY}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [ "$HTTP_CODE" = "200" ]; then
    # Use green for healthy, red for error
    COLOR="\\033[0;32m"
    if [ "$STATUS" = "error" ]; then
      COLOR="\\033[0;31m"
      echo -e "\\033[0;31m[$(date +%H:%M:%S)] WARNING: Gateway probe failed ($GATEWAY_URL)\\033[0m"
    fi
    echo -e "\${COLOR}[$(date +%H:%M:%S)] Heartbeat sent (\${STATUS^^})  CPU: \${CPU}%  MEM: \${MEM}%  Latency: \${LATENCY}ms\\033[0m"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "[$(date +%H:%M:%S)] Session expired, retrying..."
    SESSION_TOKEN=""
    send_heartbeat
  else
    echo "[$(date +%H:%M:%S)] Failed ($HTTP_CODE): $BODY"
  fi
}

echo "Initializing agent session..."
perform_handshake || exit 1
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
      const agentId = searchParams.get('agent_id');
      const agentSecret = searchParams.get('agent_secret');

      if (!agentId || !agentSecret) {
        return json({ error: 'Missing agent_id or agent_secret parameter' }, 400);
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
      const interval = searchParams.get('interval') || '300';

      const psScript = [
        '# OpenClaw Fleet Monitor - PowerShell Heartbeat Agent',
        '# Agent: ' + agentId,
        '# Run: powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1',
        '',
        '$SaasUrl = "' + baseUrl + '"',
        '$AgentId = "' + agentId + '"',
        '$AgentSecret = "' + agentSecret + '"',
        '$Interval = ' + interval,
        '$SessionToken = $null',
        '$GatewayUrl = $null',
        '',
        'Write-Host ""',
        'Write-Host "  OpenClaw Fleet Monitor" -ForegroundColor Green',
        'Write-Host "  --------------------------------"',
        'Write-Host "  Agent:    $AgentId"',
        'Write-Host "  SaaS:     $SaasUrl"',
        'Write-Host "  Interval: $($Interval)s"',
        'Write-Host "  Gateway:  $(if ($GatewayUrl) { $GatewayUrl } else { "N/A (Probing Disabled)" })"',
        'Write-Host ""',
        '',
        'function Perform-Handshake {',
        '    Write-Host "[$(Get-Date -Format "HH:mm:ss")] Performing handshake..."',
        '    $body = @{ agent_id = $AgentId; agent_secret = $AgentSecret } | ConvertTo-Json',
        '    try {',
        '        $res = Invoke-RestMethod -Uri "$SaasUrl/api/agents/handshake" -Method POST -Body $body -ContentType "application/json"',
        '        if ($res.token) {',
        '            $script:SessionToken = $res.token',
        '            $script:GatewayUrl = $res.gateway_url',
        '            Write-Host "[$(Get-Date -Format "HH:mm:ss")] Handshake successful" -ForegroundColor Green',
        '            if ($GatewayUrl) { Write-Host "   Probing active: $GatewayUrl" -ForegroundColor Cyan }',
        '            return $true',
        '        }',
        '    } catch {',
        '        Write-Host "[$(Get-Date -Format "HH:mm:ss")] Handshake failed: $($_.Exception.Message)" -ForegroundColor Red',
        '    }',
        '    return $false',
        '}',
        '',
        'function Send-Heartbeat {',
        '    if (-not $SessionToken) {',
        '        if (-not (Perform-Handshake)) { return }',
        '    }',
        '    ',
        '    $status = "healthy"',
        '    $latency = 0',
        '    if ($GatewayUrl) {',
        '        try {',
        '            $start = Get-Date',
        '            $resp = Invoke-WebRequest -Uri $GatewayUrl -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop',
        '            $latency = [math]::Round(((Get-Date) - $start).TotalMilliseconds)',
        '        } catch {',
        '            $latency = [math]::Round(((Get-Date) - $start).TotalMilliseconds)',
        '            if ($_.Exception.Response) {',
        '                $status = "healthy" # HTTP Error (4xx/5xx) means service IS reachable',
        '            } else {',
        '                $status = "error" # Network Error means service is DOWN',
        '                $latency = 0',
        '            }',
        '        }',
        '    }',
        '',
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
        '    # Get machine ID (hostname)',
        '    $machineId = $env:COMPUTERNAME',
        '',
        '    # Guess location from timezone',
        '    $location = "unknown"',
        '    try {',
        '        $tz = [System.TimeZoneInfo]::Local.Id',
        '        if ($tz -match "Pacific") { $location = "us-west" }',
        '        elseif ($tz -match "Mountain") { $location = "us-mountain" }',
        '        elseif ($tz -match "Central") { $location = "us-central" }',
        '        elseif ($tz -match "Eastern") { $location = "us-east" }',
        '        elseif ($tz -match "GMT|UTC") { $location = "eu-west" }',
        '        elseif ($tz -match "Europe") { $location = "eu-central" }',
        '        elseif ($tz -match "Asia") { $location = "ap-southeast" }',
        '    } catch { }',
        '',
        '    $body = @{',
        '        agent_id   = $AgentId',
        '        status     = $status',
        '        machine_id = $machineId',
        '        location   = $location',
        '        metrics    = @{',
        '            cpu_usage    = [int]$cpuVal',
        '            memory_usage = [int]$memVal',
        '            uptime_hours = [int]$uptimeVal',
        '            latency_ms   = [int]$latency',
        '        }',
        '    } | ConvertTo-Json -Depth 3',
        '',
        '    try {',
        '        $headers = @{ Authorization = "Bearer $SessionToken" }',
        '        $null = Invoke-RestMethod -Uri "$SaasUrl/api/heartbeat" -Method POST -ContentType "application/json" -Body $body -Headers $headers',
        '        $time = Get-Date -Format "HH:mm:ss"',
        '        $statusColor = if ($status -eq "healthy") { "Green" } else { "Red" }',
        '        if ($status -eq "error") {',
        '            Write-Host "[$time] WARNING: Gateway probe failed ($GatewayUrl)" -ForegroundColor Red',
        '        }',
        '        Write-Host "[$time] Heartbeat sent ($($status.ToUpper()))  CPU: $($cpuVal)%  MEM: $($memVal)%  Latency: $($latency)ms" -ForegroundColor $statusColor',
        '    } catch {',
        '        $time = Get-Date -Format "HH:mm:ss"',
        '        if ($_.Exception.Response.StatusCode -eq 401) {',
        '            Write-Host "[$time] Session expired, retrying..." -ForegroundColor Yellow',
        '            $script:SessionToken = $null',
        '            Send-Heartbeat',
        '        } else {',
        '            Write-Host "[$time] FAIL: $($_.Exception.Message)" -ForegroundColor Red',
        '        }',
        '    }',
        '}',
        '',
        'if (Perform-Handshake) {',
        '    Write-Host "Starting heartbeat loop (Ctrl+C to stop)..." -ForegroundColor Yellow',
        '    Write-Host ""',
        '    while ($true) {',
        '        Send-Heartbeat',
        '        Start-Sleep -Seconds $Interval',
        '    }',
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
      const agentId = searchParams.get('agent_id');
      const agentSecret = searchParams.get('agent_secret');

      if (!agentId || !agentSecret) {
        return json({ error: 'Missing agent_id or agent_secret parameter' }, 400);
      }

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
        'AGENT_SECRET = "' + agentSecret + '"',
        'INTERVAL = ' + interval + '\nSESSION_TOKEN = None\nGATEWAY_URL = None\n',
        '',
        'def perform_handshake():',
        '    global SESSION_TOKEN, GATEWAY_URL',
        '    data = json.dumps({"agent_id": AGENT_ID, "agent_secret": AGENT_SECRET}).encode()',
        '    req = urllib.request.Request(f"{SAAS_URL}/api/agents/handshake", data=data, headers={"Content-Type": "application/json"}, method="POST")',
        '    try:',
        '        with urllib.request.urlopen(req, timeout=10) as resp:\n            res = json.loads(resp.read().decode())\n            SESSION_TOKEN = res.get("token")\n            GATEWAY_URL = res.get("gateway_url")\n            print(f"[{time.strftime(\'%H:%M:%S\')}] Handshake successful")\n            if GATEWAY_URL: print(f"   \\033[96mProbing active: {GATEWAY_URL}\\033[0m")\n            return True',
        '    except Exception as e:',
        '        print(f"[{time.strftime(\'%H:%M:%S\')}] Handshake failed: {e}")',
        '        return False',
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
        '    global SESSION_TOKEN',
        '    if not SESSION_TOKEN:\n        if not perform_handshake(): return\n\n    status = "healthy"\n    latency = 0\n    if GATEWAY_URL:\n        try:\n            start = time.time()\n            urllib.request.urlopen(GATEWAY_URL, timeout=5)\n            latency = int((time.time() - start) * 1000)\n        except:\n            status = "error"\n\n    cpu, mem, uptime = get_cpu(), get_mem(), get_uptime()\n    data = json.dumps({"agent_id": AGENT_ID, "status": status, "metrics": {"cpu_usage": cpu, "memory_usage": mem, "uptime_hours": uptime, "latency_ms": latency}}).encode()\n',
        '    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {SESSION_TOKEN}"}',
        '    req = urllib.request.Request(f"{SAAS_URL}/api/heartbeat", data=data, headers=headers, method="POST")',
        '    try:',
        '        with urllib.request.urlopen(req, timeout=10) as resp:',
        '            t = time.strftime("%H:%M:%S")',
        '            st_upper = status.upper()',
        '            if status == "error":',
        '                print(f"[{t}] \\033[91mWARNING: Gateway probe failed ({GATEWAY_URL})\\033[0m")',
        '                print(f"[{t}] \\033[91mHeartbeat sent ({st_upper})  CPU: {cpu}%  MEM: {mem}%  Latency: {latency}ms\\033[0m")',
        '            else:',
        '                print(f"[{t}] \\033[92mHeartbeat sent ({st_upper})  CPU: {cpu}%  MEM: {mem}%  Latency: {latency}ms\\033[0m")',
        '    except urllib.error.HTTPError as e:',
        '        if e.code == 401:',
        '            print(f"[{time.strftime(\'%H:%M:%S\')}] Session expired, retrying...")',
        '            SESSION_TOKEN = None',
        '            send_heartbeat()',
        '        else: print(f"[{time.strftime(\'%H:%M:%S\')}] FAIL: {e}")',
        '    except Exception as e:',
        '        print(f"[{time.strftime(\'%H:%M:%S\')}] FAIL: {e}")',
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
        '    if perform_handshake():',
        '        print("Starting heartbeat loop (Ctrl+C to stop)...")',
        '        print()',
        '        while True:',
        '            send_heartbeat()',
        '            time.sleep(INTERVAL)',
        '    else:',
        '        print("Fatal: Initial handshake failed. Exiting.")',
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
      const { data: fleets, error } = await supabaseAdmin
        .from('fleets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ fleets });
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { searchParams } = new URL(request.url);
      const fleet_id = searchParams.get('fleet_id');
      let query = supabaseAdmin.from('agents').select('*').eq('user_id', user.id);
      if (fleet_id) query = query.eq('fleet_id', fleet_id);
      const { data: agents, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return json({ agents: agents.map(decryptAgent) });
    }

    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agentMatch[1])
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent: decryptAgent(agent) });
    }

    if (path === '/alerts') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: alerts, error } = await supabaseAdmin
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ alerts });
    }

    if (path === '/dashboard/stats') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      const [agentsRes, fleetsRes, alertsRes] = await Promise.all([
        supabaseAdmin.from('agents').select('*').eq('user_id', user.id),
        supabaseAdmin.from('fleets').select('*').eq('user_id', user.id),
        supabaseAdmin.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('resolved', false)
      ]);

      const agents = agentsRes.data || [];
      const fleets = fleetsRes.data || [];
      const unresolvedAlerts = alertsRes.count || 0;

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

    // ============ STALE AGENT CRON (MOVED TO /api/cron/check-stale) ============
    // Logic migrated to specialized route handler: app/api/cron/check-stale/route.js


    // ============ BILLING / SUBSCRIPTION ============
    if (path === '/billing') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .maybeSingle();
      const { count: agentCount } = await supabaseAdmin
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
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

      let { data: team, error } = await supabaseAdmin
        .from('teams')
        .select('*')
        .or(`owner_id.eq.${user.id},members.cs.[{"user_id":"${user.id}"}]`)
        .maybeSingle();

      if (!team && !error) {
        team = {
          id: uuidv4(),
          name: `${user.email?.split('@')[0]}'s Team`,
          owner_id: user.id,
          members: [{ user_id: user.id, email: user.email, role: 'owner', joined_at: new Date().toISOString() }],
          created_at: new Date().toISOString()
        };
        await supabaseAdmin.from('teams').insert(team);
      }
      return json({ team });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('GET Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function POST(request, context) {
  const params = await context.params;
  const path = getPath(params);
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // Global IP Rate Limit
    const globalLimit = await checkRateLimit(request, ip, 'global');
    if (!globalLimit.allowed) return globalLimit.response;

    if (path === '/fleets') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const fleet = {
        id: uuidv4(),
        user_id: user.id,
        name: body.name || 'My Fleet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('fleets').insert(fleet);
      if (error) throw error;
      return json({ fleet }, 201);
    }

    if (path === '/agents') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const plainSecret = uuidv4();
      const agent = {
        id: uuidv4(),
        fleet_id: body.fleet_id,
        user_id: user.id,
        name: body.name || 'New Agent',
        gateway_url: body.gateway_url || '',
        status: 'idle',
        last_heartbeat: null,
        config_json: encrypt(body.config_json || { profile: 'dev', skills: ['code', 'search'], model: 'gpt-4', data_scope: 'full' }),
        metrics_json: { latency_ms: 0, tasks_completed: 0, errors_count: 0, uptime_hours: 0, cost_usd: 0, cpu_usage: 0, memory_usage: 0 },
        machine_id: body.machine_id || '',
        location: body.location || '',
        model: body.model || 'gpt-4',
        agent_secret: JSON.stringify(encrypt(plainSecret)), // Secure auto-generated secret
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('agents').insert(agent);
      if (error) throw error;

      // Return plaintext to the UI
      return json({
        agent: {
          ...agent,
          agent_secret: plainSecret,
          config_json: body.config_json || { profile: 'dev', skills: ['code', 'search'], model: 'gpt-4', data_scope: 'full' }
        }
      }, 201);
    }

    const restartMatch = path.match(/^\/agents\/([^/]+)\/restart$/);
    if (restartMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .update({ status: 'idle', last_heartbeat: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', restartMatch[1])
        .eq('user_id', user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent, message: 'Agent restart initiated' });
    }

    if (path === '/agents/handshake') {
      const body = await request.json();

      // Get agent's owner for tier-based handshake limit
      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('id, fleet_id, agent_secret, user_id, gateway_url')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);

      // Route-specific handshake limit
      const handshakeLimit = await checkRateLimit(request, agent.id, 'handshake', agent.user_id);
      if (!handshakeLimit.allowed) return handshakeLimit.response;

      // Simple secret check (Option B uses secret for handshake)
      const decryptedSecret = decrypt(agent.agent_secret);
      if (!decryptedSecret || decryptedSecret !== body.agent_secret) {
        return json({ error: 'Invalid agent secret' }, 401);
      }

      const token = await createAgentToken(agent.id, agent.fleet_id);
      return json({ token, expires_in: 86400, gateway_url: agent.gateway_url });
    }

    if (path === '/heartbeat') {
      const body = await request.json();

      // Verify JWT
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Missing or invalid session token' }, 401);
      }

      const token = authHeader.split(' ')[1];
      const payload = await verifyAgentToken(token);

      if (!payload || payload.agent_id !== body.agent_id) {
        return json({ error: 'Invalid or expired session' }, 401);
      }

      // Route-specific heartbeat limit
      const heartbeatLimit = await checkRateLimit(request, payload.agent_id, 'heartbeat');
      if (!heartbeatLimit.allowed) return heartbeatLimit.response;

      const { data: agent, error: fetchError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', body.agent_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!agent) return json({ error: 'Agent not found' }, 404);

      const update = {
        status: body.status || 'healthy',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (body.metrics) {
        // Calculate uptime based on agent creation time (not machine uptime)
        const createdAt = new Date(agent.created_at);
        const now = new Date();
        const uptimeHours = Math.floor((now - createdAt) / (1000 * 60 * 60));

        // Calculate cost based on model pricing (cost per task)
        // Pricing estimates based on typical task size (~1K input, ~500 output tokens)
        const MODEL_PRICING = {
          // Anthropic Claude models
          'claude-opus-4.5': 0.0338,        // $15/$75 per M tokens → ~$0.034/task
          'claude-sonnet-4': 0.0090,        // $3/$15 per M tokens → ~$0.009/task
          'claude-3': 0.0090,               // Same as Sonnet 4
          'claude-haiku': 0.0015,           // Budget Claude option

          // OpenAI GPT models
          'gpt-4o': 0.0090,                 // $2.50/$10 per M tokens → ~$0.009/task
          'gpt-4o-mini': 0.0004,            // $0.15/$0.60 per M tokens → ~$0.0004/task
          'gpt-4': 0.0180,                  // Legacy GPT-4 (more expensive)
          'gpt-3.5-turbo': 0.0010,          // $0.50/$1.50 per M tokens → ~$0.001/task

          // Google Gemini models
          'gemini-3-pro': 0.0056,           // $1.25/$10 per M tokens → ~$0.0056/task
          'gemini-2-flash': 0.0015,         // Budget Gemini option

          // xAI Grok models
          'grok-4.1-mini': 0.0004,          // $0.20/$0.50 per M tokens → ~$0.0004/task
          'grok-2': 0.0030,                 // Mid-tier Grok

          // Open-source models (via haimaker.ai or self-hosted)
          'llama-3.3-70b': 0.0003,          // ~$0.10-$0.50 per M tokens → ~$0.0003/task
          'llama-3': 0.0003,                // Same as above
          'qwen-2.5-72b': 0.0003,           // Similar to Llama pricing
          'mistral-large': 0.0020,          // ~$1/$5 per M tokens → ~$0.002/task
          'mistral-medium': 0.0010,         // Budget Mistral
          'deepseek-v3': 0.0002,            // Very cheap open-source

          // Legacy/fallback
          'gpt-4-turbo': 0.0120,            // Between GPT-4 and GPT-4o
        };

        const costPerTask = MODEL_PRICING[agent.model] || 0.01; // Default $0.01
        const newTasksCompleted = (agent.metrics_json?.tasks_completed || 0) + 1;
        const totalCost = parseFloat((newTasksCompleted * costPerTask).toFixed(4));

        // Merge incoming metrics and increment tasks_completed
        update.metrics_json = {
          ...agent.metrics_json,
          ...body.metrics,
          tasks_completed: newTasksCompleted,
          // Increment errors_count if status is 'error'
          errors_count: (body.status === 'error')
            ? (agent.metrics_json?.errors_count || 0) + 1
            : (agent.metrics_json?.errors_count || 0),
          // Override uptime_hours with calculated value
          uptime_hours: uptimeHours,
          // Calculate cost based on model and tasks
          cost_usd: totalCost
        };
      }

      // Update machine_id and location if provided
      if (body.machine_id) update.machine_id = body.machine_id;
      if (body.location) update.location = body.location;

      const { error } = await supabaseAdmin.from('agents').update(update).eq('id', body.agent_id);
      if (error) throw error;
      return json({ message: 'Heartbeat received', status: update.status });
    }

    const resolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
    if (resolveMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { error } = await supabaseAdmin
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', resolveMatch[1])
        .eq('user_id', user.id);
      if (error) throw error;
      return json({ message: 'Alert resolved' });
    }

    if (path === '/seed-demo') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      let { data: fleets } = await supabaseAdmin.from('fleets').select('*').eq('user_id', user.id);
      let fleet;
      if (!fleets || fleets.length === 0) {
        fleet = { id: uuidv4(), user_id: user.id, name: 'Production Fleet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await supabaseAdmin.from('fleets').insert(fleet);
      } else {
        fleet = fleets[0];
      }

      await supabaseAdmin.from('agents').delete().eq('user_id', user.id);
      await supabaseAdmin.from('alerts').delete().eq('user_id', user.id);

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
      await supabaseAdmin.from('agents').insert(agentDocs);

      const demoAlerts = [
        { agent_id: agentDocs[3].id, agent_name: 'delta-monitor', type: 'high-error', message: 'Error rate exceeded threshold: 28 errors in 24h', resolved: false },
        { agent_id: agentDocs[4].id, agent_name: 'epsilon-analyst', type: 'downtime', message: 'Agent offline - no heartbeat for 2 hours', resolved: false },
        { agent_id: agentDocs[0].id, agent_name: 'alpha-coder', type: 'high-latency', message: 'Avg latency exceeded 500ms for 5 minutes', resolved: true, resolved_at: new Date(now - 3600000).toISOString() },
      ];
      const alertDocs = demoAlerts.map(a => ({
        id: uuidv4(), user_id: user.id, ...a,
        created_at: new Date(now - Math.random() * 86400000).toISOString(),
      }));
      await supabaseAdmin.from('alerts').insert(alertDocs);

      return json({ message: 'Demo data loaded', agents: agentDocs.length, alerts: alertDocs.length });
    }

    // ============ LEMON SQUEEZY CHECKOUT ============
    if (path === '/billing/checkout') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const plan = body.plan || 'pro';
      const LEMON_KEY = process.env.LEMON_SQUEEZY_API_KEY;
      const STORE_ID = '139983';
      const VARIANT_ID = '626520';

      try {
        const checkoutRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LEMON_KEY}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
          body: JSON.stringify({
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  email: user.email,
                  custom: { user_id: user.id, plan: plan }
                },
                product_options: {
                  name: plan === 'enterprise' ? 'OpenClaw Fleet Enterprise' : 'OpenClaw Fleet Pro',
                  description: plan === 'enterprise' ? 'Unlimited agents, custom policies, SSO, priority support' : 'Unlimited agents, alerts, team collaboration',
                },
              },
              relationships: {
                store: { data: { type: 'stores', id: STORE_ID } },
                variant: { data: { type: 'variants', id: VARIANT_ID } },
              }
            }
          }),
        });
        const checkoutData = await checkoutRes.json();
        const checkoutUrl = checkoutData?.data?.attributes?.url;
        if (!checkoutUrl) return json({ error: 'Failed to create checkout' }, 500);
        return json({ checkout_url: checkoutUrl, plan });
      } catch (err) {
        console.error('Lemon Squeezy error:', err);
        return json({ error: 'Payment service unavailable' }, 500);
      }
    }

    // ============ LEMON SQUEEZY WEBHOOK ============
    if (path === '/webhooks/lemonsqueezy') {
      const body = await request.json();
      const eventName = body?.meta?.event_name;
      const customData = body?.meta?.custom_data || {};

      if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
        const attrs = body?.data?.attributes || {};
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: customData.user_id,
          plan: customData.plan || 'pro',
          status: attrs.status === 'active' ? 'active' : attrs.status,
          lemon_subscription_id: body?.data?.id,
          customer_id: attrs.customer_id,
          variant_id: attrs.variant_id,
          current_period_end: attrs.renews_at,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('user_id', customData.user_id);
      }

      return json({ received: true });
    }

    // ============ TEAM INVITE ============
    if (path === '/team/invite') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: team } = await supabaseAdmin.from('teams').select('*').eq('owner_id', user.id).maybeSingle();
      if (!team) return json({ error: 'Only team owners can invite members' }, 403);

      const existing = team.members?.find(m => m.email === body.email);
      if (existing) return json({ error: 'Member already in team' }, 409);

      const newMembers = [...(team.members || []), { user_id: null, email: body.email, role: body.role || 'member', invited_by: user.id, joined_at: new Date().toISOString() }];
      await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

      return json({ message: `Invited ${body.email}` }, 201);
    }

    // ============ TEAM REMOVE MEMBER ============
    if (path === '/team/remove') {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: team } = await supabaseAdmin.from('teams').select('*').eq('owner_id', user.id).maybeSingle();
      if (!team) return json({ error: 'Only team owners can remove members' }, 403);
      if (body.email === user.email) return json({ error: 'Cannot remove yourself' }, 400);

      const newMembers = team.members?.filter(m => m.email !== body.email) || [];
      await supabaseAdmin.from('teams').update({ members: newMembers }).eq('id', team.id);

      return json({ message: `Removed ${body.email}` });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('POST Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function PUT(request, context) {
  const params = await context.params;
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const updateFields = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) updateFields.name = body.name;
      if (body.gateway_url !== undefined) updateFields.gateway_url = body.gateway_url;
      if (body.config_json !== undefined) updateFields.config_json = encrypt(body.config_json);
      if (body.machine_id !== undefined) updateFields.machine_id = body.machine_id;
      if (body.location !== undefined) updateFields.location = body.location;
      if (body.model !== undefined) updateFields.model = body.model;
      if (body.status !== undefined) updateFields.status = body.status;

      const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .update(updateFields)
        .eq('id', agentMatch[1])
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!agent) return json({ error: 'Agent not found' }, 404);
      return json({ agent: decryptAgent(agent) });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      const { data: fleet, error } = await supabaseAdmin
        .from('fleets')
        .update({ name: body.name, updated_at: new Date().toISOString() })
        .eq('id', fleetMatch[1])
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!fleet) return json({ error: 'Fleet not found' }, 404);
      return json({ fleet });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('PUT Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  const params = await context.params;
  const path = getPath(params);
  try {
    const agentMatch = path.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { error: deleteError } = await supabaseAdmin.from('agents').delete().eq('id', agentMatch[1]).eq('user_id', user.id);
      if (deleteError) throw deleteError;
      await supabaseAdmin.from('alerts').delete().eq('agent_id', agentMatch[1]).eq('user_id', user.id);
      return json({ message: 'Agent deleted' });
    }

    const fleetMatch = path.match(/^\/fleets\/([^/]+)$/);
    if (fleetMatch) {
      const user = await getUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      await supabaseAdmin.from('agents').delete().eq('fleet_id', fleetMatch[1]).eq('user_id', user.id);
      await supabaseAdmin.from('alerts').delete().eq('fleet_id', fleetMatch[1]).eq('user_id', user.id);
      const { error: deleteError } = await supabaseAdmin.from('fleets').delete().eq('id', fleetMatch[1]).eq('user_id', user.id);
      if (deleteError) throw deleteError;
      return json({ message: 'Fleet and associated agents deleted' });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('DELETE Error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
