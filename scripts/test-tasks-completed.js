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

async function testTasksCompleted() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('🔍 Testing tasks_completed metric...\n');

    // Get current state
    const { data: before, error: beforeError } = await supabase
        .from('agents')
        .select('metrics_json')
        .eq('id', agentId)
        .maybeSingle();

    if (beforeError) {
        console.error('❌ Error fetching agent:', beforeError);
        return;
    }

    if (!before) {
        console.error('❌ Agent not found');
        return;
    }

    console.log('📊 BEFORE heartbeat:');
    console.log('   tasks_completed:', before.metrics_json?.tasks_completed || 0);
    console.log('   cpu_usage:', before.metrics_json?.cpu_usage || 0);
    console.log('   memory_usage:', before.metrics_json?.memory_usage || 0);
    console.log('');

    // Simulate heartbeat update (what the API does)
    const incomingMetrics = {
        cpu_usage: 45,
        memory_usage: 60,
        uptime_hours: 10,
        latency_ms: 120
    };

    const updatedMetrics = { ...before.metrics_json, ...incomingMetrics };

    console.log('📥 Incoming metrics from agent:');
    console.log('   ', JSON.stringify(incomingMetrics, null, 2));
    console.log('');

    console.log('📊 AFTER merge (current behavior):');
    console.log('   tasks_completed:', updatedMetrics.tasks_completed || 0);
    console.log('   cpu_usage:', updatedMetrics.cpu_usage);
    console.log('   memory_usage:', updatedMetrics.memory_usage);
    console.log('');

    console.log('❌ PROBLEM: tasks_completed is NOT incremented!');
    console.log('');

    // Show what SHOULD happen
    const correctMetrics = {
        ...before.metrics_json,
        ...incomingMetrics,
        tasks_completed: (before.metrics_json?.tasks_completed || 0) + 1
    };

    console.log('✅ CORRECT behavior (should increment):');
    console.log('   tasks_completed:', correctMetrics.tasks_completed);
    console.log('   (incremented from', before.metrics_json?.tasks_completed || 0, 'to', correctMetrics.tasks_completed, ')');
}

testTasksCompleted().catch(console.error);
