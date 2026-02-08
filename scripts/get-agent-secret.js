const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { decrypt } = require('../lib/encryption');

/**
 * Loads environment variables from a .env file.
 *
 * This function resolves the path to the .env file, checks if it exists, and reads its content.
 * Each line is split into key-value pairs, which are then trimmed and assigned to the process.env object
 * if the key is valid and the value is present. This allows for dynamic configuration of environment variables.
 */
function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length > 0) {
            process.env[key.trim()] = val.join('=').trim();
        }
    });
}
loadEnv();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Retrieves and logs the agent secret for a specific agent.
 *
 * This asynchronous function fetches the agent's secret from the 'agents' table in the Supabase database using a predefined agent ID.
 * It handles potential errors during the fetch operation and checks if the agent exists. If successful, it decrypts the agent secret
 * and logs it along with a CLI command for further use.
 */
async function getAgentSecret() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    const { data: agent, error } = await supabase
        .from('agents')
        .select('agent_secret')
        .eq('id', agentId)
        .maybeSingle();

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!agent) {
        console.error('❌ Agent not found');
        return;
    }

    const secret = decrypt(agent.agent_secret);
    console.log('Agent Secret:', secret);
    console.log('');
    console.log('📋 CLI Command:');
    console.log(`openclaw config push --agent-id=${agentId} --saas-url=http://localhost:3000 --agent-secret=${secret} --config='{"model":"claude-sonnet-4","skills":["code","search"],"profile":"dev","data_scope":"full"}'`);
}

getAgentSecret().catch(console.error);
