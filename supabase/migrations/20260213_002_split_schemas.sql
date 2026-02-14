-- Migration: Split Schemas (Clean Separation)
-- Description: Removes tables that have been moved to Turso (the "Engine") to enforce strict separation of concerns.
-- Supabase ("The Vault") retains Auth, Teams, Billing, and User Preferences.
-- Turso ("The Engine") retains Agents, Fleets, Metrics, Alerts, and Operational Configs.

-- 1. DROP Tables moved to Turso
-- We use CASCADE to remove dependent foreign keys and policies automatically.

DROP TABLE IF EXISTS public.alert_configs CASCADE;
DROP TABLE IF EXISTS public.alert_channels CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.agent_metrics CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.custom_policies CASCADE;

-- 2. DROP Core Agent/Fleet tables
-- WARNING: This removes the Supabase copy of these tables. Ensure Turso has the data if needed.
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.fleets CASCADE;

-- 3. Cleanup unused types if any (Optional)
-- (None specific to these tables defined in init_core_schema, mostly text/jsonb)
