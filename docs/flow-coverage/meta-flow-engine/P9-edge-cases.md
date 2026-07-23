# FLOW-26 Edge Cases — Phase 9 Deliverable

**Flow:** Meta Flow Engine (`meta-flow-engine`)
**Classification:** ENGINE_INTERNAL
**P1 states:** 9
**CF rules (iron-rule coverage):** 0
**Total edge cases:** 9 (CRITICAL=0, HIGH=7, MEDIUM=2; SERVER_REQUIRED=7, CLIENT_ONLY=2)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 2 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 3 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 4 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 5 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 6 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 7 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 8 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 9 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |

## Arbiters

- **Iron rule coverage:** 0 CF rules in `server/src/engine-contracts/meta-flow-engine*.ts` → 0 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 7 rows need a new/updated endpoint, validator, or BFA rule. 2 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/meta-flow-engine/P1-business-logic-inventory.md` (9 items)
- CF rules from `server/src/engine-contracts/meta-flow-engine*.ts` (0 rules)
- Common edge-case library (5 generic patterns)

