# FLOW-48 i18n-translation — P2 UI Gap Analysis

## Purpose

For every observable business state inventoried in
`docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md`, classify
the UI surface that renders that state as MISSING, POTEMKIN, PARTIAL, or COMPLETE.

## Source

- P1 inventory (17 items) at `docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md`
- Plan `FLOW-48-PLAN-P1-P14.md` §P2 — two UI surface types
- Design `FLOW-48-DESIGN-R2.md` — LanguageSwitcher, LanguageSettingsPage, AdminI18nPage

## UI surface types for FLOW-48

- **Type 1 — NEW components** (3 new surfaces):
  1. `LanguageSwitcher` — shell component mounted in the top navigation bar, not a route
  2. `/settings/language` page — user preferences page
  3. `/admin/i18n` page — tenant admin configuration panel
- **Type 2 — CROSS-CUTTING** (one modification applied to many pages):
  1. Per-page `useTranslation()` wiring added to every existing page in the client (×47 pages)

## Live codebase reconnaissance (executed against working tree)

```
$ ls client/src/components/LanguageSwitcher* 2>/dev/null || echo "MISSING"
MISSING

$ grep -rn "useTranslation\|react-i18next" client/src/pages/ 2>/dev/null | wc -l
0

$ grep "i18next\|react-i18next" client/package.json 2>/dev/null || echo "MISSING"
MISSING

$ grep "settings/language\|admin/i18n" client/src/App.tsx 2>/dev/null | head -5
(no output — no matches)

$ ls client/e2e/i18n-translation* 2>/dev/null || echo "MISSING"
MISSING

$ ls docs/e2e-snapshots/i18n-translation/*.png 2>/dev/null | wc -l
0
```

All six probes confirm a green-field state: no component file, no library
dependency, no route registration, no page-level hook usage anywhere.

## Gap table — one row per P1 observable state

| # | Observable state (from P1) | UI surface | UI component | Verdict | Reason |
|---|----------------------------|------------|--------------|---------|--------|
| 1 | User registers with a recognised Accept-Language → translation request stored, locale enrolled | Tenant admin panel showing enabled locales | `/admin/i18n` page | MISSING | No admin i18n page exists; tenant admins cannot see the newly enrolled locale anywhere in the UI |
| 2 | User registers without recognised Accept-Language → no request stored, no config change | Tenant admin panel (locale list unchanged) | `/admin/i18n` page | MISSING | No admin i18n page exists to observe the unchanged locale list |
| 3 | Admin toggles auto-detect-from-registrations to false → later registrations write no request | Tenant admin panel toggle + locale list | `/admin/i18n` page | MISSING | No admin i18n page; the auto-detect toggle has no UI control today |
| 4 | New locale added to enabled-locales after registration | Tenant admin panel locale list | `/admin/i18n` page | MISSING | No admin i18n page to render the enabled-locales list |
| 5 | Non-English locale cache hit → translations returned from cache | Any tenant-facing page translated to the selected locale | All existing pages (×47 multiplier, one row) | MISSING | No existing page calls the translation hook; no localised rendering path exists |
| 6 | Marketplace delta-empty branch → master hash linked as tenant ref | Any tenant-facing page of a marketplace module translated | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 — no page-level translation hook anywhere |
| 7 | Full tenant translation via AI → stored and returned | Any tenant-facing page translated to the selected locale | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 — no page-level translation hook anywhere |
| 8 | Locale denied by policy → fallback response in English | Language switcher shows fallback indicator, pages render English | `LanguageSwitcher` shell component + all existing pages | MISSING | No switcher component exists; no fallback indicator is rendered anywhere |
| 9 | AI translation succeeds → blob stored in cache, translated content returned | Any tenant-facing page translated to the selected locale | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 |
| 10 | AI translation fails → English fallback returned | Language switcher fallback indicator, pages render English | `LanguageSwitcher` shell component + all existing pages | MISSING | Same as row 8 |
| 11 | Marketplace delta-non-empty branch → delta translated and merged | Any tenant-facing page of a marketplace module translated | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 |
| 12 | Tenant keys strict subset of marketplace keys → ref points at master hash | Any tenant-facing page of a marketplace module translated | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 |
| 13 | Master cache job completes under master-tenant context | No direct end-user visible UI — master background write | (no UI surface) | MISSING | The job has no tenant-visible surface; out of scope for end-user UI but still unobservable today because no admin dashboard shows cache state |
| 14 | User explicitly sets locale → user-override stored, tenant changes do not propagate | Language settings page with save confirmation | `/settings/language` page | MISSING | No user-facing language settings page exists |
| 15 | User has no preference → tenant default applies and propagates | Language settings page showing tenant default | `/settings/language` page | MISSING | Same as row 14 — no settings page to display the tenant-default state |
| 16 | Per-module override applied → module renders in override locale, others unchanged | The overridden module's own pages | All existing pages (×47 multiplier, one row) | MISSING | Same as row 5 — no page-level translation hook to select a module-specific locale |
| 17 | English locale requested → bundled English resource used, zero server calls | Any page rendered in English from the bundle | All existing pages (×47 multiplier, one row) | MISSING | No react-i18next bundle or init present; English today is hardcoded strings, not served from a locale bundle |

Row count: **17**, matching the P1 inventory exactly.

## XIIGen Architecture Checks

- **Arbiter 1 — Row count matches P1:** 17 rows, equal to P1 item count of 17. ✅
- **Arbiter 2 — Verdicts grounded in live greps:** every MISSING verdict references
  the reconnaissance block above (package.json lookup, component file lookup, route
  grep, page-level hook grep). No assumed verdicts. ✅
- **Arbiter 3 — Cross-cutting per-page wiring is ONE row with ×47 multiplier:** every
  row that depends on the per-page `useTranslation()` hook references
  "All existing pages (×47 multiplier, one row)" instead of being duplicated 47 times.
  Rows 5, 6, 7, 9, 11, 12, 16, 17 share this single cross-cutting surface. ✅
- **Arbiter 4 — LanguageSwitcher classified as shell component, not a route:** rows 8
  and 10 point at `LanguageSwitcher` as a shell component and are NOT expected to
  appear in the App.tsx `<Route>` list. The `/settings/language` and `/admin/i18n`
  entries are separately classified as route-backed pages. ✅
