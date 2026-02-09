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
 * Check the cost associated with a specific agent based on its model and metrics.
 *
 * This function retrieves the agent's details from the Supabase database using the agentId. It calculates the expected cost based on the model pricing and compares it with the stored cost in the agent's metrics. It logs the results, including any discrepancies between the expected and stored costs, and provides a pricing table for reference.
 *
 * @returns {Promise<void>} A promise that resolves when the cost check is complete.
 */
async function checkCost() {
    const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';

    console.log('💰 Checking cost for agent:', agentId);
    console.log('');

    const { data: agent, error } = await supabase
        .from('agents')
        .select('name, model, metrics_json, created_at')
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

    const MODEL_PRICING = {
        // Anthropic Claude models
        'claude-opus-4.5': 0.0338,
        'claude-sonnet-4': 0.0090,
        'claude-3': 0.0090,
        'claude-haiku': 0.0015,

        // OpenAI GPT models
        'gpt-4o': 0.0090,
        'gpt-4o-mini': 0.0004,
        'gpt-4': 0.0180,
        'gpt-3.5-turbo': 0.0010,

        // Google Gemini models
        'gemini-3-pro': 0.0056,
        'gemini-2-flash': 0.0015,

        // xAI Grok models
        'grok-4.1-mini': 0.0004,
        'grok-2': 0.0030,

        // Open-source models
        'llama-3.3-70b': 0.0003,
        'llama-3': 0.0003,
        'qwen-2.5-72b': 0.0003,
        'mistral-large': 0.0020,
        'mistral-medium': 0.0010,
        'deepseek-v3': 0.0002,

        // Legacy/fallback
        'gpt-4-turbo': 0.0120,
    };

    const costPerTask = MODEL_PRICING[agent.model] || 0.01;
    const tasksCompleted = agent.metrics_json?.tasks_completed || 0;
    const storedCost = agent.metrics_json?.cost_usd || 0;
    const calculatedCost = parseFloat((tasksCompleted * costPerTask).toFixed(4));

    console.log('Agent Name:', agent.name);
    console.log('Model:', agent.model);
    console.log('Created:', new Date(agent.created_at).toLocaleString());
    console.log('');
    console.log('💵 Cost Calculation:');
    console.log('   Cost per task:', `$${costPerTask.toFixed(3)}`);
    console.log('   Tasks completed:', tasksCompleted);
    console.log('   Expected cost:', `$${calculatedCost.toFixed(2)}`);
    console.log('   Stored cost:', `$${storedCost.toFixed(2)}`);
    console.log('');

    if (Math.abs(storedCost - calculatedCost) < 0.01) {
        console.log('✅ Cost is CORRECT!');
        console.log(`   Total cost: $${storedCost.toFixed(2)} for ${tasksCompleted} tasks`);
    } else {
        const diff = Math.abs(storedCost - calculatedCost);
        console.log('⚠️  Cost mismatch!');
        console.log('   Difference:', `$${diff.toFixed(2)}`);
        console.log('   Send a heartbeat to update it to the correct value');
    }

    console.log('');
    console.log('📊 Pricing Table (per task):');
    console.log('   Premium:');
    console.log('     Claude Opus 4.5:  $0.0338');
    console.log('     GPT-4:            $0.0180');
    console.log('     GPT-4 Turbo:      $0.0120');
    console.log('   Mid-tier:');
    console.log('     Claude Sonnet 4:  $0.0090');
    console.log('     GPT-4o:           $0.0090');
    console.log('     Gemini 3 Pro:     $0.0056');
    console.log('     Grok 2:           $0.0030');
    console.log('   Budget:');
    console.log('     Mistral Large:    $0.0020');
    console.log('     Claude Haiku:     $0.0015');
    console.log('     Gemini 2 Flash:   $0.0015');
    console.log('     GPT-3.5 Turbo:    $0.0010');
    console.log('     Mistral Medium:   $0.0010');
    console.log('   Ultra-cheap:');
    console.log('     GPT-4o Mini:      $0.0004');
    console.log('     Grok 4.1 Mini:    $0.0004');
    console.log('     LLaMA 3.3 70B:    $0.0003');
    console.log('     Qwen 2.5 72B:     $0.0003');
    console.log('     DeepSeek v3:      $0.0002');
    console.log('   Default:            $0.0100');
}

checkCost().catch(console.error);
