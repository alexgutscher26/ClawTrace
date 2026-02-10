-- Migration: Optimize RLS Policies
-- Description: Replaces direct auth.uid() calls with (select auth.uid()) to prevent re-evaluation for every row.
-- This improves query performance at scale for core tables: profiles, fleets, agents, alerts, etc.

-- 1. PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Users can view and edit their own profile" ON public.profiles FOR ALL USING ((select auth.uid()) = id);

-- 2. FLEETS
DROP POLICY IF EXISTS "Users can view own fleets" ON public.fleets;
DROP POLICY IF EXISTS "Users can insert own fleets" ON public.fleets;
DROP POLICY IF EXISTS "Users can update own fleets" ON public.fleets;
DROP POLICY IF EXISTS "Users can delete own fleets" ON public.fleets;
DROP POLICY IF EXISTS "Users can manage their own fleets" ON public.fleets;

CREATE POLICY "Users can view own fleets" ON public.fleets FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own fleets" ON public.fleets FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own fleets" ON public.fleets FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own fleets" ON public.fleets FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage their own fleets" ON public.fleets FOR ALL USING ((select auth.uid()) = user_id);

-- 3. AGENTS
DROP POLICY IF EXISTS "Users can view own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can insert own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can manage their own agents" ON public.agents;

CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own agents" ON public.agents FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage their own agents" ON public.agents FOR ALL USING ((select auth.uid()) = user_id);

-- 4. ALERTS
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.alerts;

CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage their own alerts" ON public.alerts FOR ALL USING ((select auth.uid()) = user_id);

-- 5. SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING ((select auth.uid()) = user_id);

-- 6. AGENT_METRICS
DROP POLICY IF EXISTS "Users can read own agent metrics" ON public.agent_metrics;
CREATE POLICY "Users can read own agent metrics" ON public.agent_metrics FOR SELECT USING ((select auth.uid()) = user_id);

-- 7. ALERT CHANNELS
DROP POLICY IF EXISTS "Users can manage own alert channels" ON public.alert_channels;
DROP POLICY IF EXISTS "Users can view own alert channels" ON public.alert_channels;
DROP POLICY IF EXISTS "Users can insert own alert channels" ON public.alert_channels;
DROP POLICY IF EXISTS "Users can update own alert channels" ON public.alert_channels;
DROP POLICY IF EXISTS "Users can delete own alert channels" ON public.alert_channels;

CREATE POLICY "Users can manage own alert channels" ON public.alert_channels FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view own alert channels" ON public.alert_channels FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own alert channels" ON public.alert_channels FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own alert channels" ON public.alert_channels FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own alert channels" ON public.alert_channels FOR DELETE USING ((select auth.uid()) = user_id);

-- 8. ALERT CONFIGS
DROP POLICY IF EXISTS "Users can manage own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can view own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can insert own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can update own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can delete own alert configs" ON public.alert_configs;

CREATE POLICY "Users can manage own alert configs" ON public.alert_configs FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view own alert configs" ON public.alert_configs FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own alert configs" ON public.alert_configs FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own alert configs" ON public.alert_configs FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own alert configs" ON public.alert_configs FOR DELETE USING ((select auth.uid()) = user_id);

-- 9. CUSTOM POLICIES
DROP POLICY IF EXISTS "Users can view own custom policies" ON public.custom_policies;
DROP POLICY IF EXISTS "Users can update own custom policies" ON public.custom_policies;
DROP POLICY IF EXISTS "Users can delete own custom policies" ON public.custom_policies;
DROP POLICY IF EXISTS "Enterprise users can insert custom policies" ON public.custom_policies;

CREATE POLICY "Users can view own custom policies" ON public.custom_policies FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own custom policies" ON public.custom_policies FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own custom policies" ON public.custom_policies FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Enterprise users can insert custom policies"
    ON public.custom_policies FOR INSERT
    WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
             SELECT 1 FROM public.subscriptions
             WHERE user_id = (select auth.uid())
             AND plan = 'enterprise'
             AND status IN ('active', 'trialing')
        )
    );

-- 10. ENTERPRISE BRANDING
DROP POLICY IF EXISTS "Users can manage their own branding" ON public.enterprise_branding;
CREATE POLICY "Users can manage their own branding" ON public.enterprise_branding FOR ALL USING ((select auth.uid()) = user_id);
