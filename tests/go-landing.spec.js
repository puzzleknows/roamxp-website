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

  test("desktop keeps badges + QR and hides iOS in-app panel", async ({
    page
  }) => {
    await blockAndCapturePosthog(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/go/${QS}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#ios-inapp-panel")).toBeHidden();
    await expect(page.locator("#btn-app-store")).toBeVisible();
    await expect(page.locator("#btn-play-store")).toBeVisible();
    await expect(page.locator("#desktop-qr")).toBeVisible();
    expect(await page.locator("#btn-app-store").getAttribute("target")).toBe(
      "_blank"
    );
  });

  test("TikTok iOS shows App Store CTA + Safari steps; same-tab store link", async ({
    browser
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a0c1 TikTok 33.0.0",
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    await blockAndCapturePosthog(page);
    await page.goto(
      "/go/?utm_source=tiktok&utm_medium=social&utm_campaign=roamxp_download&link_id=tt",
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator("#ios-inapp-panel")).toBeVisible();
    await expect(page.locator("#btn-app-store-cta")).toBeVisible();
    await expect(page.locator("#btn-app-store-cta")).toContainText(
      "Open in the App Store"
    );
    await expect(page.locator("#ios-inapp-steps")).toContainText(
      "Open in Safari"
    );
    await expect(page.locator("#desktop-qr")).toBeHidden();

    const cta = page.locator("#btn-app-store-cta");
    const badge = page.locator("#btn-app-store");
    const ctaHref = await cta.getAttribute("href");
    const badgeHref = await badge.getAttribute("href");
    expect(ctaHref).toContain("apps.apple.com");
    expect(badgeHref).toContain("apps.apple.com");
    expect(await cta.getAttribute("target")).toBeNull();
    expect(await badge.getAttribute("target")).toBeNull();

    await expect(page.locator("#btn-play-store")).toBeVisible();
    await context.close();
  });

  test("Android TikTok keeps Play badge and hides iOS in-app panel", async ({
    browser
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 TikTok 32.0.0",
      isMobile: true,
      hasTouch: true,
      viewport: { width: 412, height: 915 }
    });
    const page = await context.newPage();
    await blockAndCapturePosthog(page);
    await page.goto(
      "/go/?utm_source=tiktok&utm_medium=social&utm_campaign=roamxp_download&link_id=tt",
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.locator("#ios-inapp-panel")).toBeHidden();
    await expect(page.locator("#btn-play-store")).toBeVisible();
    const play = await page.locator("#btn-play-store").getAttribute("href");
    expect(play).toContain("play.google.com");
    expect(play).toContain("referrer=");
    await context.close();
  });
});
