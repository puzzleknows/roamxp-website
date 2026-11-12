const { test, expect } = require("@playwright/test");
const {
  campaignQuery,
  expectPlayReferrer,
  expectAppStoreParams
} = require("./fixtures/campaign");
const { blockAndCapturePosthog } = require("./helpers/analytics");

const QS = campaignQuery();

test.describe("/go/ landing regressions", () => {
  test("does not auto-redirect to stores; preserves attribution on badges", async ({
    page
  }) => {
    await blockAndCapturePosthog(page);
    const storeHits = [];
    await page.route(/apps\.apple\.com|play\.google\.com/, async (route) => {
      storeHits.push(route.request().url());
      await route.abort("blockedbyclient");
    });

    await page.goto(`/go/${QS}`, { waitUntil: "networkidle" });
    expect(page.url()).toContain("/go/");
    expect(storeHits.length).toBe(0);

    await expect(page.locator(".hero-title")).toContainText(
      "Turn Life Into a Game."
    );
    await expect(page.locator("#btn-app-store")).toBeVisible();
    await expect(page.locator("#btn-play-store")).toBeVisible();

    const ios = await page.locator("#btn-app-store").getAttribute("href");
    const play = await page.locator("#btn-play-store").getAttribute("href");
    expect(ios).toContain("apps.apple.com");
    const apple = expectAppStoreParams(ios);
    expect(apple.ok, apple.missing).toBeTruthy();
    const ref = expectPlayReferrer(play);
    expect(ref.ok, JSON.stringify(ref)).toBeTruthy();
  });

  test("manual store clicks emit roamxp_store_clicked only (not smart_redirected)", async ({
    page
  }) => {
    await blockAndCapturePosthog(page);
    await page.addInitScript(() => {
      window.__qaEvents = [];
      window.posthog = {
        __SV: 1,
        init() {},
        capture(name, props) {
          window.__qaEvents.push({ name, props });
        }
      };
    });

    await page.goto(`/go/${QS}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      window.__qaEvents = window.__qaEvents || [];
      window.posthog = window.posthog || {};
      window.posthog.capture = function (name, props) {
        window.__qaEvents.push({ name, props });
      };
      document
        .getElementById("btn-app-store")
        .addEventListener("click", (e) => e.preventDefault(), true);
      document
        .getElementById("btn-play-store")
        .addEventListener("click", (e) => e.preventDefault(), true);
    });

    await page.locator("#btn-app-store").click();
    await page.locator("#btn-play-store").click();

    const events = await page.evaluate(() => window.__qaEvents || []);
    const clicks = events.filter((e) => e.name === "roamxp_store_clicked");
    const smart = events.filter((e) => e.name === "roamxp_smart_redirected");
    expect(clicks.length).toBeGreaterThanOrEqual(2);
    expect(smart.length).toBe(0);

    // Debounce should prevent immediate duplicates for same key
    await page.locator("#btn-app-store").click();
    const after = await page.evaluate(() => window.__qaEvents || []);
    const iosClicks = after.filter(
      (e) =>
        e.name === "roamxp_store_clicked" &&
        e.props &&
        e.props.destination_store === "ios"
    );
    // At most one ios click within debounce window
    expect(iosClicks.length).toBe(1);
  });

  test("does not load roamxp-smart-get.js", async ({ page }) => {
    await blockAndCapturePosthog(page);
    const scripts = [];
    page.on("request", (req) => {
      if (req.url().includes(".js")) scripts.push(req.url());
    });
    await page.goto(`/go/${QS}`, { waitUntil: "networkidle" });
    expect(scripts.some((u) => u.includes("roamxp-smart-get.js"))).toBeFalsy();
    expect(scripts.some((u) => u.includes("roamxp-store-links.js"))).toBeTruthy();
    expect(scripts.some((u) => u.includes("roamxp-landing.js"))).toBeTruthy();
  });
});
