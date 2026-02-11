# ClawTrace Agent - PowerShell Heartbeat Agent
# Agent: {{AGENT_ID}}
# Run: powershell -ExecutionPolicy Bypass -File clawtrace-agent.ps1

$SaasUrl = "{{BASE_URL}}"
$AgentId = "{{AGENT_ID}}"
$AgentSecret = "{{AGENT_SECRET}}"

if ([string]::IsNullOrEmpty($AgentSecret)) {
    $AgentSecret = $env:CLAWTRACE_AGENT_SECRET
}
if ([string]::IsNullOrEmpty($AgentSecret)) {
    Write-Host "Error: AGENT_SECRET is not set. Please set CLAWTRACE_AGENT_SECRET environment variable." -ForegroundColor Red
    exit 1
}

$Interval = {{INTERVAL}}
$SessionToken = $null
$GatewayUrl = $null

Write-Host ""
Write-Host "  ClawTrace Agent" -ForegroundColor Green
Write-Host "  --------------------------------"
Write-Host "  Agent:    $AgentId"
Write-Host "  SaaS:     $SaasUrl"
Write-Host "  Interval: $($Interval)s"
Write-Host "  Gateway:  $(if ($GatewayUrl) { $GatewayUrl } else { "N/A (Probing Disabled)" })"
Write-Host ""

function Perform-Handshake {
    Write-Host "[$(Get-Date -Format "HH:mm:ss")] Performing handshake..."
    $timestamp = [int]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($AgentSecret)
    $sigBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($AgentId + $timestamp))
    $signature = [System.BitConverter]::ToString($sigBytes).Replace("-","").ToLower()

    $body = @{ agent_id = $AgentId; timestamp = "$timestamp"; signature = $signature } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$SaasUrl/api/agents/handshake" -Method POST -Body $body -ContentType "application/json"
        if ($res.token) {
            $script:SessionToken = $res.token
            $script:GatewayUrl = $res.gateway_url
            Write-Host "[$(Get-Date -Format "HH:mm:ss")] Handshake successful" -ForegroundColor Green
            if ($GatewayUrl) { Write-Host "   Probing active: $GatewayUrl" -ForegroundColor Cyan }
            return $true
        }
    } catch {
        Write-Host "[$(Get-Date -Format "HH:mm:ss")] Handshake failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    return $false
}

function Send-Heartbeat {
    if (-not $SessionToken) {
        if (-not (Perform-Handshake)) { return }
    }

    $status = "healthy"
    $latency = 0
    if ($GatewayUrl) {
        try {
            $start = Get-Date
            $resp = Invoke-WebRequest -Uri $GatewayUrl -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            $latency = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        } catch {
            $latency = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
            if ($_.Exception.Response) {
                $status = "healthy" # HTTP Error (4xx/5xx) means service IS reachable
            } else {
                $status = "error" # Network Error means service is DOWN
                $latency = 0
            }
        }
    }

    $cpuVal = 0
    try {
        $cpuVal = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)
    } catch { $cpuVal = 0 }

    $memVal = 0
    try {
        $osInfo = Get-CimInstance Win32_OperatingSystem
        $memVal = [math]::Round(($osInfo.TotalVisibleMemorySize - $osInfo.FreePhysicalMemory) / $osInfo.TotalVisibleMemorySize * 100)
    } catch { $memVal = 0 }

    $uptimeVal = 0
    try {
        $osInfo = Get-CimInstance Win32_OperatingSystem
        $uptimeVal = [math]::Round((New-TimeSpan -Start $osInfo.LastBootUpTime -End (Get-Date)).TotalHours)
    } catch { $uptimeVal = 0 }

    # Get machine ID (hostname)
    $machineId = $env:COMPUTERNAME

    # Guess location from timezone
    $location = "unknown"
    try {
        $tz = [System.TimeZoneInfo]::Local.Id
        if ($tz -match "Pacific") { $location = "us-west" }
        elseif ($tz -match "Mountain") { $location = "us-mountain" }
        elseif ($tz -match "Central") { $location = "us-central" }
        elseif ($tz -match "Eastern") { $location = "us-east" }
        elseif ($tz -match "GMT|UTC") { $location = "eu-west" }
        elseif ($tz -match "Europe") { $location = "eu-central" }
        elseif ($tz -match "Asia") { $location = "ap-southeast" }
    } catch { }

    $body = @{
        agent_id   = $AgentId
        status     = $status
        machine_id = $machineId
        location   = $location
        metrics    = @{
            cpu_usage    = [int]$cpuVal
            memory_usage = [int]$memVal
            uptime_hours = [int]$uptimeVal
            latency_ms   = [int]$latency
        }
    } | ConvertTo-Json -Depth 3

    try {
        $headers = @{ Authorization = "Bearer $SessionToken" }
        $null = Invoke-RestMethod -Uri "$SaasUrl/api/heartbeat" -Method POST -ContentType "application/json" -Body $body -Headers $headers
        $time = Get-Date -Format "HH:mm:ss"
        $statusColor = if ($status -eq "healthy") { "Green" } else { "Red" }
        if ($status -eq "error") {
            Write-Host "[$time] WARNING: Gateway probe failed ($GatewayUrl)" -ForegroundColor Red
        }
        Write-Host "[$time] Heartbeat sent ($($status.ToUpper()))  CPU: $($cpuVal)%  MEM: $($memVal)%  Latency: $($latency)ms" -ForegroundColor $statusColor
    } catch {
        $time = Get-Date -Format "HH:mm:ss"
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "[$time] Session expired, retrying..." -ForegroundColor Yellow
            $script:SessionToken = $null
            Send-Heartbeat
        } else {
            Write-Host "[$time] FAIL: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (Perform-Handshake) {
    Write-Host "Starting heartbeat loop (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host ""
    while ($true) {
        Send-Heartbeat
        Start-Sleep -Seconds $Interval
    }
}
