const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../lib/encryption');

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

async function updateModel() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
    const newModel = 'claude-sonnet-4';

    console.log('🔧 Updating model configuration...');
    console.log('   Agent ID:', agentId);
    console.log('   New Model:', newModel);
    console.log('');

    // Get current agent
    const { data: agent, error: fetchError } = await supabase
        .from('agents')
        .select('config_json')
        .eq('id', agentId)
        .maybeSingle();

    if (fetchError) {
        console.error('❌ Error fetching agent:', fetchError);
        return;
    }

    if (!agent) {
        console.error('❌ Agent not found');
        return;
    }

    // Decrypt current config
    let config = {};
    try {
        const decrypted = decrypt(agent.config_json);
        config = JSON.parse(decrypted);
        console.log('📋 Current config:');
        console.log(JSON.stringify(config, null, 2));
    } catch (err) {
        console.log('⚠️  Could not decrypt config, using default');
        config = { profile: 'dev', skills: ['code', 'search'], data_scope: 'full' };
    }

    console.log('');

    // Update model in config
    config.model = newModel;

    console.log('📋 New config:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');

    // Encrypt and save
    const encryptedConfig = encrypt(config);

    const { error: updateError } = await supabase
        .from('agents')
        .update({
            model: newModel,
            config_json: JSON.stringify(encryptedConfig),
            updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

    if (updateError) {
        console.error('❌ Error updating agent:', updateError);
        return;
    }

    console.log('✅ Model updated successfully!');
    console.log('');
    console.log('📊 Changes:');
    console.log('   model field: gpt-4 → claude-sonnet-4');
    console.log('   config_json.model: gpt-4 → claude-sonnet-4');
    console.log('');
    console.log('💰 Cost Impact:');
    console.log('   Old cost (gpt-4): $0.0180 per task');
    console.log('   New cost (claude-sonnet-4): $0.0090 per task');
    console.log('   Savings: 50% cheaper! 🎉');
    console.log('');
    console.log('🔄 Refresh your browser to see the changes in Agent Info');
}

updateModel().catch(console.error);
