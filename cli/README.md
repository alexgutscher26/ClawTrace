# ClawTrace Monitor CLI

Heartbeat agent and configuration manager for ClawTrace Orchestrator. Install on any machine running an agent to send real-time metrics and manage configurations from the terminal.

## Install

```bash
npm i -g clawtrace-monitor
# Or run without installing:
bun x clawtrace-monitor monitor ...
```

## Quick Start

1. Register at your ClawTrace dashboard and add an agent
2. Copy the agent ID and Secret from the dashboard
3. Run the monitor:

```bash
clawtrace monitor --saas-url=https://fleet.clawtrace.dev --agent-id=YOUR_AGENT_UUID --agent-secret=YOUR_AGENT_SECRET
```

## Commands

### `monitor`
Starts the heartbeat agent. Sent metrics include CPU, Memory, Uptime, and Gateway Latency.

```bash
clawtrace monitor \
  --saas-url=https://fleet.clawtrace.dev \
  --agent-id=... \
  --agent-secret=... \
  --interval=5
```

### `config`
Manage local agent configuration (encrypted at rest).

```bash
# Set a value
clawtrace config set --key=openai_api_key --value=sk-... 

# Get a value
clawtrace config get --key=openai_api_key

# List all
clawtrace config list
```

### `discover`
Auto-discover local ClawTrace Gateways on the network (mDNS/Bonjour).

```bash
clawtrace discover
```

### `status`
Show current system metrics and agent status.

```bash
clawtrace status
```

### `install-service` (Linux/macOS)
Install the monitor as a systemd service (Linux) or LaunchAgent (macOS) for persistence.

```bash
clawtrace install-service --saas-url=... --agent-id=... --agent-secret=...
```

## Development

```bash
git clone https://github.com/alexgutscher/fleet
cd fleet/cli
npm install
npm link
clawtrace --help
```

## Service Definition

When installed as a service, the unit file is named `clawtrace-monitor.service` (Linux) or `com.clawtrace.monitor.plist` (macOS).

Logs are written to:
- Linux: `journalctl -u clawtrace-monitor`
- macOS: `/var/log/clawtrace-monitor.log` or Console.app

## Monitor Options

| Option       | Required | Default | Description                     |
|--------------|----------|---------|----------------------------------|
| `--saas-url` | Yes      | -       | Your ClawTrace dashboard URL         |
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
clawtrace discover
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
clawtrace monitor ... --plugins=./queue.py
```

## Service Mode

Install the agent as a background service (Linux/macOS):

```bash
clawtrace install-service --saas-url=... --agent-id=... --agent-secret=...
```

This will automatically create and enable:
- **Linux**: systemd unit (`/etc/systemd/system/clawtrace-monitor.service`)
- **macOS**: LaunchAgent (`~/Library/LaunchAgents/com.clawtrace.monitor.plist`)

## Examples

```bash
# Standard 5-minute heartbeat
clawtrace monitor --saas-url=https://fleet.clawtrace.dev --agent-id=abc-123 --agent-secret=secret-123

# Push configuration update (Change model and skills)
clawtrace config push \
  --saas-url=https://fleet.clawtrace.dev \
  --agent-id=abc-123 \
  --agent-secret=secret-123 \
  --model=claude-sonnet-4 \
  --skills=code,search

# Check system status locally with plugins
clawtrace status --plugins=./queue.py
```

## What It Reports

- CPU usage (%)
- Memory usage (%)
- System uptime (hours)
- Response latency (ms)

## License

MIT
