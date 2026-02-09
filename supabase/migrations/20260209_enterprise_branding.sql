-- Create Enterprise Branding table
CREATE TABLE IF NOT EXISTS public.enterprise_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.enterprise_branding ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own branding
CREATE POLICY "Users can manage their own branding" ON public.enterprise_branding
    FOR ALL
    USING (auth.uid() = user_id);

-- Allow service_role full access
CREATE POLICY "Service role full access" ON public.enterprise_branding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
