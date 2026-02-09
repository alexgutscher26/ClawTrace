# Pro User Heartbeat Interval Implementation

## Summary
Updated the agent installation script endpoints to automatically set the heartbeat interval based on the user's subscription tier.

## Changes Made

### 1. Modified Install Script Endpoints
Updated three install script endpoints in `app/api/[[...path]]/route.js`:
- `/install-agent` (Bash/Linux/macOS)
- `/install-agent-ps` (PowerShell/Windows)
- `/install-agent-py` (Python/Cross-platform)

### 2. Tier-Based Interval Logic
Each endpoint now:
1. Checks if an `interval` query parameter is provided (manual override)
2. If not provided, queries the agent's `user_id` from the database
3. Calls `getTier(user_id)` to determine subscription tier
4. Sets interval based on tier:
   - **Pro users**: 60 seconds (1-minute heartbeat)
   - **Free users**: 300 seconds (5-minute heartbeat)

### 3. Rate Limit Alignment
The heartbeat intervals now align with the existing rate limits:
- **Free tier**: `{ capacity: 3, refillRate: 1 / 300 }` → 1 req / 5 min
- **Pro tier**: `{ capacity: 10, refillRate: 1 / 60 }` → 1 req / min

## Code Example
```javascript
// Determine user tier for heartbeat interval
let interval = searchParams.get('interval');
if (!interval) {
  // Get agent's user_id to determine tier
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('user_id')
    .eq('id', agentId)
    .maybeSingle();
  
  if (agent) {
    const tier = await getTier(agent.user_id);
    interval = tier === 'pro' ? '60' : '300'; // Pro: 1 min, Free: 5 min
  } else {
    interval = '300'; // Default to free tier
  }
}
```

## Testing
To test the implementation:
1. Create a pro subscription for a user
2. Generate an agent install script for that user
3. Verify the script contains `INTERVAL=60` (or `$Interval = 60` for PowerShell)
4. Run the agent and confirm heartbeats are sent every 60 seconds

## Benefits
- **Pro users** get real-time monitoring with 1-minute heartbeat intervals
- **Free users** maintain 5-minute intervals to manage server load
- **Automatic**: No manual configuration needed
- **Backward compatible**: Existing agents with hardcoded intervals continue to work
- **Override support**: Manual interval parameter still works for testing

## Related Files
- `app/api/[[...path]]/route.js` - Main API route handler
- `supabase/migrations/20260208_000_init_core_schema.sql` - Database schema
