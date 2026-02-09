-- Migration: Optimize Database Performance
-- Description: Adds compound index for agent filtering and an atomic RPC function for rate limiting.

-- 1. Create compound index for frequent agent filtering
-- This optimizes queries like: .from('agents').select('*').eq('user_id', ...).eq('fleet_id', ...).eq('status', ...)
CREATE INDEX IF NOT EXISTS idx_agents_user_fleet_status ON public.agents (user_id, fleet_id, status);

-- 2. Atomic Rate Limiting Function
-- Replaces client-side read-modify-write logic with a single atomic DB operation.
-- Significantly improves concurrency handling for the 1000+ heartbeat requirement.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_path text,
  p_capacity float,
  p_refill_rate float
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tokens float;
  v_last_refill float;
  v_now float := extract(epoch from now());
  v_elapsed float;
  v_allowed boolean;
  v_retry_after float := 0;
BEGIN
  -- Lock the specific row for update (or do nothing if not exists yet)
  -- We query first to calculate the new state
  SELECT (bucket->>'tokens')::float, (bucket->>'last_refill')::float
  INTO v_tokens, v_last_refill
  FROM public.rate_limits
  WHERE identifier = p_identifier AND path = p_path
  FOR UPDATE;

  -- Initialize if not found
  IF NOT FOUND THEN
    v_tokens := p_capacity;
    v_last_refill := v_now;
  ELSE
    -- Refill tokens based on elapsed time
    v_elapsed := v_now - v_last_refill;
    v_tokens := LEAST(p_capacity, v_tokens + (v_elapsed * p_refill_rate));
    v_last_refill := v_now;
  END IF;

  -- Check against capacity
  IF v_tokens >= 1 THEN
    v_tokens := v_tokens - 1;
    v_allowed := true;
  ELSE
    v_allowed := false;
    -- Calculate retry after (seconds)
    IF p_refill_rate > 0 THEN
      v_retry_after := CEIL((1 - v_tokens) / p_refill_rate);
    ELSE
      v_retry_after := 60; -- Fallback
    END IF;
  END IF;

  -- Upsert the new state
  INSERT INTO public.rate_limits (identifier, path, bucket, updated_at)
  VALUES (
    p_identifier, 
    p_path, 
    jsonb_build_object('tokens', v_tokens, 'last_refill', v_last_refill),
    now()
  )
  ON CONFLICT (identifier, path) DO UPDATE
  SET bucket = EXCLUDED.bucket, updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'allowed', v_allowed, 
    'tokens', v_tokens,
    'retry_after', v_retry_after
  );
END;
$$;
