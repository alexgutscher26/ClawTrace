const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Loads environment variables from a .env file.
 *
 * This function resolves the path to the .env file located one directory up from the current directory.
 * It checks for the existence of the file and reads its content if it exists. The content is split by lines,
 * and each line is processed to extract key-value pairs, which are assigned to the process.env object if valid.
 * This enables dynamic configuration of environment variables in the application.
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
 * Check the model configuration for a specific agent.
 *
 * This function retrieves the agent's details from the Supabase database using the agentId. It checks for errors in the retrieval process and logs the agent's name, model, and configuration. If there is a mismatch between the top-level model field and the model specified in the config_json, it provides guidance on how to resolve the issue. If the configuration is consistent, it confirms that the model configuration is correct.
 *
 * @returns {Promise<void>} A promise that resolves when the model check is complete.
 */
async function checkModel() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('🤖 Checking Model Configuration for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, model, config_json')
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
    console.log('');
    console.log('📊 Model Configuration:');
    console.log('   Top-level model field:', agent.model);
    console.log('   config_json.model:', agent.config_json?.model || '(not set)');
    console.log('');
    console.log('📋 Full config_json:');
    console.log(JSON.stringify(agent.config_json, null, 2));
    console.log('');

    if (agent.model !== agent.config_json?.model) {
        console.log('⚠️  Model mismatch detected!');
        console.log('   The top-level "model" field and "config_json.model" are different');
        console.log('   Agent Info displays: config_json.model || model');
        console.log('');
        console.log('💡 To fix this, update the config in the Config tab:');
        console.log('   1. Go to agent detail page');
        console.log('   2. Click "Config" tab');
        console.log('   3. Change "model" to your actual model');
        console.log('   4. Click "Save Config"');
    } else {
        console.log('✅ Model configuration is consistent');
    }
}

checkModel().catch(console.error);
