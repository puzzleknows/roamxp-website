/**
 * Intercept PostHog so synthetic QA never contaminates production analytics.
 */

async function blockAndCapturePosthog(page) {
  const events = [];
  await page.route(/posthog\.com|i\.posthog\.com|-assets\.i\.posthog\.com/i, async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      try {
        const raw = req.postData() || "";
        // PostHog may send JSON or batch lines
        const trimmed = raw.trim();
        if (trimmed.startsWith("{")) {
          events.push(JSON.parse(trimmed));
        } else if (trimmed.startsWith("[")) {
          JSON.parse(trimmed).forEach((e) => events.push(e));
        } else {
          events.push({ raw: trimmed.slice(0, 500) });
        }
      } catch {
        events.push({ raw: (req.postData() || "").slice(0, 200) });
      }
    }
    await route.abort();
  });
  return events;
}

function eventNames(events) {
  return events
    .map((e) => e.event || e.name || null)
    .filter(Boolean);
}

function assertNoStoreClickInSmartBeacons(events) {
  const names = eventNames(events);
  return {
    hasSmart: names.includes("roamxp_smart_redirected"),
    hasStoreClick: names.includes("roamxp_store_clicked"),
    names
  };
}

module.exports = {
  blockAndCapturePosthog,
  eventNames,
  assertNoStoreClickInSmartBeacons
};
