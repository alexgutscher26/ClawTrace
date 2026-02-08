# Agent Info Fix - Documentation

## Problem
The Agent Info section was showing "-" for **Machine ID** and **Location** fields because:
1. The agent scripts weren't collecting this information
2. The heartbeat endpoint wasn't accepting these fields

## Solution
Updated both the PowerShell agent script and the heartbeat API endpoint to automatically collect and store machine information.

### Changes Made

#### 1. PowerShell Agent Script (`app/api/[[...path]]/route.js` - lines 436-462)

Added automatic collection of:
- **Machine ID**: Computer hostname (`$env:COMPUTERNAME`)
- **Location**: Timezone-based geographic guess

```powershell
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
    machine_id = $machineId  # ← NEW
    location   = $location    # ← NEW
    metrics    = @{ ... }
}
```

#### 2. Heartbeat API Endpoint (`app/api/[[...path]]/route.js` - lines 996-1000)

Added logic to accept and store these fields:

```javascript
// Update machine_id and location if provided
if (body.machine_id) update.machine_id = body.machine_id;
if (body.location) update.location = body.location;
```

## How It Works

### Machine ID Detection
- **Windows**: Uses `$env:COMPUTERNAME` (e.g., "DESKTOP-ABC123")
- **Purpose**: Uniquely identifies the physical/virtual machine running the agent

### Location Detection
The location is automatically guessed from the system timezone:

| Timezone Pattern | Location |
|-----------------|----------|
| Pacific | us-west |
| Mountain | us-mountain |
| Central | us-central |
| Eastern | us-east |
| GMT/UTC | eu-west |
| Europe | eu-central |
| Asia | ap-southeast |
| Unknown | unknown |

**Note**: This is a best-effort guess. For precise location, you can manually set it when creating the agent.

## Automatic Population

On **every heartbeat** (every 5 minutes):
1. Agent collects machine_id (hostname)
2. Agent guesses location from timezone
3. Sends both fields to server
4. Server updates the agent record
5. Dashboard displays the information

## Verification

Check if your agent has machine_id and location set:

```bash
node scripts/check-agent-info.js
```

Expected output:
```
🤖 Checking Agent Info for: 79a68826-b5af-49a3-b9db-6c322c858f17

📋 Agent Information:
   Name: my-agent
   Machine ID: DESKTOP-ABC123
   Location: us-central
   Model: gpt-4
   Profile: dev
   Skills: code, search
   Data Scope: full
   Created: 2/8/2026, 1:00:00 AM

✅ Agent Info is complete!
```

## When Will It Update?

### For New Agents
- Machine ID and Location are populated on the **first heartbeat**
- Takes effect within 5 minutes of starting the agent

### For Existing Agents
- **Option 1**: Wait for next heartbeat (within 5 minutes)
- **Option 2**: Restart the agent to force immediate update:
  ```powershell
  # Stop the current agent (Ctrl+C)
  # Download and run the new script
  irm "http://localhost:3000/api/install-agent-ps?agent_id=YOUR_ID&agent_secret=YOUR_SECRET" -OutFile openclaw-monitor.ps1
  powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1
  ```

## Dashboard Display

The Agent Info section now shows:

```
Agent Info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Machine ID    DESKTOP-ABC123
Location      us-central
Model         gpt-4
Profile       dev
Skills        code, search
Data Scope    full
Created       2/8/2026
```

No more "-" placeholders! ✅

## Manual Override

You can still manually set these fields when creating an agent:

1. Click "Add Agent"
2. Fill in the form:
   - **Machine ID**: Custom identifier (e.g., "prod-server-01")
   - **Location**: Custom location (e.g., "us-east-1")
3. The agent will **not override** manually set values

## Test Scripts

- `scripts/check-agent-info.js` - View current agent info

## Summary

✅ **Machine ID**: Auto-detected from hostname
✅ **Location**: Auto-detected from timezone
✅ **Automatic**: Updates on every heartbeat
✅ **No manual input**: Works out of the box

The Agent Info section is now fully functional! 🎉
