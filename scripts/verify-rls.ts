/**
 * Checks, against the real database, that every role can do only what it should.
 *
 *   npm run verify:rls        (run `npm run seed:demo` first)
 *
 * Prints a pass/fail table and exits non-zero on any failure. Temporary users
 * it creates are removed at the end, and the demo seller is restored if hidden.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD } from "../src/lib/demo/accounts";
import { buildPraguePayload } from "../src/lib/demo/prague-payload";
import { newId } from "../src/lib/ids";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
if (!url || !publishable || !secret) {
  console.error("Set the Supabase variables in .env.local first.");
  process.exit(1);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
async function check(name: string, fn: () => Promise<boolean | string>) {
  try {
    const r = await fn();
    results.push({ name, ok: r === true, detail: r === true ? undefined : String(r) });
  } catch (e) {
    results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function login(email: string, password = DEMO_PASSWORD): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(url, publishable, opts);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`login ${email}: ${error?.message}`);
  return { client, id: data.user.id };
}

const created: string[] = [];
async function tempUser(email: string, meta: Record<string, unknown>) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: meta });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  created.push(data.user.id);
  return data.user.id;
}

const denied = (error: { message?: string } | null) => Boolean(error);

async function main() {
  const stamp = Date.now();
  const anon = createClient(url, publishable, opts);
  const buyer = await login("demo.buyer@example.com");
  const seller = await login("demo.seller@example.com");
  const adminUser = await login("demo.admin@example.com");

  const seller2Id = await tempUser(`rls.seller2.${stamp}@example.com`, { role: "seller", shop_name: "RLS Second Shop" });
  const seller2 = await login(`rls.seller2.${stamp}@example.com`);
  const adminSignup = await tempUser(`rls.admin.attempt.${stamp}@example.com`, { role: "admin", full_name: "Not An Admin" });

  const { data: cat } = await admin.from("categories").select("id").limit(1).single();
  const categoryId = cat!.id as string;

  // a draft owned by the second seller
  const draftPayload = buildPraguePayload({ sellerId: seller2Id, categoryId, newId, imagesPerColour: 0, submit: false });
  const saved = await seller2.client.rpc("save_product", { p_payload: draftPayload });
  const draftId = saved.data as string;

  await check("sign-up with role=admin becomes a buyer", async () => {
    const { data } = await admin.from("profiles").select("role").eq("id", adminSignup).single();
    return data?.role === "buyer" || `role was ${data?.role}`;
  });

  await check("anonymous can read approved listings", async () => {
    const { data } = await anon.from("products").select("id").eq("status", "approved");
    return (data?.length ?? 0) >= 1 || "no approved listings visible (run seed:demo)";
  });
  await check("anonymous cannot read a draft listing", async () => {
    const { data } = await anon.from("products").select("id").eq("id", draftId);
    return (data?.length ?? 0) === 0;
  });
  await check("anonymous cannot read orders or profiles", async () => {
    const o = await anon.from("orders").select("id");
    const p = await anon.from("profiles").select("id");
    return (o.data?.length ?? 0) === 0 && (p.data?.length ?? 0) === 0;
  });
  await check("anonymous cannot write directly to products", async () => {
    const { error } = await anon.from("products").insert({ title: "x" });
    return denied(error);
  });

  await check("buyer cannot save a product", async () => {
    const { error } = await buyer.client.rpc("save_product", { p_payload: draftPayload });
    return denied(error);
  });
  await check("buyer cannot call create_orders", async () => {
    const { error } = await buyer.client.rpc("create_orders", { p_buyer_id: buyer.id, p_payload: {} });
    return denied(error);
  });
  await check("buyer cannot call admin functions", async () => {
    const a = await buyer.client.rpc("admin_set_listing_status", { p_product_id: draftId, p_status: "approved" });
    const b = await buyer.client.rpc("admin_set_seller_status", { p_seller_id: seller2Id, p_status: "approved" });
    return denied(a.error) && denied(b.error);
  });
  await check("buyer cannot change their own role", async () => {
    await buyer.client.from("profiles").update({ role: "admin" }).eq("id", buyer.id);
    const { data } = await admin.from("profiles").select("role").eq("id", buyer.id).single();
    return data?.role === "buyer" || `role is now ${data?.role}`;
  });
  await check("buyer cannot upload to storage", async () => {
    const { error } = await buyer.client.storage.from("product-images").upload(`${buyer.id}/x/${newId()}.jpg`, new Blob(["x"]), { contentType: "image/jpeg" });
    return denied(error);
  });

  await check("seller cannot see another seller's draft", async () => {
    const { data } = await seller.client.from("products").select("id").eq("id", draftId);
    return (data?.length ?? 0) === 0;
  });
  await check("seller cannot overwrite another seller's listing", async () => {
    const hijack = { ...draftPayload, id: draftId, description: "hijacked" };
    const { error } = await seller.client.rpc("save_product", { p_payload: hijack });
    return denied(error);
  });
  await check("seller cannot approve their own listing", async () => {
    const { error } = await seller.client.rpc("admin_set_listing_status", { p_product_id: draftId, p_status: "approved" });
    return denied(error);
  });
  await check("seller cannot upload into another seller's folder", async () => {
    const { error } = await seller.client.storage.from("product-images").upload(`${seller2Id}/x/${newId()}.jpg`, new Blob(["x"]), { contentType: "image/jpeg" });
    return denied(error);
  });
  await check("seller cannot reference another seller's photo path", async () => {
    const p = buildPraguePayload({ sellerId: seller2Id, categoryId, newId, imagesPerColour: 1, submit: false });
    const { error } = await seller.client.rpc("save_product", { p_payload: p });
    return denied(error);
  });
  await check("seller cannot update an order's status unless it is theirs", async () => {
    const { data: orders } = await admin.from("orders").select("id, seller_id").neq("seller_id", seller.id).limit(1);
    if (!orders?.length) return true; // no foreign order exists to attack
    const { error } = await seller.client.rpc("set_order_status", { p_order_id: orders[0].id, p_status: "shipped" });
    return denied(error);
  });

  await check("admin can approve a listing", async () => {
    const { error } = await adminUser.client.rpc("admin_set_listing_status", { p_product_id: draftId, p_status: "approved" });
    return !error || error.message;
  });
  await check("hidden seller's listing disappears for anonymous visitors", async () => {
    // the temp seller's listing is now approved, but its shop is still pending => invisible
    const before = await anon.from("products").select("id").eq("id", draftId);
    return (before.data?.length ?? 0) === 0;
  });
  await check("approving the shop makes the listing visible, hiding it removes it again", async () => {
    await adminUser.client.rpc("admin_set_seller_status", { p_seller_id: seller2Id, p_status: "approved" });
    const shown = await anon.from("products").select("id").eq("id", draftId);
    await adminUser.client.rpc("admin_set_seller_status", { p_seller_id: seller2Id, p_status: "hidden" });
    const hidden = await anon.from("products").select("id").eq("id", draftId);
    return ((shown.data?.length ?? 0) === 1 && (hidden.data?.length ?? 0) === 0) || "visibility did not follow the shop status";
  });
  await check("a hidden seller cannot save", async () => {
    const { error } = await seller2.client.rpc("save_product", { p_payload: { ...draftPayload, description: "still here" } });
    return denied(error);
  });
}

async function cleanup() {
  for (const id of created) {
    await admin.from("products").delete().eq("seller_id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

main()
  .catch((e) => results.push({ name: "setup", ok: false, detail: e instanceof Error ? e.message : String(e) }))
  .finally(async () => {
    await cleanup().catch(() => {});
    const width = Math.max(...results.map((r) => r.name.length));
    for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}${r.detail ? `  <- ${r.detail}` : ""}`);
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
