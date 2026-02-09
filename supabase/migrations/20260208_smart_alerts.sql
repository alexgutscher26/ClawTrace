-- Migration: Add Smart Alerts System
-- Date: 2026-02-08

-- 1. ALERT CHANNELS
CREATE TABLE IF NOT EXISTS public.alert_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('slack', 'discord', 'email', 'webhook')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store webhook URLs, email addresses, etc.
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alert_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert channels" ON public.alert_channels
    FOR ALL USING (auth.uid() = user_id);

-- 2. ALERT CONFIGURATIONS (Per Agent or Fleet)
-- We'll link these to agents for granular control, but they could also be linked to fleets.
CREATE TABLE IF NOT EXISTS public.alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.alert_channels(id) ON DELETE CASCADE NOT NULL,
    
    -- Thresholds
    cpu_threshold INTEGER DEFAULT 90, -- %
    mem_threshold INTEGER DEFAULT 90, -- %
    latency_threshold INTEGER DEFAULT 1000, -- ms
    offline_alert BOOLEAN DEFAULT true,
    error_alert BOOLEAN DEFAULT true,
    
    -- Squelch (Prevention of Alert Fatigue)
    last_triggered_at TIMESTAMPTZ,
    cooldown_minutes INTEGER DEFAULT 60,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert configs" ON public.alert_configs
    FOR ALL USING (auth.uid() = user_id);

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_alert_configs_agent_id ON public.alert_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON public.alert_configs(user_id);
