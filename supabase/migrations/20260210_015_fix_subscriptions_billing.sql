-- Migration: Fix Subscriptions Table (Full Dependency Cleanup)
-- Description: Handles cross-table policy dependencies, adds Lemon Squeezy columns, and fixes user_id type.

-- 1. DROP DEPENDENT POLICIES
DROP POLICY IF EXISTS "Enterprise users can insert custom policies" ON public.custom_policies;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

-- 2. CLEANUP CONSTRAINTS
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- 3. FIX DATA TYPE
ALTER TABLE public.subscriptions 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 4. ADD LEMON SQUEEZY COLUMNS
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS lemon_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS lemon_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS variant_id TEXT;

-- 5. ATTACH SUPABASE FOREIGN KEY
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. RESTORE POLICIES
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enterprise users can insert custom policies"
    ON public.custom_policies FOR INSERT
    WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
             SELECT 1 FROM public.subscriptions
             WHERE user_id = (select auth.uid())
             AND plan = 'enterprise'
             AND status IN ('active', 'trialing', 'on_trial')
        )
    );

-- 7. UPDATE CONSTRAINTS
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check 
CHECK (plan IN ('free', 'pro', 'enterprise'));

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'on_trial', 'cancelled', 'expired', 'paused', 'past_due', 'unpaid', 'trialing'));
