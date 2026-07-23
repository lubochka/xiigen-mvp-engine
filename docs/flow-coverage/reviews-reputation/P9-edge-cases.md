# FLOW-10 Edge Cases — Phase 9 Deliverable

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**P1 states:** 12
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 12 (CRITICAL=1, HIGH=10, MEDIUM=1; SERVER_REQUIRED=10, CLIENT_ONLY=2)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-10-1 rule violation: T169 eligibility check runs at ORDER 1, BEFORE any write. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-10-1` |
| 2 | CF-10-2 rule violation: T170 moderation has THREE paths: PASS → ReviewPublished, | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-10-2` |
| 3 | CF-10-3 rule violation: T171 subscribes to BOTH ReviewPublished AND ReviewRetracted. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-10-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-10-4 (FC-32). | `CF-10-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 10 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 11 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 12 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/reviews-reputation*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 10 rows need a new/updated endpoint, validator, or BFA rule. 2 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/reviews-reputation/P1-business-logic-inventory.md` (12 items)
- CF rules from `server/src/engine-contracts/reviews-reputation*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

