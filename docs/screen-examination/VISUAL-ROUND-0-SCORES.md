# VISUAL-ROUND-0-SCORES — V-R0 baseline from rendered PNGs

Baseline capture: `client/e2e/visual-audit-baseline.spec.ts` (RUN-146)
Scored PNGs: read with Read tool, offences counted against the 12-axis rubric
in VISUAL-REEXAMINATION-PLAN.md. One offence weighted as: BLOCKER=3, MAJOR=2, MINOR=1.

## Scored sample (V-R0)

| PNG | Viewport | Role | Verdict | Score | Offences |
|-----|----------|------|---------|-------|----------|
| marketplace populated tenant-user | mobile | tenant-user | **FAIL** | 9 | BLOCKER P1 raw-JSON engine error to user (is_success/error_code/error_message); BLOCKER P5 ghost-sidebar gray strip eats 40% of 412px mobile viewport; MAJOR G3 no card grid rendered; MAJOR R ref-parity zero vs Etsy/Shopify/Upwork; MAJOR H "TENANT_NOT_FOUND" SCREAMING_SNAKE shown; MINOR S two stacked conflicting states (error banner + empty "publish first" line) |
| ads-platform populated platform-admin | desktop | platform-admin | PASS | 1 | MINOR H "MONO_MODEL_CALIBRATION" engineering code in yellow banner copy |
| ads-platform populated platform-admin | mobile | platform-admin | **FAIL** | 5 | BLOCKER P5 sidebar not collapsed on mobile (w-56 fixed, no hamburger); BLOCKER P2 nav items below 44×44 touch target; MAJOR P5 content squeezed into ~250px |
| ads-platform populated-he platform-admin | desktop | platform-admin | **FAIL** | 6 | BLOCKER i18n URL wiring absent \u2014 `?lang=he` does not call i18n.changeLanguage or flip `document.dir`; MAJOR all text still English; MAJOR layout not mirrored |
| user-registration default anonymous | mobile | anonymous | PASS | 1 | MINOR SSO icons are placeholder glyphs (`G`, `{}`, `⊞`) instead of brand marks |

V-R0 sample total offences (weighted): **22**
V-R0 sample PNG count: 5

## Systemic issues surfaced

Three issues account for 18 of the 22 V-R0 offences, meaning ONE FIX each will ripple across the whole baseline:

### S1 — AppShell not responsive
- **Symptom** (ads-platform mobile): fixed 224px sidebar on 412px viewport; no collapse.
- **Fix**: add `md:flex hidden` to sidebar and a hamburger drawer for <md. Change `ms-56` main offset to `ms-0 md:ms-56`.
- **Expected ripple**: every internal admin page captured at mobile viewport gains a real mobile layout.

### S2 — URL language wiring absent
- **Symptom** (ads-platform populated-he): `?lang=he` is parsed by the test but the app never changes i18n language or `document.dir`. Hebrew, French, future locales cannot be visually audited today.
- **Fix**: `useURLLanguageSync` hook mounted in AppShell: reads `?lang=` from URL, calls `i18n.changeLanguage` if different from current. Existing i18n `languageChanged` handler already flips `document.documentElement.dir` (RUN-119) so dir will follow automatically.
- **Expected ripple**: every populated-he cell renders correctly across all viewports.

### S3 — Raw engine JSON reaches users on API failure
- **Symptom** (marketplace mobile tenant-user): `{"is_success":false,"error_code":"TENANT_NOT_FOUND","error_message":"Tenant 'system' not found"}` rendered verbatim inside a red banner.
- **Fix**: every page that calls an internal API must catch non-2xx and render a human empty/error state, NEVER `JSON.stringify(response)`. The typical handler already exists in `fetchWithErrorHandling` utility \u2014 the marketplace page isn't using it.
- **Expected ripple**: marketplace + any other page hitting the engine API on a 404/5xx.

## V-R1 target

After the three systemic fixes land:
- S1 alone should zero out the 4+ mobile responsive BLOCKERs across internal admin pages.
- S2 should zero out the 4+ i18n BLOCKERs on he-RTL captures.
- S3 should zero out the 5+ raw-JSON offences on any page touching the engine API.

Expected V-R1 sample offence count: 4-6 (from 22 → 4-6 = 70-80% improvement).
