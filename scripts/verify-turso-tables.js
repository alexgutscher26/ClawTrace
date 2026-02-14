import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL is not defined');
  process.exit(1);
}

const turso = createClient({
  url,
  authToken,
});

async function checkAndCleanup() {
  console.log("--- Current Tables in Turso ---");
  const res = await turso.execute("SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const currentTables = res.rows.map(r => r.name);
  console.log(currentTables);

  const TABLES_TO_DROP = [
    'profiles',
    'teams',
    'subscriptions',
    'enterprise_branding',
    'invoices',
    'payment_methods'
  ];

  console.log("\n--- Cleaning up... ---");
  for (const table of TABLES_TO_DROP) {
    if (currentTables.includes(table)) {
      console.log(`Dropping ${table}...`);
      await turso.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`Dropped ${table}.`);
    } else {
      console.log(`${table} not found (already clean).`);
    }
  }

  console.log("\n--- Final Table List ---");
  const finalRes = await turso.execute("SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  console.log(finalRes.rows.map(r => r.name));
}

checkAndCleanup();
