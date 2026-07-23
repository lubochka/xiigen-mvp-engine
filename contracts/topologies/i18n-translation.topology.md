# FLOW-48 i18n-translation — Topology Contract (companion to i18n-translation.topology.json)

## Nodes (6 tasks, T665–T670)

| Task | Name | Archetype | Entry | Responsibility |
|------|------|-----------|-------|----------------|
| T665 | TranslationRequestRegistrar | validation | AccountCreated event | Parse acceptLanguage, normalise to BCP-47, store request doc, expand enabledLocales |
| T666 | TranslationResolverService | orchestration | GET /api/translations/:moduleId/:locale | 5-step pipeline: cache → policy → marketplace probe → delta → full translation |
| T667 | MarketplaceTranslationCacheJob | transaction | Async queue, MASTER_TENANT_ID CLS | Translate marketplace base terms using master AI keys; write master CAS + master ref |
| T668 | TenantTranslationWriter | data_pipeline | Translation result ready | SHA-256 via IContentHashService, blob via IPackageContentStoreService, ref via F1523.storeRef() |
| T669 | TranslationPolicyGate | validation | Inline from T666 Step 2 | Check locale permitted in enabledLocales OR xiigen-translation-requests. Never throws (CF-812). |
| T670 | UserPreferencesManager | data_pipeline | GET/PUT /api/users/:userId/preferences | Read/write xiigen-user-preferences; enforce userOverride > tenantDefault priority |

## Edges (11 total)

The topology has 3 entry points (AccountCreated, TranslationRequested, UserPreferencesRequested) and 5 terminal states (TranslationRequestStored, TranslationFallback, TranslationCached, MarketplaceCacheStored, PreferencesUpdated).

- AccountCreated → T665 (when acceptLanguage is present)
- T665 → TranslationRequestStored (terminal; when locale permitted)
- TranslationRequested → T666 (entry to pipeline)
- T666 → T669 (inline policy check)
- T669 → TranslationFallback (denied; terminal; CF-812)
- T666 → T668 (happy path; policy permitted + AI succeeded)
- T666 → T667 (marketplace source; master miss; async, non-blocking)
- T668 → TranslationCached (terminal)
- T667 → MarketplaceCacheStored (terminal)
- UserPreferencesRequested → T670 (entry)
- T670 → PreferencesUpdated (terminal)

## Iron rules applied (7 total: 3 design-locked, 4 edge-case)

| Rule | Name | Applies to |
|------|------|-----------|
| CF-810 | Translation tenant isolation | T668, T667 |
| CF-811 | Master key boundary | T667 |
| CF-812 | English fallback absolute | T666, T669 |
| CF-813 | Concurrent translation idempotency | T668 |
| CF-814 | Null acceptLanguage no-op | T665 |
| CF-815 | AI invalid JSON fallback | T666 |
| CF-816 | Marketplace job SETNX idempotency | T667 |

## ES indices (3 new)

- `xiigen-translation-refs` — docId = `${tenantId}::${moduleId}::${locale}`, OCC-protected
- `xiigen-translation-requests` — per-tenant translation requests with source (user_registration | tenant_config)
- `xiigen-user-preferences` — userId docId, stores locale + userOverride flag

## Cross-flow touches

- **FLOW-01 user-registration** — AccountCreated payload extended with optional `acceptLanguage?: string`. Formalised via `AccountCreatedPayload` interface in `engine-contracts/user-registration-contracts.ts`.

## Factory

- **F1523 ITranslationLookup** — backed by IDatabaseService; methods: `findRef()`, `storeRef()`, `isLocalePermitted()`
