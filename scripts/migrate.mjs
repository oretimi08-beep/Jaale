// Applies every SQL file in supabase/migrations to the database in DATABASE_URL.
// Run with: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Add it to .env.local first.");
  process.exit(1);
}

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  process.stdout.write(`Applying ${file}… `);
  await client.query(readFileSync(join(dir, file), "utf8"));
  console.log("done");
}
await client.query("notify pgrst, 'reload schema'");
await client.end();
console.log("Database is up to date.");
