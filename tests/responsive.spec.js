const { test, expect } = require("@playwright/test");
const { campaignQuery } = require("./fixtures/campaign");
const { blockAndCapturePosthog } = require("./helpers/analytics");

const QS = campaignQuery();
const WIDTHS = [320, 375, 390, 430, 768, 1440];

test.describe("/go/ responsive download UI", () => {
  for (const width of WIDTHS) {
    test(`${width}px — no overflow, badges visible, QR rules`, async ({
      browser
    }) => {
      const height = width >= 1024 ? 900 : 844;
      const isDesktop = width >= 768;
      const context = await browser.newContext({
        viewport: { width, height },
        userAgent: isDesktop
          ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        isMobile: !isDesktop,
        hasTouch: !isDesktop,
        deviceScaleFactor: 2
      });
      const page = await context.newPage();
      await blockAndCapturePosthog(page);
      await page.goto(`/go/${QS}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);

      await expect(page.locator("#btn-app-store")).toBeVisible();
      await expect(page.locator("#btn-play-store")).toBeVisible();
      await expect(page.locator(".hero-title")).toBeVisible();

      // Clickable hit targets
      const iosBox = await page.locator("#btn-app-store").boundingBox();
      const playBox = await page.locator("#btn-play-store").boundingBox();
      expect(iosBox).toBeTruthy();
      expect(playBox).toBeTruthy();
      expect(iosBox.height).toBeGreaterThanOrEqual(40);
      expect(playBox.height).toBeGreaterThanOrEqual(40);

      const metrics = await page.evaluate((vw) => {
        const sels = [
          ".hero-title",
          ".hero-lede",
          ".store-actions",
          "#btn-app-store",
          "#btn-play-store",
          ".footer-nav"
        ];
        const clipped = [];
        for (const sel of sels) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.left < -0.5 || r.right > vw + 0.5) clipped.push(sel);
        }
        const qr = document.querySelector("#desktop-qr");
        const qrVisible = !!(qr && !qr.hidden && getComputedStyle(qr).display !== "none");
        return {
          clipped,
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          qrVisible
        };
      }, width);

      expect(metrics.clipped, `clipped at ${width}: ${metrics.clipped}`).toEqual(
        []
      );
      expect(metrics.overflow, `horizontal overflow at ${width}`).toBeFalsy();

      if (isDesktop) {
        expect(metrics.qrVisible, "desktop QR should show").toBeTruthy();
      } else {
        expect(metrics.qrVisible, "mobile QR should hide").toBeFalsy();
      }

      await context.close();
    });
  }
});
