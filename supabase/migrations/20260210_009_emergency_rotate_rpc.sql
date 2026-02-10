-- RPC Function to atomically rotate agent models
-- Usage: supabase.rpc('rotate_agent_models', { old_model: 'gpt-4', new_model: 'claude-3-opus' })

CREATE OR REPLACE FUNCTION public.rotate_agent_models(
    old_model TEXT, 
    new_model TEXT, 
    target_fleet_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH rows AS (
    UPDATE public.agents
    SET 
      model = new_model,
      -- Update the JSON blob as well so the agent pulls the new config on next heartbeat/sync
      config_json = jsonb_set(COALESCE(config_json, '{}'::jsonb), '{model}', to_jsonb(new_model)),
      updated_at = now()
    WHERE 
      (model = old_model OR config_json->>'model' = old_model)
      AND (target_fleet_id IS NULL OR fleet_id = target_fleet_id)
    RETURNING 1
  )
  SELECT count(*) INTO updated_count FROM rows;
  
  RETURN updated_count;
END;
$$;
