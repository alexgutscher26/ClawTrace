-- Add cost_usd column to agent_metrics for historical cost tracking
ALTER TABLE public.agent_metrics
ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 5) DEFAULT 0;

-- Create index for faster cost aggregation
CREATE INDEX IF NOT EXISTS idx_agent_metrics_cost ON public.agent_metrics (cost_usd);
