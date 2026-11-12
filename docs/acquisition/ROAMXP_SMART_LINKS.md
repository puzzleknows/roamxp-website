# RoamXP Smart Links, QR & Acquisition Analytics

**Canonical public download destination:** [`https://roamxp.puzdev.com/go/`](https://roamxp.puzdev.com/go/)

Hosted from the **`roamxp-website`** repository (`CNAME: roamxp.puzdev.com`, GitHub Pages).  
This is the official RoamXP site — **not** `puzdev.com` (corporate site).

## Production status

| Item | Status |
|------|--------|
| Smart Links `/go/` `/ig/` `/yt/` `/tt/` `/qr/` | **Live** |
| Premium minimalist `/go/` redesign | **Live** (approved) |
| App Store + Google Play official badges | **Live** |
| PostHog project **656002** (`us.i.posthog.com`) | **Live** |
| Campaign QR print assets | **Live** |

## Routes

| Route | Purpose |
|-------|---------|
| `/go/` | Canonical smart download landing |
| `/ig/` | Instagram → `/go/` + default UTMs |
| `/yt/` | YouTube → `/go/` + default UTMs |
| `/tt/` | TikTok → `/go/` + default UTMs |
| `/qr/` | QR / offline → `/go/` + default UTMs |

Short links merge defaults without overwriting explicit query params.

### Examples

```
https://roamxp.puzdev.com/go/
https://roamxp.puzdev.com/ig/
https://roamxp.puzdev.com/yt/
https://roamxp.puzdev.com/tt/
https://roamxp.puzdev.com/qr/
https://roamxp.puzdev.com/go/?utm_source=instagram&utm_medium=qr&utm_campaign=gta_reel_01
```

## `/go/` landing (current design)

Premium, light, Apple-like **download destination** (not a marketing site):

- Official app icon + **RoamXP** name
- Headline: **Turn Life Into a Game.**
- Supporting line: Complete real-life quests, level up your character, and unlock rewards.
- Official App Store + Google Play badges (self-hosted under `assets/badges/`)
- iOS / Android: prioritize matching store; never hide the other
- Desktop only: campaign-aware QR (“Scan to open on your phone”)
- Quiet Premium subscription note; footer **Privacy | Terms | Support**
- **No** visitor-facing UTM / source chips (attribution stays in PostHog + outbound URLs)

Key files: `go/index.html`, `go/styles.css`, `assets/js/roamxp-landing.js`, `assets/config/site-analytics.js`.

### Store attribution (Phase 1 vs Phase 2)

**Phase 1 (shipped):**

- Web click tracking via PostHog (`roamxp_landing_viewed`, `roamxp_store_clicked`)
- Google Play outbound URLs use encoded `referrer=` (UTMs + `link_id`) for Install Referrer
- App Store button works; Apple Campaign `pt`/`ct`/`mt` only when configured

**Phase 2 (not blockers):**

1. Set `appleCampaignProviderToken` (`pt`) in `site-analytics.js` from App Store Connect Campaign Links.
2. Read Play Install Referrer in the Android app and verify before claiming install attribution.

## PostHog

- **Project:** RoamXP · ID **656002** · host **https://us.i.posthog.com**
- **Web:** `assets/config/site-analytics.js` → project token (`phc_…`), not a personal key
- Tags: `analytics_surface: web_acquisition`, `platform: web`
- Consent: skipped when GPC or DNT is enabled
- Deduping: one landing view per script execution; store clicks debounced ~800ms
- Production landing **never** sets `verification_run`

Events: `roamxp_landing_viewed`, `roamxp_store_clicked`  
Channels: `instagram` | `youtube` | `tiktok` | `qr` | `campaign` | `direct`

### Exclude QA from dashboards

Filter **out** `verification_run` is set, or `$lib = roamxp-website-qa`, or `distinct_id` prefix `web_qa_`.

## QR print assets

```bash
brew install qrencode
python3 -m venv .venv && .venv/bin/pip install pillow zxing-cpp
.venv/bin/python scripts/generate-roamxp-qr.py
```

| Asset | Decoded URL |
|-------|-------------|
| `general.png` | `/go/?…&link_id=qr_general` |
| `instagram.png` | `/ig/` |
| `youtube.png` | `/yt/` |
| `tiktok.png` | `/tt/` |
| `qr_entry.png` | `/qr/` |
| `campaign-gta_reel_01.png` | `/go/?utm_source=instagram&utm_medium=qr&utm_campaign=gta_reel_01&link_id=qr_gta_reel_01` |

## Local preview

```bash
cd roamxp-website
python3 -m http.server 8090
# http://127.0.0.1:8090/go/
```

## Deploy

Push `main` on `puzzleknows/roamxp-website` → GitHub Pages → `https://roamxp.puzdev.com`.
