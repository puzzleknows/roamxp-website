// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const isProdSmoke = !!process.env.PLAYWRIGHT_BASE_URL;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8090";
const useSystemChrome = process.env.PW_CHANNEL === "chrome" || !process.env.CI;

/**
 * Local suite serves the static site.
 * Production smoke is read-only against roamxp.puzdev.com (PostHog blocked in tests).
 *
 * Local default uses system Google Chrome (channel: chrome) to avoid large
 * Playwright browser downloads hanging in constrained environments.
 * CI installs Chromium + WebKit via `npx playwright install --with-deps`.
 */
module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // python -m http.server is single-threaded; keep concurrency low to avoid flakes
  workers: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["./tests/reporters/smart-links-summary.js"]
  ],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ignoreHTTPSErrors: true
  },
  webServer: isProdSmoke
    ? undefined
    : {
        command: "python3 -m http.server 8090",
        url: "http://127.0.0.1:8090/go/",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000
      },
  projects: isProdSmoke
    ? [
        {
          name: "production-smoke",
          testMatch: /production-smoke\.spec\.js/,
          use: {
            ...devices["Desktop Chrome"],
            channel: "chrome"
          }
        }
      ]
    : [
        {
          name: "chromium",
          testIgnore: /production-smoke\.spec\.js/,
          use: {
            ...devices["Desktop Chrome"],
            ...(useSystemChrome ? { channel: "chrome" } : {})
          }
        },
        // WebKit project is CI-oriented; skip locally unless PW_WEBKIT=1
        ...(process.env.CI || process.env.PW_WEBKIT === "1"
          ? [
              {
                name: "webkit",
                testIgnore: /production-smoke\.spec\.js/,
                use: { ...devices["Desktop Safari"] }
              }
            ]
          : [])
      ]
});
