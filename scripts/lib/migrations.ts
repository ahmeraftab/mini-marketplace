import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Migration = { name: string; sql: string };

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase", "migrations");

/** Reads supabase/migrations/*.sql in filename (= chronological) order. */
export function readMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(path.join(dir, f), "utf8") }));
}
