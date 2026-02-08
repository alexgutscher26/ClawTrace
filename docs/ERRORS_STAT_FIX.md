# ERRORS Stat Fix - Verification Guide

## Problem
The `errors_count` metric was not being tracked properly. When agents sent heartbeats with `status: "error"`, the error count was not incrementing.

## Solution
Modified `app/api/[[...path]]/route.js` (lines 918-928) to increment `errors_count` when the agent status is 'error':

```javascript
if (body.metrics) {
  update.metrics_json = {
    ...agent.metrics_json,
    ...body.metrics,
    tasks_completed: (agent.metrics_json?.tasks_completed || 0) + 1,
    // Increment errors_count if status is 'error'
    errors_count: (body.status === 'error') 
      ? (agent.metrics_json?.errors_count || 0) + 1 
      : (agent.metrics_json?.errors_count || 0)
  };
}
```

## How It Works

1. **Healthy Heartbeat** (`status: "healthy"`):
   - ✅ `tasks_completed` increments by 1
   - ❌ `errors_count` stays the same

2. **Error Heartbeat** (`status: "error"`):
   - ✅ `tasks_completed` increments by 1
   - ✅ `errors_count` increments by 1

## When Errors Are Detected

Agents automatically set `status: "error"` when:
- Gateway URL probe fails (network timeout, connection refused, etc.)
- The monitored service is unreachable

## Verification Steps

### Option 1: Check Current State
```bash
node scripts/check-errors-count.js
```

This shows:
- Current `errors_count`
- Current `tasks_completed`
- Error rate percentage

### Option 2: Test Error Increment (Manual)
Due to rate limiting, you need to wait between heartbeats:

1. Check current errors_count:
   ```bash
   node scripts/check-errors-count.js
   ```

2. Wait 60 seconds (rate limit reset)

3. Send error heartbeat:
   ```bash
   node scripts/test-errors-with-wait.js
   ```

4. Verify errors_count increased:
   ```bash
   node scripts/check-errors-count.js
   ```

### Option 3: Use Real Agent
The best way to test is with a real agent monitoring a failing gateway:

1. Create an agent with a gateway URL that will fail (e.g., `http://invalid-url:9999`)
2. Run the agent's heartbeat script
3. Watch the errors_count increment in the dashboard

## Dashboard Display

The ERRORS stat appears in two places:

1. **Dashboard Overview** (`/dashboard`):
   - Shows count of agents with `status === 'error'`
   - Located in the stats cards at the top

2. **Agent Detail Page** (`/agent/{id}`):
   - Shows `errors_count` from metrics
   - Displays error rate: `(errors_count / tasks_completed) * 100`
   - Shows in the metrics grid

## Expected Behavior

✅ **Working Correctly:**
- errors_count increments when gateway probe fails
- Error rate is calculated correctly
- Dashboard shows accurate error statistics
- Agent status changes to 'error' when gateway is unreachable

## Test Scripts Created

- `scripts/check-errors-count.js` - View current errors_count
- `scripts/test-errors-count.js` - Send test heartbeats (may hit rate limit)
- `scripts/test-errors-with-wait.js` - Wait for rate limit, then test

## Rate Limiting

The heartbeat endpoint has rate limiting:
- **Limit**: 10 requests per 60 seconds per agent
- **Reset**: After 60 seconds
- **Error**: `429 Too Many Requests` with `retry_after` field

When testing, space out heartbeats by at least 6 seconds, or wait 60 seconds between test runs.
