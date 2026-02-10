
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
