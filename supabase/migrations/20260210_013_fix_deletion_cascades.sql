-- Migration: Fix Foreign Key Constraints for Deletion
-- Description: Adds ON DELETE CASCADE to missing foreign keys referencing auth.users to allow clean user deletion.

-- 1. AGENT_METRICS
ALTER TABLE public.agent_metrics
DROP CONSTRAINT IF EXISTS agent_metrics_user_id_fkey;

ALTER TABLE public.agent_metrics
ADD CONSTRAINT agent_metrics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. SUBSCRIPTIONS
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
