import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles the POST request to rotate agent models.
 *
 * This function extracts the `fromModel`, `toModel`, and `fleetId` from the request body.
 * It updates the `model` column in the `agents` table in Turso.
 * The function returns a JSON response indicating success or failure, along with relevant messages.
 *
 * @param request - The incoming request object containing the JSON body with parameters.
 * @returns A JSON response indicating the success of the operation and the number of agents updated or an error message.
 * @throws Error If an error occurs during the database update.
 */
export async function POST(request) {
  try {
    const { fromModel, toModel, fleetId } = await request.json();

    if (!fromModel || !toModel) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let sql = 'UPDATE agents SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE model = ?';
    const args = [toModel, fromModel];

    if (fleetId) {
      sql += ' AND fleet_id = ?';
      args.push(fleetId);
    }

    const result = await turso.execute({ sql, args });
    const count = result.rowsAffected;

    return NextResponse.json({
      success: true,
      count,
      message: `Successfully rotated ${count} agents from ${fromModel} to ${toModel}`,
      method: 'turso',
    });
  } catch (err) {
    console.error('Rotation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
