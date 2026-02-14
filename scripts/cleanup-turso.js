import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

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

const NON_OPERATIONAL_TABLES = [
  'profiles',
  'teams',
  'subscriptions',
  'enterprise_branding',
  'invoices', // if it exists
  'payment_methods', // if it exists
];

async function cleanup() {
  console.log("Cleaning up non-operational tables from Turso...");
  
  for (const table of NON_OPERATIONAL_TABLES) {
    try {
      console.log(`Checking table: ${table}`);
      await turso.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`Dropped ${table} (if it existed)`);
    } catch (e) {
      console.error(`Error dropping ${table}:`, e.message);
    }
  }

  // Also verify operational tables exist
  console.log("Verifying operational tables...");
  const OPERATIONAL_TABLES = [
    'fleets',
    'agents',
    'agent_metrics',
    'alert_channels',
    'alerts',
    'alert_configs',
    'custom_policies',
    'scaling_events',
    'api_rate_limits'
  ];

  for (const table of OPERATIONAL_TABLES) {
    try {
      await turso.execute(`SELECT 1 FROM ${table} LIMIT 1`);
      console.log(`Verified ${table} exists`);
    } catch (e) {
      console.warn(`Warning: ${table} might be missing or empty (Error: ${e.message})`);
      // If missing, we might want to create it, but migrate-turso.js should handle that.
    }
  }

  console.log("Cleanup complete.");
}

cleanup();
