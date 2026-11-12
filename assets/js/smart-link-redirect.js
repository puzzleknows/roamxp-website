/**
 * Shared short-link redirect for GitHub Pages directory routes.
 * Merges default UTM / link_id values without overwriting explicit query params.
 *
 * Usage (inline before this file):
 *   window.PUZDEV_SMART_LINK = {
 *     targetPath: "/get/",
 *     defaults: { utm_source: "instagram", utm_medium: "social", utm_campaign: "roamxp_download", link_id: "ig" }
 *   };
 * Channel routes (/ig|/yt|/tt|/qr) target /get/ (smart store router).
 * /go/ remains the premium manual fallback download page.
 */
(function () {
  "use strict";
  var cfg = window.PUZDEV_SMART_LINK || {};
  var targetPath = cfg.targetPath || "/get/";
  var defaults = cfg.defaults || {};

  function merge() {
    var params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (e) {
      params = new URLSearchParams();
    }
    Object.keys(defaults).forEach(function (key) {
      if (!params.has(key) && defaults[key] != null && defaults[key] !== "") {
        params.set(key, String(defaults[key]));
      }
    });
    var qs = params.toString();
    var hash = window.location.hash || "";
    return targetPath + (qs ? "?" + qs : "") + hash;
  }

  var next = merge();
  window.location.replace(next);
})();
