-- Turso (SQLite) Core Schema for Fleet Orchestrator
-- Optimized for High-Speed Edge Operations & Agent Management

-- 1. FLEETS
CREATE TABLE IF NOT EXISTS fleets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scaling_enabled INTEGER DEFAULT 0,
    scale_up_threshold_ms INTEGER DEFAULT 500,
    max_instances INTEGER DEFAULT 5,
    scale_down_threshold_ms INTEGER DEFAULT 200,
    min_instances INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 2. AGENTS
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fleet_id TEXT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'offline',
    version TEXT,
    model TEXT,
    location TEXT,
    machine_id TEXT,
    gateway_url TEXT,
    config_json TEXT, -- Store as JSON string
    metrics_json TEXT, -- Store as JSON string
    agent_secret TEXT,
    policy_profile TEXT DEFAULT 'dev',
    last_heartbeat TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fleet_id) REFERENCES fleets (id) ON DELETE SET NULL
);

-- 3. AGENTS METRICS (High Volume)
CREATE TABLE IF NOT EXISTS agent_metrics (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_id TEXT,
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    uptime_hours INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id_created_at ON agent_metrics (agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_user_id ON agent_metrics (user_id);

-- 4. ALERT CHANNELS (Notification Destinations)
CREATE TABLE IF NOT EXISTS alert_channels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    destination TEXT, -- Optional, for simple destinations
    config TEXT, -- JSON string for complex config
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. ALERTS (Operational Logs)
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_id TEXT,
    agent_name TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    metadata TEXT, -- JSON string
    resolved INTEGER DEFAULT 0, -- 0 for false, 1 for true
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
);

-- 6. ALERT CONFIGS (Operational Config)
CREATE TABLE IF NOT EXISTS alert_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_id TEXT,
    fleet_id TEXT,
    channel_id TEXT NOT NULL,
    cpu_threshold INTEGER DEFAULT 90,
    mem_threshold INTEGER DEFAULT 90,
    latency_threshold INTEGER DEFAULT 1000,
    offline_alert INTEGER DEFAULT 1,
    error_alert INTEGER DEFAULT 1,
    last_triggered_at TEXT,
    cooldown_minutes INTEGER DEFAULT 60,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE,
    FOREIGN KEY (fleet_id) REFERENCES fleets (id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES alert_channels (id) ON DELETE CASCADE
);

-- 7. CUSTOM POLICIES (Enterprise Security)
CREATE TABLE IF NOT EXISTS custom_policies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT,
    description TEXT,
    color TEXT,
    bg TEXT,
    skills TEXT, -- JSON string
    tools TEXT, -- JSON string
    data_access TEXT,
    heartbeat_interval INTEGER DEFAULT 300,
    guardrails TEXT, -- JSON string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 8. SCALING EVENTS (Operational Logs)
CREATE TABLE IF NOT EXISTS scaling_events (
    id TEXT PRIMARY KEY,
    fleet_id TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'UP', 'DOWN'
    old_count INTEGER,
    new_count INTEGER,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fleet_id) REFERENCES fleets (id) ON DELETE CASCADE
);

-- 9. API RATE LIMITS (High Volume Edge)
CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    tokens REAL,
    last_refill TEXT
);
