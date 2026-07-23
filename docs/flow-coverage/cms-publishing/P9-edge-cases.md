# FLOW-22 Edge Cases — Phase 9 Deliverable

**Flow:** CMS Publishing (`cms-publishing`)
**Classification:** TENANT_FACING
**P1 states:** 6
**CF rules (iron-rule coverage):** 6
**Total edge cases:** 11 (CRITICAL=0, HIGH=10, MEDIUM=1; SERVER_REQUIRED=10, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-408 rule violation: Without this, rollback is ineligible. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-408` |
| 2 | CF-411 rule violation: MUST only be called in publish-pipeline context. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-411` |
| 3 | CF-412 rule violation: This entry path MUST exist (E2 correction). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-412` |
| 4 | CF-420 rule violation: Removal REJECTED (DD-192). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-420` |
| 5 | CF-402 rule violation: structural write point. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-402` |
| 6 | CF-424 rule violation: must be called after T336 deploy completes. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-424` |
| 7 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 8 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 9 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 10 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 11 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 6 CF rules in `server/src/engine-contracts/cms-publishing*.ts` → 6 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 10 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/cms-publishing/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/cms-publishing*.ts` (6 rules)
- Common edge-case library (5 generic patterns)

