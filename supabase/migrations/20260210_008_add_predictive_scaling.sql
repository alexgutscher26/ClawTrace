-- Add Auto-Scaling Configuration to Fleets
ALTER TABLE public.fleets
ADD COLUMN IF NOT EXISTS scaling_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_instances INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_instances INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS scale_up_threshold_ms INTEGER DEFAULT 500, -- 500ms default as requested
ADD COLUMN IF NOT EXISTS scale_down_threshold_ms INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS cooldown_seconds INTEGER DEFAULT 300;

-- Create Scaling Events Log
CREATE TABLE IF NOT EXISTS public.scaling_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('UP', 'DOWN')),
    reason TEXT,
    old_count INTEGER,
    new_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scaling_events_fleet_id ON public.scaling_events(fleet_id);

-- Enable RLS for Scaling Events
ALTER TABLE public.scaling_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fleet scaling events" 
ON public.scaling_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.fleets 
        WHERE id = scaling_events.fleet_id 
        AND user_id = auth.uid()
    )
);
