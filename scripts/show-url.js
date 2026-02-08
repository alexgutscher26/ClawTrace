const { createClient } = require('@supabase/supabase-js');
// Basic .env parser
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

async function showUrl() {
    const { data: agents } = await supabase.from('agents').select('*');
    const agent = agents.filter(a => a.id.startsWith('79a68826'))[0];
    if (agent) {
        console.log('GATEWAY_URL="' + (agent.gateway_url || 'NULL') + '"');
        console.log('LATENCY=' + (agent.metrics_json?.latency_ms || 0));
        console.log('LAST_HEARTBEAT=' + agent.last_heartbeat);
    } else {
        console.log('AGENT_NOT_FOUND');
    }
}
showUrl();
