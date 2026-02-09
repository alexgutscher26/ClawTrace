-- Migration: Add Policy Profiles to Agents
-- Description: Adds policy_profile column to agents table for Dev, Ops, Exec roles.

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS policy_profile TEXT DEFAULT 'dev' CHECK (policy_profile IN ('dev', 'ops', 'exec'));

-- Update existing agents to have 'dev' as default if they don't have one
UPDATE public.agents SET policy_profile = 'dev' WHERE policy_profile IS NULL;
