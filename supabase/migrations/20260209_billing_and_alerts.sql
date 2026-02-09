-- Migration: Lemon Squeezy and Alerts Schema
-- Description: Adds LS fields to subscriptions and creates alert tables.

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS lemon_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS lemon_customer_id TEXT,
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create alert_channels table
CREATE TABLE IF NOT EXISTS public.alert_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('slack', 'discord', 'email', 'webhook')),
    config JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create alert_configs table
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
    cooldown_minutes INTEGER DEFAULT 60,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- Policies for alert_channels
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can insert own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can update own alert channels" ON public.alert_channels;
    DROP POLICY IF EXISTS "Users can delete own alert channels" ON public.alert_channels;
END $$;

CREATE POLICY "Users can view own alert channels" ON public.alert_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert channels" ON public.alert_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alert channels" ON public.alert_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alert channels" ON public.alert_channels FOR DELETE USING (auth.uid() = user_id);

-- Policies for alert_configs
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can insert own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can update own alert configs" ON public.alert_configs;
    DROP POLICY IF EXISTS "Users can delete own alert configs" ON public.alert_configs;
END $$;

CREATE POLICY "Users can view own alert configs" ON public.alert_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert configs" ON public.alert_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alert configs" ON public.alert_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alert configs" ON public.alert_configs FOR DELETE USING (auth.uid() = user_id);
