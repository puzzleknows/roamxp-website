const { test, expect } = require("@playwright/test");
const { DEVICES } = require("./fixtures/devices");
const {
  campaignQuery,
  expectAttributionOnGoUrl,
  expectPlayReferrer,
  expectAppStoreParams
} = require("./fixtures/campaign");
const {
  openGetWithStoreIntercept,
  resolveDestination,
  assertGoDownloadUi,
  assertNoRedirectLoop
} = require("./helpers/navigation");
const { assertNoStoreClickInSmartBeacons } = require("./helpers/analytics");

const QS = campaignQuery();

test.describe("/get/ routing decisions (navigation, not helper-only)", () => {
  for (const device of DEVICES) {
    test(`${device.label} → ${device.expect}`, async ({ browser }, testInfo) => {
      testInfo.annotations.push({
        type: "coverage",
        description:
          "Simulated UA + navigation intercept. Does not prove native store opening on device."
      });

      const { context, page, storeHits, posthogEvents } =
        await openGetWithStoreIntercept(browser, device, QS);

      const result = await resolveDestination(page, storeHits);

      expect(
        result.kind,
        `${device.id}: expected ${device.expect}, got ${result.kind} (${result.dest})`
      ).toBe(device.expect);

      if (result.kind === "ios") {
        expect(result.dest).toContain("apps.apple.com/us/app/roamxp");
        const apple = expectAppStoreParams(result.dest);
        expect(apple.ok, `Apple params missing: ${apple.missing}`).toBeTruthy();
      }

      if (result.kind === "android") {
        expect(result.dest).toContain("play.google.com/store/apps/details");
        expect(result.dest).toContain("id=com.roamxp.app");
        const play = expectPlayReferrer(result.dest);
        expect(
          play.ok,
          `Play referrer issue missing=${play.missing} unexpected=${play.unexpected}`
        ).toBeTruthy();
      }

      if (result.kind === "go") {
        await assertNoRedirectLoop(result.dest);
        const missing = expectAttributionOnGoUrl(result.dest);
        expect(missing, `attribution lost: ${missing.join(",")}`).toEqual([]);
        await assertGoDownloadUi(page);
      }

      // Analytics: smart redirect attempts must never be store_clicked
      const analytics = assertNoStoreClickInSmartBeacons(posthogEvents);
      expect(
        analytics.hasStoreClick,
        `store_clicked leaked on /get/: ${analytics.names}`
      ).toBeFalsy();

      await context.close();
    });
  }

  test("ordinary Mac is not classified as iPad (desktop → /go/)", async ({
    browser
  }) => {
    const device = {
      id: "mac_zero_touch",
      label: "Mac maxTouchPoints=0",
      expect: "go",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      isMobile: false,
      hasTouch: false,
      viewport: { width: 1280, height: 800 },
      platformOverride: "MacIntel",
      maxTouchPoints: 0
    };
    const { context, page, storeHits } = await openGetWithStoreIntercept(
      browser,
      device,
      QS
    );
    const result = await resolveDestination(page, storeHits);
    expect(result.kind).toBe("go");
    expect(storeHits.length).toBe(0);
    await context.close();
  });
});
