const { test, expect } = require("@playwright/test");
const { blockAndCapturePosthog } = require("./helpers/analytics");
const { resolveDestination } = require("./helpers/navigation");

const SHORT = [
  { path: "/ig/", source: "instagram", medium: "social", linkId: "ig" },
  { path: "/yt/", source: "youtube", medium: "social", linkId: "yt" },
  { path: "/tt/", source: "tiktok", medium: "social", linkId: "tt" },
  { path: "/qr/", source: "qr", medium: "offline", linkId: "qr" }
];

test.describe("Channel routes unify through /get/", () => {
  test("HTML configs declare targetPath /get/ (not /go/)", async ({ request }) => {
    for (const link of SHORT) {
      const res = await request.get(link.path);
      expect(res.ok()).toBeTruthy();
      const body = await res.text();
      expect(body).toContain('targetPath: "/get/"');
      expect(body).not.toContain('targetPath: "/go/"');
    }
  });

  for (const link of SHORT) {
    test(`${link.path} → /get/ → /go/ on desktop with defaults`, async ({
      page
    }) => {
      await blockAndCapturePosthog(page);
      const hops = [];
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) hops.push(frame.url());
      });

      await page.goto(link.path, { waitUntil: "domcontentloaded" });
      for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
        await page.waitForTimeout(100);
      }

      expect(page.url()).toContain("/go/");
      expect(page.url()).not.toMatch(/\/get\/$/);
      const url = new URL(page.url());
      expect(url.searchParams.get("utm_source")).toBe(link.source);
      expect(url.searchParams.get("utm_medium")).toBe(link.medium);
      expect(url.searchParams.get("link_id")).toBe(link.linkId);
      expect(url.searchParams.get("utm_campaign")).toBe("roamxp_download");

      // Must have passed through /get/ (no loops back to channel)
      const hopPaths = hops.map((h) => {
        try {
          return new URL(h).pathname;
        } catch {
          return h;
        }
      });
      expect(hopPaths.some((p) => p.includes("/get"))).toBeTruthy();
      expect(hopPaths.filter((p) => p.includes(link.path.replace(/\//g, ""))).length).toBeLessThan(3);

      await expect(page.locator("#btn-app-store")).toBeVisible();
      await expect(page.locator("#btn-play-store")).toBeVisible();
    });
  }

  test("explicit query params survive /ig/ → /get/ → /go/", async ({ page }) => {
    await blockAndCapturePosthog(page);
    await page.goto(
      "/ig/?utm_source=custom&utm_campaign=keep_me&link_id=custom_ig",
      { waitUntil: "domcontentloaded" }
    );
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    const url = new URL(page.url());
    expect(url.pathname).toContain("/go");
    expect(url.searchParams.get("utm_source")).toBe("custom");
    expect(url.searchParams.get("utm_campaign")).toBe("keep_me");
    expect(url.searchParams.get("link_id")).toBe("custom_ig");
    // default medium merged because not provided
    expect(url.searchParams.get("utm_medium")).toBe("social");
  });

  test("/ig/ on iPhone routes toward App Store (via /get/)", async ({
    browser
  }) => {
    // Reuse get intercept helper by first loading channel in a custom flow
    const device = {
      id: "iphone_via_ig",
      label: "iPhone via /ig/",
      expect: "ios",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 }
    };

    const context = await browser.newContext({
      userAgent: device.userAgent,
      viewport: device.viewport,
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await blockAndCapturePosthog(page);
    const storeHits = [];
    page.on("request", (req) => {
      if (/apps\.apple\.com|play\.google\.com/.test(req.url())) {
        storeHits.push(req.url());
      }
    });
    await page.route(/apps\.apple\.com|play\.google\.com/, async (route) => {
      storeHits.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>store</title>ok"
      });
    });

    await page.goto("/ig/", { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 40; i++) {
      if (storeHits.length || /\/go\//.test(page.url())) break;
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(150);

    const result = await resolveDestination(page, storeHits);
    expect(result.kind).toBe("ios");
    expect(result.dest).toContain("apps.apple.com");
    await context.close();
  });

  test("/ig/ Instagram in-app falls back to /go/ with ig attribution", async ({
    browser
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0.0",
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    await blockAndCapturePosthog(page);
    await page.goto("/ig/", { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    expect(page.url()).toContain("/go/");
    const url = new URL(page.url());
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("link_id")).toBe("ig");
    await expect(page.locator("#btn-app-store")).toBeVisible();
    await context.close();
  });

  test("no redirect loop on channel → get → go", async ({ page }) => {
    await blockAndCapturePosthog(page);
    const visits = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) visits.push(frame.url());
    });
    await page.goto("/qr/", { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    const getCount = visits.filter((u) => u.includes("/get/")).length;
    const qrCount = visits.filter((u) => /\/qr\/?(\?|$)/.test(u)).length;
    expect(getCount).toBeLessThanOrEqual(2);
    expect(qrCount).toBeLessThanOrEqual(2);
    expect(page.url()).toContain("/go/");
    expect(page.url()).not.toContain("/get/");
  });
});
