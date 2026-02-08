-- Migration: Add rate_limits table for API rate limiting
-- Description: Stores request buckets for IP-based and Agent-based rate limiting.

CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address or User ID
    path TEXT NOT NULL,       -- API path (e.g., '/agents/handshake')
    bucket JSONB NOT NULL DEFAULT '{"tokens": 10, "last_refill": null}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by identifier and path
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_path ON public.rate_limits (identifier, path);

-- Enable RLS (Row Level Security) - though this table is mainly for server-side use
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage rate limits (default)
CREATE POLICY "Service role only" ON public.rate_limits
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON public.rate_limits
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
