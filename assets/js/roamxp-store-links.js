/**
 * Shared RoamXP store URL + device helpers for /go/ and /get/.
 * Single source for App Store / Play URL building (UTMs, Apple pt/ct/mt, Play referrer).
 */
(function (global) {
  "use strict";

  var APP_STORE_BASE =
    "https://apps.apple.com/us/app/roamxp-habit-tracker-focus/id6821217688";
  var APP_STORE_RATE =
    "https://apps.apple.com/us/app/roamxp-habit-tracker-focus/id6821217688?action=write-review";
  var UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term"
  ];
  var CANONICAL_ORIGIN = "https://roamxp.puzdev.com";

  function cfg() {
    return global.PUZDEV_ANALYTICS || {};
  }

  function readQueryParams() {
    try {
      return new URLSearchParams(global.location.search || "");
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function readAttribution(params) {
    var source = params || readQueryParams();
    var data = {};
    UTM_KEYS.forEach(function (key) {
      var value = source.get(key);
      if (value) data[key] = value;
    });
    var linkId = source.get("link_id");
    if (linkId) data.link_id = linkId;
    ["pt", "ct", "mt"].forEach(function (key) {
      var value = source.get(key);
      if (value) data[key] = value;
    });
    return data;
  }

  /**
   * iPhone/iPad/iPod → ios
   * Android → android
   * Windows / macOS / Linux desktop → desktop
   * Unknown / ambiguous → desktop (safe → /go/)
   * iPadOS desktop-class Safari: MacIntel + maxTouchPoints > 1 → ios
   * Ordinary Mac (MacIntel, maxTouchPoints 0) stays desktop — never treat as iPad.
   */
  function detectDeviceOs(userAgent, nav) {
    var ua = userAgent || (nav && nav.userAgent) || global.navigator.userAgent || "";
    var n = nav || global.navigator;
    if (/android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (n.platform === "MacIntel" && Number(n.maxTouchPoints || 0) > 1) {
      return "ios";
    }
    return "desktop";
  }

  /**
   * Social / embedded WebViews that often block or mishandle store redirects.
   * Regular Safari, Chrome, Samsung Internet are NOT treated as in-app.
   */
  function detectInAppBrowser(userAgent) {
    var ua = userAgent || global.navigator.userAgent || "";
    if (/Instagram/i.test(ua)) return "instagram";
    if (/\bFBAN\b|\bFBAV\b|FB_IAB|FBOS|FBIOS/i.test(ua)) return "facebook";
    if (/TikTok|musical_ly|BytedanceWebview|ByteLocale/i.test(ua)) return "tiktok";
    if (/YouTube\b|YTApp\b/i.test(ua)) return "youtube";
    // Android WebView marker used by many social containers
    if (/; wv\)/i.test(ua)) return "webview";
    return "";
  }

  /**
   * Only auto-open HTTPS store URLs in ordinary mobile browsers.
   * In-app / desktop / unknown → caller should use /go/ (or badge fallback).
   */
  function canAutoRedirectToStore(deviceOs, inAppBrowser) {
    if (deviceOs !== "ios" && deviceOs !== "android") return false;
    if (inAppBrowser) return false;
    return true;
  }

  function playStoreBaseUrl() {
    return String(cfg().playStoreUrl || "").trim();
  }

  /**
   * Google Play Install Referrer via encoded `referrer=` query param.
   */
  function buildPlayStoreUrl(attribution) {
    var base = playStoreBaseUrl();
    if (!base) return "";
    try {
      var url = new URL(base);
      var referrer = new URLSearchParams();
      UTM_KEYS.forEach(function (key) {
        if (attribution[key]) referrer.set(key, attribution[key]);
      });
      if (attribution.link_id) referrer.set("link_id", attribution.link_id);
      var referrerStr = referrer.toString();
      if (referrerStr) {
        if (referrerStr.length > 512) {
          referrerStr = referrerStr.slice(0, 512);
        }
        url.searchParams.set("referrer", referrerStr);
      }
      return url.toString();
    } catch (e) {
      return base;
    }
  }

  function buildAppStoreUrl(attribution) {
    var url = new URL(APP_STORE_BASE);
    var pt =
      attribution.pt ||
      String(cfg().appleCampaignProviderToken || "").trim();
    var mt =
      attribution.mt ||
      String(cfg().appleCampaignMediaType || "8").trim() ||
      "8";
    var ct =
      attribution.ct ||
      attribution.utm_campaign ||
      attribution.link_id ||
      "roamxp";

    if (pt) {
      url.searchParams.set("pt", pt);
      url.searchParams.set("ct", String(ct).slice(0, 100));
      url.searchParams.set("mt", mt);
    }
    return url.toString();
  }

  function buildGoUrl(attribution, origin) {
    var baseOrigin = origin || global.location.origin || CANONICAL_ORIGIN;
    var url;
    try {
      url = new URL(
        "/go/",
        String(baseOrigin).replace(/\/?$/, "/") 
      );
    } catch (e) {
      url = new URL(CANONICAL_ORIGIN + "/go/");
    }
    if (!/^https?:/i.test(url.href)) {
      url = new URL(CANONICAL_ORIGIN + "/go/");
    }
    UTM_KEYS.forEach(function (key) {
      if (attribution[key]) url.searchParams.set(key, attribution[key]);
    });
    if (attribution.link_id) url.searchParams.set("link_id", attribution.link_id);
    ["pt", "ct", "mt"].forEach(function (key) {
      if (attribution[key]) url.searchParams.set(key, attribution[key]);
    });
    return url.pathname + url.search + (global.location.hash || "");
  }

  function buildGoAbsoluteUrl(attribution) {
    var path = buildGoUrl(attribution, CANONICAL_ORIGIN);
    if (path.indexOf("http") === 0) return path;
    return CANONICAL_ORIGIN + path;
  }

  function channelLabel(attribution) {
    var link = attribution.link_id || "";
    var source = (attribution.utm_source || "").toLowerCase();
    var medium = (attribution.utm_medium || "").toLowerCase();
    if (link === "ig" || source === "instagram") return "instagram";
    if (link === "yt" || source === "youtube") return "youtube";
    if (link === "tt" || source === "tiktok") return "tiktok";
    if (link.indexOf("qr") === 0 || source === "qr" || medium === "offline" || medium === "qr") {
      return "qr";
    }
    if (attribution.utm_campaign) return "campaign";
    return "direct";
  }

  function analyticsConsentAllowed() {
    try {
      if (global.navigator.globalPrivacyControl === true) return false;
      var dnt =
        global.navigator.doNotTrack ||
        global.doNotTrack ||
        global.navigator.msDoNotTrack;
      if (dnt === "1" || dnt === "yes") return false;
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function prioritizeStoreActions(deviceOs, iosBtn, playBtn, actions) {
    if (!iosBtn || !playBtn || !actions) return;
    iosBtn.classList.remove("store-badge--primary");
    playBtn.classList.remove("store-badge--primary");
    if (deviceOs === "android") {
      playBtn.classList.add("store-badge--primary");
      actions.insertBefore(playBtn, iosBtn);
    } else if (deviceOs === "ios") {
      iosBtn.classList.add("store-badge--primary");
      actions.insertBefore(iosBtn, playBtn);
    } else {
      actions.insertBefore(iosBtn, playBtn);
    }
  }

  global.RoamXPStoreLinks = {
    APP_STORE_BASE: APP_STORE_BASE,
    APP_STORE_RATE: APP_STORE_RATE,
    UTM_KEYS: UTM_KEYS,
    CANONICAL_ORIGIN: CANONICAL_ORIGIN,
    cfg: cfg,
    readQueryParams: readQueryParams,
    readAttribution: readAttribution,
    detectDeviceOs: detectDeviceOs,
    detectInAppBrowser: detectInAppBrowser,
    canAutoRedirectToStore: canAutoRedirectToStore,
    playStoreBaseUrl: playStoreBaseUrl,
    buildPlayStoreUrl: buildPlayStoreUrl,
    buildAppStoreUrl: buildAppStoreUrl,
    buildGoUrl: buildGoUrl,
    buildGoAbsoluteUrl: buildGoAbsoluteUrl,
    channelLabel: channelLabel,
    analyticsConsentAllowed: analyticsConsentAllowed,
    prioritizeStoreActions: prioritizeStoreActions
  };
})(typeof window !== "undefined" ? window : this);
