import { expect, test, type Page } from "@playwright/test";

const PATH = "/products/prague-divan-bed-cream-naples";

/** Appendix B of the plan: size, storage, headboard, base, assembly -> price shown. */
const COMBOS = [
  { size: "Small Single 2FT6", storage: "No Storage", headboard: "FREE 26", base: "Standard Base", assembly: false, price: "£359.99" },
  { size: "Single 3FT", storage: "2 Drawers Left Side", headboard: "FREE 26", base: "Standard Base", assembly: false, price: "£414.99" },
  { size: "Double 4FT6", storage: "2 Drawers Right Side", headboard: "54", base: "Reinforced Base", assembly: false, price: "£459.99" },
  { size: "King 5FT", storage: "2 Drawers Foot End", headboard: "FREE 26", base: "Standard Base", assembly: true, price: "£589.98" },
  { size: "Super King 6FT", storage: "4 Drawers", headboard: "54", base: "Reinforced Base", assembly: true, price: "£704.98" },
  { size: "Small Double 4FT", storage: "No Storage", headboard: "54", base: "Standard Base", assembly: false, price: "£379.99" },
];

async function pick(page: Page, name: RegExp) {
  await page.getByRole("radio", { name }).first().click();
}

test.describe("product page", () => {
  test("opens at £269.99 with the crossed-out price and 50% OFF", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByTestId("product-title")).toHaveText("Prague Divan Bed – Cream Naples");
    await expect(page.getByText("£269.99").first()).toBeVisible();
    await expect(page.getByTestId("was-price")).toContainText("£539.98");
    await expect(page.getByText("50% OFF").first()).toBeVisible();
  });

  for (const combo of COMBOS) {
    test(`price for ${combo.size} / ${combo.storage} is ${combo.price}`, async ({ page }, info) => {
      await page.goto(PATH);
      await pick(page, new RegExp(combo.size));
      await pick(page, new RegExp(combo.storage));
      await pick(page, new RegExp(combo.headboard));
      await pick(page, new RegExp(combo.base));
      if (combo.assembly) await page.locator("label", { hasText: "Professional Assembly" }).click();
      // the live price is announced by the sr-only live region next to the digits
      await expect(page.locator('[aria-live="polite"][aria-atomic="true"]').first()).toHaveText(combo.price);
      if (info.project.name.startsWith("mobile")) {
        await expect(page.getByTestId("sticky-bar")).toContainText(combo.price);
      }
    });
  }

  test("swatch click updates selection, label, title and image", async ({ page }) => {
    await page.goto(PATH);
    const mainImage = page.locator('[aria-roledescription="slide"] img').first();
    const firstSrc = await mainImage.getAttribute("src");
    await page.getByRole("radio", { name: "Seal Grey Naples" }).click();
    await expect(page.getByTestId("colour-name")).toHaveText("Seal Grey Naples");
    await expect(page.getByTestId("product-title")).toHaveText("Prague Divan Bed – Seal Grey Naples");
    await expect(page.getByRole("radio", { name: "Seal Grey Naples" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => mainImage.getAttribute("src")).not.toBe(firstSrc);
    expect(page.url()).toContain("colour=seal-grey-naples");
  });

  test("refuses to add without a size, then adds configurations as separate lines", async ({ page }) => {
    await page.goto(PATH);
    const add = page.locator('[data-testid="add-to-basket"]:visible, [data-testid="add-to-basket-desktop"]:visible').first();
    await add.click();
    await expect(page.getByText("Please choose a size").first()).toBeVisible();
    await expect(page.getByText("Added to your basket")).toHaveCount(0);

    await pick(page, /Single 3FT/);
    await add.click();
    await page.getByRole("button", { name: "Close" }).click();
    await pick(page, /King 5FT/);
    await add.click();
    await page.getByRole("link", { name: "View basket" }).click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByTestId("cart-line")).toHaveCount(2);
  });

  test("controls meet the 44px touch size and nothing scrolls sideways", async ({ page }, info) => {
    await page.goto(PATH);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (!info.project.name.startsWith("mobile")) return;
    const targets = page.locator('[role="radio"], [data-testid="add-to-basket"], button[aria-label*="quantity"]');
    const n = await targets.count();
    for (let i = 0; i < n; i++) {
      const box = await targets.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `target ${i}`).toBeGreaterThanOrEqual(43.5);
      expect(box.width, `target ${i}`).toBeGreaterThanOrEqual(43.5);
    }
  });

  test("the Add to Basket bar stays on screen while scrolling (phone)", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"), "phone layout only");
    await page.goto(PATH);
    const bar = page.getByTestId("sticky-bar");
    for (const y of [0, 600, 1800, 99999]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect(bar).toBeInViewport({ ratio: 0.95 });
    }
  });
});

test.describe("pages", () => {
  for (const route of ["/", "/products", "/cart", "/login", "/signup", "/install", "/offline"]) {
    test(`${route} has no sideways scroll`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("guests are sent to log in from seller, admin, checkout and orders", async ({ page }) => {
    for (const route of ["/seller", "/admin", "/checkout", "/orders"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login\?next=/, { timeout: 20_000 });
    }
  });

  test("shop search and colour filter work", async ({ page }) => {
    await page.goto("/products?q=prague");
    await expect(page.getByText("1 result")).toBeVisible();
    await page.goto("/products?q=zzzz");
    await expect(page.getByText("Nothing matches those filters")).toBeVisible();
    await page.goto("/products?colour=Seal%20Grey%20Naples");
    await expect(page.getByRole("heading", { name: "Prague Divan Bed – Seal Grey Naples" })).toBeVisible();
  });
});
