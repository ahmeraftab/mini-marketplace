/**
 * Applies supabase/migrations/*.sql to the database in SUPABASE_DB_URL.
 * Each file runs once, inside a transaction, and is recorded in
 * migrations_meta.applied (a schema PostgREST does not expose).
 *
 *   npm run db:push
 */
import { Client } from "pg";
import { readMigrations } from "./lib/migrations";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set. Add the Session-pooler connection string to .env.local.");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query(`create schema if not exists migrations_meta`);
  await client.query(`
    create table if not exists migrations_meta.applied (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

  const done = new Set(
    (await client.query<{ name: string }>(`select name from migrations_meta.applied`)).rows.map((r) => r.name),
  );

  let applied = 0;
  for (const m of readMigrations()) {
    if (done.has(m.name)) {
      console.log(`  skip   ${m.name}`);
      continue;
    }
    console.log(`  apply  ${m.name}`);
    try {
      await client.query("begin");
      await client.query(m.sql);
      await client.query(`insert into migrations_meta.applied (name) values ($1)`, [m.name]);
      await client.query("commit");
      applied++;
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${m.name} failed: ${(error as Error).message}`);
    }
  }
  console.log(applied === 0 ? "Database is up to date." : `Applied ${applied} migration(s).`);
}

main()
  .catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  })
  .finally(() => client.end());
