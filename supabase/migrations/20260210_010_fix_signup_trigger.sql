-- Fix for 500 Error on Signup
-- 1. Revert search_path to 'public' so built-in functions/operators work.
-- 2. Add ON CONFLICT DO NOTHING to handle idempotency.
-- 3. Add explicit error handling.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error to Postgres logs
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    -- Important: Return new so the auth user is still created even if profile fails
    -- (Depending on app logic, maybe re-raise, but better to allow login and fix profile later)
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly set search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
