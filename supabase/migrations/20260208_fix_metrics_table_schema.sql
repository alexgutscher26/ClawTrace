-- SAFE MIGRATION: Fix agent_metrics table schema if columns missing
-- This script is safe to run multiple times (idempotent).

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- tasks_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_metrics' AND column_name='tasks_completed') THEN
        ALTER TABLE public.agent_metrics ADD COLUMN tasks_completed INTEGER DEFAULT 0;
    END IF;

    -- errors_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_metrics' AND column_name='errors_count') THEN
        ALTER TABLE public.agent_metrics ADD COLUMN errors_count INTEGER DEFAULT 0;
    END IF;

    -- user_id (essential for RLS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_metrics' AND column_name='user_id') THEN
        ALTER TABLE public.agent_metrics ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Drop policy if exists to recreate it safely
DROP POLICY IF EXISTS "Service role write access" ON public.agent_metrics;
CREATE POLICY "Service role write access" ON public.agent_metrics
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Drop read policy if exists
DROP POLICY IF EXISTS "Users can read own agent metrics" ON public.agent_metrics;
CREATE POLICY "Users can read own agent metrics" ON public.agent_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;
