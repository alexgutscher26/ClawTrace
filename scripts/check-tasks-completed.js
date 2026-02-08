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

async function checkTasksCompleted() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('📊 Checking tasks_completed for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, metrics_json, last_heartbeat')
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

    console.log('Agent Name:', agent.name);
    console.log('Last Heartbeat:', agent.last_heartbeat);
    console.log('');
    console.log('📈 Metrics:');
    console.log('   tasks_completed:', agent.metrics_json?.tasks_completed || 0);
    console.log('   cpu_usage:', agent.metrics_json?.cpu_usage || 0, '%');
    console.log('   memory_usage:', agent.metrics_json?.memory_usage || 0, '%');
    console.log('   uptime_hours:', agent.metrics_json?.uptime_hours || 0);
    console.log('   latency_ms:', agent.metrics_json?.latency_ms || 0);
    console.log('   errors_count:', agent.metrics_json?.errors_count || 0);
    console.log('');

    const tasksCompleted = agent.metrics_json?.tasks_completed || 0;
    if (tasksCompleted > 0) {
        console.log('✅ tasks_completed is working! Current count:', tasksCompleted);
    } else {
        console.log('⚠️  tasks_completed is 0. Send a heartbeat to test the increment.');
    }
}

checkTasksCompleted().catch(console.error);
