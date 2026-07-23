# FLOW-28 Edge Cases — Phase 9 Deliverable

**Flow:** Blog/CMS Modules (`blog-cms-modules`)
**Classification:** TENANT_FACING
**P1 states:** 1
**CF rules (iron-rule coverage):** 3
**Total edge cases:** 8 (CRITICAL=0, HIGH=7, MEDIUM=1; SERVER_REQUIRED=7, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-590 rule violation: T440 MUST be step[0] in ALL FLOW-28 DAG templates. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-590` |
| 2 | CF-577 rule violation: XSS sanitize before store. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-577` |
| 3 | CF-586 rule violation: SSRF check on every webhook retry with skipCache:true. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-586` |
| 4 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 5 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 6 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 7 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 8 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 3 CF rules in `server/src/engine-contracts/blog-cms-modules*.ts` → 3 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 7 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/blog-cms-modules/P1-business-logic-inventory.md` (1 items)
- CF rules from `server/src/engine-contracts/blog-cms-modules*.ts` (3 rules)
- Common edge-case library (5 generic patterns)

