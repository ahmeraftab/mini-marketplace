import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Full buyer -> seller -> admin flow against a seeded Supabase project
 * (npm run seed:demo). Run with the app started WITHOUT MM_FIXTURES:
 *   npx next dev -p 3000   then   FLOW_BASE_URL=http://localhost:3000 npx playwright test flow --project=desktop
 */
const base = process.env.FLOW_BASE_URL;
test.skip(!base, "set FLOW_BASE_URL to run the live flow");
test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);
test.use({ actionTimeout: 30_000 });
expect.configure({ timeout: 30_000 });

const PASSWORD = "Demo-Pass-2026!";

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function as(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, email);
  return { ctx, page };
}

let orderUrl = "";

test("buyer configures, orders; seller moves the status; buyer sees it", async ({ browser }) => {
  const buyer = await as(browser, "demo.buyer@example.com");
  const p = buyer.page;
  await p.goto(`${base}/products/prague-divan-bed-cream-naples`);
  await p.getByRole("radio", { name: "Mink Naples" }).click();
  await p.getByRole("radio", { name: /King 5FT/ }).click();
  await p.getByRole("radio", { name: /2 Drawers Foot End/ }).click();
  await p.locator("label", { hasText: "Professional Assembly" }).click();
  await expect(p.locator('[aria-live="polite"][aria-atomic="true"]').first()).toHaveText("£589.98");
  // desktop has the button in the options column, phones have it in the sticky bar
  await p.locator('[data-testid="add-to-basket-desktop"]:visible, [data-testid="add-to-basket"]:visible').first().click();
  await p.getByRole("link", { name: "View basket" }).click();
  await expect(p.getByTestId("cart-line")).toHaveCount(1);
  await expect(p.getByTestId("cart-total")).toHaveText("£589.98");
  await p.getByRole("link", { name: "Checkout" }).first().click();
  await p.getByLabel(/Full name/).fill("Demo Buyer");
  await p.getByLabel(/Phone/).fill("07123 456789");
  await p.getByLabel(/^Address \*/).fill("1 Sample Street");
  await p.getByLabel(/Town or city/).fill("London");
  await p.getByLabel(/Postcode/).fill("SW1A 1AA");
  await p.locator('[data-testid="place-order"]:visible, [data-testid="place-order-mobile"]:visible').first().click();
  await expect(p).toHaveURL(/checkout\/success/, { timeout: 30_000 });
  await expect(p.getByTestId("order-numbers")).toContainText("MM-");

  await p.goto(`${base}/orders`);
  await p.getByTestId("order-number").first().click();
  await expect(p.getByTestId("order-status")).toContainText("New");
  orderUrl = p.url();

  const seller = await as(browser, "demo.seller@example.com");
  await seller.page.goto(`${base}/seller/orders`);
  await seller.page.getByTestId("seller-order").first().click();
  await expect(seller.page.getByText("Mink Naples").first()).toBeVisible();
  for (const step of ["Confirmed", "Shipped", "Delivered"]) {
    await expect(seller.page.getByTestId("next-status")).toHaveText(`Mark as ${step}`);
    await seller.page.getByTestId("next-status").click();
    await expect(seller.page.getByText(`Marked as ${step}`).first()).toBeVisible({ timeout: 15_000 });
    // the buyer's open page hears about it live (Realtime), without a reload
    await expect(p.getByText(/Order MM-[0-9]+ is now /).filter({ hasText: step }).first()).toBeVisible({ timeout: 30_000 });
  }
  await seller.ctx.close();

  await p.reload();
  await expect(p.getByTestId("order-status")).toContainText("Delivered");
  await buyer.ctx.close();
});

test("guards: buyer is denied the seller and admin areas", async ({ browser }) => {
  const buyer = await as(browser, "demo.buyer@example.com");
  for (const route of ["/seller", "/admin"]) {
    await buyer.page.goto(`${base}${route}`);
    await expect(buyer.page.getByTestId("access-denied")).toBeVisible();
  }
  await buyer.ctx.close();
});

test("admin hides the listing and it leaves the shop; approving brings it back", async ({ browser }) => {
  const admin = await as(browser, "demo.admin@example.com");
  const guest = await (await browser.newContext()).newPage();
  await admin.page.goto(`${base}/admin`);
  const row = admin.page.getByTestId("listing-row").filter({ hasText: "Prague Divan Bed" }).first();
  await row.getByTestId("hide-listing").click();
  await admin.page.getByRole("button", { name: "Hide", exact: true }).last().click();
  await expect(row.getByTestId("approve-listing")).toBeVisible({ timeout: 15_000 });
  await guest.goto(`${base}/products`);
  await expect(guest.getByText("Nothing matches those filters")).toBeVisible();
  await row.getByTestId("approve-listing").click();
  await expect(row.getByTestId("hide-listing")).toBeVisible({ timeout: 15_000 });
  await guest.goto(`${base}/products`);
  await expect(guest.getByRole("heading", { name: /Prague Divan Bed/ }).first()).toBeVisible();
  await admin.ctx.close();
  void orderUrl;
});
