-- ⚠️ DANGER: This script deletes ALL data from the database.
-- It preserves the schema (tables, columns, policies) but removes all rows.
-- Use with caution!

TRUNCATE TABLE 
    public.scaling_events,
    public.agent_metrics,
    public.alert_configs,
    public.alerts,
    public.agents,
    public.fleets,
    public.alert_channels,
    public.custom_policies,
    public.enterprise_branding,
    public.rate_limits,
    public.subscriptions,
    public.teams,
    public.profiles
RESTART IDENTITY CASCADE;

-- Optional: Reset auth.users if you have access (usually requires service_role or extensive privileges)
-- DELETE FROM auth.users WHERE id != 'your-admin-id'; -- Example only
