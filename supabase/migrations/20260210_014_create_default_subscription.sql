-- Migration: Create Default Subscription on Signup
-- Description: Updates the handle_new_user trigger to also create a default 'free' subscription for new users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- 1. Create Profile
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

  -- 2. Create Default 'free' Subscription
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

  -- 3. Create Default Fleet (Optional but helps initial experience)
  INSERT INTO public.fleets (
    user_id,
    name,
    description
  )
  VALUES (
    NEW.id,
    'Default Fleet',
    'Main operational fleet for ' || COALESCE(NEW.email, 'this user')
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ClawFleet TRIGGER ERROR: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;
