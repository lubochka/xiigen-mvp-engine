# FLOW-17 Edge Cases — Phase 9 Deliverable

**Flow:** Freelancer Marketplace (`freelancer-marketplace`)
**Classification:** TENANT_FACING
**P1 states:** 6
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 9 (CRITICAL=0, HIGH=8, MEDIUM=1; SERVER_REQUIRED=8, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-17-1 rule violation: T613 BOLA ORDER 1 + SETNX ORDER 2 + OCC ORDER 3 + storeDocument(audit) before GigAccepted | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-17-1` |
| 2 | CF-17-2 rule violation: T614 CONTRACT_IMMUTABLE_FIELDS compile-time constant + sum validation + OCC write | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-17-2` |
| 3 | CF-17-3 rule violation: T615 delivery gate before release + LIFO milestone compensation + no deleteDocument on dispute | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-17-3` |
| 4 | CF-17-4 rule violation: T616 single-direction review + duplicate direction check + append-only + comment excluded from PLATFORM_ONLY | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-17-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/freelancer-marketplace*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 8 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/freelancer-marketplace/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/freelancer-marketplace*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

