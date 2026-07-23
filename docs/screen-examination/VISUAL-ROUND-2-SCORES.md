# VISUAL-ROUND-2-SCORES — after targeted residual fixes

Four targeted fixes land as RUN-148.

## Rescored sample (V-R2)

| PNG | Viewport | Role | Verdict | Score | Offences |
|-----|----------|------|---------|-------|----------|
| marketplace populated tenant-user | mobile | tenant-user | **fixed** | 0 | clean: "We couldn't load the marketplace." + "Please try refreshing in a moment..." + "Try again" CTA; no stacked empty-state under the error; reference-platform error pattern (Stripe/Shopify) |
| ads-platform populated platform-admin | desktop | platform-admin | **fixed** | 0 | banner now reads "Missing provider keys: openai, gemini. Training data will use fallback calibration until real keys are configured." — no MONO_MODEL_CALIBRATION |
| ads-platform populated platform-admin | mobile | platform-admin | **fixed** | 0 | same banner + responsive layout preserved from V-R1 |
| ads-platform populated-he platform-admin | desktop | platform-admin | improved | 2 | MAJOR page content strings still hardcoded English (h1 "Ads platform", metric tile labels, card column headers) — per-flow i18n wiring, V-R3+ work; banner now in Hebrew with new copy |
| user-registration default anonymous | mobile | anonymous | **fixed** | 0 | real Google / GitHub / Microsoft brand SVGs, 44px min touch targets, no regressions |

V-R2 sample total offences (weighted): **2**
V-R1 was: 8
V-R0 was: 22
**Delta V-R1 → V-R2: −6 points / −75.0% improvement.**
**Cumulative V-R0 → V-R2: −20 points / −90.9% improvement.**

## Per-axis status

| Axis | V-R0 | V-R1 | V-R2 |
|------|------|------|------|
| UX-P5 Responsive | 5 | 0 | 0 |
| UX-P2 Touch target | 1 | 0 | 0 |
| i18n URL wiring | 3 | 0 | 0 |
| Raw JSON leak | 3 | 0 | 0 |
| S state legibility (stacked states) | 1 | 1 | 0 |
| R grammar/ref parity (marketplace G3) | 2 | 2 | 0 |
| H human-language (MONO_MODEL_CALIBRATION banner) | 1 | 1 | 0 |
| H human-language (page content hardcoded English on he-RTL) | 0 | 3 | 2 |
| SSO placeholder icons | 1 | 1 | 0 |
| "system" tenant identifier leak | 1 | 1 | 0 |

## Residual (2 offences) — all in the same class

Both remaining offences are the same category: hardcoded English strings on a per-page basis that don't get translated when the URL switches language. Examples:

- "Ads platform" h1 (ads-platform page)
- "Running campaigns, budgets, CTR and spend — read the metric tiles..." subtitle
- "CAMPAIGNS / Most recent first / bid editable inline" column header

These cost roughly 1 offence per page-in-non-English. With 44 product flows × 2 non-default languages (he + fr) = 88 per-page cells potentially affected, but most will score 0 offences if the flow doesn't render on that cell (e.g., a platform-admin-only flow viewed as anonymous). The next round is per-flow i18n wiring — the largest remaining body of work, but it no longer moves under systemic fixes.

## V-R3 prediction

V-R3 fires as a convergence check. Expected delta:
- If I do nothing: V-R3 = 2, delta 0% → CONVERGED under Luba's <1% rule for systemic metrics.
- If I wire i18n on a single flow (e.g., ads-platform page) as a pattern demonstration: delta ~1 point, ~50% of residual, but that's just one flow — the real effort scales linearly with flow count and is better tracked per-flow in ROUND-2-COVERAGE-MATRIX.json than as an automated score round.

Recommendation: declare V-R3 the convergence round for the **systemic-score axis** and hand the residual 2-and-accumulating per-page-i18n work to the coverage matrix as per-cell quality tasks.
