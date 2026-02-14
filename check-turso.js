import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

async function check() {
  // Dynamic import ensures env vars are loaded first
  const { turso } = await import('./lib/turso.js');

  try {
    const { rows: agents } = await turso.execute('SELECT count(*) as count FROM agents');
    console.log('Agents count:', agents[0].count);
    
    const { rows: fleets } = await turso.execute('SELECT count(*) as count FROM fleets');
    console.log('Fleets count:', fleets[0].count);

    try {
      const { rows: profiles } = await turso.execute('SELECT count(*) as count FROM profiles');
      console.log('Profiles table exists in Turso. Count:', profiles[0].count);
    } catch (e) {
      console.log('Profiles table check failed (likely does not exist):', e.message);
    }

    // Also check if we can fetch stats structure manually to see if query works
    const { rows: stats } = await turso.execute(`
        SELECT 
            count(*) as total_agents,
            sum(case when status = 'online' then 1 else 0 end) as online_agents,
            sum(case when status = 'offline' then 1 else 0 end) as offline_agents
        FROM agents
    `);
    console.log('Stats query result:', stats[0]);

  } catch (err) {
    console.error('Error checking Turso:', err);
  }
}

check();
