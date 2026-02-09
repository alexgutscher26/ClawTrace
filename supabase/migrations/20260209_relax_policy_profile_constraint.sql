-- Migration: Relax Policy Profile Constraint
-- Description: Drops the restrictive check constraint on policy_profile to allow custom policies.
-- Date: 2026-02-09

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_policy_profile_check;

-- Add a more flexible constraint or just allow text
-- For now, we allow any text since custom policies can have arbitrary names
ALTER TABLE public.agents ALTER COLUMN policy_profile SET DEFAULT 'dev';
