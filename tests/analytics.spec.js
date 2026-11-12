const { test, expect } = require("@playwright/test");
const { campaignQuery } = require("./fixtures/campaign");
const { blockAndCapturePosthog } = require("./helpers/analytics");

const QS = campaignQuery();

async function stubPrivacySignal(context, signal) {
  await context.addInitScript((kind) => {
    try {
      if (kind === "dnt") {
        Object.defineProperty(Navigator.prototype, "doNotTrack", {
          configurable: true,
          get: () => "1"
        });
      }
      if (kind === "gpc") {
        Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
          configurable: true,
          get: () => true
        });
      }
    } catch {
      /* non-fatal for navigation tests */
    }
  }, signal);
}

test.describe("Analytics safety", () => {
  test("/get/ attempts emit roamxp_smart_redirected (not store_clicked)", async ({
    browser
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    const events = await blockAndCapturePosthog(page);
    await page.route(/apps\.apple\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>store</title>ok"
      });
    });

    try {
      await page.goto(`/get/${QS}`, { waitUntil: "domcontentloaded" });
    } catch {
      /* store fulfill */
    }
    await page.waitForTimeout(600);

    const smart = events.filter((e) => e.event === "roamxp_smart_redirected");
    const clicks = events.filter((e) => e.event === "roamxp_store_clicked");
    expect(clicks.length).toBe(0);
    if (smart.length) {
      const props = smart[0].properties || {};
      expect(props.redirect_mode).toBeTruthy();
      expect(props.analytics_surface).toBe("web_acquisition");
      expect(props.destination_store).toBeTruthy();
      expect(props.device_os).toBeTruthy();
    }
    await context.close();
  });

  test("DNT skips analytics and still navigates", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    await stubPrivacySignal(context, "dnt");
    const page = await context.newPage();
    const events = await blockAndCapturePosthog(page);
    await page.goto(`/get/${QS}`, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    expect(page.url()).toContain("/go/");
    expect(
      events.filter((e) => e.event === "roamxp_smart_redirected").length
    ).toBe(0);
    await expect(page.locator("#btn-app-store")).toBeVisible();
    await context.close();
  });

  test("GPC skips analytics and still navigates", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    await stubPrivacySignal(context, "gpc");
    const page = await context.newPage();
    const events = await blockAndCapturePosthog(page);
    await page.goto(`/get/${QS}`, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    expect(page.url()).toContain("/go/");
    expect(
      events.filter((e) => e.event === "roamxp_smart_redirected").length
    ).toBe(0);
    await context.close();
  });

  test("blocked PostHog never blocks /get/ → /go/ navigation", async ({
    browser
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    await page.route(/posthog/i, (route) => route.abort());
    await page.goto(`/get/${QS}`, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    expect(page.url()).toContain("/go/");
    await expect(page.locator("#btn-play-store")).toBeVisible();
    await context.close();
  });
});
