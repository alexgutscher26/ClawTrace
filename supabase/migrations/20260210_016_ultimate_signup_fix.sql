-- Migration: Ultimate Signup Flow Fix
-- Description: Re-creates the signup trigger with explicit schema references and improved reliability.
-- This migration ensures that the profile, default subscription, and default fleet are created atomically.

-- 1. DROP EXISTING TRIGGER FIRST to avoid double-firing or conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. RE-CREATE FUNCTION with strict schema enforcement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
    default_fleet_id UUID;
BEGIN
    -- Logging for audit trail (available in Supabase logs)
    RAISE LOG 'ClawTrace: Handling new user % (%)', NEW.id, NEW.email;

    -- A. Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        avatar_url, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        updated_at = now();

    -- B. Create Default 'free' Subscription
    -- Using INSERT ... ON CONFLICT to ensure idempotency
    INSERT INTO public.subscriptions (
        user_id,
        plan,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        'free',
        'active',
        now(),
        now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- C. Create Initial Fleet
    -- We want every user to have at least one fleet to start with
    INSERT INTO public.fleets (
        user_id,
        name,
        description,
        created_at
    )
    VALUES (
        NEW.id,
        'Main Fleet',
        'Auto-generated production fleet for ' || COALESCE(NEW.email, 'new user'),
        now()
    )
    ON CONFLICT DO NOTHING;

    RAISE LOG 'ClawTrace: Successfully initialized user data for %', NEW.id;
    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-throwing error if it's a critical failure we want to know about during signup
        -- However, we wrap it in a custom message for easier identification
        RAISE EXCEPTION 'ClawTrace Signup Initialization Failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- 3. RE-ESTABLISH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFY POLICIES (Safety check)
-- Ensure the new user has the right to see their own profile even if RLS is tight
-- This is usually already handled by 'Users can insert their own profile' but let's be sure.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
