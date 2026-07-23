# FLOW-48 i18n-translation — P5 UI Specifications

## Purpose

Component specifications for the three new UI surfaces introduced by FLOW-48 plus the
cross-cutting wiring that must land in every one of the 47 existing pages. The `data-testid`
values in each state block are contract — P8 tests and P13 screenshots depend on them being
exact. Text content is intentionally not contract: the whole point of this flow is that user
visible text varies by locale.

## Source

- `FLOW-48-PLAN-P1-P14.md` §P5
- `FLOW-48-DESIGN-R2.md` — Decisions 1, 2, 3, 6, 7 and Iron Rules CF-810..CF-812
- `docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md` — goal elements G1..G6

---

## New component specs

### (a) LanguageSwitcher — shell component, not a page

```
Component file: client/src/components/LanguageSwitcher.tsx
Placement:      client/src/App.tsx — rendered inside the top navigation bar
Route:          NONE. LanguageSwitcher is a direct child of the nav bar, never a <Route>.
Data source:    GET /api/users/:userId/preferences → effectiveLocale
                GET /tenants/:tenantId/config      → i18n.enabledLocales
```

**Render states**

| # | State | data-testid | What the user sees |
|---|-------|-------------|---------------------|
| 1 | dropdown-closed | `language-switcher` | Current locale label or flag (for example "EN") as a compact trigger button in the nav bar |
| 2 | dropdown-open | `language-switcher-dropdown` | The trigger button plus a dropdown listing every locale currently in `i18n.enabledLocales`; each option carries `data-testid="locale-option-{code}"` (example: `locale-option-he`, `locale-option-fr`) |
| 3 | locale-changing | `language-switcher-loading` | A small spinner or "loading" indicator shown while i18next fetches the non-English translation bundle for the selected locale |
| 4 | fallback-active | `language-switcher` with child `data-testid="locale-fallback-indicator"` (text "[EN fallback]") | When the server response for the current locale carried `{ fallback: true }`, the trigger still shows the user's selected locale code but a small "[EN fallback]" badge sits next to it so the user knows they are seeing English, not their chosen locale |

**User actions**

| Action | Trigger data-testid | Side effects |
|--------|--------------------|--------------|
| Open dropdown | click on `language-switcher` | transitions to `dropdown-open` |
| Select locale | click on `locale-option-{code}` | writes locale to `localStorage`; sends `PUT /api/users/:userId/preferences` (best-effort, async); calls `i18n.changeLanguage(locale)`; transitions to `locale-changing`, then back to `dropdown-closed` with the new label |
| Close dropdown without selection | click outside or press Escape | transitions back to `dropdown-closed` |

Goals covered: **G1** (easy switching), **G6** (fallback indicator surfaces CF-812 to the user).

---

### (b) LanguageSettingsPage — new user-facing page

```
Component file: client/src/pages/settings/LanguageSettingsPage.tsx
Route:          /settings/language
Data source:    GET /api/users/:userId/preferences
                GET /tenants/:tenantId/config → i18n.defaultLocale, i18n.enabledLocales
```

**Render states**

| # | State | data-testid | What the user sees |
|---|-------|-------------|---------------------|
| 1 | page-loaded | `page-language-settings` | The settings page root; a form with current locale selector, a "Use tenant default" toggle, a userOverride indicator, and the two action buttons below |
| 2 | page-loading | `language-settings-loading` | Spinner while preferences are fetched from the server |
| 3 | save-confirmed | `language-settings-saved` | A confirmation banner visible immediately after the PUT completes; auto-dismiss after a short delay |

**User actions**

| Action | Trigger data-testid | Side effects |
|--------|--------------------|--------------|
| Save preference | click on `save-language-btn` | sends `PUT /api/users/:userId/preferences` with the selected locale and `userOverride: true`; on success shows `language-settings-saved` state |
| Reset to tenant default | click on `reset-to-tenant-btn` | sends `PUT /api/users/:userId/preferences` with `locale: <tenantDefault>` and `userOverride: false`; on success shows `language-settings-saved` state |

Goals covered: **G2** (tenant default vs user override precedence is visible and adjustable here).

---

### (c) AdminI18nPage — new admin page

```
Component file: client/src/pages/admin-i18n/AdminI18nPage.tsx
Route:          /admin/i18n
Data source:    GET /tenants/:tenantId/config
                PUT /tenants/:tenantId/config (i18n.enabledLocales, i18n.defaultLocale)
```

**Render states**

| # | State | data-testid | What the admin sees |
|---|-------|-------------|----------------------|
| 1 | page-loaded | `page-admin-i18n` | The admin i18n page root; shows current `i18n.defaultLocale`, the list of `i18n.enabledLocales`, each with a remove control, plus an add-locale form below |
| 2 | add-locale-form-visible | `add-locale-form` | A text input to enter a BCP-47 locale code plus an "Add" button; visible either inline at page load or after clicking an "Add locale" trigger |
| 3 | config-saved | `i18n-config-saved` | A confirmation banner shown after the tenant config PUT completes successfully |

Goals covered: **G3** (tenant decides which locales are permitted), **G5** (admin sees which
locales are backed by tenant keys vs marketplace cache).

---

## (d) Cross-cutting wiring — ALL 47 existing pages

This is not a fourth component. It is a modification applied once per existing page, listed
here as a single spec with a ×47 multiplier rather than 47 near-identical entries.

```
Scope: every page component under client/src/pages/
Count: 47 pages (one per tenant-facing module slug)
```

**Wiring contract per page**

1. Import `useTranslation` from `react-i18next` at the top of the file.
2. Call `const { t } = useTranslation('{module-slug}')` inside the component body, where
   `{module-slug}` is the semantic slug that names the module the page belongs to.
3. Replace every hardcoded user-visible English string with a `t('key_name')` call. Matching
   English values live in `client/src/locales/en/{module-slug}.json` (one bundle per module).
4. `data-testid` values are UNCHANGED. Testids are layout markers, not text-content markers,
   and P8 tests key off them exactly as they appear in the pre-i18n codebase.

**Negative example — never do this**

```
<button data-testid="save-button-t-save_key">...</button>
```

Embedding the translation key (`t('save_key')` output or the raw key name) inside a
`data-testid` value breaks P8 tests the moment the locale changes. Testids stay constant
across locales; only the visible text changes.

Goals covered: **G1** (every page now participates in locale switching), **G4** (every page
pulls translations through the same server pipeline cache → marketplace delta → AI).

---

## XIIGen Architecture Checks

- **Arbiter 1 — Goal delivery:** G1 covered by LanguageSwitcher + per-page wiring; G2 covered
  by LanguageSettingsPage; G3 covered by AdminI18nPage; G4 covered by per-page `useTranslation`
  call pulling from the server backend; G5 covered by AdminI18nPage showing enabled locales;
  G6 covered by LanguageSwitcher fallback-active state. All six goal elements map to at least
  one component spec.
- **Arbiter 2 — Shell vs page:** LanguageSwitcher has NO route entry. It is rendered directly
  inside the nav bar in `client/src/App.tsx`, not via `<Route>`. The only two new routes are
  `/settings/language` and `/admin/i18n`.
- **Arbiter 3 — testid complete:** every render state across the three new components carries
  a distinct `data-testid`. No two states share a testid. Action triggers carry their own
  testids (`locale-option-{code}`, `save-language-btn`, `reset-to-tenant-btn`).
- **Arbiter 4 — Cross-cutting:** per-page `useTranslation` wiring appears as one spec with
  explicit ×47 multiplier, not as 47 separate specs. The wiring contract is identical for
  every page — only the `{module-slug}` namespace differs.
- **Arbiter 5 — CF-812 in spec:** the LanguageSwitcher fallback-active state renders an
  `[EN fallback]` indicator whenever the translation endpoint returns `{ fallback: true }`,
  so the user can tell they are viewing English instead of their selected locale. CF-812 is
  therefore visible in the UI surface, not just in the server contract.

---

Produces artifact at: docs/flow-coverage/i18n-translation/P5-ui-specs.md
