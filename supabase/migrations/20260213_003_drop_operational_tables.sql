-- Drop operational tables that have been migrated to Turso
DROP TABLE IF EXISTS fleets CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS agent_metrics CASCADE;
DROP TABLE IF EXISTS alert_channels CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS alert_configs CASCADE;
DROP TABLE IF EXISTS custom_policies CASCADE;
DROP TABLE IF EXISTS scaling_events CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
