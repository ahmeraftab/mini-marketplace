import { expect, test } from "@playwright/test";

/**
 * Installability checks against a PRODUCTION build (the service worker only
 * registers there):
 *   npm run build && npx next start -p 3200
 *   PWA_BASE_URL=http://localhost:3200 npx playwright test pwa --project=desktop
 */
const base = process.env.PWA_BASE_URL;
test.skip(!base, "set PWA_BASE_URL to a production build to run the PWA checks");
test.setTimeout(90_000);

test("the manifest is valid and every icon loads", async ({ request }) => {
  const res = await request.get(`${base}/manifest.webmanifest`);
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.start_url).toBe("/");
  expect(m.name).toBeTruthy();
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of m.icons as Array<{ src: string }>) {
    const r = await request.get(new URL(icon.src, base).toString());
    expect(r.status(), icon.src).toBe(200);
  }
  const apple = await request.get(`${base}/icons/apple-touch-icon.png`);
  expect(apple.status()).toBe(200);
});

test("the service worker registers and is never cached", async ({ page, request }) => {
  const sw = await request.get(`${base}/sw.js`);
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.scope;
  });
  expect(scope).toBe(`${base}/`);
});

test("offline, a page navigation shows the offline page", async ({ page, context }) => {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  // the worker must control the page before the network goes away
  await page.reload({ waitUntil: "networkidle" });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto(`${base}/products`).catch(() => {});
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await context.setOffline(false);
});

test("the pages carry the iPhone home-screen metadata", async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
});
