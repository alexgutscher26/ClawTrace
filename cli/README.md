# OpenClaw Fleet Monitor CLI

Heartbeat agent for [OpenClaw Fleet Orchestrator](https://fleet.openclaw.dev). Install on any machine running an OpenClaw agent to send real-time metrics to your fleet dashboard.

## Install

```bash
npm i -g openclaw-fleet-monitor
```

## Quick Start

1. Register at your Fleet dashboard and add an agent
2. Copy the agent ID from the dashboard
3. Run the monitor:

```bash
openclaw monitor --saas-url=https://your-fleet-app.com --agent-id=YOUR_AGENT_UUID
```

## Commands

| Command   | Description                              |
|-----------|------------------------------------------|
| `monitor` | Start sending heartbeats to the dashboard|
| `status`  | Show local system metrics                |
| `help`    | Show help message                        |

## Monitor Options

| Option       | Required | Default | Description                     |
|-------------|----------|---------|----------------------------------|
| `--saas-url`| Yes      | -       | Your Fleet dashboard URL         |
| `--agent-id`| Yes      | -       | Agent UUID from dashboard        |
| `--interval`| No       | 300     | Heartbeat interval in seconds    |
| `--status`  | No       | healthy | Status to report (healthy/idle)  |

## Examples

```bash
# Standard 5-minute heartbeat
openclaw monitor --saas-url=https://fleet.openclaw.dev --agent-id=abc-123-def

# Fast 1-minute heartbeat (Pro plan)
openclaw monitor --saas-url=https://fleet.openclaw.dev --agent-id=abc-123-def --interval=60

# Check system status locally
openclaw status
```

## What It Reports

- CPU usage (%)
- Memory usage (%)
- System uptime (hours)
- Response latency (ms)

## License

MIT
