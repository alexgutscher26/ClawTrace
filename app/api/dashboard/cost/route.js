import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { turso } from '@/lib/turso';
import { MODEL_PRICING } from '@/lib/pricing';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Retrieves the user associated with the provided authorization token.
 *
 * This function checks the 'authorization' header of the request for a Bearer token.
 * If the token is present, it uses the Supabase admin client to fetch the user data.
 * In case of an error or if the token is invalid, it returns null.
 *
 * @param {Request} request - The request object containing headers for authorization.
 */
async function getUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);
    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Handles the GET request to retrieve user-specific agent cost data and recommendations.
 *
 * This function retrieves the user associated with the request and checks for authorization. It fetches all agents for the user from Turso, aggregates their costs by model, and generates savings recommendations based on current pricing. The results include total costs, usage by model, and sorted recommendations for potential savings.
 *
 * @param request - The incoming request object containing user information.
 * @returns A JSON response containing total cost, usage by model, and savings recommendations.
 * @throws Error If there is an error retrieving agents or processing data.
 */
export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Get all agents from Turso
    const { rows } = await turso.execute({
      sql: 'SELECT id, name, model, metrics_json FROM agents WHERE user_id = ?',
      args: [user.id],
    });

    const agents = rows.map((agent) => ({
      ...agent,
      metrics_json:
        typeof agent.metrics_json === 'string'
          ? JSON.parse(agent.metrics_json)
          : agent.metrics_json || {},
    }));

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

          if (savingsPercent > 20 && cost > 1.0) {
            // Only recommend if significant savings > 20% and spent > $1
            recommendations.push({
              agent_name: agent.name,
              current_model: model,
              suggested_model: bestAlt[0],
              potential_savings_pct: savingsPercent,
              estimated_monthly_saving: (cost * (savingsPercent / 100)).toFixed(2),
            });
          }
        }
      }
    }

    return NextResponse.json({
      total_cost: totalCost,
      usage_by_model: usageByModel,
      recommendations: recommendations.sort(
        (a, b) => b.potential_savings_pct - a.potential_savings_pct
      ),
    });
  } catch (err) {
    console.error('Cost API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
