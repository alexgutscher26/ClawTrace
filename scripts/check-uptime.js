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
 * Checks the uptime of an agent by comparing the stored uptime with the calculated uptime.
 *
 * This function retrieves the agent's details from the 'agents' table in Supabase using the agentId.
 * It calculates the actual uptime based on the agent's creation date and compares it with the stored uptime
 * from the agent's metrics. The results are logged to the console, indicating whether the uptime is correct
 * or if there is a mismatch that needs to be addressed.
 */
async function checkUptime() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('📊 Checking uptime for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, created_at, metrics_json, last_heartbeat')
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

    const createdAt = new Date(agent.created_at);
    const now = new Date();
    const actualUptimeHours = Math.floor((now - createdAt) / (1000 * 60 * 60));
    const storedUptimeHours = agent.metrics_json?.uptime_hours || 0;

    console.log('Agent Name:', agent.name);
    console.log('Created At:', agent.created_at);
    console.log('Last Heartbeat:', agent.last_heartbeat);
    console.log('');
    console.log('⏱️  Uptime Calculation:');
    console.log('   Created:', createdAt.toLocaleString());
    console.log('   Now:', now.toLocaleString());
    console.log('   Time Elapsed:', Math.floor((now - createdAt) / 1000 / 60), 'minutes');
    console.log('');
    console.log('   Stored uptime_hours:', storedUptimeHours, 'hours');
    console.log('   Calculated uptime_hours:', actualUptimeHours, 'hours');
    console.log('');

    if (storedUptimeHours === actualUptimeHours) {
        console.log('✅ Uptime is CORRECT!');
        console.log('   The agent has been registered for', actualUptimeHours, 'hours');
    } else {
        const diff = Math.abs(storedUptimeHours - actualUptimeHours);
        console.log('⚠️  Uptime mismatch!');
        console.log('   Difference:', diff, 'hours');
        console.log('   Send a heartbeat to update it to the correct value');
    }
}

checkUptime().catch(console.error);
