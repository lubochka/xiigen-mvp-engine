# FLOW-48 i18n-translation — Arbiters bulk NDJSON (companion)

Source NDJSON: `i18n-translation-arbiters.bulk.ndjson` (8 records)

## Arbiter records

| Arbiter ID | Type | Target | Rule (summary) | Severity | Iron rule |
|------------|------|--------|----------------|----------|-----------|
| arb_flow48_scope_isolation | scope_isolation | T665–T670 | Every F1523.storeRef() reads tenantId from ALS context; only T667 under MASTER CLS is exempt | BUILD_FAILURE | CF-810 |
| arb_flow48_master_key_boundary | cls_switch_boundary | T667 | Only MarketplaceTranslationCacheJob may switch CLS to MASTER_TENANT_ID for translation | BUILD_FAILURE | CF-811 |
| arb_flow48_fallback_absolute | http_contract | T666, T669, translation.controller | GET /api/translations/:moduleId/:locale always returns HTTP 200; errors → `{ fallback: true, locale: 'en' }` | BUILD_FAILURE | CF-812 |
| arb_flow48_concurrent_cas_write | concurrency_constraint | T668 | Concurrent GET requests for same tenant/module/locale produce exactly one CAS blob + one lookup ref | BUILD_FAILURE | CF-813 |
| arb_flow48_null_accept_language | ordering_constraint | T665 | Null/malformed Accept-Language → no-op; no write to xiigen-translation-requests, no enabledLocales mutation | BUILD_FAILURE | CF-814 |
| arb_flow48_ai_invalid_json | error_handling | T666 | IAiProvider.generateStructured() invalid JSON → CF-812 fallback path; no partial CAS write | BUILD_FAILURE | CF-815 |
| arb_flow48_marketplace_job_idempotency | idempotency_constraint | T667 | SETNX idem key at ORDER 1; concurrent job instances produce exactly one master CAS blob | BUILD_FAILURE | CF-816 |
| arb_flow48_scope_isolation_always_last | scope_isolation | all_flow48_services | FC-32 mandatory scope-isolation arbiter — kept last per bulk NDJSON convention | BUILD_FAILURE | CF-32 |

## Format

Each NDJSON line is a JSON object with fields: `arbiterId`, `flowId`, `arbiterType`, `target`, `rule`, `severity`, `ironRuleId`.

## Load order

Bulk-loaded by the arbiter registry during flow bootstrap. The `scope_isolation_always_last` record is the FC-32 mandatory scope-isolation arbiter — required on every arbiter-panel.handler and multi-generate.handler node.
