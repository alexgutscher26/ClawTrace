-- Migration: Add Stripe Billing Columns
-- Description: Adds Stripe columns and removes Lemon Squeezy columns.

-- 1. ADD STRIPE COLUMNS
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. REMOVE LEMON SQUEEZY COLUMNS
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS lemon_subscription_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS lemon_customer_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS variant_id;
