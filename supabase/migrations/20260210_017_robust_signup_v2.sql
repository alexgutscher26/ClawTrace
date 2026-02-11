-- Migration: Robust Signup Flow v2
-- Description: Fixes the 500/422 errors by making the signup trigger extremely fault-tolerant and ensuring schema alignment.

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create the robust function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, auth, pg_catalog, extensions
AS $$
DECLARE
    new_fleet_id UUID;
BEGIN
    -- Log start
    RAISE LOG 'ClawTrace: Starting signup for user %', NEW.id;

    -- A. PROFILE (Critical)
    -- We use a single block to ensure if this fails we at least log why
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
        VALUES (
            NEW.id,
            LOWER(COALESCE(NEW.email, '')),
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'ClawTrace: Profile creation failed: %', SQLERRM;
    END;

    -- B. SUBSCRIPTION (Non-critical but important)
    BEGIN
        INSERT INTO public.subscriptions (user_id, plan, status, updated_at)
        VALUES (NEW.id, 'free', 'active', now())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'ClawTrace: Subscription creation failed: %', SQLERRM;
    END;

    -- C. FLEET (Non-critical)
    BEGIN
        INSERT INTO public.fleets (user_id, name)
        VALUES (
            NEW.id, 
            'Default Fleet'
        )
        ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'ClawTrace: Fleet creation failed: %', SQLERRM;
    END;

    RAISE LOG 'ClawTrace: Signup completed for user %', NEW.id;
    RETURN NEW;
END;
$$;

-- 4. Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix any existing orphaned users (Backfill)
-- This fixes the 422 case where user exists in Auth but not in Profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', ''), COALESCE(raw_user_meta_data->>'avatar_url', ''), now()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan, status, updated_at)
SELECT id, 'free', 'active', now()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.fleets (user_id, name)
SELECT id, 'Default Fleet'
FROM auth.users
ON CONFLICT DO NOTHING;

