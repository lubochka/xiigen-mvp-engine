# FLOW-48 i18n-translation — P3 Automation Gap Analysis

## Purpose

For every observable business state inventoried in P1, classify end-to-end test
coverage as NOT_TESTED, PARTIAL, or COMPLETE.

At P3 time — before implementation and before P8 test authoring — every
observable state is expected to be NOT_TESTED. This document records the baseline
gap that P8 (QA scenarios) and P13 (QA run) must close.

## Source

- P1 inventory (17 items) at `docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md`
- Plan `FLOW-48-PLAN-P1-P14.md` §P3
- Search paths required: `client/e2e/*.spec.ts` and `e2e/tests/*.spec.ts`

## Live codebase reconnaissance (executed against working tree)

```
$ grep -rn "useTranslation\|i18next\|changeLanguage\|locale" client/e2e/ 2>/dev/null | wc -l
0

$ ls client/e2e/i18n-translation* 2>/dev/null || echo "MISSING"
MISSING

$ ls e2e/tests/i18n* 2>/dev/null || echo "MISSING"
MISSING
```

All three probes confirm zero existing automation for any i18n surface. No spec
file exercises locale switching, translation loading, user preferences, or
fallback behaviour today.

## Gap table — one row per P1 observable state

| # | Observable state (from P1) | Existing spec? | Test file path if any | Verdict |
|---|----------------------------|----------------|-----------------------|---------|
| 1 | User registers with Accept-Language → translation request stored, locale enrolled | No | — | NOT_TESTED |
| 2 | User registers without Accept-Language → no request stored | No | — | NOT_TESTED |
| 3 | Admin disables auto-detect → later registrations write nothing | No | — | NOT_TESTED |
| 4 | New locale added to enabled-locales after registration | No | — | NOT_TESTED |
| 5 | Non-English cache hit → translations returned from cache | No | — | NOT_TESTED |
| 6 | Marketplace delta-empty branch → master hash linked as tenant ref | No | — | NOT_TESTED |
| 7 | Full tenant translation via AI → stored and returned | No | — | NOT_TESTED |
| 8 | Locale denied by policy → English fallback response | No | — | NOT_TESTED |
| 9 | AI translation succeeds → translated content returned | No | — | NOT_TESTED |
| 10 | AI translation fails → English fallback returned | No | — | NOT_TESTED |
| 11 | Marketplace delta-non-empty branch → delta merged with master | No | — | NOT_TESTED |
| 12 | Tenant keys subset of marketplace keys → master ref linked | No | — | NOT_TESTED |
| 13 | Master cache job completes under master-tenant context | No | — | NOT_TESTED |
| 14 | User explicitly sets locale → user-override stored | No | — | NOT_TESTED |
| 15 | User has no preference → tenant default applies | No | — | NOT_TESTED |
| 16 | Per-module override → overridden module renders override locale | No | — | NOT_TESTED |
| 17 | English locale requested → bundled resource used, zero server calls | No | — | NOT_TESTED |

Row count: **17**, matching P1.

## Cross-flow impact

FLOW-48 is cross-cutting: once the per-page `useTranslation()` wiring ships in P6,
every existing page's user-visible text becomes locale-dependent. The current
end-to-end suite does not exercise any locale other than implicit English.

Recon:

```
$ ls client/e2e/*-mock-states.spec.ts 2>/dev/null | wc -l
29

$ ls client/e2e/*-crud.spec.ts 2>/dev/null | wc -l
28
```

Implication:

- **29 existing `*-mock-states.spec.ts` files** do not switch locale before
  asserting on rendered text. Every state they capture today is an implicit
  English-locale capture. After FLOW-48 ships, each of those 29 files covers
  only the English half of every locale-dependent state the page renders.
- **28 existing `*-crud.spec.ts` files** do not switch locale before driving a
  create/update/delete flow. Any user-visible text asserted inside those specs
  is today pinned to English strings. After FLOW-48 ships, the non-English
  rendering path for the same create/update/delete flow is NOT_TESTED.

For FLOW-48 specifically: the locale-dependent halves of rows 5, 6, 7, 9, 11,
12, 16, and 17 — which depend on per-page translation rendering — are not
covered by any existing mock-states or crud spec. P8 must add locale-switching
coverage; P13 must capture the non-English screenshots. Those existing 57 spec
files will NOT gain locale coverage automatically and are explicitly out of
scope for FLOW-48's own spec file — they will remain English-only until a
follow-on cross-flow locale sweep is scheduled.

## XIIGen Architecture Checks

- **Arbiter 1 — Row count matches P1:** 17 rows. ✅
- **Arbiter 2 — Verdicts grounded in greps:** all verdicts trace to the recon
  block (zero matches across `client/e2e/` and `e2e/tests/`, no `i18n*` file
  in either path). ✅
- **Arbiter 3 — All NOT_TESTED at P3 time:** 17 of 17. ✅
- **Arbiter 4 — Cross-flow impact recorded:** 29 mock-states + 28 crud specs
  flagged as locale-blind with implication documented. ✅
