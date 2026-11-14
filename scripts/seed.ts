/**
 * Demo data.
 *
 *   npm run seed:base    three demo accounts + the Furniture > Divan Beds category
 *   npm run seed:demo    base + the Prague bed, created through the real save_product
 *                        path as the seller and approved by the admin
 *   npm run seed:reset   removes all products and orders, then runs seed:demo again
 *
 * Needs .env.local (see .env.example). Safe to run repeatedly.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/lib/demo/accounts";
import { buildPraguePayload } from "../src/lib/demo/prague-payload";
import { PRAGUE } from "../src/lib/demo/prague";
import { slugify } from "../src/lib/format";
import { newId } from "../src/lib/ids";
import { buildImages } from "./build-seed-images";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);

async function ensureUser(account: (typeof DEMO_ACCOUNTS)[number]): Promise<string> {
  const { data: existing } = await admin.from("profiles").select("id").eq("email", account.email).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.name,
      role: account.role === "seller" ? "seller" : "buyer",
      ...(account.role === "seller" ? { shop_name: "Demo Seller" } : {}),
    },
  });
  if (error || !data.user) throw new Error(`Could not create ${account.email}: ${error?.message}`);
  return data.user.id;
}

async function seedBase() {
  const ids: Record<string, string> = {};
  for (const a of DEMO_ACCOUNTS) ids[a.role] = await ensureUser(a);

  // the admin role can only be granted here, by the service role (sign-up can never do it)
  const { error: roleError } = await admin.from("profiles").update({ role: "admin" }).eq("id", ids.admin);
  if (roleError) throw new Error(`Could not promote the admin: ${roleError.message}`);

  const { error: sellerError } = await admin
    .from("sellers")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: ids.admin })
    .eq("id", ids.seller);
  if (sellerError) throw new Error(`Could not approve the demo seller: ${sellerError.message}`);

  // categories: Furniture > Divan Beds
  let { data: parent } = await admin.from("categories").select("id").eq("slug", slugify(PRAGUE.category.parent)).maybeSingle();
  if (!parent) {
    const res = await admin.from("categories").insert({ name: PRAGUE.category.parent, slug: slugify(PRAGUE.category.parent), position: 0 }).select("id").single();
    if (res.error) throw new Error(res.error.message);
    parent = res.data;
  }
  let { data: child } = await admin.from("categories").select("id").eq("slug", slugify(PRAGUE.category.child)).maybeSingle();
  if (!child) {
    const res = await admin
      .from("categories")
      .insert({ name: PRAGUE.category.child, slug: slugify(PRAGUE.category.child), parent_id: parent!.id, position: 0 })
      .select("id")
      .single();
    if (res.error) throw new Error(res.error.message);
    child = res.data;
  }
  console.log("base ready: 3 demo accounts, category Furniture > Divan Beds");
  return { ids, categoryId: child!.id as string };
}

async function signedIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, publishable!, opts);
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

async function seedDemo() {
  const { ids, categoryId } = await seedBase();

  const { data: existing } = await admin.from("products").select("id").eq("seller_id", ids.seller).limit(1);
  if (existing && existing.length) {
    console.log("the Prague bed is already listed; run `npm run seed:reset` to start over");
    return;
  }

  // illustrations (or the owner's own photos under seed-assets/override/)
  if (!existsSync(path.join(process.cwd(), "seed-assets", "generated", slugify(PRAGUE.colours[0].name), "1.jpg"))) {
    console.log("rendering demo images...");
    await buildImages();
  }

  const payload = buildPraguePayload({ sellerId: ids.seller, categoryId, newId, submit: true });

  // upload each photo to the path the payload expects
  let n = 0;
  for (const colour of payload.colours) {
    const slug = slugify(colour.name);
    const mine = payload.images.filter((i) => i.colour_id === colour.id);
    for (let i = 0; i < mine.length; i++) {
      const override = path.join(process.cwd(), "seed-assets", "override", slug, `${i + 1}.jpg`);
      const generated = path.join(process.cwd(), "seed-assets", "generated", slug, `${i + 1}.jpg`);
      const file = existsSync(override) ? override : generated;
      const { error } = await admin.storage.from("product-images").upload(mine[i].storage_path, readFileSync(file), {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(`Upload failed for ${mine[i].storage_path}: ${error.message}`);
      n++;
    }
  }
  console.log(`uploaded ${n} photos`);

  const seller = await signedIn("demo.seller@example.com");
  const saved = await seller.rpc("save_product", { p_payload: payload });
  if (saved.error) throw new Error(`save_product failed: ${saved.error.message}`);

  const adminUser = await signedIn("demo.admin@example.com");
  const approved = await adminUser.rpc("admin_set_listing_status", { p_product_id: saved.data, p_status: "approved" });
  if (approved.error) throw new Error(`approval failed: ${approved.error.message}`);
  console.log(`listed and approved: ${PRAGUE.title}`);
}

async function seedReset() {
  // orders first (they reference sellers), then products; photos are removed from storage too
  await admin.from("orders").delete().not("id", "is", null);
  await admin.from("products").delete().not("id", "is", null);
  await admin.from("ai_usage").delete().gt("id", 0);
  const { data: sellers } = await admin.from("sellers").select("id");
  for (const s of sellers ?? []) {
    const { data: folders } = await admin.storage.from("product-images").list(s.id as string);
    for (const folder of folders ?? []) {
      const { data: files } = await admin.storage.from("product-images").list(`${s.id}/${folder.name}`);
      const paths = (files ?? []).map((f) => `${s.id}/${folder.name}/${f.name}`);
      if (paths.length) await admin.storage.from("product-images").remove(paths);
    }
  }
  console.log("cleared products, orders and photos");
  await seedDemo();
}

const mode = process.argv[2];
const run = mode === "base" ? seedBase : mode === "demo" ? seedDemo : mode === "reset" ? seedReset : null;
if (!run) {
  console.error("usage: seed.ts base | demo | reset");
  process.exit(1);
}
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
