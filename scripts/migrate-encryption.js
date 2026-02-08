const { encrypt, isEncrypted } = require('../lib/encryption');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * scripts/migrate-encryption.js
 * 
 * Migrates existing plaintext agent data to AES-256-GCM encrypted format.
 */

// Basic .env parser
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

async function migrate() {
    console.log('🚀 Starting Data Encryption Migration...');

    // 1. Fetch all agents
    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, config_json, agent_secret');

    if (error) {
        console.error('❌ Failed to fetch agents:', error.message);
        process.exit(1);
    }

    console.log(`📦 Found ${agents.length} agents to process.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const agent of agents) {
        const updates = {};
        let needsUpdate = false;

        // Check config_json
        if (agent.config_json && !isEncrypted(agent.config_json)) {
            console.log(`   - Encrypting config_json for [${agent.id}]`);
            updates.config_json = encrypt(agent.config_json);
            needsUpdate = true;
        }

        // Check agent_secret
        if (agent.agent_secret && !isEncrypted(agent.agent_secret)) {
            console.log(`   - Encrypting agent_secret for [${agent.id}]`);
            updates.agent_secret = JSON.stringify(encrypt(agent.agent_secret));
            needsUpdate = true;
        }

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('agents')
                .update(updates)
                .eq('id', agent.id);

            if (updateError) {
                console.error(`   ❌ Failed to update agent ${agent.id}:`, updateError.message);
            } else {
                migratedCount++;
            }
        } else {
            skippedCount++;
        }
    }

    console.log('\n✅ Migration Complete!');
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped:  ${skippedCount} (already encrypted or empty)`);
}

migrate().catch(err => {
    console.error('💥 Unhandled Exception:', err);
    process.exit(1);
});
