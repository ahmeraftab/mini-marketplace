import { defineConfig, devices } from "@playwright/test";

/**
 * Two kinds of tests:
 *  - tests/e2e/product.spec.ts runs against the built-in preview data
 *    (MM_FIXTURES=1, development only) so it needs no database.
 *  - tests/e2e/flow.spec.ts runs the full buyer/seller/admin flow and needs a
 *    seeded Supabase project (it skips itself when none is configured).
 */
const port = 3100;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  workers: 2,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { MM_FIXTURES: "1" },
  },
});
