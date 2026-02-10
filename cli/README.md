# Fleet Monitor CLI

Heartbeat agent and configuration manager for Fleet Orchestrator. Install on any machine running an agent to send real-time metrics and manage configurations from the terminal.

## Install

```bash
npm i -g openclaw-fleet-monitor
```

## Quick Start

1. Register at your Fleet dashboard and add an agent
2. Copy the agent ID and Secret from the dashboard
3. Run the monitor:

```bash
fleet-monitor monitor --saas-url=https://your-fleet-app.com --agent-id=YOUR_AGENT_UUID --agent-secret=YOUR_AGENT_SECRET
```

## Commands

| Command   | Description                              |
|-----------|------------------------------------------|
| `monitor` | Start sending heartbeats to the dashboard|
| `config`  | Push configuration updates to the agent  |
| `discover`| Scan local network for OpenClaw gateways |
| `status`  | Show local system metrics                |
| `help`    | Show help message                        |

## Monitor Options

| Option       | Required | Default | Description                     |
|--------------|----------|---------|----------------------------------|
| `--saas-url` | Yes      | -       | Your Fleet dashboard URL         |
| `--agent-id` | Yes      | -       | Agent UUID from dashboard        |
| `--agent-secret`| Yes   | -       | Agent Secret for authentication  |
| `--interval` | No       | 300     | Heartbeat interval in seconds    |
| `--status`   | No       | healthy | Status to report (healthy/idle)  |
| `--plugins`  | No       | -       | Path to custom metric scripts    |

## Config Push Options

Update your agent's configuration directly from the CLI.

| Option       | Required | Description                     |
|--------------|----------|----------------------------------|
| `--model`    | No       | AI Model (e.g., claude-sonnet-4)|
| `--skills`   | No       | Comma-separated list of skills   |
| `--profile`  | No       | Agent profile (dev, prod)        |
| `--data-scope`| No      | Data access scope (full, etc.)   |

## Auto-Discovery

If you don't know your Gateway URL, you can scan your local network:

```bash
fleet-monitor discover
```

## Plugin System

You can extend the agent's telemetry by writing custom scripts (Python, JS, or any executable) that output JSON.

**Example Plugin (`queue.py`):**
```python
import json
print(json.dumps({"queue_length": 42, "db_status": "ok"}))
```

**Run with Plugins:**
```bash
fleet-monitor monitor ... --plugins=./queue.py
```

## Examples

```bash
# Standard 5-minute heartbeat
fleet-monitor monitor --saas-url=https://fleet.openclaw.dev --agent-id=abc-123 --agent-secret=secret-123

# Push configuration update (Change model and skills)
fleet-monitor config push \
  --saas-url=https://fleet.openclaw.dev \
  --agent-id=abc-123 \
  --agent-secret=secret-123 \
  --model=claude-sonnet-4 \
  --skills=code,search

# Check system status locally with plugins
fleet-monitor status --plugins=./queue.py
```

## What It Reports

- CPU usage (%)
- Memory usage (%)
- System uptime (hours)
- Response latency (ms)

## License

MIT
