import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";

/**
 * A brand-new seller signs up, gets approved, builds a listing through the real
 * form (photo upload, colour, option group), an admin approves it, a guest sees
 * it, the seller edits a price, an admin hides the shop, and the seller deletes
 * the listing (its photos leave Storage). Everything it creates is called TEST
 * and is removed afterwards, so the live shop ends with its one real product.
 *
 *   FLOW_BASE_URL=http://localhost:3000 npx playwright test seller-form --project=desktop
 */
const base = process.env.FLOW_BASE_URL;
test.skip(!base, "set FLOW_BASE_URL to run the live flow");
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
test.use({ actionTimeout: 30_000 });
expect.configure({ timeout: 30_000 });

const PASSWORD = "Demo-Pass-2026!";
const stamp = Date.now();
const email = `test-seller-${stamp}@larchmarket.test`;
const shop = `TEST Shop ${stamp}`;
const title = `TEST Bed ${stamp}`;
const photos = [1, 2, 3, 4, 5].map((n) => path.join(process.cwd(), "seed-assets", "generated", "cream-naples", `${n}.jpg`));

function dbUrl(): string | null {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  try {
    const line = readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DB_URL="));
    return line ? line.slice("SUPABASE_DB_URL=".length).trim() : null;
  } catch {
    return null;
  }
}

async function login(page: Page, mail: string) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(mail);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function as(browser: Browser, mail: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, mail);
  return { ctx, page };
}

test.afterAll(async () => {
  const url = dbUrl();
  if (!url) return;
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await db.connect();
    await db.query("delete from public.products where seller_id in (select id from public.profiles where email = $1)", [email]);
    await db.query("delete from auth.users where email = $1", [email]);
  } catch {
    // best effort: the TEST prefix makes any leftovers easy to spot
  } finally {
    await db.end().catch(() => {});
  }
});

test("a new seller signs up and waits for approval; an admin approves the shop", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/signup?role=seller`, { waitUntil: "networkidle" });
  await page.getByLabel(/Your name/).fill("TEST Seller");
  await page.getByLabel(/Shop name/).fill(shop);
  await page.getByLabel("Email").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: /Open my shop/ }).click();
  await expect(page).toHaveURL(/\/seller$/, { timeout: 30_000 });
  await expect(page.getByText(/waiting for admin approval/)).toBeVisible();
  await ctx.close();

  const admin = await as(browser, "demo.admin@example.com");
  await admin.page.goto(`${base}/admin`);
  const row = admin.page.getByTestId("seller-row").filter({ hasText: shop });
  await row.getByTestId("approve-seller").click();
  await expect(row.getByTestId("hide-seller")).toBeVisible({ timeout: 15_000 });
  await admin.ctx.close();
});

test("the seller builds a listing through the form and submits it", async ({ browser }) => {
  const seller = await as(browser, email);
  const p = seller.page;
  await expect(p.getByText(/waiting for admin approval/)).toHaveCount(0);
  await p.goto(`${base}/seller/products/new`, { waitUntil: "networkidle" });

  await p.getByLabel(/^Price/).fill("199.50");
  await p.getByLabel("Description").fill("A sample bed made by the end-to-end test.");
  await p.locator('input[type="file"]').setInputFiles(photos);
  await expect(p.getByTestId("photo-card")).toHaveCount(5, { timeout: 90_000 });

  await p.getByLabel("Colour name").first().fill("TEST Cream");
  await p.getByLabel(/Product title/).first().fill(title);

  await p.getByRole("button", { name: "Add an option group" }).click();
  await p.getByLabel("Group name").first().fill("Size");
  while ((await p.locator('input[aria-label^="Choice "]').count()) < 2) {
    await p.getByRole("button", { name: "Add a choice" }).first().click();
  }
  await p.locator('input[aria-label^="Choice 1"]').fill("Small");
  await p.locator('input[aria-label^="Extra cost for choice 1"]').fill("0");
  await p.locator('input[aria-label^="Choice 2"]').fill("Large");
  await p.locator('input[aria-label^="Extra cost for choice 2"]').fill("25");

  await p.getByTestId("submit-approval").click();
  await expect(p).toHaveURL(/\/seller$/, { timeout: 60_000 });
  const row = p.getByTestId("listing-row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText(/pending/i);
  await seller.ctx.close();
});

test("approving the listing shows it to a guest; editing the price shows the new price", async ({ browser }) => {
  const admin = await as(browser, "demo.admin@example.com");
  await admin.page.goto(`${base}/admin`);
  const row = admin.page.getByTestId("listing-row").filter({ hasText: title });
  await row.getByTestId("approve-listing").click();
  await expect(row.getByTestId("hide-listing")).toBeVisible({ timeout: 15_000 });
  await admin.ctx.close();

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`${base}/products?q=${encodeURIComponent(title)}`);
  await expect(guest.getByRole("heading", { name: title }).first()).toBeVisible();
  await expect(guest.getByText("£199.50").first()).toBeVisible();

  const seller = await as(browser, email);
  await seller.page.goto(`${base}/seller`);
  await seller.page.getByTestId("listing-row").filter({ hasText: title }).getByRole("link", { name: "Edit" }).click();
  await seller.page.getByLabel(/^Price/).fill("189.50");
  await seller.page.getByTestId("save-changes").click();
  await expect(seller.page).toHaveURL(/\/seller$/, { timeout: 60_000 });
  await seller.ctx.close();

  await guest.goto(`${base}/products?q=${encodeURIComponent(title)}`);
  await expect(guest.getByText("£189.50").first()).toBeVisible();
});

test("hiding the shop removes its listing from the shop; approving brings it back", async ({ browser }) => {
  const admin = await as(browser, "demo.admin@example.com");
  const guest = await (await browser.newContext()).newPage();
  await admin.page.goto(`${base}/admin`);
  const row = admin.page.getByTestId("seller-row").filter({ hasText: shop });
  await row.getByTestId("hide-seller").click();
  await admin.page.getByRole("button", { name: "Hide", exact: true }).last().click();
  await expect(row.getByTestId("approve-seller")).toBeVisible({ timeout: 15_000 });
  await guest.goto(`${base}/products?q=${encodeURIComponent(title)}`);
  await expect(guest.getByText("Nothing matches those filters")).toBeVisible();

  await row.getByTestId("approve-seller").click();
  await expect(row.getByTestId("hide-seller")).toBeVisible({ timeout: 15_000 });
  await guest.goto(`${base}/products?q=${encodeURIComponent(title)}`);
  await expect(guest.getByRole("heading", { name: title }).first()).toBeVisible();
  await admin.ctx.close();
});

test("deleting the listing removes its photos from Storage", async ({ browser }) => {
  const seller = await as(browser, email);
  await seller.page.goto(`${base}/seller`);
  const row = seller.page.getByTestId("listing-row").filter({ hasText: title });
  await row.getByRole("button", { name: /^Delete/ }).click();
  await seller.page.getByRole("button", { name: "Delete listing" }).click();
  await expect(seller.page.getByTestId("listing-row").filter({ hasText: title })).toHaveCount(0, { timeout: 30_000 });

  // Storage itself must hold no files for this seller any more (the public URL can still be
  // answered from the CDN cache for a while, so ask the database, not the URL)
  const url = dbUrl();
  test.skip(!url, "SUPABASE_DB_URL is needed to look inside Storage");
  const db = new Client({ connectionString: url!, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    const left = await db.query(
      "select count(*)::int as n from storage.objects o join public.profiles p on o.name like p.id::text || '/%' where o.bucket_id = 'product-images' and p.email = $1",
      [email],
    );
    expect(left.rows[0].n).toBe(0);
  } finally {
    await db.end();
  }
  await seller.ctx.close();
});
