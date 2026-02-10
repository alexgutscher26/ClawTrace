-- Migration: Harden Signup Trigger
-- Description: Ensures users are reliably saved to the profiles table with better conflict handling and logging.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract metadata safely
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  v_avatar_url := COALESCE(new.raw_user_meta_data->>'avatar_url', '');

  -- Insert into profiles using fully qualified names for maximum safety
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id, 
    new.email, 
    v_full_name,
    v_avatar_url,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END,
    updated_at = now();
    
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'FAULT in handle_new_user: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly set search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
