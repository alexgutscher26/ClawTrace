import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { turso } from './lib/turso.js';

async function check() {
  try {
    // Get the user ID from the agent we found
    const { rows: agents } = await turso.execute('SELECT user_id FROM agents LIMIT 1');
    if (agents.length === 0) {
      console.log('No agents found');
      return;
    }
    const userId = agents[0].user_id;
    console.log('Testing stats for user_id:', userId);

    const sql = `SELECT
          count(*) as total_agents,
          sum(case when status = 'healthy' then 1 else 0 end) as healthy,
          sum(case when status = 'idle' then 1 else 0 end) as idle,
          sum(case when status = 'error' then 1 else 0 end) as error,
          sum(case when status = 'offline' then 1 else 0 end) as offline,
          sum(cast(json_extract(metrics_json, '$.cost_usd') as real)) as total_cost,
          sum(cast(json_extract(metrics_json, '$.tasks_completed') as integer)) as total_tasks
        FROM agents
        WHERE user_id = ?`;
        
    const { rows } = await turso.execute({
      sql,
      args: [userId],
    });

    console.log('Stats result:', rows[0]);
  } catch (err) {
    console.error(err);
  }
}

check();
