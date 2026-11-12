/**
 * RoamXP smart download landing — OS priority, desktop QR, UTM, Apple ct/pt/mt,
 * PostHog acquisition events. Safe with missing analytics config. No forced store redirect.
 */
(function () {
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

  function qs() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function cfg() {
    return window.PUZDEV_ANALYTICS || {};
  }

  function readAttribution(params) {
    var data = {};
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) data[key] = value;
    });
    var linkId = params.get("link_id");
    if (linkId) data.link_id = linkId;
    ["pt", "ct", "mt"].forEach(function (key) {
      var value = params.get(key);
      if (value) data[key] = value;
    });
    return data;
  }

  function detectDeviceOs() {
    var ua = navigator.userAgent || navigator.vendor || "";
    if (/android/i.test(ua)) return "android";
    if (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) {
      return "ios";
    }
    return "desktop";
  }

  function playStoreUrl() {
    return String(cfg().playStoreUrl || "").trim();
  }

  /**
   * Google Play install attribution uses the encoded `referrer` query param
   * (Install Referrer API). Top-level utm_* on play.google.com do NOT by
   * themselves reach the app. This builds a correct referrer string; install
   * attribution is still NOT claimed until the app reads Install Referrer and
   * Play Console / MMP verification confirms it.
   */
  function buildPlayStoreUrl(attribution) {
    var base = playStoreUrl();
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

  function analyticsConsentAllowed() {
    // Honor Global Privacy Control / DNT as an analytics opt-out signal.
    try {
      if (navigator.globalPrivacyControl === true) return false;
      var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
      if (dnt === "1" || dnt === "yes") return false;
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function posthogReady() {
    if (!analyticsConsentAllowed()) return false;
    var token = String(cfg().posthogProjectToken || "").trim();
    var host = String(cfg().posthogHost || "").trim();
    if (!token || !/^phc_[A-Za-z0-9]+/.test(token)) return false;
    if (!/^https:\/\//i.test(host)) return false;
    return { token: token, host: host };
  }

  function loadPostHog(ph) {
    if (window.__puzdevPosthogLoading) return;
    window.__puzdevPosthogLoading = true;
    !(function (t, e) {
      var o, n, p, r;
      e.__SV ||
        ((window.posthog = e),
        (e._i = []),
        (e.init = function (i, s, a) {
          function g(t, e) {
            var o = e.split(".");
            2 == o.length && ((t = t[o[0]]), (e = o[1]));
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          }
          ((p = t.createElement("script")).type = "text/javascript"),
            (p.crossOrigin = "anonymous"),
            (p.async = true),
            (p.src =
              s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") +
              "/static/array.js"),
            (r = t.getElementsByTagName("script")[0]),
            r.parentNode.insertBefore(p, r);
          var u = e;
          void 0 !== a ? (u = e[a] = []) : (a = "posthog");
          u.people = u.people || [];
          u.toString = function (t) {
            var e = "posthog";
            return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
          };
          u.people.toString = function () {
            return u.toString(1) + ".people (stub)";
          };
          o =
            "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_session_id createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(
              " "
            );
          for (n = 0; n < o.length; n++) g(u, o[n]);
          e._i.push([i, s, a]);
        }),
        (e.__SV = 1));
    })(document, window.posthog || []);

    window.posthog.init(ph.token, {
      api_host: ph.host,
      person_profiles: "identified_only",
      persistence: "localStorage+cookie",
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      loaded: function () {
        window.__puzdevPosthogLoaded = true;
      }
    });
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

  function baseProps(attribution, deviceOs) {
    return {
      product: "roamxp",
      analytics_surface: "web_acquisition",
      platform: "web",
      posthog_project_id: String(cfg().posthogProjectId || "656002"),
      landing_page: "/go/",
      device_os: deviceOs,
      acquisition_channel: channelLabel(attribution),
      referrer: document.referrer || "(direct)",
      utm_source: attribution.utm_source || "(none)",
      utm_medium: attribution.utm_medium || "(none)",
      utm_campaign: attribution.utm_campaign || "(none)",
      utm_content: attribution.utm_content || "(none)",
      utm_term: attribution.utm_term || "(none)",
      link_id: attribution.link_id || "(none)",
      apple_ct: attribution.ct || attribution.utm_campaign || attribution.link_id || "(none)"
    };
  }

  function track(eventName, props) {
    try {
      if (!analyticsConsentAllowed()) return;
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(eventName, props);
      }
    } catch (e) {
      /* never break UX */
    }
  }

  function trackStoreOnce(key, eventName, props) {
    window.__puzdevStoreClickKeys = window.__puzdevStoreClickKeys || {};
    if (window.__puzdevStoreClickKeys[key]) return;
    window.__puzdevStoreClickKeys[key] = true;
    track(eventName, props);
    window.setTimeout(function () {
      window.__puzdevStoreClickKeys[key] = false;
    }, 800);
  }

  function prioritizeButtons(deviceOs) {
    var iosBtn = document.getElementById("btn-app-store");
    var playBtn = document.getElementById("btn-play-store");
    var actions = document.getElementById("store-actions");
    var qrPanel = document.getElementById("desktop-qr");
    if (!iosBtn || !playBtn || !actions) return;

    iosBtn.classList.remove("store-btn--primary", "store-btn--secondary");
    playBtn.classList.remove("store-btn--primary", "store-btn--secondary");

    if (deviceOs === "android") {
      playBtn.classList.add("store-btn--primary");
      iosBtn.classList.add("store-btn--secondary");
      actions.insertBefore(playBtn, iosBtn);
    } else if (deviceOs === "ios") {
      iosBtn.classList.add("store-btn--primary");
      playBtn.classList.add("store-btn--secondary");
      actions.insertBefore(iosBtn, playBtn);
    } else {
      iosBtn.classList.add("store-btn--primary");
      playBtn.classList.add("store-btn--primary");
      actions.insertBefore(iosBtn, playBtn);
    }

    if (qrPanel) {
      qrPanel.hidden = deviceOs !== "desktop";
    }

    var hint = document.getElementById("platform-hint");
    if (!hint) return;
    if (deviceOs === "ios") {
      hint.textContent =
        "Suggested for your device: App Store. Google Play stays available.";
    } else if (deviceOs === "android") {
      hint.textContent =
        "Suggested for your device: Google Play. App Store stays available.";
    } else {
      hint.textContent =
        "Download on iOS or Android, or scan the QR code with your phone.";
    }
  }

  function campaignAwareLandingUrl(attribution) {
    var url = new URL(CANONICAL_ORIGIN + "/go/");
    UTM_KEYS.forEach(function (key) {
      if (attribution[key]) url.searchParams.set(key, attribution[key]);
    });
    if (attribution.link_id) url.searchParams.set("link_id", attribution.link_id);
    ["pt", "ct", "mt"].forEach(function (key) {
      if (attribution[key]) url.searchParams.set(key, attribution[key]);
    });
    return url.toString();
  }

  function wireDesktopQr(attribution) {
    var panel = document.getElementById("desktop-qr");
    var mount = document.getElementById("desktop-qr-mount");
    var caption = document.getElementById("desktop-qr-caption");
    var urlLink = document.getElementById("desktop-qr-url");
    if (!panel || !mount) return;

    var targetUrl = campaignAwareLandingUrl(attribution);
    if (caption) {
      caption.textContent = attribution.utm_campaign
        ? "Scan to open this campaign on your phone"
        : "Scan to open this download page on your phone";
    }
    if (urlLink) {
      urlLink.href = targetUrl;
      urlLink.textContent = targetUrl.replace(/^https:\/\//, "");
    }

    mount.innerHTML = "";
    if (typeof window.QRCode === "function") {
      try {
        // Campaign-aware: encodes the current /go/ URL including UTMs / link_id.
        new window.QRCode(mount, {
          text: targetUrl,
          width: 132,
          height: 132,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
        return;
      } catch (e) {
        /* fall through to static asset */
      }
    }

    var img = document.createElement("img");
    img.width = 132;
    img.height = 132;
    img.alt = "QR code for RoamXP download";
    img.src = "../assets/qr/roamxp/general.png";
    mount.appendChild(img);
  }

  function wireStores(attribution, deviceOs) {
    var iosBtn = document.getElementById("btn-app-store");
    var playBtn = document.getElementById("btn-play-store");
    var rateLink = document.getElementById("rate-roamxp");
    var propsBase = baseProps(attribution, deviceOs);
    var playUrl = playStoreUrl();

    if (iosBtn) {
      iosBtn.href = buildAppStoreUrl(attribution);
      iosBtn.addEventListener("click", function () {
        trackStoreOnce(
          "ios",
          "roamxp_store_clicked",
          Object.assign({}, propsBase, {
            destination_store: "ios",
            store_status: "available",
            funnel_step: "store_click"
          })
        );
      });
    }

    if (rateLink) {
      rateLink.href = APP_STORE_RATE;
      rateLink.addEventListener("click", function () {
        trackStoreOnce(
          "rate",
          "roamxp_store_clicked",
          Object.assign({}, propsBase, {
            destination_store: "ios",
            store_status: "rate",
            funnel_step: "rate_click"
          })
        );
      });
    }

    if (playBtn) {
      if (playUrl) {
        playBtn.href = buildPlayStoreUrl(attribution);
        playBtn.removeAttribute("aria-disabled");
        playBtn.classList.remove("store-btn--soon");
        var label = playBtn.querySelector(".store-btn__label");
        if (label) label.textContent = "Google Play";
        var eye = playBtn.querySelector(".store-btn__eyebrow");
        if (eye) eye.textContent = "Get it on";
        playBtn.addEventListener("click", function () {
          trackStoreOnce(
            "android",
            "roamxp_store_clicked",
            Object.assign({}, propsBase, {
              destination_store: "android",
              store_status: "available",
              funnel_step: "store_click"
            })
          );
        });
      } else {
        playBtn.href = "#play-coming-soon";
        playBtn.setAttribute("aria-disabled", "true");
        playBtn.classList.add("store-btn--soon");
        playBtn.addEventListener("click", function (event) {
          event.preventDefault();
          trackStoreOnce(
            "android_soon",
            "roamxp_store_clicked",
            Object.assign({}, propsBase, {
              destination_store: "android",
              store_status: "coming_soon",
              funnel_step: "store_click"
            })
          );
        });
      }
    }
  }

  function showCampaignChip(attribution) {
    var chip = document.getElementById("campaign-chip");
    if (!chip) return;
    var source = attribution.utm_source || attribution.link_id;
    if (!source || source === "(none)") return;
    chip.hidden = false;
    chip.textContent = "Via " + String(source).replace(/[_-]+/g, " ");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var params = qs();
    var attribution = readAttribution(params);
    var deviceOs = detectDeviceOs();
    var ph = posthogReady();

    if (ph) loadPostHog(ph);

    prioritizeButtons(deviceOs);
    wireStores(attribution, deviceOs);
    wireDesktopQr(attribution);
    showCampaignChip(attribution);

    // One landing view per page script execution (blocks duplicate script includes).
    // A full reload intentionally sends a new view for Live Events / analytics.
    if (!window.__puzdevRoamxpViewSent) {
      window.__puzdevRoamxpViewSent = true;
      track(
        "roamxp_landing_viewed",
        Object.assign({}, baseProps(attribution, deviceOs), {
          funnel_step: "landing_view"
        })
      );
    }
  });
})();
