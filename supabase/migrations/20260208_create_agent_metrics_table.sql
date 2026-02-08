-- Migration: Create agent_metrics table for historical data
-- Description: Stores timeseries metrics for agents (CPU, Memory, Latency, etc.)

CREATE TABLE IF NOT EXISTS public.agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    uptime_hours INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast time-range queries
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id_created_at ON public.agent_metrics (agent_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can write metrics (via API)
CREATE POLICY "Service role write access" ON public.agent_metrics
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can read metrics for their own agents
-- Note: This requires complex join/subquery. 
-- Simpler approach: Allow authenticated users to SELECT if they own the related agent.
-- But standard Supabase pattern is often `auth.uid() = user_id`.
-- Since metrics don't store user_id directly, we need a join or duplicate user_id.

-- Let's duplicate user_id for RLS simplicity (common in Supabase)
ALTER TABLE public.agent_metrics ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can read own agent metrics" ON public.agent_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Update trigger might not be needed as this is append-only log, 
-- but let's keep it standard if we ever update rows (e.g. consolidation)
