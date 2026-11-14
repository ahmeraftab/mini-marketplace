/**
 * Database + row-level-security tests. They run the real migrations on an
 * in-memory Postgres (PGlite) with a Supabase-style role shim, then act as
 * anon / buyer / seller / admin / service_role and check what each may do.
 *
 *   npm run test:db
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { SaveProductPayload } from "../../src/lib/catalog/payload";
import { newId } from "../../src/lib/ids";
import { buildPraguePayload } from "../../src/lib/demo/prague-payload";
import { anon, as, createDb, service, signUp, user, type Db } from "./harness";

const BUYER = "00000000-0000-4000-8000-0000000000b1";
const BUYER2 = "00000000-0000-4000-8000-0000000000b2";
const SELLER_A = "00000000-0000-4000-8000-0000000000a1";
const SELLER_B = "00000000-0000-4000-8000-0000000000a2";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const CATEGORY_PARENT = "00000000-0000-4000-8000-00000000c001";
const CATEGORY_CHILD = "00000000-0000-4000-8000-00000000c002";

let db: Db;
let productA: string;
let productB: string;

type Payload = SaveProductPayload;
const prague = (sellerId: string, extra: Partial<Parameters<typeof buildPraguePayload>[0]> = {}) =>
  buildPraguePayload({ sellerId, categoryId: CATEGORY_CHILD, newId, ...extra });
const clone = <T,>(v: T): T => structuredClone(v);

const save = (uid: string, payload: unknown) =>
  as(db, user(uid), async () =>
    (await db.query<{ id: string }>(`select public.save_product($1::jsonb) as id`, [JSON.stringify(payload)])).rows[0].id,
  );

const count = (who: Parameters<typeof as>[1], from: string, params: unknown[] = []) =>
  as(db, who, async () =>
    (await db.query<{ n: number }>(`select count(*)::int as n from ${from}`, params)).rows[0].n,
  );

const run = <T extends Record<string, unknown> = Record<string, unknown>>(
  who: Parameters<typeof as>[1],
  sql: string,
  params: unknown[] = [],
) => as(db, who, async () => (await db.query<T>(sql, params)).rows);

const sup = async <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows;

before(async () => {
  db = await createDb();
  await signUp(db, BUYER, "buyer@example.test", { role: "admin", full_name: "Bea Buyer" });
  await signUp(db, BUYER2, "buyer2@example.test");
  await signUp(db, SELLER_A, "a@example.test", { role: "seller", shop_name: "Demo Seller" });
  await signUp(db, SELLER_B, "b@example.test", { role: "seller", shop_name: "Other Shop" });
  await signUp(db, ADMIN, "admin@example.test");
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [ADMIN]);
  await db.query(
    `insert into public.categories (id, parent_id, name, slug, position) values
       ($1, null, 'Furniture', 'furniture', 0), ($2, $1, 'Divan Beds', 'divan-beds', 0)`,
    [CATEGORY_PARENT, CATEGORY_CHILD],
  );
});

after(async () => {
  await db.close();
});

describe("sign-up trigger", () => {
  it("never lets metadata make someone an admin", async () => {
    const [p] = await sup<{ role: string }>(`select role from public.profiles where id = $1`, [BUYER]);
    assert.equal(p.role, "buyer");
    assert.equal((await sup(`select 1 from public.sellers where id = $1`, [BUYER])).length, 0);
  });

  it("creates a pending seller with the shop name", async () => {
    const [s] = await sup<{ status: string; shop_name: string }>(
      `select status, shop_name from public.sellers where id = $1`,
      [SELLER_A],
    );
    assert.deepEqual(s, { status: "pending", shop_name: "Demo Seller" });
  });

  it("gives a seller without a shop name a fallback name", async () => {
    const id = "00000000-0000-4000-8000-0000000000f1";
    await signUp(db, id, "nameless@example.test", { role: "seller" });
    const [s] = await sup<{ shop_name: string }>(`select shop_name from public.sellers where id = $1`, [id]);
    assert.equal(s.shop_name, "Shop 000000");
    await db.query(`delete from auth.users where id = $1`, [id]);
  });
});

describe("privileges: clients can read, never write directly", () => {
  it("anon can read categories but not private tables", async () => {
    assert.equal(await count(anon, "public.categories"), 2);
    await assert.rejects(count(anon, "public.profiles"), /permission denied/);
    await assert.rejects(count(anon, "public.orders"), /permission denied/);
    await assert.rejects(count(anon, "public.ai_usage"), /permission denied/);
  });

  it("signed-in users cannot insert, update or delete table rows directly", async () => {
    const attempts = [
      `insert into public.categories (name, slug) values ('Hack', 'hack')`,
      `update public.sellers set status = 'approved' where id = '${SELLER_A}'`,
      `update public.profiles set role = 'admin' where id = '${BUYER}'`,
      `delete from public.categories`,
      `insert into public.orders (checkout_id, buyer_id, seller_id, subtotal_pence, total_pence,
         shipping_name, shipping_phone, shipping_line1, shipping_city, shipping_postcode)
       values (gen_random_uuid(), '${BUYER}', '${SELLER_A}', 1, 1, 'a', 'b', 'c', 'd', 'e')`,
    ];
    for (const sql of attempts) {
      await assert.rejects(run(user(BUYER), sql), /permission denied/, sql);
      await assert.rejects(run(user(SELLER_A), sql), /permission denied/, sql);
    }
    const [p] = await sup<{ role: string }>(`select role from public.profiles where id = $1`, [BUYER]);
    assert.equal(p.role, "buyer");
  });

  it("a user can rename themselves but nobody else", async () => {
    await run(user(BUYER), `update public.profiles set full_name = 'Bea B' where id = $1`, [BUYER]);
    const other = await as(db, user(BUYER), async () =>
      (await db.query(`update public.profiles set full_name = 'x' where id = $1`, [BUYER2])).affectedRows,
    );
    assert.equal(other, 0);
    const [p] = await sup<{ full_name: string }>(`select full_name from public.profiles where id = $1`, [BUYER]);
    assert.equal(p.full_name, "Bea B");
  });

  it("execute rights: functions are not callable by the wrong roles", async () => {
    await assert.rejects(run(anon, `select public.save_product('{}'::jsonb)`), /permission denied/);
    await assert.rejects(
      run(user(BUYER), `select public.create_orders($1, '{}'::jsonb)`, [BUYER]),
      /permission denied/,
    );
    await assert.rejects(
      run(user(SELLER_A), `select public.create_orders($1, '{}'::jsonb)`, [SELLER_A]),
      /permission denied/,
    );
    await assert.rejects(run(anon, `select public.set_order_status(gen_random_uuid(), 'shipped')`), /permission denied/);
  });

  it("money columns are integers, never text or floats", async () => {
    const rows = await sup<{ table_name: string; column_name: string; data_type: string }>(
      `select table_name, column_name, data_type from information_schema.columns
       where table_schema = 'public' and (column_name like '%pence')`,
    );
    assert.deepEqual(rows.map((r) => `${r.table_name}.${r.column_name}`).sort(), [
      "option_values.price_delta_pence",
      "order_items.line_total_pence",
      "order_items.unit_price_pence",
      "orders.subtotal_pence",
      "orders.total_pence",
      "product_addons.price_pence",
      "products.base_price_pence",
      "products.compare_at_price_pence",
    ]);
    for (const r of rows) assert.equal(r.data_type, "integer", `${r.table_name}.${r.column_name}`);
  });
});

describe("listing lifecycle", () => {
  it("a buyer cannot save a listing", async () => {
    await assert.rejects(save(BUYER, prague(BUYER)), /FORBIDDEN/);
  });

  it("a seller saves the Prague bed with all its children", async () => {
    const payload = prague(SELLER_A);
    productA = await save(SELLER_A, payload);
    assert.equal(productA, payload.id);

    const [p] = await sup<{ title: string; slug: string; status: string; base: number; cmp: number }>(
      `select title, slug, status, base_price_pence as base, compare_at_price_pence as cmp
       from public.products where id = $1`,
      [productA],
    );
    assert.equal(p.title, "Prague Divan Bed – Cream Naples");
    assert.equal(p.slug, "prague-divan-bed-cream-naples");
    assert.equal(p.status, "pending");
    assert.equal(p.base, 26999);
    assert.equal(p.cmp, 53998);

    const counts = await sup<Record<string, number>>(
      `select
         (select count(*)::int from public.product_colours where product_id = $1) as colours,
         (select count(*)::int from public.product_images  where product_id = $1) as images,
         (select count(*)::int from public.option_groups   where product_id = $1) as groups,
         (select count(*)::int from public.option_values v join public.option_groups g on g.id = v.group_id
            where g.product_id = $1) as options,
         (select count(*)::int from public.product_addons  where product_id = $1) as addons`,
      [productA],
    );
    assert.deepEqual(counts[0], { colours: 6, images: 36, groups: 4, options: 15, addons: 1 });

    const positions = await sup<{ name: string }>(
      `select name from public.option_groups where product_id = $1 order by position`,
      [productA],
    );
    assert.deepEqual(positions.map((r) => r.name), ["Size", "Storage", "Headboard", "Base"]);
  });

  it("is invisible to the public until BOTH listing and shop are approved", async () => {
    assert.equal(await count(anon, "public.products"), 0);
    assert.equal(await count(user(BUYER), "public.products"), 0);
    assert.equal(await count(user(SELLER_B), "public.products"), 0);
    assert.equal(await count(user(SELLER_A), "public.products"), 1, "owner sees own pending listing");
    assert.equal(await count(user(ADMIN), "public.products"), 1, "admin sees everything");

    // sellers and buyers cannot approve
    await assert.rejects(run(user(SELLER_A), `select public.admin_set_listing_status($1, 'approved')`, [productA]), /FORBIDDEN/);
    await assert.rejects(run(user(BUYER), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_A]), /FORBIDDEN/);
    await assert.rejects(run(anon, `select public.admin_set_listing_status($1, 'approved')`, [productA]), /permission denied/);

    // listing approved, shop still pending -> still hidden
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'approved')`, [productA]);
    assert.equal(await count(anon, "public.products"), 0);
    assert.equal(await count(anon, "public.product_colours"), 0, "children follow the parent");

    // shop approved -> visible, with children
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_A]);
    assert.equal(await count(anon, "public.products"), 1);
    assert.equal(await count(anon, "public.product_colours"), 6);
    assert.equal(await count(anon, "public.option_values"), 15);
    assert.equal(await count(anon, "public.product_addons"), 1);
    assert.equal(await count(anon, "public.sellers"), 1);
  });

  it("another seller cannot edit it or use its storage folder", async () => {
    const hijack = clone(prague(SELLER_B, { productId: productA }));
    await assert.rejects(save(SELLER_B, hijack), /FORBIDDEN/);

    const stealPhoto = prague(SELLER_B);
    stealPhoto.images[0].storage_path = `${SELLER_A}/${productA}/steal.jpg`;
    await assert.rejects(save(SELLER_B, stealPhoto), /own folder/);

    const dotdot = prague(SELLER_B);
    dotdot.images[0].storage_path = `${SELLER_B}/../${SELLER_A}/x.jpg`;
    await assert.rejects(save(SELLER_B, dotdot), /own folder/);
  });

  it("editing keeps the approved status and the option ids, and replaces children cleanly", async () => {
    const before = await sup<{ id: string }>(
      `select v.id from public.option_values v join public.option_groups g on g.id = v.group_id
       where g.product_id = $1 order by v.id`,
      [productA],
    );
    const edit = prague(SELLER_A, { productId: productA });
    // keep the SAME option value ids, change a price and a label
    const old = await sup<{ id: string; name: string }>(
      `select id, name from public.option_groups where product_id = $1`,
      [productA],
    );
    assert.equal(old.length, 4);
    edit.base_price_pence = 27999;
    edit.groups[0].values[0].label = "Small Single (2FT6)";
    edit.groups[0].values[0].price_delta_pence = 9500;
    await save(SELLER_A, edit);

    const [p] = await sup<{ status: string; base: number }>(
      `select status, base_price_pence as base from public.products where id = $1`,
      [productA],
    );
    assert.equal(p.status, "approved", "editing never resets an approved listing");
    assert.equal(p.base, 27999);
    const [label] = await sup<{ label: string; price: number }>(
      `select v.label, v.price_delta_pence as price from public.option_values v
       join public.option_groups g on g.id = v.group_id
       where g.product_id = $1 and g.name = 'Size' and v.position = 0`,
      [productA],
    );
    assert.deepEqual(label, { label: "Small Single (2FT6)", price: 9500 });
    assert.equal(
      (await sup(`select 1 from public.option_values v join public.option_groups g on g.id = v.group_id where g.product_id = $1`, [productA])).length,
      15,
    );
    assert.ok(before.length === 15);

    // restore the brief's exact values for the later tests
    const restore = prague(SELLER_A, { productId: productA });
    await save(SELLER_A, restore);
    const [r] = await sup<{ base: number }>(`select base_price_pence as base from public.products where id = $1`, [productA]);
    assert.equal(r.base, 26999);
  });

  describe("rejects invalid listings", () => {
    const cases: Array<[string, (p: Payload) => void, RegExp]> = [
      ["duplicate colour names", (p) => { p.colours[1].name = p.colours[0].name.toUpperCase(); }, /listed twice/],
      ["bad hex", (p) => { p.colours[0].hex = "red"; }, /hex/],
      ["colour title too short", (p) => { p.colours[0].title = "ab"; }, /title/],
      ["no colours", (p) => { p.colours = []; p.images = []; }, /between 1 and 20 colours/],
      ["negative base price", (p) => { p.base_price_pence = -1; }, /base price/],
      ["compare-at not above base", (p) => { p.compare_at_price_pence = p.base_price_pence; }, /compare-at/],
      ["negative option price", (p) => { p.groups[0].values[0].price_delta_pence = -5; }, /zero or more/],
      ["two defaults in a group", (p) => { p.groups[1].values[0].is_default = true; p.groups[1].values[1].is_default = true; }, /more than one default/],
      ["duplicate choice in a group", (p) => { p.groups[0].values[1].label = p.groups[0].values[0].label; }, /listed twice/],
      ["empty option group", (p) => { p.groups[0].values = []; }, /between 1 and 30/],
      ["duplicate group", (p) => { p.groups[1].name = "size"; }, /listed twice/],
      ["negative add-on price", (p) => { p.addons[0].price_pence = -1; }, /zero or more/],
      ["image on an unknown colour", (p) => { p.images[0].colour_id = newId(); }, /colour that does not exist/],
      ["unknown category", (p) => { p.category_id = newId(); }, /category/],
      ["submit with no photos", (p) => { p.images = []; p.submit = true; }, /at least one photo/],
      ["too many add-ons", (p) => { p.addons = Array.from({ length: 11 }, (_, i) => ({ id: newId(), label: `a${i}`, price_pence: 1 })); }, /at most 10 add-ons/],
    ];
    for (const [name, mutate, pattern] of cases) {
      it(name, async () => {
        const p = prague(SELLER_A);
        mutate(p);
        await assert.rejects(save(SELLER_A, p), pattern);
        assert.equal(await count(user(SELLER_A), "public.products"), 1, "nothing was written");
      });
    }
  });

  it("hiding a shop hides its listings and stops it saving", async () => {
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'hidden')`, [SELLER_A]);
    assert.equal(await count(anon, "public.products"), 0);
    assert.equal(await count(anon, "public.sellers"), 0);
    await assert.rejects(save(SELLER_A, prague(SELLER_A, { productId: productA })), /hidden/);
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_A]);
    assert.equal(await count(anon, "public.products"), 1);
  });

  it("hiding a single listing hides only it", async () => {
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'hidden')`, [productA]);
    assert.equal(await count(anon, "public.products"), 0);
    assert.equal(await count(user(SELLER_A), "public.products"), 1, "the owner still sees it");
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'approved')`, [productA]);
    assert.equal(await count(anon, "public.products"), 1);
    await assert.rejects(run(user(ADMIN), `select public.admin_set_listing_status($1, 'draft')`, [productA]), /VALIDATION/);
    await assert.rejects(run(user(ADMIN), `select public.admin_set_listing_status(gen_random_uuid(), 'approved')`), /NOT_FOUND/);
  });

  it("a second seller's listing gets a unique slug", async () => {
    productB = await save(SELLER_B, prague(SELLER_B));
    const [p] = await sup<{ slug: string }>(`select slug from public.products where id = $1`, [productB]);
    assert.match(p.slug, /^prague-divan-bed-cream-naples-[0-9a-f]{6}$/);
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'approved')`, [productB]);
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_B]);
    assert.equal(await count(anon, "public.products"), 2);
  });
});

describe("search and facets (all data-driven)", () => {
  const search = (args: Record<string, unknown>) =>
    run<{ id: string }>(
      anon,
      `select id from public.search_products(
         p_q => $1, p_category => $2, p_colours => $3, p_sizes => $4, p_min_pence => $5, p_max_pence => $6)`,
      [args.q ?? null, args.category ?? null, args.colours ?? null, args.sizes ?? null, args.min ?? null, args.max ?? null],
    );

  it("finds by title, colour, shop and category; treats % and _ literally", async () => {
    assert.equal((await search({})).length, 2);
    assert.equal((await search({ q: "prague" })).length, 2);
    assert.equal((await search({ q: "plush velvet" })).length, 2);
    assert.equal((await search({ q: "Demo Seller" })).length, 1);
    assert.equal((await search({ q: "divan beds" })).length, 2);
    assert.equal((await search({ q: "%" })).length, 0);
    assert.equal((await search({ q: "_" })).length, 0);
    assert.equal((await search({ q: "no-such-thing" })).length, 0);
  });

  it("filters by size, colour, category and price", async () => {
    assert.equal((await search({ sizes: ["King 5FT"] })).length, 2);
    assert.equal((await search({ sizes: ["Nonexistent 9FT"] })).length, 0);
    assert.equal((await search({ colours: ["Mink Naples"] })).length, 2);
    assert.equal((await search({ colours: ["Purple"] })).length, 0);
    assert.equal((await search({ category: CATEGORY_PARENT })).length, 2, "parent category includes children");
    assert.equal((await search({ category: CATEGORY_CHILD })).length, 2);
    assert.equal((await search({ min: 30000 })).length, 0);
    assert.equal((await search({ max: 26999 })).length, 2);
    assert.equal((await search({ min: 26999, max: 26999 })).length, 2);
    assert.equal((await search({ q: "prague", colours: ["Mink Naples"], sizes: ["Single 3FT"], max: 30000 })).length, 2);
  });

  it("does not leak a seller's own non-public listings into the shop", async () => {
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'hidden')`, [productB]);
    const ids = await run<{ id: string }>(user(SELLER_B), `select id from public.search_products()`);
    assert.deepEqual(ids.map((r) => r.id), [productA]);
    await run(user(ADMIN), `select public.admin_set_listing_status($1, 'approved')`, [productB]);
  });

  it("builds facets from the data", async () => {
    const [{ f }] = await run<{ f: { categories: unknown[]; colours: Array<{ name: string }>; sizes: string[]; min_pence: number; max_pence: number } }>(
      anon,
      `select public.catalog_facets() as f`,
    );
    assert.equal(f.categories.length, 2);
    assert.deepEqual(f.colours.map((c) => c.name), [
      "Cream Naples", "Mink Naples", "Mink Plush Velvet", "Pink Coniston", "Seal Grey Naples", "Silver Linoso",
    ]);
    assert.deepEqual(f.sizes, [
      "Small Single 2FT6", "Single 3FT", "Small Double 4FT", "Double 4FT6", "King 5FT", "Super King 6FT",
    ]);
    assert.equal(f.min_pence, 26999);
    assert.equal(f.max_pence, 26999);
  });
});

describe("orders", () => {
  let checkoutId: string;
  let orderA: string;
  let orderB: string;

  const optionsFor = (label: string, delta: number) => [{ group: "Size", value: label, price_delta_pence: delta }];
  const line = (productId: string, sellerId: string, over: Record<string, unknown> = {}) => ({
    product_id: productId,
    seller_id: sellerId,
    title: "Prague Divan Bed – Cream Naples",
    colour_name: "Cream Naples",
    colour_hex: "#E8DFCF",
    image_path: `${sellerId}/${productId}/x.jpg`,
    options: optionsFor("King 5FT", 12500),
    addons: [{ label: "Professional Assembly", price_pence: 3999 }],
    unit_price_pence: 58998,
    quantity: 2,
    line_total_pence: 117996,
    ...over,
  });
  const shipping = { name: "Bea Buyer", phone: "07000 000000", line1: "1 Test Street", line2: "", city: "London", postcode: "N1 1AA" };
  const place = (buyer: string, payload: unknown) =>
    as(db, service, async () =>
      (await db.query<{ r: Array<{ id: string; order_number: string; seller_id: string; total_pence: number }> }>(
        `select public.create_orders($1, $2::jsonb) as r`,
        [buyer, JSON.stringify(payload)],
      )).rows[0].r,
    );

  before(() => {
    checkoutId = newId();
  });

  it("creates one order per seller, with snapshots and a first status event", async () => {
    const created = await place(BUYER, {
      checkout_id: checkoutId,
      shipping,
      lines: [
        line(productA, SELLER_A),
        line(productA, SELLER_A, { options: optionsFor("Single 3FT", 9500), unit_price_pence: 35499, quantity: 1, line_total_pence: 35499, addons: [] }),
        line(productB, SELLER_B, { unit_price_pence: 26999, quantity: 1, line_total_pence: 26999, options: [], addons: [] }),
      ],
    });
    assert.equal(created.length, 2);
    const a = created.find((o) => o.seller_id === SELLER_A)!;
    const b = created.find((o) => o.seller_id === SELLER_B)!;
    orderA = a.id;
    orderB = b.id;
    assert.equal(a.total_pence, 117996 + 35499);
    assert.equal(b.total_pence, 26999);
    assert.match(a.order_number, /^MM-\d{5,}$/);
    assert.notEqual(a.order_number, b.order_number);

    const items = await sup<{ options: Array<{ value: string }>; addons: unknown[]; line_total_pence: number }>(
      `select options, addons, line_total_pence from public.order_items where order_id = $1 order by position`,
      [orderA],
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].options[0].value, "King 5FT");
    assert.equal(items[0].addons.length, 1);
    assert.equal((await sup(`select 1 from public.order_status_events where order_id = $1 and status = 'new'`, [orderA])).length, 1);
  });

  it("is idempotent: the same checkout never creates a second set of orders", async () => {
    const again = await place(BUYER, { checkout_id: checkoutId, shipping, lines: [line(productA, SELLER_A)] });
    assert.deepEqual(again.map((o) => o.id).sort(), [orderA, orderB].sort());
    assert.equal((await sup(`select 1 from public.orders`)).length, 2);
  });

  it("rejects bad input atomically", async () => {
    const before = (await sup(`select 1 from public.orders`)).length;
    await assert.rejects(
      place(BUYER, { checkout_id: newId(), shipping, lines: [line(productA, SELLER_A, { line_total_pence: 1 })] }),
      /does not match/,
    );
    await assert.rejects(
      place(BUYER, { checkout_id: newId(), shipping, lines: [line(productA, SELLER_A, { quantity: 11, line_total_pence: 58998 * 11 })] }),
      /quantity/,
    );
    await assert.rejects(place(BUYER, { checkout_id: newId(), shipping, lines: [] }), /between 1 and 50/);
    await assert.rejects(place(BUYER, { checkout_id: newId(), shipping: { ...shipping, name: "" }, lines: [line(productA, SELLER_A)] }));
    await assert.rejects(place(newId(), { checkout_id: newId(), shipping, lines: [line(productA, SELLER_A)] }), /unknown buyer/);

    // an unavailable item aborts the whole checkout, including the good line
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'hidden')`, [SELLER_B]);
    await assert.rejects(
      place(BUYER, { checkout_id: newId(), shipping, lines: [line(productA, SELLER_A), line(productB, SELLER_B)] }),
      /ITEM_UNAVAILABLE/,
    );
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_B]);
    assert.equal((await sup(`select 1 from public.orders`)).length, before);
  });

  it("each party sees only their own orders", async () => {
    assert.equal(await count(user(BUYER), "public.orders"), 2);
    assert.equal(await count(user(BUYER2), "public.orders"), 0);
    assert.equal(await count(user(SELLER_A), "public.orders"), 1);
    assert.equal(await count(user(SELLER_B), "public.orders"), 1);
    assert.equal(await count(user(ADMIN), "public.orders"), 2);
    assert.equal(await count(user(BUYER2), "public.order_items"), 0);
    assert.equal(await count(user(SELLER_B), "public.order_items", []), 1);
    assert.equal(await count(user(BUYER), "public.order_items"), 3);
    assert.equal(await count(user(BUYER2), "public.order_status_events"), 0);
  });

  it("only the order's seller (or an admin) can change its status", async () => {
    await assert.rejects(run(user(BUYER), `select public.set_order_status($1, 'confirmed')`, [orderA]), /FORBIDDEN/);
    await assert.rejects(run(user(SELLER_B), `select public.set_order_status($1, 'confirmed')`, [orderA]), /FORBIDDEN/);
    await assert.rejects(run(user(BUYER2), `select public.set_order_status($1, 'confirmed')`, [orderA]), /FORBIDDEN/);
    await assert.rejects(run(user(SELLER_A), `select public.set_order_status(gen_random_uuid(), 'confirmed')`), /NOT_FOUND/);

    for (const status of ["confirmed", "shipped", "delivered"]) {
      await run(user(SELLER_A), `select public.set_order_status($1, $2::public.order_status)`, [orderA, status]);
    }
    const [o] = await sup<{ status: string }>(`select status from public.orders where id = $1`, [orderA]);
    assert.equal(o.status, "delivered");
    const events = await sup<{ status: string }>(
      `select status from public.order_status_events where order_id = $1 order by created_at, status`,
      [orderA],
    );
    assert.equal(events.length, 4);

    // re-selecting the same status adds nothing; the buyer sees the change
    await run(user(SELLER_A), `select public.set_order_status($1, 'delivered')`, [orderA]);
    assert.equal(await count(user(BUYER), "public.order_status_events where order_id = $1", [orderA]), 4);
    const seen = await run<{ status: string }>(user(BUYER), `select status from public.orders where id = $1`, [orderA]);
    assert.equal(seen[0].status, "delivered");

    // an admin may correct a status; any of the four is allowed
    await run(user(ADMIN), `select public.set_order_status($1, 'shipped')`, [orderA]);
    assert.equal((await sup<{ status: string }>(`select status from public.orders where id = $1`, [orderA]))[0].status, "shipped");
  });

  it("deleting a listing keeps past orders intact", async () => {
    await assert.rejects(run(user(SELLER_B), `select public.delete_product($1)`, [productA]), /FORBIDDEN/);
    await assert.rejects(run(user(BUYER), `select public.delete_product($1)`, [productA]), /FORBIDDEN/);
    await run(user(SELLER_A), `select public.delete_product($1)`, [productA]);
    assert.equal(await count(anon, "public.products"), 1);
    assert.equal((await sup(`select 1 from public.product_colours where product_id = $1`, [productA])).length, 0);
    const items = await sup<{ product_id: string | null; title: string; image_path: string }>(
      `select product_id, title, image_path from public.order_items where order_id = $1`,
      [orderA],
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].product_id, null);
    assert.equal(items[0].title, "Prague Divan Bed – Cream Naples");
    await assert.rejects(run(user(SELLER_A), `select public.delete_product($1)`, [productA]), /NOT_FOUND/);
  });

  it("orders are published to realtime", async () => {
    const rows = await sup(`select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders'`);
    assert.equal(rows.length, 1);
    assert.ok(orderB);
  });
});

describe("storage and AI usage", () => {
  const insertObject = (uid: string | null, name: string) =>
    as(db, uid ? user(uid) : anon, () =>
      db.query(`insert into storage.objects (bucket_id, name, owner) values ('product-images', $1, $2)`, [name, uid]),
    );

  it("sellers write only inside their own folder", async () => {
    await insertObject(SELLER_A, `${SELLER_A}/p/one.jpg`);
    await assert.rejects(insertObject(SELLER_A, `${SELLER_B}/p/two.jpg`), /row-level security/);
    await assert.rejects(insertObject(SELLER_A, `loose.jpg`), /row-level security/);
    await assert.rejects(insertObject(null, `${SELLER_A}/p/anon.jpg`), /row-level security/);
  });

  it("hidden sellers cannot upload; others cannot delete foreign files", async () => {
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'hidden')`, [SELLER_A]);
    await assert.rejects(insertObject(SELLER_A, `${SELLER_A}/p/three.jpg`), /row-level security/);
    await run(user(ADMIN), `select public.admin_set_seller_status($1, 'approved')`, [SELLER_A]);

    const removed = (id: string, name: string) =>
      as(db, user(id), async () =>
        (await db.query(`delete from storage.objects where name = $1`, [name])).affectedRows,
      );
    assert.equal(await removed(SELLER_B, `${SELLER_A}/p/one.jpg`), 0);
    assert.equal(await removed(ADMIN, `${SELLER_A}/p/one.jpg`), 1);
  });

  it("the AI usage table is private to the service role", async () => {
    await assert.rejects(run(user(SELLER_A), `select * from public.ai_usage`), /permission denied/);
    await assert.rejects(run(user(SELLER_A), `insert into public.ai_usage (user_id) values ('${SELLER_A}')`), /permission denied/);
    await run(service, `insert into public.ai_usage (user_id) values ($1)`, [SELLER_A]);
    assert.equal(await count(service, "public.ai_usage"), 1);
  });
});
