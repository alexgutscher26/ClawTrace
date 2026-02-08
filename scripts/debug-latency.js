const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic .env parser
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fix the latency configuration for agents in the database.
 *
 * This function checks the latency configuration of agents by fetching all agents from the database, filtering them based on a specific ID prefix, and updating the gateway URL for the first matching agent. It handles potential errors during database operations and logs relevant information to the console.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function fixLatency() {
    console.log('🕵️ Checking Agent Latency configuration...');

    // Fetch all agents and filter in JS (safer for UUIDs)
    const { data: allAgents, error } = await supabase
        .from('agents')
        .select('*');

    if (error) {
        console.error('❌ DB Error:', error.message);
        return;
    }

    const agents = allAgents.filter(a => a.id.startsWith('79a68826'));

    if (agents.length === 0) {
        console.log('❌ No agent found starting with 79a68826');
        return;
    }

    const agent = agents[0];
    console.log(`\n📋 Agent Details:`);
    console.log(`   ID:          ${agent.id}`);
    console.log(`   Name:        ${agent.name}`);
    console.log(`   Gateway URL: ${agent.gateway_url || '(Not Set)'}`);

    // Force Update for reliable testing
    console.log('\n⚠️  Forcing update to reliable Gateway URL (http://localhost:3000)...');

    const { error: updateError } = await supabase
        .from('agents')
        .update({ gateway_url: 'http://localhost:3000' })
        .eq('id', agent.id);

    if (updateError) {
        console.error('❌ Failed to update gateway_url:', updateError.message);
    } else {
        console.log('✅ Successfully set gateway_url to http://localhost:3000');
        console.log('   The agent should start reporting latency (approx 5-50ms) after restart.');
    }
}

fixLatency().catch(console.error);
