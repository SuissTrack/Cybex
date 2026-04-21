import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Tests run against the Next.js dev/prod server.
 *
 * Usage:
 *   npm run test:e2e          # run all E2E tests
 *   npx playwright test --ui  # interactive UI mode
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // sequential — wizard tests depend on DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start Next.js dev server automatically if not already running
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
