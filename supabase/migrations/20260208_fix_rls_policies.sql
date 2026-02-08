-- Enable Row Level Security (RLS) on all tables to prevent unrestricted access
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Agents Policies
CREATE POLICY "Users can manage their own agents" ON public.agents
    FOR ALL
    USING (auth.uid() = user_id);

-- Alerts Policies
CREATE POLICY "Users can manage their own alerts" ON public.alerts
    FOR ALL
    USING (auth.uid() = user_id);

-- Fleets Policies
CREATE POLICY "Users can manage their own fleets" ON public.fleets
    FOR ALL
    USING (auth.uid() = user_id);

-- Subscriptions Policies (Read-only for users, managed by service role)
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Teams Policies
-- Allow access if user is owner OR member
-- Note: 'members' is a JSONB column array of objects like [{user_id: "..."}]
CREATE POLICY "Users can view and manage their teams" ON public.teams
    FOR ALL
    USING (
        auth.uid() = owner_id 
        OR 
        members @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()))
    );

-- Ensure profiles table also has RLS (it looked safe but good to confirm)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit their own profile" ON public.profiles
    FOR ALL
    USING (auth.uid() = id);

-- Public profiles are viewable by anyone (optional, depends on app needs)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT
    USING (true);
