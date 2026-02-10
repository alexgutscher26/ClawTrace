
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MODEL_PRICING } from '@/lib/pricing';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        return user;
    } catch (e) {
        return null;
    }
}

export async function GET(request) {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Get all agents
        const { data: agents, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('id, name, model, metrics_json')
            .eq('user_id', user.id);

        if (agentError) throw agentError;

        // 2. Aggregate costs per model
        const usageByModel = {};
        let totalCost = 0;
        const recommendations = [];

        /* 
          We calculate based on LIFETIME cost stored in metrics_json.cost_usd
          For a more granular approach, we could query agent_metrics over time range.
        */

        for (const agent of agents) {
            const model = agent.model || 'unknown';
            const cost = agent.metrics_json?.cost_usd || 0;
            const tasks = agent.metrics_json?.tasks_completed || 0;

            if (!usageByModel[model]) {
                usageByModel[model] = { cost: 0, count: 0, agents: 0 };
            }
            usageByModel[model].cost += cost;
            usageByModel[model].count += tasks; // Proxy for token usage
            usageByModel[model].agents += 1;
            totalCost += cost;

            // 3. Generate Savings Recommendations
            const currentPrice = MODEL_PRICING[model];
            if (currentPrice) {
                // Find cheaper alternatives
                const potentialSavings = Object.entries(MODEL_PRICING)
                    .filter(([m, price]) => price < currentPrice && m.includes(model.split('-')[0])) // Same family preference
                    .sort((a, b) => a[1] - b[1]); // Cheapest first

                if (potentialSavings.length > 0) {
                    const bestAlt = potentialSavings[0];
                    const savingsPercent = Math.round(((currentPrice - bestAlt[1]) / currentPrice) * 100);

                    if (savingsPercent > 20 && cost > 1.0) { // Only recommend if significant savings > 20% and spent > $1
                        recommendations.push({
                            agent_name: agent.name,
                            current_model: model,
                            suggested_model: bestAlt[0],
                            potential_savings_pct: savingsPercent,
                            estimated_monthly_saving: (cost * (savingsPercent / 100)).toFixed(2)
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            total_cost: totalCost,
            usage_by_model: usageByModel,
            recommendations: recommendations.sort((a, b) => b.potential_savings_pct - a.potential_savings_pct)
        });

    } catch (err) {
        console.error('Cost API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
