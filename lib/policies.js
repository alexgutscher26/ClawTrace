/**
 * Fleet Orchestrator - Policy Profile Definitions
 * 
 * Defines the capabilities, skills, and data access for each pre-built role.
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

export const getPolicy = (id) => POLICY_PROFILES[id] || POLICY_PROFILES.dev;
