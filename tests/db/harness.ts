import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { readMigrations } from "../../scripts/lib/migrations";

export type Db = PGlite;
export type DbRole = "anon" | "authenticated" | "service_role";

/** A fresh in-memory Postgres with the Supabase shim and every migration applied. */
export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(readFileSync(path.resolve("tests/db/supabase-shim.sql"), "utf8"));
  for (const m of readMigrations()) {
    try {
      await db.exec(m.sql);
    } catch (error) {
      throw new Error(`Migration ${m.name} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

/**
 * Run `fn` as a Supabase-style caller: the database role (anon / authenticated /
 * service_role) and the JWT subject that auth.uid() reads. Row-level security
 * and privileges apply exactly as they would for a browser request.
 */
export async function as<T>(
  db: Db,
  who: { role: DbRole; uid?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const claims = who.uid ? { sub: who.uid, role: who.role } : { role: who.role };
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify(claims),
  ]);
  await db.exec(`set role ${who.role}`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

export const user = (uid: string) => ({ role: "authenticated" as const, uid });
export const anon = { role: "anon" as const };
export const service = { role: "service_role" as const };

/** Insert an auth user (as the superuser); the handle_new_user trigger builds profile/seller. */
export async function signUp(
  db: Db,
  id: string,
  email: string,
  meta: Record<string, unknown> = {},
): Promise<string> {
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
    [id, email, JSON.stringify(meta)],
  );
  return id;
}
