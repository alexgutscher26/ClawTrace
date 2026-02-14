import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { turso } from './lib/turso.js';

async function check() {
  try {
    const { rows } = await turso.execute('SELECT id, user_id, name, status, metrics_json FROM agents');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

check();
