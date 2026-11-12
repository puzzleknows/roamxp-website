# RoamXP Smart Links, QR & Acquisition Analytics

**Canonical smart download entry:** [`https://roamxp.puzdev.com/get/`](https://roamxp.puzdev.com/get/)  
**Premium fallback download page:** [`https://roamxp.puzdev.com/go/`](https://roamxp.puzdev.com/go/)

Hosted from the **`roamxp-website`** repository (`CNAME: roamxp.puzdev.com`, GitHub Pages).  
This is the official RoamXP site — **not** `puzdev.com` (corporate site).

## Production status

| Item | Status |
|------|--------|
| Smart entry `/get/` | **Live** — central acquisition router |
| Channel routes `/ig/` `/yt/` `/tt/` `/qr/` | **Live → `/get/`** (unified acquisition) |
| Premium fallback `/go/` | **Live** (design unchanged) |
| Unify + QA harness deploy | **See commit hash below after push** |
| App Store + Google Play official badges | **Live** |
| PostHog project **656002** (`us.i.posthog.com`) | **Live** |
| Campaign QR print assets | **Live** (paths unchanged; see QR notes) |

## Canonical routing

```
/ig/  ─┐
/yt/  ─┼─→  /get/  ─┬─→  App Store   (clean iOS browsers)
/tt/  ─┤            ├─→  Google Play (clean Android browsers)
/qr/  ─┘            └─→  /go/        (in-app, desktop, unknown)
                 /go/   = premium manual download + desktop QR
```

| Route | Purpose |
|-------|---------|
| `/get/` | **Central smart download entry** — OS routing + attribution |
| `/go/` | Premium download fallback (badges, desktop QR). Not auto-store. |
| `/ig/` | Instagram → `/get/` + default UTMs (`link_id=ig`) |
| `/yt/` | YouTube → `/get/` + default UTMs (`link_id=yt`) |
| `/tt/` | TikTok → `/get/` + default UTMs (`link_id=tt`) |
| `/qr/` | QR / offline → `/get/` + default UTMs (`link_id=qr`) |

Short links merge defaults without overwriting explicit query params.  
`/get/` and `/go/` share `assets/js/roamxp-store-links.js` (App Store / Play URL builders).

### `/get/` device rules

| Environment | Action |
|-------------|--------|
| iPhone/iPad Safari, Chrome (not in-app) | `location.replace` → App Store HTTPS |
| Android Chrome / Samsung Internet (not in-app) | `location.replace` → Play HTTPS + `referrer=` |
| Instagram / TikTok / YouTube / Facebook / Android `wv` | → `/go/` (manual badges) |
| Desktop macOS / Windows / Linux | → `/go/` |
| Unknown / ambiguous UA | → `/go/` |

Ordinary Mac is never classified as iPad. iPadOS desktop-class UA requires `MacIntel` + `maxTouchPoints > 1`.  
No custom URI schemes, no redirect loops (`/get/` never targets `/get/`).

### Examples

```
https://roamxp.puzdev.com/get/
https://roamxp.puzdev.com/ig/
https://roamxp.puzdev.com/yt/
https://roamxp.puzdev.com/tt/
https://roamxp.puzdev.com/qr/
https://roamxp.puzdev.com/get/?utm_source=instagram&utm_medium=bio&utm_campaign=launch&link_id=get_bio
https://roamxp.puzdev.com/go/
```

## `/go/` landing (unchanged design)

Premium, light download destination:

- Official app icon + **RoamXP**
- **Turn Life Into a Game.**
- Official App Store + Google Play badges
- Desktop campaign-aware QR; mobile QR hidden
- Footer Privacy | Terms | Support

## Attribution

Preserved end-to-end on channel → `/get/` → store or `/go/`:

- `utm_source` `utm_medium` `utm_campaign` `utm_content` `utm_term`
- `link_id`
- Google Play Install Referrer via encoded `referrer=`
- Apple `pt` / `ct` / `mt` when configured (`appleCampaignProviderToken` or query `pt`)

## PostHog acquisition reporting

| Event | Meaning | Do **not** treat as |
|-------|---------|---------------------|
| `roamxp_smart_redirected` | Automatic `/get/` routing **attempt** (`redirect_mode`, `destination_store`, `device_os`, UTMs) | Install, store open confirmed, or button click |
| `roamxp_landing_viewed` | `/go/` landing page view | Install |
| `roamxp_store_clicked` | Manual badge/button click on `/go/` (or rate link) | Automatic redirect |

`redirect_mode`: `auto_store` | `in_app_fallback` | `fallback_go`  
Tags: `analytics_surface: web_acquisition`, `platform: web`  
Consent: skipped when GPC or DNT is enabled. Never block navigation for analytics.

### Dashboard changes recommended

1. **Separate funnels:** routing attempts (`roamxp_smart_redirected`) vs manual clicks (`roamxp_store_clicked`) vs landing views (`roamxp_landing_viewed`).
2. **Do not** chart `roamxp_smart_redirected` as installs or “store opens.”
3. After channel routes use `/get/`, expect **more** `roamxp_smart_redirected` and **fewer** direct `/go/` views from social (in-app still lands on `/go/`).
4. Break down `roamxp_smart_redirected` by `redirect_mode` and `acquisition_channel` (`instagram`/`youtube`/`tiktok`/`qr`/…).
5. Continue excluding QA: `verification_run` set, `$lib = roamxp-website-qa`, or `distinct_id` prefix `web_qa_`.

## QR print assets

**Do not regenerate** unless URLs in the PNG payloads must change. Published codes stay valid:

| Asset | Encoded URL | After unify |
|-------|-------------|-------------|
| `instagram.png` | `/ig/` | `/ig/` → `/get/` → store or `/go/` |
| `youtube.png` | `/yt/` | same pattern |
| `tiktok.png` | `/tt/` | same pattern |
| `qr_entry.png` | `/qr/` | `/qr/` → `/get/` → … |
| `general.png` | `/go/?…&link_id=qr_general` | Still opens `/go/` directly (bypass `/get/`) |
| `campaign-gta_reel_01.png` | `/go/?utm_…&link_id=qr_gta_reel_01` | Still opens `/go/` directly |

Regenerate only if you intentionally want printed `general` / campaign codes to enter via `/get/` instead.

```bash
brew install qrencode
python3 -m venv .venv && .venv/bin/pip install pillow zxing-cpp
.venv/bin/python scripts/generate-roamxp-qr.py
```

## Automated QA

```bash
cd roamxp-website
npm ci
npm test                 # local Chromium suite
npm run test:smoke:prod  # read-only live smoke; PostHog blocked
```

See `tests/README.md`. Simulation ≠ physical-device store opening.

## Deploy

Push `main` on `puzzleknows/roamxp-website` → GitHub Pages → `https://roamxp.puzdev.com`.
