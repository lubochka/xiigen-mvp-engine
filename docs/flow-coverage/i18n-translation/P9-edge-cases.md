# FLOW-48 i18n-translation — P9 Edge Cases

## Purpose

Enumerate every failure mode, race condition, and boundary case that the FLOW-48 pipeline
must survive. Each row is classified as either SERVER_REQUIRED (the fix lives in a server
task T665–T670 and needs a BFA rule) or CLIENT_ONLY (the fix lives in the React client
alone). SERVER_REQUIRED rows are promoted to P10 and receive a CF-813+ rule each.

## Source

- `FLOW-48-PLAN-P1-P14.md` §P9
- `FLOW-48-DESIGN-R2.md` — Decisions 2, 4, 6 and Iron Rules CF-810..CF-812

---

## Edge cases

| # | Edge Case | Severity | Type | Expected Outcome |
|---|-----------|----------|------|------------------|
| 1 | Two users simultaneously request translation for the same locale and module | CRITICAL | SERVER_REQUIRED | Atomic write — only one CAS blob is produced, the second request observes the ref and returns the cached result. No duplicate AI calls, no duplicate blobs. |
| 2 | `acceptLanguage` header on `AccountCreated` contains a malformed locale code such as `xyz-invalid` | HIGH | SERVER_REQUIRED | BCP-47 normalisation returns null → `TranslationRequestRegistrar` writes nothing and emits no event. `i18n.enabledLocales` is unchanged. |
| 3 | AI provider returns a payload that is not a valid key-value JSON object | HIGH | SERVER_REQUIRED | Structured-output schema validation rejects the payload → pipeline falls through to CF-812 → endpoint returns HTTP 200 `{ fallback: true, locale: 'en' }`. No partial translation written to CAS. |
| 4 | `sourceKeys` base64 query parameter is malformed or absent on a translation request | HIGH | SERVER_REQUIRED | Server returns HTTP 200 `{ fallback: true, locale: 'en' }`. Client falls back to the English bundle. No 4xx emitted (CF-812 absolute 200 rule). |
| 5 | Tenant's enabledLocales already contains the locale the user registered with | MEDIUM | SERVER_REQUIRED | Idempotent — no duplicate translation-request document is written, no duplicate freedom-config mutation. |
| 6 | `MarketplaceTranslationCacheJob` fails mid-write: CAS store succeeds but the lookup ref write fails | CRITICAL | SERVER_REQUIRED | Partial state is acceptable — the next request re-runs the full pipeline because the missing ref means "not cached". No corruption; eventual consistency without user-visible breakage. |
| 7 | User clicks the LanguageSwitcher five times rapidly, selecting a different locale each time | MEDIUM | CLIENT_ONLY | Only the final selection is persisted. Intermediate `PUT /api/users/:userId/preferences` calls are debounced on the client; no server-side change. |
| 8 | Tenant admin disables a locale that a user has already set as their explicit override | HIGH | SERVER_REQUIRED | The user's preferences document is unchanged (userOverride protects it), but the translation policy gate now denies the locale → subsequent translation calls return `{ fallback: true }` → the user sees English until they pick another locale. |
| 9 | `i18n.module.overrides[moduleSlug]` points at a locale not in `i18n.enabledLocales` | HIGH | SERVER_REQUIRED | Policy gate denies the override locale → endpoint returns `{ fallback: true }` → the module renders in English despite the override being configured. |
| 10 | Translation cache `sourceHash` differs from the current English bundle hash (stale translation) | MEDIUM | SERVER_REQUIRED | Phase 2 invalidation — deferred in R2 design. Current behaviour returns the stale translation. `sourceHash` is already recorded so Phase 2 can drive invalidation later. |
| 11 | Master-tenant marketplace cache job runs concurrently for the same moduleId/locale | CRITICAL | SERVER_REQUIRED | Idempotency: SETNX on key `idem:translate:master:${moduleId}:${locale}` prevents duplicate job execution. DNA-7 applied at ORDER 1 — second job instance returns `{ skipped: true }`. |
| 12 | Client requests `/api/translations` for a locale with zero translated keys (empty delta, nothing to return) | LOW | CLIENT_ONLY | Response is `{}` or `{ fallback: true }`. i18next falls back to the English bundle automatically. |

---

## Severity distribution

- CRITICAL: **3** (rows 1, 6, 11)
- HIGH: **5** (rows 2, 3, 4, 8, 9)
- MEDIUM: **3** (rows 5, 7, 10)
- LOW: **1** (row 12)

Total: 12 edge cases. 10 SERVER_REQUIRED, 2 CLIENT_ONLY.

---

## Promotion to P10

Four SERVER_REQUIRED rows are promoted to P10 and receive dedicated BFA rules CF-813..CF-816:

- EC-1 → CF-813 (row 1, concurrent translation write)
- EC-2 → CF-814 (row 2, malformed acceptLanguage normalisation)
- EC-3 → CF-815 (row 3, AI returns invalid JSON)
- EC-4 → CF-816 (row 11, marketplace cache concurrent execution)

The remaining six SERVER_REQUIRED rows (4, 5, 6, 8, 9, 10) are covered by iron rules
CF-810..CF-812 already registered in the design or are deferred to Phase 2 (row 10). The two
CLIENT_ONLY rows (7, 12) are handled by client debounce logic and i18next default fallback
behaviour respectively; no BFA rule is required.

---

Produces artifact at: docs/flow-coverage/i18n-translation/P9-edge-cases.md
