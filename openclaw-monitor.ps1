# OpenClaw Fleet Monitor - PowerShell Heartbeat Agent
# Agent: 79a68826-b5af-49a3-b9db-6c322c858f17
# Run: powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1

$SaasUrl = "http://localhost:3000"
$AgentId = "79a68826-b5af-49a3-b9db-6c322c858f17"
$AgentSecret = "4721c562-21eb-4b65-ae77-dcd6ec94f710"
$Interval = 300
$SessionToken = $null
$GatewayUrl = $null

Write-Host ""
Write-Host "  OpenClaw Fleet Monitor" -ForegroundColor Green
Write-Host "  --------------------------------"
Write-Host "  Agent:    $AgentId"
Write-Host "  SaaS:     $SaasUrl"
Write-Host "  Interval: $($Interval)s"
Write-Host ""

function Perform-Handshake {
    Write-Host "[$(Get-Date -Format "HH:mm:ss")] Performing handshake..."
    $body = @{ agent_id = $AgentId; agent_secret = $AgentSecret } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$SaasUrl/api/agents/handshake" -Method POST -Body $body -ContentType "application/json"
        if ($res.token) {
            $script:SessionToken = $res.token
            $script:GatewayUrl = $res.gateway_url
            Write-Host "[$(Get-Date -Format "HH:mm:ss")] Handshake successful" -ForegroundColor Green
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
            $test = Invoke-WebRequest -Uri $GatewayUrl -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Ignore
            if ($test.StatusCode -ge 400) { $status = "healthy" } # Service is up but returns error
            $latency = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        } catch {
            $status = "error"
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

    $body = @{
        agent_id = $AgentId
        status   = $status
        metrics  = @{
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
        Write-Host "[$time] Heartbeat sent  CPU: $($cpuVal)%  MEM: $($memVal)%" -ForegroundColor Green
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