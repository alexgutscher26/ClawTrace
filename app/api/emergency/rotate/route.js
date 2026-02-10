
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Handles the POST request to rotate agent models.
 *
 * This function extracts the `fromModel`, `toModel`, and `fleetId` from the request body. It first attempts to rotate the models using a remote procedure call (RPC) to `rotate_agent_models`. If the RPC fails, it falls back to a basic update of the `model` column in the `agents` table. The function returns a JSON response indicating success or failure, along with relevant messages.
 *
 * @param request - The incoming request object containing the JSON body with parameters.
 * @returns A JSON response indicating the success of the operation and the number of agents updated or an error message.
 * @throws Error If an error occurs during the RPC call or the fallback update.
 */
export async function POST(request) {
    try {
        const { fromModel, toModel, fleetId } = await request.json();

        if (!fromModel || !toModel) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Try using RPC first
        const { data: countRpc, error: rpcError } = await supabaseAdmin.rpc(
            'rotate_agent_models',
            {
                old_model: fromModel,
                new_model: toModel,
                target_fleet_id: fleetId || null
            }
        );

        if (rpcError) {
            console.warn('RPC failed, falling back to basic update:', rpcError);

            // Fallback: If RPC not created, update `model` column only
            // (This updates config_json ONLY if the agent syncing relies on model column)
            let query = supabaseAdmin
                .from('agents')
                .update({ model: toModel, updated_at: new Date() })
                .eq('model', fromModel);

            if (fleetId) query = query.eq('fleet_id', fleetId);

            const { count, error: updateError } = await query.select(); // Assuming count requires 'select' with 'count' option in standard client, but here we just check if it executed.

            if (updateError) throw updateError;

            return NextResponse.json({
                success: true,
                message: `Updated agents (fallback mode). Models changed from ${fromModel} to ${toModel}`,
                method: 'fallback'
            });
        }

        return NextResponse.json({
            success: true,
            count: countRpc,
            message: `Successfully rotated ${countRpc} agents from ${fromModel} to ${toModel}`,
            method: 'rpc'
        });

    } catch (err) {
        console.error('Rotation Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
