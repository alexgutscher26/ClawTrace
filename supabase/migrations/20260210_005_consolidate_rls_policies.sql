-- Migration: Consolidate RLS Policies
-- Description: Removes redundant "manage" (FOR ALL) policies where granular (SELECT, INSERT, UPDATE, DELETE) policies already exist.
-- This resolves the "Multiple permissive policies" performance warning.

-- 1. FLEETS
DROP POLICY IF EXISTS "Users can manage their own fleets" ON public.fleets;

-- 2. AGENTS
DROP POLICY IF EXISTS "Users can manage their own agents" ON public.agents;

-- 3. ALERTS
DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.alerts;

-- 4. ALERT CHANNELS
DROP POLICY IF EXISTS "Users can manage own alert channels" ON public.alert_channels;

-- 5. ALERT CONFIGS
DROP POLICY IF EXISTS "Users can manage own alert configs" ON public.alert_configs;

-- 6. PROFILES
-- "Public profiles are viewable by everyone" covers SELECT.
-- "Users can insert/update..." covers write operations.
-- "Users can view and edit their own profile" (FOR ALL) is redundant and causes overlap.
-- "Users can update their own profile" is likely a duplicate of "Users can update own profile".
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 7. TEAMS
-- "Users can view and manage their teams" (FOR ALL) overlaps with granular policies.
DROP POLICY IF EXISTS "Users can view and manage their teams" ON public.teams;

-- 8. SUBSCRIPTIONS
-- Remove redundant policy ("Users can view their own subscription") in favor of "Users can view own subscription".
-- These two were identical.
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
