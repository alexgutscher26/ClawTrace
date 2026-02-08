-- Migration: Initialize Core Schema (Main 8 Tables)
-- Description: Creates the complete foundational schema for the Fleet Orchestrator.
-- Includes all 8 core tables required for the application to function.
-- IDEMPOTENT: Safe to run multiple times.

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
END $$;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END
$$;

-- 2. FLEETS
CREATE TABLE IF NOT EXISTS public.fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own fleets" ON public.fleets;
    DROP POLICY IF EXISTS "Users can insert own fleets" ON public.fleets;
    DROP POLICY IF EXISTS "Users can update own fleets" ON public.fleets;
    DROP POLICY IF EXISTS "Users can delete own fleets" ON public.fleets;
END $$;

CREATE POLICY "Users can view own fleets" ON public.fleets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fleets" ON public.fleets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fleets" ON public.fleets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fleets" ON public.fleets FOR delete USING (auth.uid() = user_id);

-- 3. AGENTS
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('healthy', 'idle', 'error', 'offline')),
    version TEXT,
    model TEXT,
    location TEXT,
    machine_id TEXT,
    gateway_url TEXT,
    config_json JSONB,
    metrics_json JSONB,
    agent_secret TEXT,
    last_heartbeat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can insert own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can update own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can delete own agents" ON public.agents;
END $$;

CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);

-- 4. ALERTS
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    agent_name TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
    DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
END $$;

CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- 5. TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    members JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Team members can view team" ON public.teams;
    DROP POLICY IF EXISTS "Owner can update team" ON public.teams;
    DROP POLICY IF EXISTS "Owner can delete team" ON public.teams;
END $$;

CREATE POLICY "Team members can view team" ON public.teams 
    FOR SELECT 
    USING (
        auth.uid() = owner_id 
        OR 
        members @> ('[{"user_id": "' || auth.uid()::text || '"}]')::jsonb
    );
CREATE POLICY "Owner can update team" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete team" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

-- 6. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
END $$;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 7. AGENT_METRICS
CREATE TABLE IF NOT EXISTS public.agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    uptime_hours INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id_created_at ON public.agent_metrics (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_user_id ON public.agent_metrics (user_id);

ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role write access" ON public.agent_metrics;
    DROP POLICY IF EXISTS "Users can read own agent metrics" ON public.agent_metrics;
END $$;

CREATE POLICY "Service role write access" ON public.agent_metrics
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can read own agent metrics" ON public.agent_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

-- 8. RATE_LIMITS
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    path TEXT NOT NULL,
    bucket JSONB NOT NULL DEFAULT '{"tokens": 10, "last_refill": null}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_path ON public.rate_limits (identifier, path);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role only" ON public.rate_limits;
END $$;

CREATE POLICY "Service role only" ON public.rate_limits
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Function to auto-update updated_at on rate_limits
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rate_limits_updated_at') THEN
        CREATE TRIGGER update_rate_limits_updated_at
        BEFORE UPDATE ON public.rate_limits
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END
$$;
