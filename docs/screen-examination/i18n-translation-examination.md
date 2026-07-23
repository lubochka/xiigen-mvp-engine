# Flow UI examination — FLOW-48 admin-i18n / i18n-translation

## Date: 2026-04-20 · Run: RUN-61 · Batch: G (Grammar 7 Settings Tabs + Grammar 3 Translation Table)

## One-sentence spec
**No F1 STEP-1-INVARIANTS.md for FLOW-48.** Intent derived from
`docs/design-reviews/FLOW-48-DESIGN-REVIEW-v1.md` + existing pages
(`LanguageSettingsPage` at `/settings/language`, `AdminI18nPage` at `/admin/i18n`)
+ existing `LanguageSwitcher` component:

Intent: allow tenants to switch their UI language + allow platform admins to
manage translation strings per namespace, review contributor submissions, and
deploy translated UI to tenants.

## Roles
- **tenant-user** — pick own UI language (LanguageSwitcher + LanguageSettingsPage)
- **tenant-admin** — set tenant default language + override per-user settings
- **platform-admin** — manage translation strings + contributor submissions (AdminI18nPage)
- **translator (contributor)** — submit translations for review

## Grammar (compound)
- **G7 Settings Tabs** for admin-i18n (Languages / Namespaces / Contributors / Deployment)
- **G3 Card List (translation table)** for per-namespace per-key translation rows
- **G5 Kiosk** for LanguageSettingsPage (single "Select your language" dropdown)

## Reference
**Crowdin + Lokalise + Phrase** (translation management systems); **Crowdin translator editor** (per-key translation UI).

## Classification
- **Q1 CRUD?** 🟡 AdminI18nPage likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty namespaces: "No translations loaded yet" + seeded-namespace CTA.
- **Q3 Engineering leak?** "Namespace" is acceptable in translator UI (standard i18n term); avoid exposing i18n library internals.
- **Q4 Role-correct?** ✅ 4-role split; contributor is a new role.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for admin console + contributor review queue.

## 14 existing PNGs (`i18n-translation/` slug; `admin-i18n/` empty)

## Planned fixes
- **LanguageSettingsPage**: simple kiosk — language dropdown + save primary + "Your language preference applies immediately" helper
- **AdminI18nPage Settings Tabs**:
  - Languages tab: supported languages list with completeness % per language
  - Namespaces tab: per-namespace list with key count + completeness + "View strings" CTA
  - Contributors tab: pending-submissions queue (Grammar 2 Verdict Grid: approve / request revision / reject)
  - Deployment tab: push-to-production controls + per-language diff preview
- **Per-namespace translation table** (G3 row list): key + source (EN) + target language + status badge + inline editor
