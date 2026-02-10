-- Migration: Supabase-Compatible Signup Trigger
-- Description: Re-creates the trigger on auth.users without attempting restricted ALTER TABLE operations.

-- 1. Clean up existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create the function with robust logging and search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
BEGIN
  -- Detailed logging for debugging
  RAISE LOG 'ClawFleet: Processing new user signup - ID: %, Email: %', NEW.id, NEW.email;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END,
    updated_at = now();
    
  RAISE LOG 'ClawFleet: Successfully created/updated profile for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ClawFleet FAULT: handle_new_user failed for user %. Error: %, State: %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 3. Create the trigger explicitly on auth.users
-- Note: ALTER TABLE auth.users is NOT required as triggers are enabled by default.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
