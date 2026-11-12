const { test, expect } = require("@playwright/test");

/**
 * Read-only production smoke against https://roamxp.puzdev.com
 * ALWAYS blocks PostHog — never contaminate production analytics.
 *
 * Run: npm run test:smoke:prod
 */
test.describe("Production smoke (read-only)", () => {
  test.beforeEach(async ({ context, page }) => {
    // Block all PostHog hosts at the context level so live smoke never emits.
    await context.route(
      /posthog\.com|i\.posthog\.com|-assets\.i\.posthog\.com/i,
      (route) => route.abort()
    );
    await page.route(
      /posthog\.com|i\.posthog\.com|-assets\.i\.posthog\.com/i,
      (route) => route.abort()
    );
    await page.addInitScript(() => {
      try {
        const orig = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
        if (orig) {
          navigator.sendBeacon = function (url, data) {
            if (String(url).includes("posthog")) return true;
            return orig(url, data);
          };
        }
      } catch {
        /* ignore */
      }
    });
  });

  test("public routes respond", async ({ request }) => {
    for (const path of ["/go/", "/get/", "/ig/", "/yt/", "/tt/", "/qr/"]) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
    }
  });

  test("desktop /get/ falls back to /go/ with attribution", async ({ page }) => {
    await page.goto(
      "/get/?utm_source=prod_smoke&utm_campaign=daily&link_id=prod_smoke_get",
      { waitUntil: "networkidle" }
    );
    expect(page.url()).toContain("/go/");
    expect(page.url()).toContain("utm_campaign=daily");
    expect(page.url()).toContain("link_id=prod_smoke_get");
    await expect(page.locator("#btn-app-store")).toBeVisible();
    await expect(page.locator("#btn-play-store")).toBeVisible();
  });

  test("short links enter via /get/ then resolve (desktop → /go/)", async ({
    page
  }) => {
    await page.goto("/ig/", { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 50 && !/\/go\//.test(page.url()); i++) {
      await page.waitForTimeout(100);
    }
    // Desktop smoke ends on /go/; channel HTML must point at /get/
    expect(page.url()).toContain("/go/");
    const ig = await page.request.get("/ig/");
    expect(await ig.text()).toContain('targetPath: "/get/"');
  });

  test("/go/ design intact", async ({ page }) => {
    await page.goto("/go/", { waitUntil: "networkidle" });
    await expect(page.locator(".hero-title")).toContainText(
      "Turn Life Into a Game."
    );
    await expect(page.locator("#btn-app-store")).toBeVisible();
  });
});
