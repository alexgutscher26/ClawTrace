-- Migration: Add Dashboard Stats RPC
-- Description: Adds a function to calculate dashboard statistics efficiently in the database.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_total_agents int;
  v_total_fleets int;
  v_healthy int;
  v_idle int;
  v_error int;
  v_offline int;
  v_total_cost numeric;
  v_total_tasks int;
  v_unresolved_alerts int;
BEGIN
  -- Agents stats
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'healthy'),
    count(*) FILTER (WHERE status = 'idle'),
    count(*) FILTER (WHERE status = 'error'),
    count(*) FILTER (WHERE status = 'offline'),
    COALESCE(SUM((metrics_json->>'cost_usd')::numeric), 0),
    COALESCE(SUM((metrics_json->>'tasks_completed')::int), 0)
  INTO
    v_total_agents,
    v_healthy,
    v_idle,
    v_error,
    v_offline,
    v_total_cost,
    v_total_tasks
  FROM public.agents
  WHERE user_id = p_user_id;

  -- Fleets stats
  SELECT count(*) INTO v_total_fleets
  FROM public.fleets
  WHERE user_id = p_user_id;

  -- Alerts stats
  SELECT count(*) INTO v_unresolved_alerts
  FROM public.alerts
  WHERE user_id = p_user_id AND resolved = false;

  RETURN jsonb_build_object(
    'total_agents', v_total_agents,
    'total_fleets', v_total_fleets,
    'healthy', v_healthy,
    'idle', v_idle,
    'error', v_error,
    'offline', v_offline,
    'total_cost', ROUND(v_total_cost, 2),
    'total_tasks', v_total_tasks,
    'unresolved_alerts', v_unresolved_alerts
  );
END;
$$;
