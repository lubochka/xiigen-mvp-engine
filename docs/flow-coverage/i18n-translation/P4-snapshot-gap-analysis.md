# FLOW-48 i18n-translation — P4 Snapshot Gap Analysis

## Purpose

For every observable business state inventoried in P1, classify PNG snapshot
coverage as NO_SCREENSHOT, PARTIAL, or COMPLETE.

At P4 time — before implementation (P6), before test authoring (P8), and before
the QA run (P13) — every observable state is expected to be NO_SCREENSHOT. This
document records the baseline gap and enumerates the target PNGs that P13 must
produce.

## Source

- P1 inventory (17 items) at `docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md`
- Plan `FLOW-48-PLAN-P1-P14.md` §P4
- Snapshot directory: `docs/e2e-snapshots/i18n-translation/`

## Live codebase reconnaissance (executed against working tree)

```
$ ls docs/e2e-snapshots/i18n-translation/*.png 2>/dev/null | wc -l
0
```

The snapshot directory contains no PNG files today. No locale-aware screenshot
exists for any of the 17 observable states.

## Gap table — one row per P1 observable state

Each row lists the expected PNG that P13 will produce (see target list below
for the full file name mapping).

| # | Observable state (from P1) | Expected PNG path | Exists now? | Verdict |
|---|----------------------------|-------------------|-------------|---------|
| 1 | User registers with Accept-Language → translation request stored, locale enrolled | docs/e2e-snapshots/i18n-translation/10-admin-i18n-config.png | No | NO_SCREENSHOT |
| 2 | User registers without Accept-Language → no request stored | docs/e2e-snapshots/i18n-translation/10-admin-i18n-config.png | No | NO_SCREENSHOT |
| 3 | Admin disables auto-detect → later registrations write nothing | docs/e2e-snapshots/i18n-translation/10-admin-i18n-config.png | No | NO_SCREENSHOT |
| 4 | New locale added to enabled-locales after registration | docs/e2e-snapshots/i18n-translation/10-admin-i18n-config.png | No | NO_SCREENSHOT |
| 5 | Non-English cache hit → translations returned from cache | docs/e2e-snapshots/i18n-translation/02-locale-hebrew-active.png | No | NO_SCREENSHOT |
| 6 | Marketplace delta-empty branch → master hash linked | docs/e2e-snapshots/i18n-translation/03-locale-french-active.png | No | NO_SCREENSHOT |
| 7 | Full tenant translation via AI → stored and returned | docs/e2e-snapshots/i18n-translation/02-locale-hebrew-active.png | No | NO_SCREENSHOT |
| 8 | Locale denied by policy → English fallback response | docs/e2e-snapshots/i18n-translation/04-fallback-english-on-error.png | No | NO_SCREENSHOT |
| 9 | AI translation succeeds → translated content returned | docs/e2e-snapshots/i18n-translation/02-locale-hebrew-active.png | No | NO_SCREENSHOT |
| 10 | AI translation fails → English fallback returned | docs/e2e-snapshots/i18n-translation/07-server-error-fallback.png | No | NO_SCREENSHOT |
| 11 | Marketplace delta-non-empty branch → delta merged with master | docs/e2e-snapshots/i18n-translation/03-locale-french-active.png | No | NO_SCREENSHOT |
| 12 | Tenant keys subset of marketplace keys → master ref linked | docs/e2e-snapshots/i18n-translation/03-locale-french-active.png | No | NO_SCREENSHOT |
| 13 | Master cache job completes under master-tenant context | docs/e2e-snapshots/i18n-translation/10-admin-i18n-config.png | No | NO_SCREENSHOT |
| 14 | User explicitly sets locale → user-override stored | docs/e2e-snapshots/i18n-translation/05-user-preferences-set.png | No | NO_SCREENSHOT |
| 15 | User has no preference → tenant default applies | docs/e2e-snapshots/i18n-translation/06-tenant-default-respected.png | No | NO_SCREENSHOT |
| 16 | Per-module override → overridden module renders override locale | docs/e2e-snapshots/i18n-translation/08-module-override-active.png | No | NO_SCREENSHOT |
| 17 | English locale requested → bundled resource used, zero server calls | docs/e2e-snapshots/i18n-translation/11-en-bundle-no-server-call.png | No | NO_SCREENSHOT |

Row count: **17**, matching P1.

## Target PNG set for P13

From plan `FLOW-48-PLAN-P1-P14.md` §P4, P13 must produce the following PNGs under
`docs/e2e-snapshots/i18n-translation/`:

- `01-language-switcher-visible.png`
- `02-locale-hebrew-active.png`
- `03-locale-french-active.png`
- `04-fallback-english-on-error.png`
- `05-user-preferences-set.png`
- `06-tenant-default-respected.png`
- `07-server-error-fallback.png`
- `08-module-override-active.png`
- `09-settings-page-saved.png`
- `10-admin-i18n-config.png`
- `11-en-bundle-no-server-call.png`
- `12-non-en-backend-load.png`

## XIIGen Architecture Checks

- **Arbiter 1 — Row count matches P1:** 17 rows. ✅
- **Arbiter 2 — Verdicts grounded in live recon:** `find` returned zero PNGs,
  so all 17 rows resolve to NO_SCREENSHOT against live evidence. ✅
- **Arbiter 3 — All NO_SCREENSHOT at P4 time:** 17 of 17. ✅
- **Arbiter 4 — Target PNG list present:** 12 target PNGs enumerated for P13. ✅
