# VISUAL-ROUND-1-SCORES — after S1/S2/S3 systemic fixes

Three systemic fixes landed as RUN-147, all three visibly effective on the recaptured PNGs.

## Rescored sample (V-R1)

| PNG | Viewport | Role | Verdict | Score | Offences |
|-----|----------|------|---------|-------|----------|
| marketplace populated tenant-user | mobile | tenant-user | improved | 3 | MAJOR S stacked conflicting states (error banner "Tenant 'system' not found" still appears alongside empty-state "No published packages yet"); MAJOR G3 no card grid (not a regression — waiting on real data); MINOR H "Tenant 'system' not found" leaks the internal tenant identifier "system" |
| ads-platform populated platform-admin | desktop | platform-admin | unchanged | 1 | MINOR H "MONO_MODEL_CALIBRATION" engineering code still in banner copy |
| ads-platform populated platform-admin | mobile | platform-admin | fixed | 1 | MINOR H same banner code |
| ads-platform populated-he platform-admin | desktop | platform-admin | **fixed** | 2 | MAJOR page content strings still English (h1 "Ads platform", "Running campaigns, budgets, CTR..." subtitle, card labels — not wired to i18n); MINOR H MONO_MODEL_CALIBRATION banner |
| user-registration default anonymous | mobile | anonymous | unchanged | 1 | MINOR SSO placeholder icons |

V-R1 sample total offences (weighted): **8**
V-R0 sample total was: 22
**Delta: −14 points / −63.6% improvement from V-R0 → V-R1.**

## Offence breakdown by axis

| Axis | V-R0 | V-R1 | Delta |
|------|------|------|-------|
| UX-P5 Responsive (mobile breakage) | 5 | 0 | **−5** (S1) |
| UX-P2 Touch target <44px | 1 | 0 | **−1** (S1) |
| i18n URL wiring (Hebrew) | 3 | 0 | **−3** (S2) |
| Raw JSON leak | 3 | 0 | **−3** (S3) |
| H human language (MONO_MODEL_CALIBRATION, "system" tenant-id, page content English in he-RTL) | 1 | 4 | +3 (newly surfaced after he-RTL unlocked) |
| S state legibility (stacked error+empty) | 1 | 1 | 0 |
| R grammar/ref parity (marketplace G3 no card grid) | 2 | 2 | 0 |
| SSO placeholder icons | 1 | 1 | 0 |

Note: The "+3" line in H is not a regression — those offences were invisible at V-R0 because the page rendered in English regardless of URL. S2 unlocked the Hebrew render, which then surfaced the hardcoded English strings as a new class of offence. This is expected and tracked as V-R2 per-flow i18n work.

## V-R1 → V-R2 remaining work

Residual 8 offences cluster by axis:

1. **H — per-page i18n wiring for hardcoded strings (4 offences)**: page h1s, subtitles, column headers in each flow need `t('...', { defaultValue: '...' })` wrappers. V-R2 grammar-alignment pass.
2. **S — marketplace stacked error+empty (1 offence)**: pick one state, not both. When `error` truthy: show error only. When `error` null + `!loading` + empty: show empty-state only.
3. **R — marketplace card grid absent (2 offences)**: G3 grammar requires the card list even when empty. Wire category-tile skeleton or "browse by category" teaser for empty state per MARKET-REFERENCE-CATALOG §3 (Stripe/Shopify pattern).
4. **SSO icon placeholders (1 offence)**: swap the text glyphs (`G`, `{}`, `⊞`) for real brand SVGs.
5. **MONO_MODEL_CALIBRATION banner copy**: rewrite to plain-language — "DPO triples will use fallback calibration. [Configure keys] to generate with production providers."

Cumulative after R0→R1 = 63.6% improvement. R2 target: ≥30% further delta on the residual 8.
