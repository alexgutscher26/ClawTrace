
const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    console.log('Creating api_rate_limits table in Turso...');
    try {
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS api_rate_limits (
                key TEXT PRIMARY KEY,
                tokens REAL NOT NULL,
                last_refill TEXT NOT NULL
            );
        `);
        console.log('Table created successfully.');
    } catch (e) {
        console.error('Failed to create table:', e.message);
    }
}

main();
