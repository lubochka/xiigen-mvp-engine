# FLOW-02 Edge Cases — Phase 9 Deliverable

**Flow:** Profile Enrichment (`profile-enrichment`)
**Classification:** TENANT_FACING
**P1 states:** 8
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 9 (CRITICAL=1, HIGH=7, MEDIUM=1; SERVER_REQUIRED=8, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-02-1 rule violation: T50 dual-record-write: PRIVATE full profile + GLOBAL 4-field matching record — both required. Missing GLOBAL write means users are invisible to FLOW-03 audience scoring. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-02-1` |
| 2 | CF-02-2 rule violation: T51 B1 matching timeout 30s → partialResults:true is a SUCCESS MODE — never in failureModes. Output produced = success. Placing in failureModes teaches models to treat designed degradation as errors. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-02-2` |
| 3 | CF-02-3 rule violation: T52 PersonalizationCompleted is a MACHINE string literal — never computed or read from config. FLOW-02 MUST NOT emit OnboardingCompleted (owned by FLOW-01). Collision causes FLOW-08 to create duplicate listing feeds. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-02-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-02-4 (FC-32). | `CF-02-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/profile-enrichment*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 8 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/profile-enrichment/P1-business-logic-inventory.md` (8 items)
- CF rules from `server/src/engine-contracts/profile-enrichment*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

