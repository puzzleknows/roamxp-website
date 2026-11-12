/**
 * RoamXP website — public web analytics / acquisition config.
 *
 * Uses the SAME PostHog project as the RoamXP mobile app
 * (Project: RoamXP / ID 656002 / host https://us.i.posthog.com).
 *
 * Source of token for local setup: RoamXP-DEV/.env → EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN
 * (also used via EAS secrets for the app). This is a PostHog *project* API key
 * intended for client SDKs — not a personal private API secret.
 *
 * Apple App Store campaign links (optional):
 *   appleCampaignProviderToken → "pt" from App Store Connect Campaign Links
 *   When empty, App Store button works without pt/ct/mt.
 * Google Play:
 *   playStoreUrl → production listing URL
 *   Landing JS encodes UTMs into Play `referrer=` (Install Referrer). That does
 *   not by itself prove install attribution until the app reads it.
 */
window.PUZDEV_ANALYTICS = {
  posthogProjectToken: "phc_nFpVJyQXKJs477cuZrtKwcpKpqF8jCibJ2t5hmR9wvTk",
  posthogHost: "https://us.i.posthog.com",
  posthogProjectId: "656002",
  appleCampaignProviderToken: "",
  appleCampaignMediaType: "8",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.roamxp.app",
  gaMeasurementId: ""
};
