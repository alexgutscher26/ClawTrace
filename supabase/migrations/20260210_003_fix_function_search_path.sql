-- Migration: Fix Function Search Paths
-- Description: Secures functions by explicitly setting search_path to empty string to prevent search_path hijacking.
-- Affected functions: update_updated_at_column, handle_new_user, get_dashboard_stats, check_rate_limit

-- 1. update_updated_at_column (Trigger Function - Commonly flagged)
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- 2. handle_new_user (SECURITY DEFINER Trigger Function - Critical)
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 3. get_dashboard_stats (RPC Function)
-- Ensure this function exists before altering (it should from migration 002)
ALTER FUNCTION public.get_dashboard_stats(uuid) SET search_path = '';

-- 4. check_rate_limit (RPC Function - SECURITY DEFINER - Critical)
-- This function was added in migration 20260209_001_optimize_performance.sql
ALTER FUNCTION public.check_rate_limit(text, text, float, float) SET search_path = '';

-- 5. handle_new_user (Already handled above, but ensuring consistency)
-- (No action needed, just verifying coverage)

-- 6. update_custom_policies_updated_at (Potential phantom/dynamic check)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_custom_policies_updated_at'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.update_custom_policies_updated_at() SET search_path = ''''';
    END IF;
END $$;
