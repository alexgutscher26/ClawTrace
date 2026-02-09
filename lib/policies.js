/**
 * Fleet Orchestrator - Policy Profile Definitions
 * 
 * Defines the capabilities, skills, and data access for each pre-built role.
 * Enterprise users can create custom policies via the custom_policies table.
 */

export const POLICY_PROFILES = {
    dev: {
        label: 'DEVELOPER',
        description: 'Full access to tools, environment variables, and advanced debugging skills.',
        color: 'text-white border-white/40',
        bg: 'bg-white/10',
        skills: ['coding', 'architecture', 'debugging', 'testing', 'refactoring'],
        tools: ['terminal', 'vscode', 'git', 'browser', 'npm', 'bun'],
        data_access: 'unrestricted',
        heartbeat_interval: 300, // 5 minutes
    },
    ops: {
        label: 'OPERATIONS',
        description: 'System-level access for monitoring, scaling, and deployment management.',
        color: 'text-emerald-400 border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        skills: ['monitoring', 'scaling', 'deployment', 'security', 'logging'],
        tools: ['bash', 'docker', 'k8s', 'ssh', 'top', 'systemctl'],
        data_access: 'system-only',
        heartbeat_interval: 60, // 1 minute
    },
    exec: {
        label: 'EXECUTIVE',
        description: 'Read-only access focused on high-level analysis, costs, and high-level reporting.',
        color: 'text-amber-400 border-amber-500/30',
        bg: 'bg-amber-500/10',
        skills: ['analysis', 'reporting', 'budgeting', 'forecasting', 'strategy'],
        tools: ['analytics', 'dashboard', 'spreadsheet', 'presentation'],
        data_access: 'summarized-results',
        heartbeat_interval: 600, // 10 minutes
    }
};

/**
 * Get a policy by ID. Supports both built-in and custom policies.
 * For custom policies, pass the full custom policy object or use getPolicyWithCustom.
 * 
 * @param {string} id - Policy ID (dev, ops, exec, or custom policy name)
 * @param {object} customPolicy - Optional custom policy object
 * @returns {object} Policy configuration
 */
export const getPolicy = (id, customPolicy = null) => {
    // If custom policy object is provided, return it
    if (customPolicy && typeof customPolicy === 'object' && customPolicy.name === id) {
        return {
            label: customPolicy.label,
            description: customPolicy.description,
            color: customPolicy.color || 'text-blue-400 border-blue-500/30',
            bg: customPolicy.bg || 'bg-blue-500/10',
            skills: Array.isArray(customPolicy.skills) ? customPolicy.skills : [],
            tools: Array.isArray(customPolicy.tools) ? customPolicy.tools : [],
            data_access: customPolicy.data_access || 'restricted',
            heartbeat_interval: customPolicy.heartbeat_interval || 300,
        };
    }

    // Return built-in policy or default to dev
    return POLICY_PROFILES[id] || POLICY_PROFILES.dev;
};

/**
 * Get all available policies for a user (built-in + custom)
 * This should be called from the server-side with database access
 * 
 * @param {object} supabaseClient - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<object>} Object with all policies keyed by ID
 */
export async function getAllPolicies(supabaseClient, userId) {
    const policies = { ...POLICY_PROFILES };

    if (!userId || !supabaseClient) return policies;

    try {
        const { data: customPolicies } = await supabaseClient
            .from('custom_policies')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (customPolicies && customPolicies.length > 0) {
            customPolicies.forEach(cp => {
                policies[cp.name] = {
                    label: cp.label,
                    description: cp.description,
                    color: cp.color,
                    bg: cp.bg,
                    skills: cp.skills,
                    tools: cp.tools,
                    data_access: cp.data_access,
                    heartbeat_interval: cp.heartbeat_interval,
                    custom: true, // Flag to identify custom policies
                    id: cp.id, // Store the database ID
                };
            });
        }
    } catch (error) {
        console.error('Error fetching custom policies:', error);
    }

    return policies;
}

