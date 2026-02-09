-- Migration: Initialize Core Schema
-- Description: Creates the complete foundational schema for the Fleet Orchestrator.
-- Includes all core tables: profiles, fleets, agents, alerts, teams, subscriptions, agent_metrics, rate_limits, alert_channels, alert_configs, custom_policies, enterprise_branding.
-- IDEMPOTENT: Safe to run multiple times.

-- ==========================================
-- 1. PROFILES
-- ==========================================
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
    DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;
END $$;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Redundant but explicit policy from fix_rls_policies
CREATE POLICY "Users can view and edit their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);


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

-- ==========================================
-- 2. FLEETS
-- ==========================================
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
    DROP POLICY IF EXISTS "Users can manage their own fleets" ON public.fleets;
END $$;

CREATE POLICY "Users can view own fleets" ON public.fleets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fleets" ON public.fleets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fleets" ON public.fleets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fleets" ON public.fleets FOR DELETE USING (auth.uid() = user_id);
-- Consolidated "manage" policy
CREATE POLICY "Users can manage their own fleets" ON public.fleets FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 3. AGENTS
-- ==========================================
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
    policy_profile TEXT DEFAULT 'dev', -- Added from add_policy_profiles.sql, constraint relaxed from relax_policy_profile_constraint.sql
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
    DROP POLICY IF EXISTS "Users can manage their own agents" ON public.agents;
END $$;

CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);
-- Consolidated "manage" policy
CREATE POLICY "Users can manage their own agents" ON public.agents FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. ALERTS
-- ==========================================
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
    DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.alerts;
END $$;

CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
-- Consolidated "manage" policy
CREATE POLICY "Users can manage their own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. TEAMS
-- ==========================================
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
    DROP POLICY IF EXISTS "Users can view and manage their teams" ON public.teams;
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
-- Check fix_rls_policies for slightly different JSON logic
CREATE POLICY "Users can view and manage their teams" ON public.teams
    FOR ALL
    USING (
        auth.uid() = owner_id 
        OR 
        members @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()))
    );

-- ==========================================
-- 6. SUBSCRIPTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    lemon_subscription_id TEXT, -- Added from billing_and_alerts.sql
    lemon_customer_id TEXT,     -- Added from billing_and_alerts.sql
    variant_id TEXT,            -- Added from billing_and_alerts.sql
    current_period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
END $$;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Redundant but keeping consistent with history
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- 7. AGENT_METRICS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Added from fix_metrics_table_schema.sql
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    uptime_hours INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0, -- Added from fix_metrics_table_schema.sql
    tasks_completed INTEGER DEFAULT 0, -- Added from fix_metrics_table_schema.sql
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

-- ==========================================
-- 8. RATE_LIMITS
-- ==========================================
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

-- ==========================================
-- 9. ALERT CHANNELS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.alert_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('slack', 'discord', 'email', 'webhook')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alert_channels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can view own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can insert own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can update own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can delete own alert channels" ON public.alert_channels;
END $$;

CREATE POLICY "Users can manage own alert channels" ON public.alert_channels FOR ALL USING (auth.uid() = user_id);
-- Granular policies from billing_and_alerts.sql
CREATE POLICY "Users can view own alert channels" ON public.alert_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert channels" ON public.alert_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alert channels" ON public.alert_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alert channels" ON public.alert_channels FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 10. ALERT CONFIGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.alert_channels(id) ON DELETE CASCADE NOT NULL,
    
    cpu_threshold INTEGER DEFAULT 90,
    mem_threshold INTEGER DEFAULT 90,
    latency_threshold INTEGER DEFAULT 1000,
    offline_alert BOOLEAN DEFAULT true,
    error_alert BOOLEAN DEFAULT true,
    
    last_triggered_at TIMESTAMPTZ,
    cooldown_minutes INTEGER DEFAULT 60,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_configs_agent_id ON public.alert_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON public.alert_configs(user_id);

ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can view own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can insert own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can update own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can delete own alert configs" ON public.alert_configs;
END $$;

CREATE POLICY "Users can manage own alert configs" ON public.alert_configs FOR ALL USING (auth.uid() = user_id);
-- Granular policies from billing_and_alerts.sql
CREATE POLICY "Users can view own alert configs" ON public.alert_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert configs" ON public.alert_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alert configs" ON public.alert_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alert configs" ON public.alert_configs FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 11. CUSTOM POLICIES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.custom_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT DEFAULT 'text-blue-400 border-blue-500/30',
    bg TEXT DEFAULT 'bg-blue-500/10',
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_access TEXT NOT NULL DEFAULT 'restricted' CHECK (data_access IN ('unrestricted', 'system-only', 'summarized-results', 'restricted')),
    heartbeat_interval INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_policies_user_id ON public.custom_policies (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_policies_user_active ON public.custom_policies (user_id, is_active);

ALTER TABLE public.custom_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Enterprise users can insert custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Users can update own custom policies" ON public.custom_policies;
    DROP POLICY IF EXISTS "Users can delete own custom policies" ON public.custom_policies;
END $$;

CREATE POLICY "Users can view own custom policies" 
    ON public.custom_policies FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Enterprise users can insert custom policies" 
    ON public.custom_policies FOR INSERT 
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
    ON public.custom_policies FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom policies" 
    ON public.custom_policies FOR DELETE 
    USING (auth.uid() = user_id);

-- ==========================================
-- 12. ENTERPRISE BRANDING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.enterprise_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.enterprise_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own branding" ON public.enterprise_branding
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.enterprise_branding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 13. GLOBAL FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to rate_limits
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rate_limits_updated_at') THEN
        CREATE TRIGGER update_rate_limits_updated_at
        BEFORE UPDATE ON public.rate_limits
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- Apply to custom_policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_policies_timestamp') THEN
        CREATE TRIGGER update_custom_policies_timestamp
        BEFORE UPDATE ON public.custom_policies
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
