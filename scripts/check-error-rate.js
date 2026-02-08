const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
 * Check and log the error rate for a specific agent.
 *
 * This function retrieves the agent's metrics from the database using the agentId. It calculates the error rate based on the number of tasks completed and errors recorded. The results, including the error rate and success rate, are logged to the console. It handles cases where the agent is not found or if there are errors in the database query.
 *
 * @returns {Promise<void>} A promise that resolves when the error rate has been logged.
 */
async function checkErrorRate() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('📊 Checking Error Rate for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, status, metrics_json')
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

    const tasksCompleted = agent.metrics_json?.tasks_completed || 0;
    const errorsCount = agent.metrics_json?.errors_count || 0;
    const errorRate = tasksCompleted > 0 ? ((errorsCount / tasksCompleted) * 100).toFixed(1) : 0;

    console.log('Agent Name:', agent.name);
    console.log('Current Status:', agent.status);
    console.log('');
    console.log('📈 Error Rate Calculation:');
    console.log('   Tasks Completed:', tasksCompleted);
    console.log('   Errors Count:', errorsCount);
    console.log('   Error Rate:', errorRate + '%');
    console.log('');

    if (tasksCompleted === 0) {
        console.log('⚠️  No tasks completed yet');
        console.log('   Error rate will show 0% until the agent completes some tasks');
    } else if (errorsCount === 0) {
        console.log('✅ Perfect! No errors recorded');
        console.log('   Error rate: 0% (0 errors out of', tasksCompleted, 'tasks)');
    } else {
        const successRate = (100 - parseFloat(errorRate)).toFixed(1);
        console.log('📊 Error Rate Analysis:');
        console.log('   Success Rate:', successRate + '%');
        console.log('   Error Rate:', errorRate + '%');
        console.log('   ', errorsCount, 'errors out of', tasksCompleted, 'tasks');
    }
}

checkErrorRate().catch(console.error);
