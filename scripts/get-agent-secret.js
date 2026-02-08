const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { decrypt } = require('../lib/encryption');

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
