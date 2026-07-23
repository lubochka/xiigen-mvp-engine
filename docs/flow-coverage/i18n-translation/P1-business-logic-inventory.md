# FLOW-48 i18n-translation — P1 Business Logic Inventory

## Purpose

Plain-English inventory of every user- or operator-observable state in the i18n-translation
flow. One row per observable outcome. No TypeScript, no class names, no file paths. Items
labelled `[IRON: CF-81X]` encode MACHINE-invariant contract rules; items labelled
`[CROSS-FLOW: FLOW-NN]` encode contracts that touch another flow.

## Source

- `FLOW-48-DESIGN-R2.md` — Decisions 1–7, Task Map T665–T670, Iron Rules CF-810..CF-812
- `FLOW-48-PLAN-P1-P14.md` §P1

## Shape contract

- Minimum 14 items (6 nodes + ≥ 8 edges).
- Delivered: **17 items** (covers all 7 design decisions and both Step-4 pipeline branches).

---

## Inventory

| # | Observable state | Trigger | Contract labels |
|---|-----------------|---------|-----------------|
| 1 | User registers on tenant subdomain and their HTTP Accept-Language header carries a recognised locale tag → a translation request document is stored for the tenant, and the detected locale is enrolled as permitted | `AccountCreated` event with populated `acceptLanguage` header | `[CROSS-FLOW: FLOW-01]` |
| 2 | User registers with no Accept-Language header or an unrecognised locale tag → no translation request is stored, no freedom-config change occurs | `AccountCreated` event with `acceptLanguage` absent or malformed | `[IRON: CF-814]` |
| 3 | Tenant admin toggles the freedom-config switch `i18n.autoDetectFromRegistrations` to false → any subsequent registration, even with a valid Accept-Language, writes no translation request | `AccountCreated` arriving after toggle flip | — |
| 4 | A locale newly detected from registration is added to the tenant's `i18n.enabledLocales` → the tenant's Freedom config reflects the enlarged set on the next read | `TranslationRequestRegistrar` completion when locale was not previously in set | — |
| 5 | Client requests translations for a non-English locale that has already been translated for this tenant + module combination → cached translations are returned from content-addressable storage without any AI call | Translation endpoint, Step 1 — tenant cache hit | — |
| 6 | Client requests translations for a non-English locale that has never been translated for this tenant, the module comes from the marketplace, and the marketplace master cache has a matching translation, and the tenant's source keys are a subset of the marketplace keys → the master translation hash is linked as the tenant's reference without any AI call | Translation endpoint, Step 4 — marketplace-delta-empty branch | — |
| 7 | Client requests translations for a non-English locale not in cache, and either the module is tenant-only OR the marketplace master has no cache → all source keys are translated via AI under the tenant's own AI keys and stored in tenant content-addressable storage with a lookup reference | Translation endpoint, Step 5 — full tenant translation | — |
| 8 | Client requests translations for a locale that is not in `i18n.enabledLocales` and has never been registered via user-registration → endpoint returns `{ fallback: true, locale: 'en' }` with HTTP 200; translation client falls back to the bundled English resource | Translation endpoint, Step 2 — policy gate denies | `[IRON: CF-812]` |
| 9 | AI translation succeeds → translation blob is stored in CAS by content hash, a lookup reference document links tenantId + moduleId + locale to that hash, and the translation is returned to the client | Successful `IAiProvider.generateStructured()` call | — |
| 10 | AI provider fails to produce valid JSON (timeout, structured-output schema violation, network error) → endpoint returns `{ fallback: true, locale: 'en' }` with HTTP 200; no partial translation is written to CAS | Any `IAiProvider` failure path during Step 5 or delta translation | `[IRON: CF-812, CF-815]` |
| 11 | Client requests a marketplace module translation, marketplace master cache hit, and the tenant has additional source keys the marketplace base does not have → only the delta keys are translated via AI, the delta is merged with the marketplace master, and the merged result is cached and returned | Translation endpoint, Step 4 — marketplace-delta-non-empty branch | — |
| 12 | Tenant translation keys are a strict subset of marketplace keys for the same module and locale → a tenant lookup reference is stored pointing directly at the marketplace master content hash; the tenant issues no additional AI translation call | Translation endpoint, Step 4 — shortcut write | — |
| 13 | A tenant requests a marketplace-module translation for a locale whose marketplace master cache is empty → a marketplace cache job is queued, the tenant call proceeds to Step 5 full translation, and when the queued job runs it stores the marketplace master translation under the master-tenant CLS context | `MarketplaceTranslationCacheJob` async completion | `[IRON: CF-811, CF-816]` |
| 14 | User explicitly selects a locale from the language switcher or settings page → a user-preferences record is stored with `userOverride: true`; subsequent tenant-level changes to `i18n.defaultLocale` do not override this user's locale | User submits language setting | — |
| 15 | User has no stored preferences or the stored record has `userOverride: false` → effective locale is the tenant's `i18n.defaultLocale`; tenant changes propagate to the user automatically | User session starts with no preference doc, or reset-to-tenant button pressed | — |
| 16 | Tenant sets a per-module override in `i18n.module.overrides[moduleSlug] = 'fr'` for one module while the user's locale is `he` → that specific module page renders in French; all other modules continue rendering in Hebrew | User navigates to a module that has a per-module override | — |
| 17 | Client requests English translations → the i18next bundled English resource is used directly with zero calls to the server's translation endpoint | User's effective locale is `en`, or any page fallback path | `[IRON: CF-812 indirect — bundle path]` |

---

## XIIGen Architecture Checks (from P1-P14 plan)

- **Arbiter 1 — Shape:** 17 items > 14 minimum. 6 nodes (T665–T670) + 11 edges = 17. ✅
- **Arbiter 2 — Scope isolation:** zero TypeScript names, zero class names, zero file paths. ✅
- **Arbiter 3 — Iron rules labeled:** items 2, 8, 10, 13 carry `[IRON: CF-81X]`. ✅
- **Arbiter 4 — Pipeline states:** Step 4 delta-empty (item 6) and delta-non-empty (item 11) are separate rows. ✅
- **Arbiter 5 — Cross-flow state:** item 1 carries `[CROSS-FLOW: FLOW-01]` for the AccountCreated payload extension. ✅

---

## Goal coverage (FC-14)

| Goal | Items |
|------|-------|
| G1 easy language switching | 5, 7, 17 |
| G2 tenant default + per-module override + user preference > tenant | 14, 15, 16 |
| G3 translation trigger policy | 1, 2, 3, 4 |
| G4 server pipeline cache → marketplace delta → AI | 5, 6, 7, 8, 11, 12 |
| G5 AI key routing tenant vs master | 13 |
| G6 fallback to English on error | 8, 10, 17 |
