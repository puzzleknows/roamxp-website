# RoamXP Smart Links, QR & Acquisition Analytics

**Canonical public download destination:** [`https://roamxp.puzdev.com/go/`](https://roamxp.puzdev.com/go/)

Hosted from the **`roamxp-website`** repository (`CNAME: roamxp.puzdev.com`, GitHub Pages).  
This is the official RoamXP site — **not** `puzdev.com` (corporate site).

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

## Landing behavior

- iOS / Android: prioritize the matching store; never hide the other
- Desktop: both stores + **campaign-aware QR** (encodes the current `/go/` URL including UTMs/`link_id`)
- App Store live; Google Play live (`com.roamxp.app`) via `playStoreUrl`
- Rate / Privacy / Terms / Support use this site’s pages + App Store write-review

### Store attribution (Phase 1 vs Phase 2)

**Phase 1 (this release — ship without blocking):**

- Web click tracking via PostHog (`roamxp_landing_viewed`, `roamxp_store_clicked`)
- Google Play outbound URLs use an encoded `referrer=` param (UTMs + `link_id`) suitable for Install Referrer
- App Store button works without Apple Campaign Links

**Phase 2 (documented, not required for this release):**

1. **Apple Campaign Provider Token** — set `appleCampaignProviderToken` (`pt`) in `assets/config/site-analytics.js` from App Store Connect Campaign Links so `pt` / `ct` / `mt` attach to App Store URLs.
2. **Android Install Referrer** — read Play Install Referrer in the RoamXP Android app and verify end-to-end in Play Console / analytics before claiming install attribution.

Do **not** claim store installs are attributable from web UTMs alone until Phase 2 is verified.

## PostHog

- **Project:** RoamXP · ID **656002** · host **https://us.i.posthog.com** (same project as the mobile app).
- **App:** `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` + `EXPO_PUBLIC_POSTHOG_HOST` in RoamXP-DEV `.env` / EAS secrets.
- **Web landing:** `assets/config/site-analytics.js` → `posthogProjectToken` / `posthogHost` / `posthogProjectId`.
  - This is a PostHog **project** API key for client SDKs, not a personal private API secret.
- Web events tagged `analytics_surface: web_acquisition`, `platform: web` to stay distinct from app events.
- Consent: analytics is skipped when Global Privacy Control or Do Not Track is enabled.
- Deduping: one `roamxp_landing_viewed` per page script execution; store clicks debounced ~800ms.
- **Production landing never sets `verification_run`.** That property exists only on intentional pre-deploy QA captures.

Events: `roamxp_landing_viewed`, `roamxp_store_clicked`  
Channel helper: `acquisition_channel` (`instagram` | `youtube` | `tiktok` | `qr` | `campaign` | `direct`)

### Production dashboards (exclude QA)

Pre-deploy verification used properties such as:

- `verification_run` (e.g. `predeploy_20261111T232005Z`)
- `$lib = roamxp-website-qa`
- `distinct_id` prefix `web_qa_`

For conversion / funnel insights, filter **out** events where `verification_run` is set (or `$lib = roamxp-website-qa`). Production `/go/` traffic will not include `verification_run`.

### Live Events check (manual)

Open `/go/?utm_source=instagram&link_id=ig` and confirm `roamxp_landing_viewed` / store clicks in PostHog Live events. Do not leave QA `verification_run` filters on production dashboards.

## Funnel (honest)

```
Landing View → Store Click → App Install → Onboarding → Trial → Paid
```

Only Landing View + Store Click are implemented on this website.  
Install / onboarding / trial / paid live in App Store Connect, Play Console, and/or the **app** PostHog project — **not** automatically joined to web clicks (Phase 2).

## QR print assets

```bash
brew install qrencode
python3 -m venv .venv && .venv/bin/pip install pillow zxing-cpp
.venv/bin/python scripts/generate-roamxp-qr.py
.venv/bin/python scripts/generate-roamxp-qr.py --campaign gta_reel_01 --source Instagram --medium qr
```

Output: `assets/qr/roamxp/` (PNG + SVG, decode-verified against `https://roamxp.puzdev.com/...`).

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

## Release readiness (manual deploy)

**Ready to ship when approved.** Do not auto-deploy.

1. PostHog project token present in `site-analytics.js` (done)
2. Google Play URL live (done)
3. App Store button live (done)
4. QR assets decode to `roamxp.puzdev.com` (done)
5. Phase 2 items documented above — **not blockers**
6. Push `roamxp-website` `main` to GitHub Pages when explicitly approved
7. After deploy: spot-check Live events from a real `/ig/` → `/go/` → store click (no `verification_run`)
