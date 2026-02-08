const { encrypt, decrypt, isEncrypted } = require('../lib/encryption');
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

/**
 * Debugs the secret associated with a specific agent by inspecting its stored configuration.
 *
 * The function retrieves the agent's data from the database using the agentId, checks for errors,
 * and verifies if the agent's configuration and secret are encrypted. It attempts to decrypt the
 * agent's secret and compares it with the provided agentSecretParam, logging the results of the
 * comparison and any errors encountered during the process.
 *
 * @returns {Promise<void>} A promise that resolves when the debugging process is complete.
 */
async function debugSecret() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17'; // from user command
    const agentSecretParam = '4721c562-21eb-4b65-ae77-dcd6ec94f710'; // from user command

    console.log(`🔍 inspecting Agent: ${agentId}`);

    const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .maybeSingle();

    if (error) { console.error('DB Error:', error); return; }
    if (!agent) { console.error('Agent not found'); return; }

    console.log('Stored Config JSON Encrypted?', isEncrypted(agent.config_json));
    console.log('Stored Agent Secret Encrypted?', isEncrypted(agent.agent_secret));
    console.log('Stored Agent Secret Raw:', agent.agent_secret);

    try {
        const decrypted = decrypt(agent.agent_secret);
        console.log('🔓 Decrypted Secret:', decrypted);
        console.log('🔑 Expected Secret: ', agentSecretParam);

        // Check for double-stringification (e.g. '"uuid"' vs 'uuid')
        if (decrypted === agentSecretParam) {
            console.log('✅ MATCH! Decryption works and content matches.');
        } else if (JSON.parse(decrypted) === agentSecretParam) {
            console.log('⚠️  MISMATCH (Type): Decrypted is JSON stringified, checking parse...');
            console.log('✅ MATCH after JSON.parse!');
        } else {
            console.log('❌ MISMATCH! The secrets do not match.');
            console.log(`   Length: Decrypted(${decrypted.length}) vs Param(${agentSecretParam.length})`);
        }
    } catch (e) {
        console.error('💥 Decryption Exception:', e.message);
    }
}

debugSecret().catch(console.error);
