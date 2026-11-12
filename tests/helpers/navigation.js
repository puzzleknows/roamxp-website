const { expect } = require("@playwright/test");
const { blockAndCapturePosthog } = require("./analytics");

/**
 * Open /get/ with store navigations safely intercepted.
 * Captures intended App Store / Play URLs without requiring native store opens.
 * PostHog is always blocked.
 */
async function openGetWithStoreIntercept(browser, device, campaignQuery) {
  const context = await browser.newContext({
    userAgent: device.userAgent,
    viewport: device.viewport,
    isMobile: !!device.isMobile,
    hasTouch: !!device.hasTouch,
    deviceScaleFactor: device.isMobile ? 2 : 1
  });

  if (device.platformOverride != null || device.maxTouchPoints != null) {
    await context.addInitScript(
      ({ platform, maxTouchPoints }) => {
        if (platform != null) {
          try {
            Object.defineProperty(Navigator.prototype, "platform", {
              get: () => platform,
              configurable: true
            });
          } catch {
            /* ignore */
          }
        }
        if (maxTouchPoints != null) {
          try {
            Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
              get: () => maxTouchPoints,
              configurable: true
            });
          } catch {
            /* ignore */
          }
        }
      },
      {
        platform: device.platformOverride ?? null,
        maxTouchPoints: device.maxTouchPoints ?? null
      }
    );
  }

  const page = await context.newPage();
  const posthogEvents = await blockAndCapturePosthog(page);
  const storeHits = [];

  page.on("request", (req) => {
    const url = req.url();
    if (/apps\.apple\.com|play\.google\.com/.test(url)) {
      storeHits.push(url);
    }
  });

  await page.route(/apps\.apple\.com|play\.google\.com/, async (route) => {
    const url = route.request().url();
    storeHits.push(url);
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>store-intercepted</title><p>ok</p>"
    });
  });

  let navError = null;
  try {
    await page.goto(`/get/${campaignQuery}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000
    });
  } catch (e) {
    navError = String(e.message || e);
  }

  // Poll for routing settlement (store request or /go/ landing)
  for (let i = 0; i < 40; i++) {
    if (storeHits.length || /\/go\//.test(page.url())) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(150);

  return { context, page, storeHits, navError, posthogEvents };
}

/**
 * Resolve destination from intercepted store hits, final URL, or wired badge hrefs
 * when an auto-store attempt left us on /get/ after a fulfilled/aborted navigation.
 */
async function resolveDestination(page, storeHits) {
  if (storeHits.length) {
    const dest = storeHits[0];
    if (/apps\.apple\.com/.test(dest)) return { kind: "ios", dest };
    if (/play\.google\.com/.test(dest)) return { kind: "android", dest };
    return { kind: "store_other", dest };
  }

  const pageUrl = page.url();
  if (/\/go\//.test(pageUrl)) return { kind: "go", dest: pageUrl };

  // Still on /get/: use wired store badges + status as the routing decision signal.
  // This covers cases where the browser cancelled external navigation before a
  // request was observed, while smart-get still prepared the correct destination.
  try {
    const status = ((await page.locator("#get-status").textContent()) || "").trim();
    const ios = (await page.locator("#btn-app-store").getAttribute("href")) || "";
    const play = (await page.locator("#btn-play-store").getAttribute("href")) || "";
    const openingStore = /opening the store/i.test(status);

    if (openingStore && /apps\.apple\.com/.test(ios) && !/\/go\//.test(ios)) {
      return { kind: "ios", dest: ios, via: "badge_href" };
    }
    if (
      openingStore &&
      /play\.google\.com/.test(play) &&
      /referrer=/.test(play)
    ) {
      return { kind: "android", dest: play, via: "badge_href" };
    }
  } catch {
    /* fall through */
  }

  if (/\/get\//.test(pageUrl)) return { kind: "get_stuck", dest: pageUrl };
  return { kind: "other", dest: pageUrl };
}

function classifyDestination(pageUrl, storeHits) {
  if (storeHits.length) {
    const dest = storeHits[0];
    if (/apps\.apple\.com/.test(dest)) return { kind: "ios", dest };
    if (/play\.google\.com/.test(dest)) return { kind: "android", dest };
    return { kind: "store_other", dest };
  }
  if (/\/go\//.test(pageUrl)) return { kind: "go", dest: pageUrl };
  if (/\/get\//.test(pageUrl)) return { kind: "get_stuck", dest: pageUrl };
  return { kind: "other", dest: pageUrl };
}

async function assertGoDownloadUi(page) {
  await expect(page.locator("#btn-app-store")).toBeVisible();
  await expect(page.locator("#btn-play-store")).toBeVisible();
  await expect(page.locator(".hero-title")).toContainText(
    "Turn Life Into a Game."
  );
  const overflow = await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1
    );
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

async function assertNoRedirectLoop(urlString) {
  const url = new URL(urlString);
  expect(url.pathname.includes("/get")).toBeFalsy();
  const hops = urlString.match(/\/get\//g);
  expect((hops || []).length).toBe(0);
}

module.exports = {
  openGetWithStoreIntercept,
  resolveDestination,
  classifyDestination,
  assertGoDownloadUi,
  assertNoRedirectLoop
};
