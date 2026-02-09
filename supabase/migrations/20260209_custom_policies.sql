-- Migration: Add Custom Policies for Enterprise Users
-- Description: Creates custom_policies table for enterprise plan users to define their own agent policies
-- IDEMPOTENT: Safe to run multiple times

CREATE TABLE IF NOT EXISTS public.custom_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., "data-scientist", "security-analyst"
    label TEXT NOT NULL, -- Display name e.g., "DATA SCIENTIST"
    description TEXT NOT NULL,
    color TEXT DEFAULT 'text-blue-400 border-blue-500/30', -- Tailwind classes
    bg TEXT DEFAULT 'bg-blue-500/10', -- Tailwind classes
    skills JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of skill strings
    tools JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of tool strings
    data_access TEXT NOT NULL DEFAULT 'restricted' CHECK (data_access IN ('unrestricted', 'system-only', 'summarized-results', 'restricted')),
    heartbeat_interval INTEGER DEFAULT 300, -- Seconds between heartbeats
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_custom_policies_user_id ON public.custom_policies (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_policies_user_active ON public.custom_policies (user_id, is_active);

-- Enable RLS
ALTER TABLE public.custom_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Enterprise users can insert custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Users can update own custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Users can delete own custom policies" ON public.custom_policies;
END $$;

-- RLS Policies
CREATE POLICY "Users can view own custom policies" 
    ON public.custom_policies 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Enterprise users can insert custom policies" 
    ON public.custom_policies 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.subscriptions 
            WHERE user_id = auth.uid() 
            AND plan = 'enterprise' 
            AND status IN ('active', 'trialing')
        )
    );

CREATE POLICY "Users can update own custom policies" 
    ON public.custom_policies 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom policies" 
    ON public.custom_policies 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_policies_timestamp') THEN
        CREATE TRIGGER update_custom_policies_timestamp
        BEFORE UPDATE ON public.custom_policies
        FOR EACH ROW
        EXECUTE PROCEDURE update_custom_policies_updated_at();
    END IF;
END
$$;

-- Add some example custom policies for testing (optional)
-- These will only be visible to the user who creates them
COMMENT ON TABLE public.custom_policies IS 'Custom agent policies for enterprise users. Allows defining custom roles, skills, tools, and access levels.';
