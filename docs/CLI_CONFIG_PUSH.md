# Fleet Monitor CLI - Config Push

The `config push` command allows you to update an agent's configuration (model, skills, profile, etc.) directly from the command line.

## Usage

### Push Configuration using Flags (Recommended)

```bash
fleet-monitor config push --agent-id=<UUID> --saas-url=<URL> --agent-secret=<SECRET> [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--model` | AI Model name | `claude-sonnet-4` |
| `--skills` | Comma-separated list of skills | `code,search` |
| `--profile` | Agent profile | `dev` |
| `--data-scope` | Data access scope | `full` |

### Example

```bash
fleet-monitor config push \
  --agent-id=79a68826-b5af-49a3-b9db-6c322c858f17 \
  --saas-url=http://localhost:3000 \
  --agent-secret=4721c562-21eb-4b65-ae77-dcd6ec94f710 \
  --model=claude-sonnet-4 \
  --skills=code,search \
  --profile=dev \
  --data-scope=full
```

### Push Configuration from File

You can also push configuration from a JSON file:

```bash
fleet-monitor config push --agent-id=<UUID> --saas-url=<URL> --agent-secret=<SECRET> --config-file=./config.json
```

**config.json example:**
```json
{
  "model": "claude-sonnet-4",
  "skills": ["code", "search"],
  "profile": "production",
  "data_scope": "full"
}
```

## Authentication

Authentication is handled via the `--agent-secret` parameter. The CLI performs a secure handshake with the Fleet SaaS to obtain a session token before pushing the configuration.
