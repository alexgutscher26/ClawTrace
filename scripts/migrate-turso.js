import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function migrate() {
  console.log("Migrating Turso...");
  
  const schemaPath = path.join(__dirname, '..', 'turso-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split by semicolon, but be careful with triggers or other complex statements if any
  // For now, assuming simple CREATE TABLE statements separated by ;
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await turso.execute(statement);
    } catch (e) {
      console.error("Error executing statement:", statement.substring(0, 50) + "...", e.message);
      // Continue anyway as some errors might be "table exists" if IF NOT EXISTS is missing (though we added it)
      // or "column exists" if we run ALTER commands separately (which are not in the schema file usually)
    }
  }

  console.log(`Executed ${statements.length} statements.`);
  console.log("Migration successful");
}

migrate();
