-- Turso (SQLite) Core Schema for Fleet Orchestrator

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- Matches auth.users(id) from Supabase
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 2. FLEETS
CREATE TABLE IF NOT EXISTS fleets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. AGENTS
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

-- 4. ALERTS
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

-- 5. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    stripe_customer_id TEXT,
    lemon_subscription_id TEXT,
    lemon_customer_id TEXT,
    variant_id TEXT,
    current_period_end TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. AGENT_METRICS
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

-- 7. ALERT CHANNELS
CREATE TABLE IF NOT EXISTS alert_channels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}', -- JSON string
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 8. ALERT CONFIGS
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

-- 9. CUSTOM POLICIES
CREATE TABLE IF NOT EXISTS custom_policies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT DEFAULT 'text-blue-400 border-blue-500/30',
    bg TEXT DEFAULT 'bg-blue-500/10',
    skills TEXT NOT NULL DEFAULT '[]', -- JSON string
    tools TEXT NOT NULL DEFAULT '[]', -- JSON string
    data_access TEXT NOT NULL DEFAULT 'restricted',
    heartbeat_interval INTEGER DEFAULT 300,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 10. ENTERPRISE BRANDING
CREATE TABLE IF NOT EXISTS enterprise_branding (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    domain TEXT,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
-- 11. API RATE LIMITS
CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    tokens REAL NOT NULL,
    last_refill TEXT NOT NULL
);
