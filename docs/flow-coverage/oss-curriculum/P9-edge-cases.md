# FLOW-39 Edge Cases — Phase 9 Deliverable

**Flow:** OSS Curriculum (`oss-curriculum`)
**Classification:** ENGINE_INTERNAL
**P1 states:** 1
**CF rules (iron-rule coverage):** 2
**Total edge cases:** 7 (CRITICAL=0, HIGH=6, MEDIUM=1; SERVER_REQUIRED=6, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-803 rule violation: CurriculumTierAssigner MUST run before any DPO triple is marked VALIDATED. Tier assignment is a required field, not optional metadata. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-803` |
| 2 | CF-804 rule violation: Shadow run results MUST be stored with the ossModel name and cycleId. Anonymous shadow results have no curriculum value. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-804` |
| 3 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 4 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 5 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 6 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 7 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 2 CF rules in `server/src/engine-contracts/oss-curriculum*.ts` → 2 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 6 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/oss-curriculum/P1-business-logic-inventory.md` (1 items)
- CF rules from `server/src/engine-contracts/oss-curriculum*.ts` (2 rules)
- Common edge-case library (5 generic patterns)

