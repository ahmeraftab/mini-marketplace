import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility scan (axe-core) of the main pages: no serious or critical issues.
 * Needs the seeded Supabase project for the signed-in pages:
 *   FLOW_BASE_URL=http://localhost:3000 npx playwright test a11y --project=desktop
 */
const base = process.env.FLOW_BASE_URL;
test.skip(!base, "set FLOW_BASE_URL to run the live scan");
test.setTimeout(120_000);
test.use({ actionTimeout: 30_000 });

const PASSWORD = "Demo-Pass-2026!";

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function scan(page: Page, route: string) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // entrance animations settle, so contrast is measured on final colours
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${route}\n${summary.join("\n")}`).toEqual([]);
}

test.describe("guest pages", () => {
  for (const route of ["/", "/products", "/products/prague-divan-bed-cream-naples", "/cart", "/login", "/signup", "/install"]) {
    test(`${route} has no serious accessibility issues`, async ({ page }) => {
      await scan(page, route);
    });
  }
});

test.describe("signed-in pages", () => {
  test("buyer: orders and account", async ({ page }) => {
    await login(page, "demo.buyer@example.com");
    for (const route of ["/orders", "/account"]) await scan(page, route);
  });

  test("seller: hub, orders and the listing form", async ({ page }) => {
    await login(page, "demo.seller@example.com");
    await scan(page, "/seller");
    await scan(page, "/seller/orders");
    await page.goto(`${base}/seller`);
    const href = await page.locator('a[href*="/edit"]').first().getAttribute("href");
    await scan(page, href!);
  });

  test("admin: moderation page", async ({ page }) => {
    await login(page, "demo.admin@example.com");
    await scan(page, "/admin");
  });
});
