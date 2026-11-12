/**
 * /get/ — production smart download router.
 *
 * Reliability over aggressive redirects:
 * - Clean mobile Safari/Chrome/Samsung → HTTPS store via location.replace
 * - Instagram/TikTok/YouTube/Facebook/WebView → /go/ (badge UI, no forced store hop)
 * - Desktop / unknown → /go/
 *
 * Uses RoamXPStoreLinks (shared with /go/). Analytics are best-effort and never block.
 * Emits roamxp_smart_redirected (attempted routing decision) — never roamxp_store_clicked.
 */
(function () {
  "use strict";

  var links = window.RoamXPStoreLinks;
  if (!links) {
    window.location.replace(
      "/go/" + (window.location.search || "") + (window.location.hash || "")
    );
    return;
  }

  var attribution = links.readAttribution(links.readQueryParams());
  var deviceOs = links.detectDeviceOs();
  var inApp = links.detectInAppBrowser();
  var goPath = links.buildGoUrl(attribution, window.location.origin);

  // Never redirect /get/ → /get/
  if (/\/get\/?/i.test(String(goPath).split("?")[0])) {
    goPath =
      "/go/" +
      (goPath.indexOf("?") >= 0 ? goPath.slice(goPath.indexOf("?")) : "");
  }

  var iosUrl = links.buildAppStoreUrl(attribution);
  var playUrl = links.buildPlayStoreUrl(attribution);
  var canAuto = links.canAutoRedirectToStore(deviceOs, inApp);

  var redirectMode = "fallback_go";
  var destinationStore = "go";
  var destinationUrl = goPath;

  if (canAuto && deviceOs === "ios") {
    redirectMode = "auto_store";
    destinationStore = "ios";
    destinationUrl = iosUrl;
  } else if (canAuto && deviceOs === "android" && playUrl) {
    redirectMode = "auto_store";
    destinationStore = "android";
    destinationUrl = playUrl;
  } else if (inApp && (deviceOs === "ios" || deviceOs === "android")) {
    // Known-interfering containers: send to premium /go/ with both badges.
    redirectMode = "in_app_fallback";
    destinationStore = "go";
    destinationUrl = goPath;
  } else {
    redirectMode = "fallback_go";
    destinationStore = "go";
    destinationUrl = goPath;
  }

  function wireBadgeFallback() {
    var iosBtn = document.getElementById("btn-app-store");
    var playBtn = document.getElementById("btn-play-store");
    var actions = document.getElementById("store-actions");
    var status = document.getElementById("get-status");
    var shell = document.getElementById("get-fallback");

    if (iosBtn) {
      iosBtn.href = iosUrl;
      iosBtn.target = "_blank";
      iosBtn.rel = "noopener noreferrer";
    }
    if (playBtn) {
      if (playUrl) {
        playBtn.href = playUrl;
        playBtn.removeAttribute("aria-disabled");
      } else {
        playBtn.href = goPath;
      }
      playBtn.target = "_blank";
      playBtn.rel = "noopener noreferrer";
    }
    if (links.prioritizeStoreActions) {
      links.prioritizeStoreActions(deviceOs, iosBtn, playBtn, actions);
    }
    if (shell) shell.hidden = false;
    if (status) {
      if (redirectMode === "auto_store") {
        status.textContent = "Opening the store…";
      } else if (redirectMode === "in_app_fallback") {
        status.textContent = "Opening download options…";
      } else {
        status.textContent = "Opening download options…";
      }
    }
  }

  function attributionProps() {
    return {
      product: "roamxp",
      analytics_surface: "web_acquisition",
      platform: "web",
      posthog_project_id: String(links.cfg().posthogProjectId || "656002"),
      landing_page: "/get/",
      device_os: deviceOs,
      destination_store: destinationStore,
      redirect_mode: redirectMode,
      acquisition_channel: links.channelLabel(attribution),
      in_app_browser: inApp || "(none)",
      referrer: document.referrer || "(direct)",
      utm_source: attribution.utm_source || "(none)",
      utm_medium: attribution.utm_medium || "(none)",
      utm_campaign: attribution.utm_campaign || "(none)",
      utm_content: attribution.utm_content || "(none)",
      utm_term: attribution.utm_term || "(none)",
      link_id: attribution.link_id || "(none)",
      apple_ct:
        attribution.ct ||
        attribution.utm_campaign ||
        attribution.link_id ||
        "(none)",
      funnel_step: "smart_redirect"
    };
  }

  function qaDistinctId() {
    try {
      var key = "roamxp_web_distinct_id";
      var existing = window.localStorage && window.localStorage.getItem(key);
      if (existing) return existing;
      var id =
        "web_" +
        Math.random().toString(36).slice(2) +
        Date.now().toString(36);
      if (window.localStorage) window.localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return "web_anon_" + String(Date.now());
    }
  }

  /** Best-effort only. Never awaited. Honors DNT/GPC. */
  function trackSmartRedirect() {
    try {
      if (!links.analyticsConsentAllowed()) return;
      var token = String(links.cfg().posthogProjectToken || "").trim();
      var host = String(links.cfg().posthogHost || "").trim();
      if (!token || !/^phc_[A-Za-z0-9]+/.test(token)) return;
      if (!/^https:\/\//i.test(host)) return;

      var body = JSON.stringify({
        api_key: token,
        distinct_id: qaDistinctId(),
        event: "roamxp_smart_redirected",
        properties: attributionProps(),
        timestamp: new Date().toISOString()
      });
      var endpoint = host.replace(/\/$/, "") + "/i/v0/e/";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: "application/json" })
        );
        return;
      }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        mode: "cors",
        credentials: "omit"
      }).catch(function () {});
    } catch (e) {
      /* never block */
    }
  }

  function redirectNow() {
    try {
      window.location.replace(destinationUrl);
    } catch (e) {
      try {
        window.location.href = destinationUrl;
      } catch (e2) {
        /* stay on badge fallback */
      }
    }
  }

  wireBadgeFallback();
  trackSmartRedirect();
  redirectNow();
})();
