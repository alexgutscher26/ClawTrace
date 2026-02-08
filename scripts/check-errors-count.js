const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Loads environment variables from a .env file.
 *
 * This function resolves the path to the .env file, checks if it exists, and reads its content.
 * It splits the content by lines and processes each line to extract key-value pairs,
 * which are then assigned to the process.env object if valid.
 * This allows for dynamic configuration of environment variables in the application.
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
 * Check and log the errors count for a specific agent.
 *
 * This function retrieves the agent's details from the 'agents' table in Supabase using the agentId.
 * It logs the agent's name, status, last heartbeat, and error metrics.
 * It also calculates and logs the error rate if tasks have been completed, and provides feedback on the errors count.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function checkErrorsCount() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('📊 Checking errors_count for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, status, metrics_json, last_heartbeat')
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
    console.log('Current Status:', agent.status);
    console.log('Last Heartbeat:', agent.last_heartbeat);
    console.log('');
    console.log('📈 Error Metrics:');
    console.log('   errors_count:', agent.metrics_json?.errors_count || 0);
    console.log('   tasks_completed:', agent.metrics_json?.tasks_completed || 0);

    const errorsCount = agent.metrics_json?.errors_count || 0;
    const tasksCompleted = agent.metrics_json?.tasks_completed || 0;

    if (tasksCompleted > 0) {
        const errorRate = ((errorsCount / tasksCompleted) * 100).toFixed(1);
        console.log('   error_rate:', errorRate + '%');
    }

    console.log('');

    if (errorsCount > 0) {
        console.log('✅ errors_count is working! Current count:', errorsCount);
    } else {
        console.log('⚠️  errors_count is 0. Send an error heartbeat to test the increment.');
    }
}

checkErrorsCount().catch(console.error);
