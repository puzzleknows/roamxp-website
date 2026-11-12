/**
 * RoamXP smart download landing — OS priority, desktop QR, UTM, Apple ct/pt/mt,
 * PostHog acquisition events. Safe with missing analytics config. No forced store redirect.
 * Store URL building lives in roamxp-store-links.js (shared with /get/).
 */
(function () {
  "use strict";

  var links = window.RoamXPStoreLinks;
  if (!links) {
    return;
  }

  var APP_STORE_RATE = links.APP_STORE_RATE;

  function qs() {
    return links.readQueryParams();
  }

  function cfg() {
    return links.cfg();
  }

  function readAttribution(params) {
    return links.readAttribution(params);
  }

  function detectDeviceOs() {
    return links.detectDeviceOs();
  }

  function playStoreUrl() {
    return links.playStoreBaseUrl();
  }

  function buildPlayStoreUrl(attribution) {
    return links.buildPlayStoreUrl(attribution);
  }

  function buildAppStoreUrl(attribution) {
    return links.buildAppStoreUrl(attribution);
  }

  function analyticsConsentAllowed() {
    return links.analyticsConsentAllowed();
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
    return links.channelLabel(attribution);
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
    links.prioritizeStoreActions(deviceOs, iosBtn, playBtn, actions);

    if (qrPanel) {
      qrPanel.hidden = deviceOs !== "desktop";
    }
  }

  function campaignAwareLandingUrl(attribution) {
    return links.buildGoAbsoluteUrl(attribution);
  }

  function wireDesktopQr(attribution) {
    var panel = document.getElementById("desktop-qr");
    var mount = document.getElementById("desktop-qr-mount");
    var caption = document.getElementById("desktop-qr-caption");
    var urlLink = document.getElementById("desktop-qr-url");
    if (!panel || !mount) return;

    var targetUrl = campaignAwareLandingUrl(attribution);
    if (caption) {
      // Keep visitor-facing copy attribution-free; UTMs remain in the encoded URL.
      caption.textContent = "Scan to open on your phone";
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

  document.addEventListener("DOMContentLoaded", function () {
    var params = qs();
    var attribution = readAttribution(params);
    var deviceOs = detectDeviceOs();
    var ph = posthogReady();

    if (ph) loadPostHog(ph);

    prioritizeButtons(deviceOs);
    wireStores(attribution, deviceOs);
    wireDesktopQr(attribution);

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
