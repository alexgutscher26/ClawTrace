const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function checkAgentInfo() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('🤖 Checking Agent Info for:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, machine_id, location, model, config_json, created_at')
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

    console.log('📋 Agent Information:');
    console.log('   Name:', agent.name);
    console.log('   Machine ID:', agent.machine_id || '(not set)');
    console.log('   Location:', agent.location || '(not set)');
    console.log('   Model:', agent.model);
    console.log('   Profile:', agent.config_json?.profile || '-');
    console.log('   Skills:', (agent.config_json?.skills || []).join(', ') || '-');
    console.log('   Data Scope:', agent.config_json?.data_scope || '-');
    console.log('   Created:', new Date(agent.created_at).toLocaleString());
    console.log('');

    if (!agent.machine_id || !agent.location) {
        console.log('⚠️  Machine ID or Location not set');
        console.log('   These will be auto-populated on the next heartbeat');
        console.log('   The agent script now sends:');
        console.log('     - machine_id: hostname (e.g., DESKTOP-ABC123)');
        console.log('     - location: timezone-based guess (e.g., us-central)');
    } else {
        console.log('✅ Agent Info is complete!');
    }
}

checkAgentInfo().catch(console.error);
