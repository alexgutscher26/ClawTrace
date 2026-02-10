-- Migration: Add Guardrails to Custom Policies
-- Description: Adds a JSONB column to custom_policies to store policy enforcement rules (e.g. spending limits, tool restrictions).

ALTER TABLE public.custom_policies 
ADD COLUMN IF NOT EXISTS guardrails JSONB DEFAULT '{}'::jsonb;
