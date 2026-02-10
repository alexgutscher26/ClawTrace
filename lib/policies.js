/**
 * ClawFleet - Policy Profile Definitions
 *
 * Defines the capabilities, skills, and data access for each pre-built role.
 * Enterprise users can create custom policies via the custom_policies table.
 */

export const POLICY_DEV = 'dev';
export const POLICY_OPS = 'ops';
export const POLICY_EXEC = 'exec';

export const DEFAULT_POLICY_PROFILE = POLICY_DEV;

export const POLICY_PROFILES = {
  [POLICY_DEV]: {
    label: 'DEVELOPER',
    description: 'Full access to tools, environment variables, and advanced debugging skills.',
    color: 'text-white border-white/40',
    bg: 'bg-white/10',
    skills: ['coding', 'architecture', 'debugging', 'testing', 'refactoring'],
    tools: ['terminal', 'vscode', 'git', 'browser', 'npm', 'bun'],
    data_access: 'unrestricted',
    heartbeat_interval: 300, // 5 minutes
  },
  [POLICY_OPS]: {
    label: 'OPERATIONS',
    description: 'System-level access for monitoring, scaling, and deployment management.',
    color: 'text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    skills: ['monitoring', 'scaling', 'deployment', 'security', 'logging'],
    tools: ['bash', 'docker', 'k8s', 'ssh', 'top', 'systemctl'],
    data_access: 'system-only',
    heartbeat_interval: 60, // 1 minute
  },
  [POLICY_EXEC]: {
    label: 'EXECUTIVE',
    description:
      'Read-only access focused on high-level analysis, costs, and high-level reporting.',
    color: 'text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/10',
    skills: ['analysis', 'reporting', 'budgeting', 'forecasting', 'strategy'],
    tools: ['analytics', 'dashboard', 'spreadsheet', 'presentation'],
    heartbeat_interval: 600, // 10 minutes
    guardrails: {
      budget_limit_usd: 1.0,
      approved_tools: ['analytics', 'dashboard'],
      max_execution_time_sec: 300,
    },
  },
};

// Add default guardrails to other profiles
POLICY_PROFILES[POLICY_DEV].guardrails = {
  budget_limit_usd: 100.0,
  approved_tools: ['*'], // Wildcard = all tools
  max_execution_time_sec: 3600,
};

POLICY_PROFILES[POLICY_OPS].guardrails = {
  budget_limit_usd: 50.0,
  approved_tools: ['bash', 'docker', 'k8s', 'ssh', 'top', 'systemctl'],
  max_execution_time_sec: 1800,
};

/**
 * Get a policy by ID, supporting both built-in and custom policies.
 *
 * The function checks if a custom policy object is provided and matches the given ID. If a match is found, it returns the properties of the custom policy. If no match is found, it retrieves the built-in policy from POLICY_PROFILES, defaulting to the dev profile if the ID is not found.
 *
 * @param id - Policy ID (dev, ops, exec, or custom policy name).
 * @param customPolicy - Optional custom policy object.
 * @returns The policy configuration object.
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
      guardrails: customPolicy.guardrails || {},
    };
  }

  // Return built-in policy or default to dev
  return POLICY_PROFILES[id] || POLICY_PROFILES[DEFAULT_POLICY_PROFILE];
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
      customPolicies.forEach((cp) => {
        policies[cp.name] = {
          label: cp.label,
          description: cp.description,
          color: cp.color,
          bg: cp.bg,
          skills: cp.skills,
          tools: cp.tools,
          data_access: cp.data_access,
          heartbeat_interval: cp.heartbeat_interval,
          guardrails: cp.guardrails || {},
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
