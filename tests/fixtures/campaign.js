/** Canonical synthetic campaign used across Smart Link QA. */
const CAMPAIGN = {
  utm_source: "qa_source",
  utm_medium: "qa_medium",
  utm_campaign: "qa_campaign",
  utm_content: "qa_content",
  utm_term: "qa_term",
  link_id: "qa_get_link",
  // Apple campaign fields (applied to App Store URL only when pt is present)
  pt: "123456",
  ct: "qa_apple_ct",
  mt: "8"
};

function campaignQuery(extra = {}) {
  const params = new URLSearchParams({ ...CAMPAIGN, ...extra });
  return `?${params.toString()}`;
}

function expectAttributionOnGoUrl(urlString) {
  const url = new URL(urlString, "http://127.0.0.1");
  const missing = [];
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "link_id",
    "pt",
    "ct",
    "mt"
  ]) {
    if (url.searchParams.get(key) !== CAMPAIGN[key]) missing.push(key);
  }
  return missing;
}

function expectPlayReferrer(playUrl) {
  const url = new URL(playUrl);
  const raw = url.searchParams.get("referrer");
  if (!raw) return { ok: false, reason: "missing referrer" };
  const ref = new URLSearchParams(raw);
  const missing = [];
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "link_id"
  ]) {
    if (ref.get(key) !== CAMPAIGN[key]) missing.push(key);
  }
  // Apple pt/ct/mt should NOT be duplicated into Play referrer by current builders
  const unexpected = [];
  for (const key of ["pt", "ct", "mt"]) {
    if (ref.has(key)) unexpected.push(key);
  }
  return {
    ok: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
    referrer: raw
  };
}

function expectAppStoreParams(appUrl) {
  const url = new URL(appUrl);
  const missing = [];
  if (url.searchParams.get("pt") !== CAMPAIGN.pt) missing.push("pt");
  if (url.searchParams.get("ct") !== CAMPAIGN.ct) missing.push("ct");
  if (url.searchParams.get("mt") !== CAMPAIGN.mt) missing.push("mt");
  return { ok: missing.length === 0, missing, href: appUrl };
}

module.exports = {
  CAMPAIGN,
  campaignQuery,
  expectAttributionOnGoUrl,
  expectPlayReferrer,
  expectAppStoreParams
};
