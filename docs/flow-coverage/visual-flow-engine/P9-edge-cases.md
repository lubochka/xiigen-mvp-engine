# FLOW-18 Edge Cases — Phase 9 Deliverable

**Flow:** Visual Flow Engine (`visual-flow-engine`)
**Classification:** ENGINE_INTERNAL
**P1 states:** 6
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 9 (CRITICAL=0, HIGH=8, MEDIUM=1; SERVER_REQUIRED=8, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-18-1 rule violation: T617 BOLA ORDER 1 + FLOW_IMMUTABLE ORDER 2 + DRAFT→PUBLISHED one-way guard | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-18-1` |
| 2 | CF-18-2 rule violation: T618 DFS cycle detection ORDER 1 + type compatibility per-edge ORDER 2 + OCC DRAFT→PUBLISHED | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-18-2` |
| 3 | CF-18-3 rule violation: T619 SETNX before both writes + redis.del in catch on failure | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-18-3` |
| 4 | CF-18-4 rule violation: T620 version lock ORDER 1 + pre-write audit ORDER 2 + append-only injection audit | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-18-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/visual-flow-engine*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 8 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/visual-flow-engine/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/visual-flow-engine*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

