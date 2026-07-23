# FLOW-48 i18n-translation — Design Reasoning triples (companion)

Source JSON: `i18n-translation-design-decisions.json` (8 triples)

## Design reasoning triples — summary

| # | Decision tag | Quality | Iron? | Source |
|---|-------------|---------|-------|--------|
| 1 | react-i18n-library-choice | 0.95 | — | R2 Decision 1 |
| 2 | translation-pipeline-cache-first | 0.97 | — | R2 Decision 2 |
| 3 | freedom-config-not-machine-locked | 0.95 | — | R2 Decision 3 |
| 4 | account-created-payload-extension | 0.93 | — | R2 Decision 4 (cross-flow FLOW-01) |
| 5 | master-cls-context-for-marketplace-translation | 0.97 | **YES** | R2 Decision 5 — locks CF-811 |
| 6 | english-fallback-absolute-200 | 0.97 | **YES** | R2 Decision 5 — locks CF-812 |
| 7 | user-override-protects-from-tenant-changes | 0.95 | — | R2 Decision 7 |
| 8 | tenant-isolation-on-storeRef | 0.97 | **YES** | R2 Decision 5 — locks CF-810 |

## Coverage of 6 goal elements

- **G1 easy language switching** → triple #1 (react-i18next bundle-first)
- **G2 tenant default + per-module + user preference priority** → triples #3, #7
- **G3 translation trigger policy** → triple #4
- **G4 server pipeline cache → marketplace delta → AI** → triple #2
- **G5 AI key routing** → triple #5
- **G6 fallback to English on error** → triple #6

## Iron rules derived

- **CF-810** (triple #8) — translation tenant isolation; every storeRef uses ALS.tenantId
- **CF-811** (triple #5) — only T667 may switch CLS to MASTER for translation
- **CF-812** (triple #6) — GET /api/translations always returns HTTP 200; errors → `{ fallback: true, locale: 'en' }`

The remaining 4 CF rules (CF-813..CF-816) come from P10 edge-case discovery, not design triples.
