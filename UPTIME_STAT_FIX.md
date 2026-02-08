# UPTIME Stat Fix - Documentation

## Problem
The `uptime_hours` metric was showing incorrect values because it was using the **machine's uptime** (how long the OS has been running) instead of **agent uptime** (how long the agent has been registered in Fleet).

### Why This Was Wrong:
- Machine uptime could be hundreds of hours (weeks/months)
- Agent might have been registered only a few hours ago
- The displayed uptime was "way off" from reality

## Solution
Modified `app/api/[[...path]]/route.js` (lines 918-933) to **calculate** `uptime_hours` server-side based on the agent's `created_at` timestamp:

```javascript
// Calculate uptime based on agent creation time (not machine uptime)
const createdAt = new Date(agent.created_at);
const now = new Date();
const uptimeHours = Math.floor((now - createdAt) / (1000 * 60 * 60));

update.metrics_json = {
  ...agent.metrics_json,
  ...body.metrics,
  tasks_completed: (agent.metrics_json?.tasks_completed || 0) + 1,
  errors_count: (body.status === 'error') 
    ? (agent.metrics_json?.errors_count || 0) + 1 
    : (agent.metrics_json?.errors_count || 0),
  // Override uptime_hours with calculated value
  uptime_hours: uptimeHours
};
```

## How It Works Now

### Before (WRONG):
1. Agent script gets machine uptime: `os.uptime()` → 720 hours (30 days)
2. Sends to server: `uptime_hours: 720`
3. Server stores: `uptime_hours: 720`
4. **Problem**: Agent was created 2 hours ago, not 30 days ago!

### After (CORRECT):
1. Agent script gets machine uptime: `os.uptime()` → 720 hours
2. Sends to server: `uptime_hours: 720`
3. **Server calculates**: `now - created_at` → 2 hours
4. **Server overrides**: `uptime_hours: 2` ✅
5. Dashboard shows: "2h" (correct!)

## What Uptime Represents

**Agent Uptime** = Time since the agent was **registered** in Fleet

- ✅ Starts at 0 when agent is created
- ✅ Increases by 1 every hour
- ✅ Accurate regardless of machine uptime
- ✅ Resets if agent is deleted and re-created

**NOT** machine uptime (how long the OS has been running)

## Verification

### Check Current Uptime
```bash
node scripts/check-uptime.js
```

This shows:
- Agent creation time
- Current time
- Calculated uptime (hours)
- Stored uptime (hours)
- Whether they match

### Test Uptime Calculation
```bash
node scripts/test-uptime-calculation.js
```

This:
1. Waits for rate limit reset (60 seconds)
2. Sends heartbeat with `uptime_hours: 999` (fake value)
3. Verifies server overrides it with correct calculated value

### Expected Output
```
Agent Name: my-agent
Created At: 2026-02-08T01:00:00.000Z
Last Heartbeat: 2026-02-08T15:05:00.000Z

⏱️  Uptime Calculation:
   Created: 2/8/2026, 1:00:00 AM
   Now: 2/8/2026, 3:05:00 PM
   Time Elapsed: 125 minutes

   Stored uptime_hours: 2
   Calculated uptime_hours: 2

✅ Uptime is CORRECT!
   The agent has been registered for 2 hours
```

## Dashboard Display

The UPTIME stat appears in the **Agent Detail Page** (`/agent/{id}`):

```javascript
{ label: 'UPTIME', value: `${m.uptime_hours || 0}h`, icon: Clock }
```

Shows: "13h", "24h", "720h", etc.

## Automatic Updates

Uptime is **recalculated on every heartbeat**:
- Every 5 minutes (default heartbeat interval)
- Automatically increases over time
- No manual intervention needed

## Edge Cases Handled

1. **New Agent**: `uptime_hours: 0` (just created)
2. **Old Agent**: Correct calculation even for agents created weeks ago
3. **Machine Reboot**: Uptime continues from creation time (not reset)
4. **Time Zones**: Uses UTC timestamps (no timezone issues)

## Migration Notes

Existing agents may have incorrect `uptime_hours` values from before this fix. These will be **automatically corrected** on the next heartbeat.

No database migration needed - the fix is applied in real-time.

## Test Scripts

- `scripts/check-uptime.js` - View current uptime and verify calculation
- `scripts/test-uptime-calculation.js` - Send test heartbeat and verify override

## Summary

✅ **Fixed**: Uptime now shows agent registration time, not machine uptime
✅ **Accurate**: Calculated server-side from `created_at` timestamp  
✅ **Automatic**: Updates on every heartbeat
✅ **Reliable**: Not affected by machine reboots or timezone changes
