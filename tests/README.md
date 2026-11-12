# RoamXP Smart Links QA

Automated Playwright coverage for `/get/` and `/go/` on `roamxp-website`.

## Commands

```bash
cd roamxp-website
npm ci
npm run test:install          # chromium + webkit
npm test                      # full local suite (starts python http.server :8090)
npm run test:smoke:prod       # read-only live smoke (blocks PostHog)
```

## What is covered

| Area | Coverage |
|------|----------|
| `/get/` routing | Simulated iPhone/iPad/Android/Samsung/in-app/desktop/unknown |
| Attribution | UTMs, `link_id`, Play `referrer=`, Apple `pt/ct/mt` |
| Short links | `/ig/` `/yt/` `/tt/` `/qr/` still → `/go/` (not `/get/`) |
| Analytics | `roamxp_smart_redirected` vs `roamxp_store_clicked`; DNT/GPC; PostHog blocked |
| Responsive | 320–1440px overflow, badges, desktop QR |

## Reporting

- Console PASS/FAIL summary via `tests/reporters/smart-links-summary.js`
- HTML report: `playwright-report/`
- Failures retain traces + screenshots in `test-results/`

## Limitations

Browser UA simulation **does not** prove native App Store / Google Play opening on physical devices. Always smoke-test real iPhone and Android (and Instagram/TikTok in-app) before promoting `/get/` in campaigns.
